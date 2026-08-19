/**
 * Production planning & finite-capacity scheduling.
 *
 * Demand arrives from Engineering (MBOM work orders) and Projects (delivery
 * milestones). The planner nets it against work-center capacity, sequences the
 * open shop load and can firm planned orders in one click.
 */
import { mfg, upsertMfg, explodeRouting, nextCode } from "./store";
import type { MfgOrder, MfgState } from "./types";
import { plmStore } from "@/lib/plm/store";
import { projectsStore } from "@/lib/projects/store";
import { bomAvailability } from "@/lib/plm/mrp";

const DAY = 86_400_000;
const dayStr = (d: Date) => d.toISOString().slice(0, 10);

export interface CapacityLine {
  workCenterCode: string;
  name: string;
  capacityHrs: number;
  loadHrs: number;
  utilisationPct: number;
  orders: number;
}

/** Load per work center across the horizon, from every open order operation. */
export function capacityLoad(s: MfgState, horizonDays = 14): CapacityLine[] {
  const openOrders = s.orders.filter((o) => ["planned", "released", "in-progress"].includes(o.status));
  const openIds = new Set(openOrders.map((o) => o.id));

  return s.workCenters.filter((w) => w.active).map((w) => {
    const ops = s.operations.filter(
      (o) => o.workCenterCode === w.code && openIds.has(o.orderId) && o.status !== "done",
    );
    const loadHrs = ops.reduce((a, o) => a + Math.max(0, o.plannedMins - o.actualMins) / 60, 0);
    const workingDays = Math.round((horizonDays / 7) * 6);
    const capacityHrs = w.shifts * w.capacityHrsPerShift * workingDays;
    return {
      workCenterCode: w.code,
      name: w.name,
      capacityHrs: Math.round(capacityHrs),
      loadHrs: Math.round(loadHrs),
      utilisationPct: capacityHrs ? Math.round((loadHrs / capacityHrs) * 100) : 0,
      orders: new Set(ops.map((o) => o.orderId)).size,
    };
  });
}

export interface DemandLine {
  source: "Engineering MBOM" | "Project milestone";
  reference: string;
  itemCode: string;
  itemName: string;
  qty: number;
  projectCode?: string;
  needBy: string;
  covered: boolean;
}

/** Open demand not yet covered by a manufacturing order. */
export function demandBoard(s: MfgState): DemandLine[] {
  const plm = plmStore.get();
  const prj = projectsStore.get();
  const covered = new Set(s.orders.filter((o) => o.status !== "cancelled").map((o) => o.sourceWoCode ?? ""));

  const fromEngineering: DemandLine[] = (plm.workOrders ?? [])
    .filter((w) => w.status !== "cancelled" && w.status !== "completed")
    .map((w) => ({
      source: "Engineering MBOM" as const,
      reference: w.code,
      itemCode: w.itemCode,
      itemName: w.itemName,
      qty: w.qty,
      projectCode: w.projectCode,
      needBy: (w.plannedEnd ?? "").slice(0, 10),
      covered: covered.has(w.code),
    }));

  const fromProjects: DemandLine[] = prj.milestones
    .filter((m) => m.status !== "achieved")
    .slice(0, 6)
    .map((m) => {
      const project = prj.projects.find((p) => p.id === m.projectId);
      return {
        source: "Project milestone" as const,
        reference: m.name,
        itemCode: project?.code ? `${project.code}-DEL` : "DELIVERABLE",
        itemName: `${project?.name ?? "Project"} deliverable`,
        qty: 1,
        projectCode: project?.code,
        needBy: (m.due ?? "").slice(0, 10),
        covered: s.orders.some((o) => o.projectCode === project?.code && o.status !== "cancelled"),
      };
    });

  return [...fromEngineering, ...fromProjects];
}

/** Pull uncovered Engineering work orders into the shop as planned MOs. */
export function importEngineeringDemand(): { created: string[] } {
  const s = mfg.get();
  const plm = plmStore.get();
  const existing = new Set(s.orders.map((o) => o.sourceWoCode).filter(Boolean));
  const created: string[] = [];

  for (const w of plm.workOrders ?? []) {
    if (w.status === "cancelled" || existing.has(w.code)) continue;
    const routing =
      s.routings.find((r) => r.itemCode === w.itemCode) ??
      s.routings.find((r) => r.active);
    const id = upsertMfg("orders", {
      itemCode: w.itemCode,
      itemName: w.itemName,
      qty: w.qty,
      uom: w.uom ?? "EA",
      projectCode: w.projectCode,
      bomRootId: w.bomRootId,
      routingCode: routing?.code,
      sourceWoCode: w.code,
      priority: "Normal",
      status: "planned",
      source: "engineering",
      plannedStart: (w.plannedStart ?? new Date().toISOString()).slice(0, 10),
      plannedEnd: (w.plannedEnd ?? new Date().toISOString()).slice(0, 10),
      dueDate: (w.plannedEnd ?? new Date().toISOString()).slice(0, 10),
      materialCost: 0,
      labourCost: 0,
      reservedValue: w.reservedValue ?? 0,
    });
    created.push(id);
  }
  return { created };
}

