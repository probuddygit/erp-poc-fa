/**
 * Event-driven finance posting engine.
 *
 * Upstream modules fire a typed business event at the moment the action
 * happens; each handler creates the matching finance records exactly once.
 * Idempotency is keyed on the source document code, so replays (and the
 * catch-up reconcile) never double-post.
 */

import {
  apStatusFor,
  arStatusFor,
  finance,
  nextCode,
  recomputeProjectCosts,
} from "./store";
import type { APBill, ARInvoice, FinanceState } from "./types";

export type FinanceEvent =
  | { type: "grn.invoiced"; grnCode: string }
  | { type: "asset.received"; grnCode: string }
  | { type: "payroll.released"; runId: string }
  | { type: "project.created"; projectCode: string }
  | { type: "so.approved"; oaId: string }
  | { type: "milestone.achieved"; milestoneId: string }
  | { type: "travel.approved"; travelId: string };

export interface PostingResult {
  created: string[];
  messages: string[];
}

const DAY = 86_400_000;
const empty = (): PostingResult => ({ created: [], messages: [] });

const plusDays = (from: string | undefined, days: number) =>
  new Date((from ? new Date(from).getTime() : Date.now()) + days * DAY).toISOString();

/* ---------------------------------------------------------------- helpers */

function billFromGrn(
  s: FinanceState,
  g: {
    code: string;
    poCode?: string;
    vendorName: string;
    receivedAt: string;
    amount: number;
    invoiceMatch?: string;
  },
  projectCode: string | undefined,
  costType: APBill["costType"],
): APBill | null {
  if (g.amount <= 0) return null;
  if (s.apBills.some((b) => b.grnCode === g.code)) return null;

  const bill: APBill = {
    id: crypto.randomUUID(),
    code: nextCode("AP-BILL-", s.apBills.map((b) => b.code)),
    vendorName: g.vendorName,
    poCode: g.poCode,
    grnCode: g.code,
    projectCode,
    costType,
    receivedAt: g.receivedAt,
    dueAt: plusDays(g.receivedAt, 30),
    amount: g.amount,
    gst: Math.round(g.amount * 0.18),
    tds: Math.round(g.amount * 0.001),
    paid: 0,
    matchStatus:
      g.invoiceMatch === "matched" || g.invoiceMatch === "3-way-matched" ? "matched" : "price-var",
    status: "pending",
  };
  bill.status = apStatusFor(bill);
  s.apBills = [bill, ...s.apBills];
  return bill;
}

function raiseInvoice(
  s: FinanceState,
  input: {
    customerName: string;
    projectCode?: string;
    amount: number;
    kind: ARInvoice["billingKind"];
    sourceOaId?: string;
    sourceOaCode?: string;
    sourceMilestoneId?: string;
    termsDays?: number;
  },
): ARInvoice | null {
  if (input.amount <= 0) return null;
  if (
    input.sourceMilestoneId &&
    s.arInvoices.some((i) => i.sourceMilestoneId === input.sourceMilestoneId)
  )
    return null;
  if (
    input.kind === "advance" &&
    input.sourceOaId &&
    s.arInvoices.some((i) => i.sourceOaId === input.sourceOaId && i.billingKind === "advance")
  )
    return null;

  const amount = Math.round(input.amount);
  const inv: ARInvoice = {
    id: crypto.randomUUID(),
    code: nextCode("AR-INV-", s.arInvoices.map((i) => i.code)),
    customerName: input.customerName,
    projectCode: input.projectCode,
    issuedAt: new Date().toISOString(),
    dueAt: plusDays(undefined, input.termsDays ?? 45),
    amount,
    gst: Math.round(amount * 0.18),
    tds: Math.round(amount * 0.01),
    received: 0,
    status: "draft",
    sourceOaId: input.sourceOaId,
    sourceOaCode: input.sourceOaCode,
    sourceMilestoneId: input.sourceMilestoneId,
    billingKind: input.kind,
  };
  inv.status = arStatusFor(inv);
  s.arInvoices = [inv, ...s.arInvoices];
  return inv;
}

