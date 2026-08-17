/**
 * GST ⇄ Finance integration.
 *
 * The GST module used to hold standalone demo data. Everything here derives
 * compliance records from the live finance ledger instead:
 *  - AR invoices  → e-invoice (IRN) queue
 *  - AP bills     → ITC lines matched against GSTR-2B
 *  - both         → period-wise GSTR-1 / 3B / 2B liability and credit
 *  - filing       → a posted GL journal settling GST payable
 *
 * Every step is idempotent (keyed on the finance document code), so the sync
 * can be re-run safely and never double-creates or double-posts.
 */
import { finance, nextCode } from "@/lib/finance/store";
import type { FinanceState } from "@/lib/finance/types";
import { gstStore } from "./store";
import type { GstState, ReturnPeriod } from "./types";

const period = (iso?: string) => (iso ?? new Date().toISOString()).slice(0, 7);
const pad = (n: number) => String(n).padStart(3, "0");

/** IGST / CGST / SGST split used across the module (62% inter-state mix). */
export function splitTax(total: number) {
  const igst = Math.round(total * 0.62);
  const half = Math.round((total - igst) / 2);
  return { igst, cgst: half, sgst: half, cess: 0 };
}

function gstinFor(s: GstState, customer: string) {
  return s.eInvoices.find((e) => e.customer === customer)?.gstin ?? "URP — unregistered";
}

export interface GstSyncResult {
  eInvoices: number;
  itcLines: number;
  periods: number;
  ledgers: number;
  messages: string[];
}

/** Pull invoices, bills and tax periods out of finance into the GST workspace. */
export function syncGstFromFinance(): GstSyncResult {
  const fin = finance.get();
  const res: GstSyncResult = { eInvoices: 0, itcLines: 0, periods: 0, ledgers: 0, messages: [] };

  gstStore.update((s) => {
    const primary = s.registrations.find((r) => r.primary) ?? s.registrations[0];
    const gstin = primary?.gstin ?? "27AAFCF1234M1ZP";

    /* ---------- AR invoices → e-invoice queue ---------- */
    const known = new Set(s.eInvoices.map((e) => e.invoiceNo));
    let n = s.eInvoices.length;
    for (const inv of fin.arInvoices) {
      if (inv.status === "draft" || inv.status === "void") continue;
      if (known.has(inv.code)) continue;
      n += 1;
      s.eInvoices = [
        {
          id: `EIN-${pad(n)}`,
          invoiceNo: inv.code,
          date: (inv.issuedAt ?? "").slice(0, 10),
          customer: inv.customerName,
          gstin: gstinFor(s, inv.customerName),
          taxableValue: inv.amount,
          totalTax: inv.gst,
          status: "pending",
        },
        ...s.eInvoices,
      ];
      res.eInvoices += 1;
    }

    /* ---------- AP bills → ITC reconciliation ---------- */
    const seenBills = new Set(s.itc.map((i) => i.invoiceNo));
    let m = s.itc.length;
    for (const b of fin.apBills) {
      if (b.gst <= 0 || seenBills.has(b.code)) continue;
      m += 1;
      const matched = b.matchStatus === "matched";
      const twoB = matched ? b.amount : b.matchStatus === "unmatched" ? 0 : Math.round(b.amount * 0.98);
      s.itc = [
        {
          id: `ITC-${pad(m)}`,
          supplier: b.vendorName,
          gstin: `PAN-${b.vendorName.slice(0, 3).toUpperCase()}`,
          invoiceNo: b.code,
          date: (b.receivedAt ?? "").slice(0, 10),
          bookValue: b.amount,
          gstr2bValue: twoB,
          itcClaimable: twoB ? Math.round(Math.min(b.amount, twoB) * 0.18) : 0,
          match: !twoB ? "missing-in-2b" : twoB === b.amount ? "matched" : "mismatch",
        },
        ...s.itc,
      ];
      res.itcLines += 1;
    }

    /* ---------- Period-wise return figures ---------- */
    const outward = new Map<string, number>();
    for (const inv of fin.arInvoices) {
      if (inv.status === "draft" || inv.status === "void") continue;
      const p = period(inv.issuedAt);
      outward.set(p, (outward.get(p) ?? 0) + inv.amount);
    }
    const inward = new Map<string, number>();
    for (const b of fin.apBills) {
      const p = period(b.receivedAt);
      inward.set(p, (inward.get(p) ?? 0) + b.amount);
    }

    const periods = new Set<string>([...outward.keys(), ...inward.keys()]);
    for (const p of periods) {
      for (const type of ["GSTR-1", "GSTR-3B", "GSTR-2B"] as const) {
        const taxable = type === "GSTR-2B" ? (inward.get(p) ?? 0) : (outward.get(p) ?? 0);
        if (!taxable) continue;
        const tax = splitTax(Math.round(taxable * 0.18));
        const existing = s.returns.find((r) => r.period === p && r.type === type);
        if (existing) {
          if (existing.status === "filed") continue;
          Object.assign(existing, { taxableValue: taxable, ...tax });
          res.periods += 1;
        } else {
          const row: ReturnPeriod = {
            id: `RET-${pad(s.returns.length + 1)}`,
            gstin,
            period: p,
            type,
            dueDate: `${p}-${type === "GSTR-1" ? "11" : type === "GSTR-3B" ? "20" : "14"}`,
            status: type === "GSTR-2B" ? "ready" : "in-progress",
            taxableValue: taxable,
            ...tax,
          };
          s.returns = [...s.returns, row];
          res.periods += 1;
        }
      }
    }
  });

  /* ---------- Mirror into the finance tax ledger ---------- */
  finance.update((f) => {
    const g = gstStore.get();
    for (const r of g.returns) {
      if (r.type === "GSTR-2B") continue;
      const type = r.type === "GSTR-1" ? "GSTR-1" : "GSTR-3B";
      const credit = g.returns.find((x) => x.period === r.period && x.type === "GSTR-2B");
      const outputTax = r.igst + r.cgst + r.sgst + r.cess;
      const inputTax = credit ? credit.igst + credit.cgst + credit.sgst : 0;
      const existing = f.taxLedgers.find((t) => t.period === r.period && t.type === type);
      const patch = {
        outputTax,
        inputTax,
        netPayable: Math.max(0, outputTax - inputTax),
        status: (r.status === "filed" ? "filed" : r.status === "ready" ? "prepared" : "open") as
          | "open" | "prepared" | "filed" | "late",
        filedAt: r.filedOn,
        reference: r.arn,
      };
      if (existing) Object.assign(existing, patch);
      else {
        f.taxLedgers = [
          { id: crypto.randomUUID(), period: r.period, type, ...patch },
          ...f.taxLedgers,
        ];
        res.ledgers += 1;
      }
    }
  });

  res.messages.push(
    `${res.eInvoices} invoice(s) queued for IRN`,
    `${res.itcLines} vendor bill(s) added to ITC reconciliation`,
    `${res.periods} return period(s) recomputed`,
  );
  return res;
}

