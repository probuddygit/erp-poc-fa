/**
 * Deterministic GST compliance intelligence.
 *
 * Every metric and recommendation is derived from the live GST workspace and
 * the finance ledger — no invented numbers, and each action can be applied.
 */
import type { AiAction } from "@/components/ai/module-copilot";
import { finance } from "@/lib/finance/store";
import type { FinanceState } from "@/lib/finance/types";
import type { GstState } from "./types";
import {
  bulkGenerateIrn, netPayableFor, postGstSettlement, syncGstFromFinance,
} from "./sync";
import { generateIrn, prepareReturn, reconcileItc, fileReturn } from "./store";

const DAY = 86_400_000;
const cr = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${Math.round(n).toLocaleString("en-IN")}`;
const days = (d?: string) => (d ? Math.round((Date.now() - new Date(d).getTime()) / DAY) : 0);
const taxOf = (r: { igst: number; cgst: number; sgst: number; cess?: number }) =>
  r.igst + r.cgst + r.sgst + (r.cess ?? 0);

export interface GstKpis {
  outputTax: number;
  inputCredit: number;
  netPayable: number;
  itcClaimable: number;
  itcAtRisk: number;
  irnCoverage: number;
  pendingIrn: number;
  failedIrn: number;
  dueSoon: number;
  overdueReturns: number;
  lateFeeExposure: number;
  ewbExpiring: number;
  unbilledToIrp: number;
  gstPayableGl: number;
}

export function gstKpis(s: GstState, f: FinanceState = finance.get()): GstKpis {
  const outputTax = s.returns.filter((r) => r.type === "GSTR-3B").reduce((a, r) => a + taxOf(r), 0);
  const inputCredit = s.returns.filter((r) => r.type === "GSTR-2B").reduce((a, r) => a + taxOf(r), 0);
  const itcClaimable = s.itc.reduce((a, i) => a + i.itcClaimable, 0);
  const itcAtRisk = s.itc
    .filter((i) => i.match !== "matched")
    .reduce((a, i) => a + Math.round(Math.max(i.bookValue - i.gstr2bValue, 0) * 0.18), 0);

  const total = s.eInvoices.filter((e) => e.status !== "cancelled").length;
  const generated = s.eInvoices.filter((e) => e.status === "generated").length;
  const openReturns = s.returns.filter((r) => r.status !== "filed" && r.type !== "GSTR-2B");
  const overdue = openReturns.filter((r) => days(r.dueDate) > 0);

  const irnCodes = new Set(s.eInvoices.map((e) => e.invoiceNo));
  const unbilledToIrp = f.arInvoices.filter(
    (i) => i.status !== "draft" && i.status !== "void" && !irnCodes.has(i.code),
  ).length;

  return {
    outputTax,
    inputCredit,
    netPayable: Math.max(0, outputTax - inputCredit),
    itcClaimable,
    itcAtRisk,
    irnCoverage: total ? Math.round((generated / total) * 100) : 100,
    pendingIrn: s.eInvoices.filter((e) => e.status === "pending").length,
    failedIrn: s.eInvoices.filter((e) => e.status === "failed").length,
    dueSoon: openReturns.filter((r) => days(r.dueDate) <= 0 && days(r.dueDate) > -10).length,
    overdueReturns: overdue.length,
    lateFeeExposure: overdue.reduce((a, r) => a + Math.min(days(r.dueDate) * 50, 5000), 0),
    ewbExpiring: s.eWayBills.filter((e) => e.status === "active" && days(e.validUpto) > -2).length,
    unbilledToIrp,
    gstPayableGl: f.accounts.find((a) => a.code === "2200")?.balance ?? 0,
  };
}

export interface ComplianceEvent {
  id: string;
  period: string;
  type: string;
  dueDate: string;
  daysLeft: number;
  status: string;
  amount: number;
}

/** Forward-looking filing calendar sorted by urgency. */
export function complianceCalendar(s: GstState): ComplianceEvent[] {
  return s.returns
    .filter((r) => r.type !== "GSTR-2B")
    .map((r) => ({
      id: r.id,
      period: r.period,
      type: r.type,
      dueDate: r.dueDate,
      daysLeft: -days(r.dueDate),
      status: r.status,
      amount: taxOf(r),
    }))
    .sort((a, b) => (a.status === "filed" ? 1 : 0) - (b.status === "filed" ? 1 : 0) || a.daysLeft - b.daysLeft);
}

export interface GstException {
  id: string;
  kind: "irn" | "itc" | "ewb" | "filing" | "ledger";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  amount?: number;
}

export function gstExceptions(s: GstState, f: FinanceState = finance.get()): GstException[] {
  const out: GstException[] = [];

  for (const e of s.eInvoices.filter((x) => x.status === "failed")) {
    out.push({
      id: `irn-${e.id}`,
      kind: "irn",
      severity: "high",
      title: `IRP rejected ${e.invoiceNo}`,
      detail: e.errorMsg ?? "The invoice was rejected by the IRP and carries no IRN.",
      amount: e.taxableValue,
    });
  }

  for (const i of s.itc.filter((x) => x.match !== "matched")) {
    const gap = Math.round(Math.abs(i.bookValue - i.gstr2bValue) * 0.18);
    out.push({
      id: `itc-${i.id}`,
      kind: "itc",
      severity: i.match === "missing-in-2b" ? "high" : "medium",
      title: `${i.supplier} — ${i.match.replace(/-/g, " ")}`,
      detail: `${i.invoiceNo}: books ${cr(i.bookValue)} vs GSTR-2B ${cr(i.gstr2bValue)}. Credit exposure ${cr(gap)}.`,
      amount: gap,
    });
  }

  for (const e of s.eWayBills.filter((x) => x.status === "active" && days(x.validUpto) > -2)) {
    out.push({
      id: `ewb-${e.id}`,
      kind: "ewb",
      severity: days(e.validUpto) >= 0 ? "high" : "medium",
      title: `e-Way bill ${e.ewbNo} ${days(e.validUpto) >= 0 ? "expired" : "expiring"}`,
      detail: `${e.invoiceNo} to ${e.toPlace} on ${e.vehicleNo} — valid up to ${e.validUpto}. Extend Part-B or the consignment moves without cover.`,
      amount: e.value,
    });
  }

  for (const r of s.returns.filter((x) => x.status !== "filed" && x.type !== "GSTR-2B" && days(x.dueDate) > 0)) {
    out.push({
      id: `late-${r.id}`,
      kind: "filing",
      severity: "high",
      title: `${r.type} ${r.period} is ${days(r.dueDate)} day(s) late`,
      detail: `Late fee accrues at ₹50/day plus 18% p.a. interest on ${cr(taxOf(r))} of tax.`,
      amount: taxOf(r),
    });
  }

  // GL vs return liability drift
  const k = gstKpis(s, f);
  const drift = Math.abs(k.gstPayableGl - k.netPayable);
  if (k.netPayable > 0 && drift > k.netPayable * 0.15) {
    out.push({
      id: "ledger-drift",
      kind: "ledger",
      severity: "medium",
      title: "GST payable in the GL differs from the return position",
      detail: `Ledger account 2200 shows ${cr(k.gstPayableGl)} while returns compute a net liability of ${cr(k.netPayable)}. Post the pending set-off journals to align.`,
      amount: drift,
    });
  }

  return out;
}

/** Applicable, one-click recommendations for the GST workspace. */
export function gstActions(s: GstState, f: FinanceState = finance.get()): AiAction[] {
  const a: AiAction[] = [];
  const k = gstKpis(s, f);

  if (k.unbilledToIrp > 0) {
    a.push({
      id: "sync-finance",
      title: `${k.unbilledToIrp} finance invoice(s) are not in the e-invoice queue`,
      detail: "Sales invoices posted in Finance have no matching IRP record. Sync pulls them in, refreshes ITC lines from vendor bills and recomputes every open return period.",
      severity: "high",
      impact: "Filing completeness",
      cta: "Sync from Finance",
      run: () => {
        const r = syncGstFromFinance();
        return `Synced ${r.eInvoices} invoice(s), ${r.itcLines} ITC line(s), ${r.periods} period(s)`;
      },
    });
  }

  if (k.pendingIrn + k.failedIrn > 0) {
    a.push({
      id: "bulk-irn",
      title: `Register ${k.pendingIrn + k.failedIrn} invoice(s) on the IRP`,
      detail: `IRN coverage is ${k.irnCoverage}%. Invoices without an IRN are not legally valid for movement or input credit at the customer end.`,
      severity: k.failedIrn ? "high" : "medium",
      impact: `${k.irnCoverage}% coverage`,
      cta: "Generate all IRNs",
      run: () => `${bulkGenerateIrn()} IRN(s) generated`,
    });
  }

  const failed = s.eInvoices.filter((e) => e.status === "failed");
  if (failed.length === 1) {
    const e = failed[0]!;
    a.push({
      id: `retry-${e.id}`,
      title: `Retry rejected invoice ${e.invoiceNo}`,
      detail: e.errorMsg ?? "IRP rejection — resubmit after correcting the payload.",
      severity: "high",
      cta: "Retry IRN",
      run: () => {
        generateIrn(e.id);
        return `IRN generated for ${e.invoiceNo}`;
      },
    });
  }

  const mismatches = s.itc.filter((i) => i.match !== "matched");
  if (mismatches.length) {
    a.push({
      id: "itc-reco",
      title: `${mismatches.length} ITC line(s) do not agree with GSTR-2B`,
      detail: `${cr(k.itcAtRisk)} of input credit is at risk. Re-running the match refreshes each line against the latest 2B values and recomputes claimable credit.`,
      severity: k.itcAtRisk > 100000 ? "high" : "medium",
      impact: `${cr(k.itcAtRisk)} at risk`,
      cta: "Reconcile ITC",
      run: () => `${reconcileItc()} exception(s) remaining after reconciliation`,
    });
  }

  const prep = s.returns.filter((r) => r.type !== "GSTR-2B" && (r.status === "not-started" || r.status === "in-progress"));
  if (prep.length) {
    a.push({
      id: "prepare-returns",
      title: `Prepare ${prep.length} open return(s)`,
      detail: `Periods ${[...new Set(prep.map((r) => r.period))].join(", ")} still sit in draft. Preparing locks the computed taxable value and readies them for filing.`,
      severity: "medium",
      impact: "Filing readiness",
      cta: "Prepare all",
      run: () => {
        prep.forEach((r) => prepareReturn(r.id));
        return `${prep.length} return(s) marked ready to file`;
      },
    });
  }

  const ready = s.returns.filter((r) => r.type === "GSTR-3B" && r.status === "ready");
  if (ready.length) {
    const r = ready[0]!;
    const np = netPayableFor(s, r.period);
    a.push({
      id: "file-3b",
      title: `File GSTR-3B ${r.period} and settle ${cr(np.net)}`,
      detail: `Output tax ${cr(np.output)} less eligible ITC ${cr(np.credit)}. Filing posts a GL journal debiting GST Payable (2200) and crediting Cash & Bank (1100).`,
      severity: "high",
      impact: `${cr(np.net)} cash outflow`,
      cta: "File & post",
      run: () => {
        fileReturn(r.id);
        const j = postGstSettlement(r.period);
        return j ? `Filed ${r.period} — journal ${j.code} posted for ${cr(j.amount)}` : `Filed ${r.period}`;
      },
    });
  }

  if (k.overdueReturns) {
    a.push({
      id: "overdue",
      title: `${k.overdueReturns} return(s) past their due date`,
      detail: `Estimated late-fee exposure of ${cr(k.lateFeeExposure)} plus 18% p.a. interest on unpaid tax. File the oldest period first to stop the clock.`,
      severity: "high",
      impact: cr(k.lateFeeExposure),
    });
  }

  if (k.ewbExpiring) {
    a.push({
      id: "ewb",
      title: `${k.ewbExpiring} e-way bill(s) expired or expiring`,
      detail: "Update Part-B with the current vehicle and extend validity before the consignment moves — expired cover attracts detention penalties.",
      severity: "high",
      impact: "Transit risk",
    });
  }

  const drift = gstExceptions(s, f).find((e) => e.kind === "ledger");
  if (drift) {
    a.push({
      id: "ledger",
      title: drift.title,
      detail: drift.detail,
      severity: "medium",
      impact: cr(drift.amount ?? 0),
    });
  }

  return a;
}
