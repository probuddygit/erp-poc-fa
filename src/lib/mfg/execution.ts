/**
 * Shop-floor execution engine.
 *
 * Every posting made on the terminal ripples outwards: inventory is
 * back-flushed, project cost is updated, Finance receives WIP journals,
 * Quality gets an NCR when scrap is reported and Procurement is asked for
 * shortages at release time.
 */
import { mfg, upsertMfg, orderOperations } from "./store";
import type { MfgOrder, MoOperation } from "./types";
import { orderShortages } from "./planning";
import { inventory, upsertInventory } from "@/lib/inventory/store";
import { procurement, upsertProcurement } from "@/lib/procurement/store";
import { upsertQuality } from "@/lib/quality/store";
import { adjustProjectMaterialCost } from "@/lib/projects/store";
import { fireFinanceEvent } from "@/lib/finance/emit";
import { upsertPlm } from "@/lib/plm/store";
import { plmStore } from "@/lib/plm/store";

export interface ReleaseResult {
  ok: boolean;
  message: string;
  prCode?: string;
  shortages: number;
  reservedValue: number;
}

const round = (n: number) => Math.round(n);

function nextSeq(prefix: string, existing: string[]) {
  const nums = existing.map((c) => Number(c.split("-").pop())).filter((n) => Number.isFinite(n)) as number[];
  return `${prefix}-${(nums.length ? Math.max(...nums) : 1000) + 1}`;
}

/** Release an order to the floor: check material, reserve it, raise a PR for gaps. */
export function releaseOrder(orderId: string): ReleaseResult {
  const s = mfg.get();
  const order = s.orders.find((o) => o.id === orderId);
  if (!order) return { ok: false, message: "Order not found", shortages: 0, reservedValue: 0 };
  if (!orderOperations(s, orderId).length) {
    return { ok: false, message: "Assign a routing before releasing — the order has no operations.", shortages: 0, reservedValue: 0 };
  }

  const shortages = orderShortages(order);
  const inv = inventory.get();
  const item = inv.items.find((i) => i.code === order.itemCode);
  const stdCost = item?.stdCost ?? 0;

  let reserved = order.reservedValue;
  if (!reserved) {
    reserved = round(order.qty * stdCost * 0.85) || round(order.qty * 120000);
  }

  let prCode: string | undefined;
  const buyGaps = shortages.filter((x) => x.sourcing === "Buy");
  if (buyGaps.length) {
    const proc = procurement.get();
    prCode = nextSeq("PR", proc.requisitions.map((r) => r.code));
    const needBy = new Date(Date.now() + 14 * 86_400_000).toISOString();
    const lines = buyGaps.map((g) => ({
      id: crypto.randomUUID(),
      itemCode: g.itemCode,
      description: g.itemName,
      qty: g.shortage,
      uom: "EA",
      estRate: g.shortage ? Math.round(g.value / g.shortage) : 0,
      needBy,
    }));
    const totalEst = lines.reduce((a, l) => a + l.qty * l.estRate, 0);
    upsertProcurement("requisitions", {
      code: prCode,
      title: `${order.code} — shop floor material shortage`,
      projectCode: order.projectCode,
      requestedBy: "Production Planning",
      department: "Manufacturing",
      needBy,
      priority: totalEst > 1_000_000 ? "critical" : "high",
      status: "pending",
      approver: "V. Rao (Head - Purchase)",
      totalEst: round(totalEst),
      lines,
      notes: `Auto-raised on release of manufacturing order ${order.code}.`,
    });
  }

  upsertMfg("orders", { id: orderId, status: "released", reservedValue: reserved });

  return {
    ok: true,
    shortages: shortages.length,
    reservedValue: reserved,
    prCode,
    message: prCode
      ? `${order.code} released · ${shortages.length} shortage line(s) routed to Purchase as ${prCode}`
      : `${order.code} released · material reserved against ${order.projectCode ?? "stock"}`,
  };
}

export function startOperation(operationId: string, operator: string) {
  mfg.update((s) => {
    const op = s.operations.find((o) => o.id === operationId);
    if (!op) return;
    op.status = "running";
    op.operator = operator;
    op.startedAt = op.startedAt ?? new Date().toISOString();
    const order = s.orders.find((o) => o.id === op.orderId);
    if (order && (order.status === "planned" || order.status === "released")) order.status = "in-progress";
  });
}