/** Net cash liability of a GSTR-3B period after set-off of eligible ITC. */
export function netPayableFor(s: GstState, periodKey: string) {
  const out = s.returns.find((r) => r.period === periodKey && r.type === "GSTR-3B");
  const inp = s.returns.find((r) => r.period === periodKey && r.type === "GSTR-2B");
  const output = out ? out.igst + out.cgst + out.sgst + out.cess : 0;
  const credit = inp ? inp.igst + inp.cgst + inp.sgst : 0;
  return { output, credit, net: Math.max(0, output - credit) };
}

const journalExists = (f: FinanceState, ref: string) => f.journals.some((j) => j.reference === ref);

/**
 * File a GSTR-3B and settle the liability in the GL:
 * Dr GST Payable (2200) / Cr Cash & Bank (1100) for the net cash outflow.
 * Returns the journal code, or null when nothing was posted.
 */
export function postGstSettlement(periodKey: string): { code: string; amount: number } | null {
  const g = gstStore.get();
  const { output, credit, net } = netPayableFor(g, periodKey);
  if (net <= 0) return null;
  const reference = `GST-3B-${periodKey}`;
  let created: { code: string; amount: number } | null = null;

  finance.update((f) => {
    if (journalExists(f, reference)) return;
    const code = nextCode("JV-", f.journals.map((j) => j.code));
    f.journals = [
      {
        id: crypto.randomUUID(),
        code,
        date: new Date().toISOString(),
        reference,
        narration: `GSTR-3B ${periodKey} — output ${output.toLocaleString("en-IN")} less ITC ${credit.toLocaleString("en-IN")}`,
        status: "posted",
        source: "system",
        createdBy: "GST Compliance",
        lines: [
          { accountCode: "2200", debit: net, credit: 0, memo: `GSTR-3B ${periodKey} set-off` },
          { accountCode: "1100", debit: 0, credit: net, memo: "GST challan payment" },
        ],
      },
      ...f.journals,
    ];
    const gstAcc = f.accounts.find((a) => a.code === "2200");
    if (gstAcc) gstAcc.balance -= net;
    const bank = f.accounts.find((a) => a.code === "1100");
    if (bank) bank.balance -= net;
    created = { code, amount: net };
  });

  return created;
}

/** Auto-register every pending e-invoice on the IRP (bulk IRN generation). */
export function bulkGenerateIrn(): number {
  let count = 0;
  gstStore.update((s) => {
    for (const e of s.eInvoices) {
      if (e.status === "generated" || e.status === "cancelled") continue;
      e.status = "generated";
      e.errorMsg = undefined;
      e.irn = Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
      e.ackNo = `1120${Math.floor(Math.random() * 900000 + 100000)}`;
      count += 1;
    }
  });
  return count;
}