function openProjectLedger(
  s: FinanceState,
  p: { code: string; name: string; customerName: string; value: number; budget: number; progress: number },
) {
  if (s.projectCosts.some((c) => c.projectCode === p.code)) return false;
  s.projectCosts = [
    {
      projectCode: p.code,
      projectName: p.name,
      customer: p.customerName,
      contractValue: p.value,
      billed: 0,
      collected: 0,
      materialCost: 0,
      labourCost: 0,
      overheadCost: 0,
      subContractCost: 0,
      committed: 0,
      wip: 0,
      percentComplete: p.progress ?? 0,
      forecastCost: p.budget,
      status: "on-track",
    },
    ...s.projectCosts,
  ];
  return true;
}

/** Advance / mobilisation percentage implied by the order's payment terms. */
export function advancePctFromTerms(terms?: string): number {
  if (!terms) return 0;
  const m = terms.match(/(\d{1,3})\s*%\s*(advance|mobilis|mobiliz|along with|with order|on order)/i);
  if (m?.[1]) return Number(m[1]);
  return /advance|mobilis|mobiliz/i.test(terms) ? 20 : 0;
}

/* ------------------------------------------------------------- handlers */

async function onGrn(grnCode: string, capexOnly: boolean): Promise<PostingResult> {
  const res = empty();
  const { procurement } = await import("@/lib/procurement/store");
  const proc = procurement.get();
  const g = proc.grns.find((x) => x.code === grnCode || x.id === grnCode);
  if (!g || !g.invoiceNo) return res;

  const po = proc.pos.find((p) => p.code === g.poCode);
  const vendor = proc.vendors.find((v) => v.name === g.vendorName);
  const isCapex = vendor?.category === "Capital Goods";
  if (capexOnly !== isCapex) return res;

  const costType: APBill["costType"] = isCapex
    ? "capex"
    : vendor?.category === "Services"
      ? "subcontract"
      : vendor?.category === "Consumables"
        ? "overhead"
        : "material";

  finance.update((s) => {
    const bill = billFromGrn(s, g, po?.projectCode, costType);
    if (bill) {
      res.created.push(bill.code);
      res.messages.push(`AP bill ${bill.code} booked from GRN ${g.code}`);
    }

    if (isCapex && !s.fixedAssets.some((a) => a.code.endsWith(g.code.replace(/\D/g, "")))) {
      const code = nextCode("FA-", s.fixedAssets.map((a) => a.code));
      s.fixedAssets = [
        {
          id: crypto.randomUUID(),
          code,
          name: `${g.vendorName} — ${po?.lines?.[0]?.description ?? "capital equipment"}`,
          category: "plant-machinery",
          projectCode: po?.projectCode,
          acquiredAt: g.receivedAt,
          cost: g.amount,
          salvage: Math.round(g.amount * 0.05),
          usefulLifeYears: 10,
          accumulatedDepreciation: 0,
          method: "SLM",
          location: "Plant — Pune",
          status: "active",
        },
        ...s.fixedAssets,
      ];
      res.created.push(code);
      res.messages.push(`Fixed asset ${code} capitalised from GRN ${g.code}`);
    }
    recomputeProjectCosts(s);
  });
  return res;
}

async function onPayroll(runId: string): Promise<PostingResult> {
  const res = empty();
  const { hr } = await import("@/lib/hr/store");
  const run = hr.get().payrollRuns.find((r) => r.id === runId || r.code === runId);
  if (!run || run.status === "draft") return res;

  finance.update((s) => {
    const ref = `PAYROLL-${run.code}`;
    if (s.journals.some((j) => j.reference === ref)) return;
    const code = nextCode("JV-", s.journals.map((j) => j.code));
    s.journals = [
      {
        id: crypto.randomUUID(),
        code,
        date: run.runOn,
        reference: ref,
        narration: `Payroll posting — ${run.period} (${run.employees} employees)`,
        status: "posted",
        source: "payroll",
        createdBy: "Workforce Sync",
        lines: [
          { accountCode: "6100", debit: run.gross, credit: 0, memo: "Gross salaries" },
          { accountCode: "2100", debit: 0, credit: run.net, memo: "Net payable" },
          {
            accountCode: "2210",
            debit: 0,
            credit: Math.max(0, run.gross - run.net),
            memo: "Statutory deductions & TDS",
          },
        ],
      },
      ...s.journals,
    ];
    res.created.push(code);
    res.messages.push(`Payroll journal ${code} posted for ${run.period}`);
  });
  return res;
}

