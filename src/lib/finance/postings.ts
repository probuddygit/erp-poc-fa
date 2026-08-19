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
  | { type: "travel.approved"; travelId: string }
  /** Open purchase commitment changed (PR approved, PO raised/amended/closed). */
  | { type: "po.changed"; poCode?: string }
  /** Approved timesheets to be costed onto their projects. */
  | { type: "timesheet.approved"; timesheetId?: string }
  /** WBS / milestone progress moved — refresh % complete and the EV view. */
  | { type: "project.progress"; projectCode?: string }
  /** Inventory value moved from one project to another. */
  | {
      type: "inventory.reallocated";
      transferCode: string;
      fromProject: string;
      toProject: string;
      itemCode: string;
      qty: number;
      value: number;
    }
  /** Shop-floor material back-flush against a manufacturing order. */
  | { type: "mfg.issued"; orderCode: string; projectCode?: string; itemCode: string; value: number }
  /** Labour / sub-contract absorption reported on the shop floor. */
  | { type: "mfg.labour"; orderCode: string; projectCode?: string; workCenter: string; value: number; mins: number }
  /** Scrap loss reported at an operation. */
  | { type: "mfg.scrapped"; orderCode: string; projectCode?: string; itemCode: string; value: number; qty: number }
  /** Manufacturing order finished — finished goods received into stock. */
  | { type: "mfg.completed"; orderCode: string; projectCode?: string; itemCode: string; value: number; qty: number };

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

/* ------------------------------------------------- rollups & timesheets */

/** Standard productive hours per year used to derive an hourly cost from CTC. */
const ANNUAL_HOURS = 2080;

/**
 * Open purchase commitment per project: approved / open POs net of what has
 * already been received, plus approved requisitions not yet converted to a PO.
 */
async function commitmentByProject(): Promise<Record<string, number>> {
  const { procurement } = await import("@/lib/procurement/store");
  const p = procurement.get();
  const out: Record<string, number> = {};
  const add = (code: string | undefined, value: number) => {
    if (!code || value <= 0) return;
    out[code] = (out[code] ?? 0) + Math.round(value);
  };

  for (const po of p.pos) {
    if (["cancelled", "closed", "draft", "rejected"].includes(po.status)) continue;
    add(po.projectCode, Math.max(0, po.amount - (po.received ?? 0)));
  }

  const orderedRfqs = new Set(p.pos.map((o) => o.rfqCode).filter(Boolean));
  for (const pr of p.requisitions) {
    if (pr.status !== "approved") continue;
    const converted = p.rfqs.some(
      (r) => r.requisitionCode === pr.code && orderedRfqs.has(r.code),
    );
    if (converted) continue;
    add(pr.projectCode, pr.totalEst);
  }
  return out;
}

/** Weighted progress maintained by the Projects module, keyed by project code. */
async function progressByProject(): Promise<Record<string, number>> {
  const { projectsStore } = await import("@/lib/projects/store");
  const out: Record<string, number> = {};
  for (const p of projectsStore.get().projects) out[p.code] = Math.round(p.progress ?? 0);
  return out;
}

/**
 * Cost approved timesheets onto their projects: one posted labour journal per
 * project per week, idempotent on the reference so replays never double-post.
 */