export interface ScheduledOp {
  orderId: string;
  orderCode: string;
  operationId: string;
  name: string;
  workCenterCode: string;
  start: string;
  end: string;
  hrs: number;
  late: boolean;
}

const PRIORITY_RANK: Record<string, number> = { Critical: 0, High: 1, Normal: 2, Low: 3 };

/**
 * Finite-capacity forward schedule: orders are sequenced by priority then due
 * date, and each operation queues behind the work center's running clock.
 */
export function scheduleShop(s: MfgState): ScheduledOp[] {
  const open = s.orders
    .filter((o) => ["planned", "released", "in-progress"].includes(o.status))
    .sort((a, b) =>
      (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2) ||
      a.dueDate.localeCompare(b.dueDate));

  const clock = new Map<string, number>();
  const out: ScheduledOp[] = [];
  const now = Date.now();

  for (const order of open) {
    let ready = now;
    const ops = s.operations.filter((o) => o.orderId === order.id && o.status !== "done").sort((a, b) => a.seq - b.seq);
    for (const op of ops) {
      const wc = s.workCenters.find((w) => w.code === op.workCenterCode);
      const dailyHrs = wc ? wc.shifts * wc.capacityHrsPerShift : 8;
      const remainingMins = Math.max(0, op.plannedMins - op.actualMins);
      const start = Math.max(ready, clock.get(op.workCenterCode) ?? now);
      const durMs = (remainingMins / 60 / dailyHrs) * DAY;
      const end = start + durMs;
      clock.set(op.workCenterCode, end);
      ready = end;
      out.push({
        orderId: order.id,
        orderCode: order.code,
        operationId: op.id,
        name: op.name,
        workCenterCode: op.workCenterCode,
        start: dayStr(new Date(start)),
        end: dayStr(new Date(end)),
        hrs: Math.round((remainingMins / 60) * 10) / 10,
        late: end > new Date(order.dueDate).getTime() + DAY,
      });
    }
  }
  return out;
}

/** Apply the finite schedule to the orders (planned start / end dates). */
export function applySchedule(by = "Planning Bot"): { updated: number; late: number } {
  const s = mfg.get();
  const plan = scheduleShop(s);
  const byOrder = new Map<string, ScheduledOp[]>();
  plan.forEach((p) => byOrder.set(p.orderId, [...(byOrder.get(p.orderId) ?? []), p]));

  let late = 0;
  mfg.update((st) => {
    for (const [orderId, ops] of byOrder) {
      const order = st.orders.find((o) => o.id === orderId);
      if (!order || !ops.length) continue;
      order.plannedStart = ops[0].start;
      order.plannedEnd = ops[ops.length - 1].end;
      if (ops.some((o) => o.late)) late += 1;
    }
    st.planRuns = [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        by,
        horizonDays: 14,
        demandLines: byOrder.size,
        ordersCreated: 0,
        scheduled: byOrder.size,
        note: `Finite-capacity schedule applied · ${late} order(s) at risk of missing the due date`,
      },
      ...st.planRuns,
    ].slice(0, 25);
  });
  return { updated: byOrder.size, late };
}

/** Firm a planned order: assign a routing if missing and move it to released-ready. */
export function firmOrder(orderId: string) {
  const s = mfg.get();
  const order = s.orders.find((o) => o.id === orderId);
  if (!order) return;
  if (!order.routingCode) {
    const routing = s.routings.find((r) => r.itemCode === order.itemCode) ?? s.routings[0];
    if (routing) upsertMfg("orders", { id: orderId, routingCode: routing.code });
  }
  if (!s.operations.some((o) => o.orderId === orderId)) explodeRouting(orderId);
}

export interface ShortageLine {
  itemCode: string;
  itemName: string;
  required: number;
  shortage: number;
  sourcing: "Make" | "Buy";
  leadTimeDays: number;
  value: number;
}

/** Material shortages behind an order, netted through the linked BOM. */
export function orderShortages(order: MfgOrder): ShortageLine[] {
  if (!order.bomRootId) return [];
  const rows = bomAvailability(plmStore.get(), order.bomRootId);
  return rows
    .filter((r) => r.shortage > 0)
    .map((r) => ({
      itemCode: r.itemCode,
      itemName: r.itemName,
      required: r.extendedQty,
      shortage: r.shortage,
      sourcing: r.sourcing,
      leadTimeDays: r.leadTimeDays,
      value: Math.round(r.shortage * r.stdCost),
    }));
}

export function newPlanRunCode(s: MfgState) {
  return nextCode("PLN", s.planRuns.map((p) => p.id));
}