async function onProject(projectCode: string): Promise<PostingResult> {
  const res = empty();
  const { projectsStore } = await import("@/lib/projects/store");
  const p = projectsStore.get().projects.find((x) => x.code === projectCode || x.id === projectCode);
  if (!p) return res;

  finance.update((s) => {
    if (openProjectLedger(s, p)) {
      res.created.push(p.code);
      res.messages.push(`Project cost ledger opened for ${p.code}`);
    }
    recomputeProjectCosts(s);
  });
  return res;
}

async function onOrderApproved(oaId: string): Promise<PostingResult> {
  const res = empty();
  const [{ crm }, { projectsStore }] = await Promise.all([
    import("@/lib/crm/store"),
    import("@/lib/projects/store"),
  ]);
  const c = crm.get();
  const oa = c.oas.find((o) => o.id === oaId || o.code === oaId);
  if (!oa) return res;

  const quote = c.quotations.find((q) => q.id === oa.quotationId);
  const project = projectsStore.get().projects.find((p) => p.oaId === oa.id);
  const pct = advancePctFromTerms(quote?.paymentTerms);
  if (!pct) return res;

  finance.update((s) => {
    const inv = raiseInvoice(s, {
      customerName: oa.customerName,
      projectCode: project?.code,
      amount: (oa.value * pct) / 100,
      kind: "advance",
      sourceOaId: oa.id,
      sourceOaCode: oa.code,
    });
    if (inv) {
      res.created.push(inv.code);
      res.messages.push(`Advance invoice ${inv.code} (${pct}%) raised against ${oa.code}`);
    }
  });
  return res;
}

async function onMilestone(milestoneId: string): Promise<PostingResult> {
  const res = empty();
  const [{ projectsStore }, { crm }] = await Promise.all([
    import("@/lib/projects/store"),
    import("@/lib/crm/store"),
  ]);
  const prj = projectsStore.get();
  const m = prj.milestones.find((x) => x.id === milestoneId);
  if (!m || m.status !== "achieved" || !m.billing) return res;
  const project = prj.projects.find((p) => p.id === m.projectId);
  if (!project) return res;
  const oa = crm.get().oas.find((o) => o.id === project.oaId);

  finance.update((s) => {
    const inv = raiseInvoice(s, {
      customerName: project.customerName,
      projectCode: project.code,
      amount: m.billing ?? 0,
      kind: "milestone",
      sourceMilestoneId: m.id,
      sourceOaId: oa?.id,
      sourceOaCode: oa?.code,
    });
    if (inv) {
      res.created.push(inv.code);
      res.messages.push(`Milestone invoice ${inv.code} raised for “${m.name}”`);
    }
    recomputeProjectCosts(s);
  });
  return res;
}

async function onTravel(travelId: string): Promise<PostingResult> {
  const res = empty();
  const { workforce } = await import("@/lib/workforce/store");
  const w = workforce.get() as unknown as Record<string, Array<Record<string, unknown>>>;
  const t = (w["travelRequests"] ?? []).find((x) => x["id"] === travelId || x["code"] === travelId);
  if (!t) return res;

  const amount = Number(t["estimatedCost"] ?? 0);
  const ref = String(t["code"] ?? travelId);
  if (amount <= 0) return res;

  finance.update((s) => {
    if (s.apBills.some((b) => b.grnCode === ref)) return;
    const bill: APBill = {
      id: crypto.randomUUID(),
      code: nextCode("AP-BILL-", s.apBills.map((b) => b.code)),
      vendorName: "Travel Desk — corporate bookings",
      grnCode: ref,
      costType: "overhead",
      receivedAt: new Date().toISOString(),
      dueAt: plusDays(undefined, 15),
      amount,
      gst: Math.round(amount * 0.05),
      tds: 0,
      paid: 0,
      matchStatus: "unmatched",
      status: "pending",
    };
    bill.status = apStatusFor(bill);
    s.apBills = [bill, ...s.apBills];
    res.created.push(bill.code);
    res.messages.push(`Travel accrual ${bill.code} booked for ${ref}`);
  });
  return res;
}