async function postTimesheetLabour(): Promise<PostingResult> {
  const res = empty();
  const { hr } = await import("@/lib/hr/store");
  const h = hr.get();
  const rateFor = (empId: string) => {
    const emp = h.employees.find((e) => e.id === empId || e.code === empId);
    return emp?.ctc ? emp.ctc / ANNUAL_HOURS : 0;
  };

  const buckets = new Map<string, { projectCode: string; weekOf: string; cost: number; hours: number }>();
  for (const t of h.timesheets) {
    if (t.status !== "approved" || !t.projectCode) continue;
    const hours = t.mon + t.tue + t.wed + t.thu + t.fri + t.sat + t.sun;
    if (hours <= 0) continue;
    const key = `${t.projectCode}|${t.weekOf}`;
    const b = buckets.get(key) ?? { projectCode: t.projectCode, weekOf: t.weekOf, cost: 0, hours: 0 };
    b.cost += hours * rateFor(t.empId);
    b.hours += hours;
    buckets.set(key, b);
  }

  finance.update((s) => {
    for (const b of buckets.values()) {
      const amount = Math.round(b.cost);
      if (amount <= 0) continue;
      const ref = `LABOUR-${b.projectCode}-${b.weekOf.slice(0, 10)}`;
      if (s.journals.some((j) => j.reference === ref)) continue;
      const code = nextCode("JV-", s.journals.map((j) => j.code));
      s.journals = [
        {
          id: crypto.randomUUID(),
          code,
          date: b.weekOf,
          reference: ref,
          narration: `Timesheet labour — ${b.projectCode} week of ${b.weekOf.slice(0, 10)} (${b.hours} h)`,
          status: "posted",
          source: "payroll",
          createdBy: "Timesheet Costing",
          lines: [
            {
              accountCode: "6110",
              debit: amount,
              credit: 0,
              projectCode: b.projectCode,
              memo: `${b.hours} h @ standard cost`,
            },
            { accountCode: "2120", debit: 0, credit: amount, memo: "Labour cost accrual" },
          ],
        },
        ...s.journals,
      ];
      res.created.push(code);
      res.messages.push(`Labour journal ${code} posted for ${b.projectCode}`);
    }
  });
  return res;
}

/**
 * Refresh the project cost ledger with live commitment and progress.
 * Cheap and idempotent — safe to fire from any upstream change.
 */
export async function refreshProjectRollups(): Promise<PostingResult> {
  const res = empty();
  const [committed, progress] = await Promise.all([commitmentByProject(), progressByProject()]);
  const codes = new Set([...Object.keys(committed), ...Object.keys(progress)]);
  const overlay: Record<string, { committed?: number; percentComplete?: number }> = {};
  for (const code of codes) {
    overlay[code] = {
      committed: committed[code] ?? 0,
      ...(progress[code] !== undefined ? { percentComplete: progress[code] } : {}),
    };
  }
  finance.update((s) => recomputeProjectCosts(s, overlay));
  return res;
}

/**
 * Inventory value moved between projects: credit the source project's material
 * cost, debit the destination's, and shift the same value on both budgets.
 */
async function onReallocation(
  event: Extract<FinanceEvent, { type: "inventory.reallocated" }>,
): Promise<PostingResult> {
  const res = empty();
  if (!event.value || event.fromProject === event.toProject) return res;

  finance.update((s) => {
    const ref = `RALLOC-${event.transferCode}`;
    if (s.journals.some((j) => j.reference === ref)) return;
    const code = nextCode("JV-", s.journals.map((j) => j.code));
    s.journals = [
      {
        id: crypto.randomUUID(),
        code,
        date: new Date().toISOString().slice(0, 10),
        reference: ref,
        narration: `Inventory reallocation ${event.transferCode} — ${event.itemCode} ${event.qty} nos from ${event.fromProject} to ${event.toProject}`,
        status: "posted",
        source: "system",
        createdBy: "Inventory Sync",
        lines: [
          {
            accountCode: "5000",
            debit: event.value,
            credit: 0,
            projectCode: event.toProject,
            memo: `Material received from ${event.fromProject}`,
          },
          {
            accountCode: "5000",
            debit: 0,
            credit: event.value,
            projectCode: event.fromProject,
            memo: `Material transferred to ${event.toProject}`,
          },
        ],
      },
      ...s.journals,
    ];
    res.created.push(code);
    res.messages.push(
      `Cost transfer ${code} posted — ${event.fromProject} → ${event.toProject}`,
    );
    recomputeProjectCosts(s);
  });

  const { adjustProjectMaterialCost } = await import("@/lib/projects/store");
  adjustProjectMaterialCost(event.fromProject, -event.value);
  adjustProjectMaterialCost(event.toProject, event.value);

  await refreshProjectRollups();
  return res;
}