export function pauseOperation(operationId: string) {
  mfg.update((s) => {
    const op = s.operations.find((o) => o.id === operationId);
    if (op) op.status = "paused";
  });
}

export interface ReportInput {
  operationId: string;
  operator: string;
  mins: number;
  goodQty: number;
  scrapQty: number;
  reworkQty: number;
  downtimeMins?: number;
  downtimeReason?: string;
  note?: string;
}

export interface ReportResult {
  message: string;
  ncrCode?: string;
  materialValue: number;
  labourValue: number;
  orderComplete: boolean;
}

/** Post production against an operation — the single write path of the terminal. */
export function reportProduction(input: ReportInput): ReportResult {
  const s = mfg.get();
  const op = s.operations.find((o) => o.id === input.operationId);
  if (!op) return { message: "Operation not found", materialValue: 0, labourValue: 0, orderComplete: false };
  const order = s.orders.find((o) => o.id === op.orderId);
  if (!order) return { message: "Order not found", materialValue: 0, labourValue: 0, orderComplete: false };

  const wc = s.workCenters.find((w) => w.code === op.workCenterCode);
  const labourValue = round((input.mins / 60) * (wc?.hourlyRate ?? 1200));

  const inv = inventory.get();
  const item = inv.items.find((i) => i.code === order.itemCode);
  const unitMaterial = (item?.stdCost ?? (order.qty ? order.materialCost / order.qty : 0)) || 120000;
  const isFirstOp = orderOperations(s, order.id)[0]?.id === op.id;
  const producedQty = input.goodQty + input.scrapQty;
  const materialValue = isFirstOp ? round(producedQty * unitMaterial) : 0;

  let orderComplete = false;

  mfg.update((st) => {
    const o = st.operations.find((x) => x.id === input.operationId);
    const ord = st.orders.find((x) => x.id === op.orderId);
    if (!o || !ord) return;

    o.actualMins += input.mins;
    o.goodQty += input.goodQty;
    o.scrapQty += input.scrapQty;
    o.operator = input.operator;
    o.startedAt = o.startedAt ?? new Date().toISOString();
    if (o.goodQty >= ord.qty) {
      o.status = "done";
      o.completedAt = new Date().toISOString();
    } else {
      o.status = "running";
    }

    st.timeLogs = [
      {
        id: crypto.randomUUID(),
        orderId: ord.id,
        operationId: o.id,
        workCenterCode: o.workCenterCode,
        operator: input.operator,
        at: new Date().toISOString(),
        mins: input.mins,
        goodQty: input.goodQty,
        scrapQty: input.scrapQty,
        reworkQty: input.reworkQty,
        note: input.note,
      },
      ...st.timeLogs,
    ];

    if (input.downtimeMins && input.downtimeReason) {
      st.downtime = [
        {
          id: crypto.randomUUID(),
          workCenterCode: o.workCenterCode,
          orderId: ord.id,
          reason: input.downtimeReason,
          mins: input.downtimeMins,
          at: new Date().toISOString(),
        },
        ...st.downtime,
      ];
    }

    ord.labourCost += labourValue;
    ord.materialCost += materialValue;
    ord.scrapQty += input.scrapQty;
    ord.reworkQty += input.reworkQty;
    if (ord.status === "planned" || ord.status === "released") ord.status = "in-progress";

    const ops = st.operations.filter((x) => x.orderId === ord.id).sort((a, b) => a.seq - b.seq);
    const last = ops[ops.length - 1];
    ord.goodQty = last ? last.goodQty : ord.goodQty;
    if (ops.length && ops.every((x) => x.status === "done")) {
      ord.status = "completed";
      orderComplete = true;
    }
  });

  /* ---------------- downstream postings ---------------- */

  if (materialValue > 0) {
    fireFinanceEvent({
      type: "mfg.issued",
      orderCode: order.code,
      projectCode: order.projectCode,
      itemCode: order.itemCode,
      value: materialValue,
    });
    if (order.projectCode) adjustProjectMaterialCost(order.projectCode, materialValue);
  }

  if (labourValue > 0) {
    fireFinanceEvent({
      type: "mfg.labour",
      orderCode: order.code,
      projectCode: order.projectCode,
      workCenter: op.workCenterCode,
      value: labourValue,
      mins: input.mins,
    });
  }

  let ncrCode: string | undefined;
  if (input.scrapQty > 0) {
    ncrCode = `NCR-${Math.floor(4000 + Math.random() * 900)}`;
    upsertQuality("ncrs", {
      code: ncrCode,
      raisedAt: new Date().toISOString(),
      raisedBy: input.operator,
      source: "in-process",
      itemCode: order.itemCode,
      itemDescription: order.itemName,
      qty: input.scrapQty,
      uom: order.uom,
      projectCode: order.projectCode,
      defect: `Scrap reported at ${op.name} (${op.workCenterCode}) on ${order.code}`,
      severity: input.scrapQty > 1 ? "major" : "minor",
      status: "open",
      costImpact: round(input.scrapQty * unitMaterial),
    });
    fireFinanceEvent({
      type: "mfg.scrapped",
      orderCode: order.code,
      projectCode: order.projectCode,
      itemCode: order.itemCode,
      value: round(input.scrapQty * unitMaterial),
      qty: input.scrapQty,
    });
  }

  if (orderComplete) completeOrder(order.id);

  return {
    message: `${input.goodQty} good · ${input.scrapQty} scrap posted on ${op.name}`,
    ncrCode,
    materialValue,
    labourValue,
    orderComplete,
  };
}