/* ------------------------------------------------------------ dispatcher */

/** Fire a business event at Finance. Safe to call repeatedly. */
export async function postEvent(event: FinanceEvent): Promise<PostingResult> {
  try {
    switch (event.type) {
      case "grn.invoiced":
        return await onGrn(event.grnCode, false);
      case "asset.received":
        return await onGrn(event.grnCode, true);
      case "payroll.released":
        return await onPayroll(event.runId);
      case "project.created":
        return await onProject(event.projectCode);
      case "so.approved":
        return await onOrderApproved(event.oaId);
      case "milestone.achieved":
        return await onMilestone(event.milestoneId);
      case "travel.approved":
        return await onTravel(event.travelId);
      default:
        return empty();
    }
  } catch (err) {
    console.error("[finance] posting failed", event, err);
    return empty();
  }
}

/** Fire and forget — used from UI/store call sites that must not block. */
export function emitFinanceEvent(event: FinanceEvent) {
  void postEvent(event);
}

/* -------------------------------------------------------------- reconcile */

export interface SyncResult {
  bills: number;
  invoices: number;
  payroll: number;
  projects: number;
  messages: string[];
}

/** Replay every upstream document; the safety net behind the live events. */
export async function reconcileFinancePostings(): Promise<SyncResult> {
  const res: SyncResult = { bills: 0, invoices: 0, payroll: 0, projects: 0, messages: [] };
  const [{ procurement }, { hr }, { projectsStore }, { crm }] = await Promise.all([
    import("@/lib/procurement/store"),
    import("@/lib/hr/store"),
    import("@/lib/projects/store"),
    import("@/lib/crm/store"),
  ]);

  for (const p of projectsStore.get().projects) {
    const r = await postEvent({ type: "project.created", projectCode: p.code });
    res.projects += r.created.length;
    res.messages.push(...r.messages);
  }

  for (const g of procurement.get().grns) {
    if (!g.invoiceNo) continue;
    for (const type of ["grn.invoiced", "asset.received"] as const) {
      const r = await postEvent({ type, grnCode: g.code });
      res.bills += r.created.length;
      res.messages.push(...r.messages);
    }
  }

  for (const run of hr.get().payrollRuns) {
    if (run.status === "draft") continue;
    const r = await postEvent({ type: "payroll.released", runId: run.id });
    res.payroll += r.created.length;
    res.messages.push(...r.messages);
  }

  for (const oa of crm.get().oas.filter((o) => o.status === "approved")) {
    const r = await postEvent({ type: "so.approved", oaId: oa.id });
    res.invoices += r.created.length;
    res.messages.push(...r.messages);
  }

  for (const m of projectsStore.get().milestones.filter((x) => x.status === "achieved")) {
    const r = await postEvent({ type: "milestone.achieved", milestoneId: m.id });
    res.invoices += r.created.length;
    res.messages.push(...r.messages);
  }

  finance.update((s) => recomputeProjectCosts(s));
  return res;
}

/* ------------------------------------------------------------ billing plan */

export interface BillingPlanRow {
  milestoneId: string;
  name: string;
  due: string;
  status: string;
  amount: number;
  invoiceCode?: string;
  invoiceStatus?: string;
}

/**
 * Billing plan for a project, derived from its milestones and the AR invoices
 * already raised against them. No duplicated schedule to keep in step.
 */
export function billingPlan(
  projectCode: string,
  milestones: Array<{ id: string; name: string; due: string; status: string; billing?: number }>,
  invoices: ARInvoice[],
): BillingPlanRow[] {
  void projectCode;
  return milestones
    .filter((m) => (m.billing ?? 0) > 0)
    .map((m) => {
      const inv = invoices.find((i) => i.sourceMilestoneId === m.id);
      return {
        milestoneId: m.id,
        name: m.name,
        due: m.due,
        status: m.status,
        amount: m.billing ?? 0,
        invoiceCode: inv?.code,
        invoiceStatus: inv?.status,
      };
    });
}