/* --------------------------------------------------------- manufacturing */

/**
 * Shop-floor postings. Material back-flush and scrap hit project material
 * cost; labour and sub-contract time are absorbed against accrued wages;
 * finished-goods receipt capitalises the order value into inventory.
 */
async function onMfg(
  event: Extract<FinanceEvent, { type: "mfg.issued" | "mfg.labour" | "mfg.scrapped" | "mfg.completed" }>,
): Promise<PostingResult> {
  const res = empty();
  if (!event.value) return res;

  const narration =
    event.type === "mfg.issued"
      ? `Material back-flush — ${event.orderCode}`
      : event.type === "mfg.labour"
        ? `Labour / conversion absorbed — ${event.orderCode} (${event.workCenter})`
        : event.type === "mfg.scrapped"
          ? `Scrap loss — ${event.orderCode}`
          : `Finished goods received — ${event.orderCode}`;

  const lines =
    event.type === "mfg.issued" || event.type === "mfg.scrapped"
      ? [
          { accountCode: "5000", debit: event.value, credit: 0, projectCode: event.projectCode, memo: narration },
          { accountCode: "1300", debit: 0, credit: event.value, memo: "Inventory consumed" },
        ]
      : event.type === "mfg.labour"
        ? [
            { accountCode: "6100", debit: event.value, credit: 0, projectCode: event.projectCode, memo: narration },
            { accountCode: "2100", debit: 0, credit: event.value, memo: "Conversion cost accrual" },
          ]
        : [
            { accountCode: "1300", debit: event.value, credit: 0, projectCode: event.projectCode, memo: "Finished goods" },
            { accountCode: "5000", debit: 0, credit: event.value, projectCode: event.projectCode, memo: `WIP relieved — ${event.orderCode}` },
          ];

  finance.update((s) => {
    const ref = `${event.type.toUpperCase()}-${event.orderCode}-${Math.round(event.value)}`;
    if (s.journals.some((j) => j.reference === ref)) return;
    const code = nextCode("JV-", s.journals.map((j) => j.code));
    s.journals = [
      {
        id: crypto.randomUUID(),
        code,
        date: new Date().toISOString().slice(0, 10),
        reference: ref,
        narration,
        status: "posted",
        source: "system",
        createdBy: "Manufacturing Sync",
        lines,
      },
      ...s.journals,
    ];
    res.created.push(code);
    res.messages.push(`${narration} — journal ${code} posted`);
    recomputeProjectCosts(s);
  });

  await refreshProjectRollups();
  return res;
}

/* ------------------------------------------------------------ dispatcher */

/** Fire a business event at Finance. Safe to call repeatedly. */
export async function postEvent(event: FinanceEvent): Promise<PostingResult> {
  try {
    switch (event.type) {
      case "grn.invoiced": {
        const r = await onGrn(event.grnCode, false);
        await refreshProjectRollups();
        return r;
      }
      case "po.changed":
      case "project.progress":
        return await refreshProjectRollups();
      case "timesheet.approved": {
        const r = await postTimesheetLabour();
        await refreshProjectRollups();
        return r;
      }
      case "asset.received":
        return await onGrn(event.grnCode, true);
      case "payroll.released":
        return await onPayroll(event.runId);
      case "project.created": {
        const r = await onProject(event.projectCode);
        await refreshProjectRollups();
        return r;
      }
      case "so.approved":
        return await onOrderApproved(event.oaId);
      case "milestone.achieved": {
        const r = await onMilestone(event.milestoneId);
        await refreshProjectRollups();
        return r;
      }
      case "mfg.issued":
      case "mfg.labour":
      case "mfg.scrapped":
      case "mfg.completed":
        return await onMfg(event);
      case "inventory.reallocated":
        return await onReallocation(event);
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

  const labour = await postTimesheetLabour();
  res.payroll += labour.created.length;
  res.messages.push(...labour.messages);

  await refreshProjectRollups();
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
