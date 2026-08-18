/**
 * Project financial closure.
 *
 * Runs a cross-module validation checklist (Procurement, Inventory, CRM,
 * Finance), freezes a closing snapshot and flips the posting guard in
 * `./store` so no further documents can hit a closed project unless they are
 * routed through an approved adjustment.
 */
import { finance } from "./store";
import { currentPeriod } from "./wip";
import { projectBalanceSheet, projectPnl } from "./project-pnl";
import { procurement } from "@/lib/procurement/store";
import { inventory } from "@/lib/inventory/store";
import { crm } from "@/lib/crm/store";
import type { ClosureCheck, FinanceState, ProjectClosure } from "./types";

const OPEN_PO = ["draft", "pending", "approved", "issued", "acknowledged", "partial"];

export function buildClosureChecks(projectCode: string): ClosureCheck[] {
  const s = finance.get();
  const proc = procurement.get();
  const inv = inventory.get();
  const crmState = crm.get();
  const checks: ClosureCheck[] = [];

  const openPos = proc.pos.filter((p) => p.projectCode === projectCode && OPEN_PO.includes(p.status));
  checks.push({
    key: "open-po",
    label: "Open purchase orders",
    status: openPos.length ? "blocker" : "pass",
    detail: openPos.length ? `${openPos.length} PO(s) still open — short-close or receive them` : "No open POs against this project",
    count: openPos.length,
    value: openPos.reduce((t, p) => t + p.amount, 0),
  });

  const openPrs = proc.requisitions.filter((r) => r.projectCode === projectCode && !["closed", "rejected", "cancelled", "converted"].includes(r.status));
  checks.push({
    key: "open-pr",
    label: "Open purchase requisitions",
    status: openPrs.length ? "warning" : "pass",
    detail: openPrs.length ? `${openPrs.length} requisition(s) pending action` : "No pending requisitions",
    count: openPrs.length,
    value: openPrs.reduce((t, r) => t + r.totalEst, 0),
  });

  const unpaidBills = s.apBills.filter((b) => b.projectCode === projectCode && b.status !== "paid");
  checks.push({
    key: "ap",
    label: "Unpaid vendor bills",
    status: unpaidBills.length ? "blocker" : "pass",
    detail: unpaidBills.length ? `${unpaidBills.length} bill(s) awaiting payment or approval` : "All vendor bills settled",
    count: unpaidBills.length,
    value: unpaidBills.reduce((t, b) => t + Math.max(0, b.amount + b.gst - b.tds - b.paid), 0),
  });

  const openAr = s.arInvoices.filter((i) => i.projectCode === projectCode && !["paid", "void"].includes(i.status));
  checks.push({
    key: "ar",
    label: "Outstanding receivables",
    status: openAr.length ? "blocker" : "pass",
    detail: openAr.length ? `${openAr.length} invoice(s) not fully collected` : "All customer invoices collected",
    count: openAr.length,
    value: openAr.reduce((t, i) => t + Math.max(0, i.amount + i.gst - i.tds - i.received), 0),
  });

  const bs = projectBalanceSheet(s, projectCode);
  checks.push({
    key: "wip",
    label: "WIP / unbilled revenue",
    status: (bs?.unbilledWip ?? 0) > 0 ? "blocker" : "pass",
    detail: (bs?.unbilledWip ?? 0) > 0 ? "Unbilled WIP must be billed or written off before closure" : "WIP fully released",
    count: (bs?.unbilledWip ?? 0) > 0 ? 1 : 0,
    value: bs?.unbilledWip ?? 0,
  });

  checks.push({
    key: "advance",
    label: "Customer advances",
    status: (bs?.customerAdvances ?? 0) > 0 ? "warning" : "pass",
    detail: (bs?.customerAdvances ?? 0) > 0 ? "Advances still to be adjusted against billing" : "No unadjusted advances",
    count: (bs?.customerAdvances ?? 0) > 0 ? 1 : 0,
    value: bs?.customerAdvances ?? 0,
  });

  const stock = inv.stock.filter((r) => r.projectCode === projectCode && r.qty > 0);
  checks.push({
    key: "stock",
    label: "Project-tagged stock on hand",
    status: stock.length ? "warning" : "pass",
    detail: stock.length ? `${stock.length} stock row(s) reserved for this project` : "No reserved project stock",
    count: stock.length,
    value: stock.reduce((t, r) => t + r.value, 0),
  });

  const drafts = s.journals.filter((j) => j.status === "draft" && j.lines.some((l) => l.projectCode === projectCode));
  checks.push({
    key: "journals",
    label: "Draft journals",
    status: drafts.length ? "blocker" : "pass",
    detail: drafts.length ? `${drafts.length} unposted journal(s) reference this project` : "No unposted journals",
    count: drafts.length,
  });

  const pendingSo = crmState.salesOrders.filter((o) => o.projectCode === projectCode && !["closed", "completed", "cancelled"].includes(o.status));
  checks.push({
    key: "so",
    label: "Open sales orders",
    status: pendingSo.length ? "warning" : "pass",
    detail: pendingSo.length ? `${pendingSo.length} sales order(s) still open in CRM` : "Revenue lifecycle documents closed",
    count: pendingSo.length,
    value: pendingSo.reduce((t, o) => t + o.value, 0),
  });

  const pnl = projectPnl(s, projectCode);
  checks.push({
    key: "margin",
    label: "Final margin review",
    status: (pnl?.netMarginPct ?? 0) < 0 ? "warning" : "pass",
    detail: pnl ? `Net margin ${pnl.netMarginPct}% on recognised revenue` : "No cost sheet found",
    count: 0,
    value: pnl?.netMargin ?? 0,
  });

  return checks;
}