/** Finished-goods receipt + close-out of the linked engineering work order. */
export function completeOrder(orderId: string) {
  const s = mfg.get();
  const order = s.orders.find((o) => o.id === orderId);
  if (!order) return;

  const inv = inventory.get();
  const item = inv.items.find((i) => i.code === order.itemCode);
  const store = inv.stores.find((x) => x.type === "Central") ?? inv.stores[0];
  const value = order.materialCost + order.labourCost;

  upsertInventory("stock", {
    itemCode: order.itemCode,
    description: order.itemName,
    storeCode: store?.code,
    storeName: store?.name,
    projectCode: order.projectCode,
    qty: order.goodQty || order.qty,
    uom: order.uom,
    value: round(value),
    status: "available",
  });
  if (!item) {
    upsertInventory("items", {
      code: order.itemCode,
      description: order.itemName,
      category: "Finished Good",
      uom: order.uom,
      stdCost: order.qty ? round(value / order.qty) : 0,
      reorder: 0,
      maxLevel: order.qty * 2,
      tracking: "none",
      onHand: order.goodQty || order.qty,
      allocated: 0,
      active: true,
      projectCode: order.projectCode,
    });
  }

  upsertMfg("orders", { id: orderId, status: "completed" });

  // Close the originating engineering work order so both views agree.
  const wo = (plmStore.get().workOrders ?? []).find((w) => w.code === order.sourceWoCode);
  if (wo && wo.status !== "completed") upsertPlm("workOrders", { id: wo.id, status: "completed" });

  fireFinanceEvent({
    type: "mfg.completed",
    orderCode: order.code,
    projectCode: order.projectCode,
    itemCode: order.itemCode,
    value: round(value),
    qty: order.goodQty || order.qty,
  });
}

/** Receive job-work quantity back from the vendor. */
export function receiveJobWork(id: string, qty: number) {
  const s = mfg.get();
  const jw = s.jobWork.find((j) => j.id === id);
  if (!jw) return;
  const returned = Math.min(jw.qty, jw.returnedQty + qty);
  upsertMfg("jobWork", {
    id,
    returnedQty: returned,
    status: returned >= jw.qty ? "received" : "partial",
  });
  fireFinanceEvent({
    type: "mfg.labour",
    orderCode: jw.orderCode ?? jw.code,
    projectCode: jw.projectCode,
    workCenter: "Sub-contract",
    value: round(qty * jw.jobRate),
    mins: 0,
  });
}

export function orderProgressPct(order: MfgOrder, ops: MoOperation[]) {
  if (!ops.length) return order.status === "completed" ? 100 : 0;
  const planned = ops.reduce((a, o) => a + o.plannedMins, 0);
  const done = ops.reduce((a, o) => a + Math.min(o.plannedMins, o.actualMins), 0);
  return planned ? Math.min(100, Math.round((done / planned) * 100)) : 0;
}