export function closureFor(s: FinanceState, projectCode: string): ProjectClosure | undefined {
  return s.closures.find((c) => c.projectCode === projectCode);
}

function upsertClosure(projectCode: string, patch: Partial<ProjectClosure>) {
  finance.update((s) => {
    const cost = s.projectCosts.find((c) => c.projectCode === projectCode);
    const existing = s.closures.find((c) => c.projectCode === projectCode);
    const base: ProjectClosure = existing ?? {
      id: crypto.randomUUID(),
      projectCode,
      projectName: cost?.projectName ?? projectCode,
      status: "open",
      checks: [],
      adjustments: [],
    };
    const next = { ...base, ...patch };
    s.closures = existing ? s.closures.map((c) => (c.id === base.id ? next : c)) : [next, ...s.closures];
  });
}

export function refreshClosureChecks(projectCode: string): ClosureCheck[] {
  const checks = buildClosureChecks(projectCode);
  upsertClosure(projectCode, { checks });
  return checks;
}

export function requestClosure(projectCode: string, by: string, notes?: string) {
  const checks = buildClosureChecks(projectCode);
  upsertClosure(projectCode, {
    checks,
    notes,
    status: "closure-requested",
    requestedBy: by,
    requestedAt: new Date().toISOString(),
  });
  return checks;
}

export function blockers(checks: ClosureCheck[]) {
  return checks.filter((c) => c.status === "blocker");
}

/** Freeze the project. Returns the blocking checks when closure is refused. */
export function closeProject(projectCode: string, by: string, force = false): { closed: boolean; blockers: ClosureCheck[] } {
  const checks = buildClosureChecks(projectCode);
  const blocking = blockers(checks);
  if (blocking.length && !force) return { closed: false, blockers: blocking };

  const s = finance.get();
  const pnl = projectPnl(s, projectCode);
  const bs = projectBalanceSheet(s, projectCode);
  upsertClosure(projectCode, {
    checks,
    status: "closed",
    closedBy: by,
    closedAt: new Date().toISOString(),
    snapshot: pnl
      ? {
          contractValue: pnl.contractValue,
          billed: pnl.billed,
          collected: pnl.collected,
          costIncurred: pnl.totalCost,
          wip: bs?.unbilledWip ?? 0,
          unbilledRevenue: bs?.unbilledWip ?? 0,
          margin: pnl.netMargin,
          marginPct: pnl.netMarginPct,
        }
      : undefined,
  });
  return { closed: true, blockers: [] };
}

export function reopenProject(projectCode: string) {
  upsertClosure(projectCode, { status: "open", closedAt: undefined, closedBy: undefined });
}

export function requestAdjustment(
  projectCode: string,
  payload: { reason: string; amount: number; accountCode: string; requestedBy: string },
) {
  finance.update((s) => {
    s.closures = s.closures.map((c) =>
      c.projectCode === projectCode
        ? {
            ...c,
            adjustments: [
              {
                id: crypto.randomUUID(),
                projectCode,
                reason: payload.reason,
                amount: payload.amount,
                accountCode: payload.accountCode,
                requestedBy: payload.requestedBy,
                requestedAt: new Date().toISOString(),
                status: "pending" as const,
              },
              ...c.adjustments,
            ],
          }
        : c,
    );
  });
}

/** Approving an adjustment posts it as a journal, bypassing the closure guard. */
export function decideAdjustment(projectCode: string, id: string, approve: boolean, approver: string) {
  const adj = closureFor(finance.get(), projectCode)?.adjustments.find((a) => a.id === id);
  finance.update((s) => {
    s.closures = s.closures.map((c) =>
      c.projectCode === projectCode
        ? {
            ...c,
            adjustments: c.adjustments.map((a) =>
              a.id === id
                ? { ...a, status: approve ? ("approved" as const) : ("rejected" as const), approver, decidedAt: new Date().toISOString() }
                : a,
            ),
          }
        : c,
    );
  });
  if (approve && adj) {
    finance.update((s) => {
      const code = `JV-ADJ-${String(s.journals.length + 1).padStart(4, "0")}`;
      s.journals = [
        {
          id: crypto.randomUUID(),
          code,
          date: new Date().toISOString(),
          reference: `CLOSE-ADJ-${projectCode}`,
          narration: `Post-closure adjustment — ${adj.reason}`,
          status: "posted",
          source: "manual",
          createdBy: approver,
          lines: [
            { accountCode: adj.accountCode, debit: adj.amount, credit: 0, projectCode, memo: adj.reason },
            { accountCode: "2100", debit: 0, credit: adj.amount, projectCode, memo: "Closure adjustment" },
          ],
        },
        ...s.journals,
      ];
    });
  }
}

export function closureSummary(s: FinanceState) {
  const closed = s.closures.filter((c) => c.status === "closed").length;
  const requested = s.closures.filter((c) => c.status === "closure-requested").length;
  const pendingAdj = s.closures.flatMap((c) => c.adjustments).filter((a) => a.status === "pending").length;
  return { closed, requested, pendingAdj, total: s.projectCosts.length };
}
