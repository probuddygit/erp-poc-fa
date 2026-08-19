import { useSyncExternalStore } from "react";
import type { MfgState } from "./types";
import { seed } from "./seed";
import { makeCrud, type MutableStore } from "@/lib/crud";

const KEY = "faith-erp:mfg:v1";

const COLLECTIONS: (keyof MfgState)[] = [
  "workCenters", "routings", "routingOps", "orders", "operations",
  "timeLogs", "downtime", "jobWork", "planRuns",
];

function load(): MfgState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw) as MfgState;
    const base = seed();
    for (const key of COLLECTIONS) {
      if (!Array.isArray(parsed[key])) {
        (parsed as unknown as Record<string, unknown>)[key] = base[key];
      }
    }
    return parsed;
  } catch {
    return seed();
  }
}

let state: MfgState = load();
const listeners = new Set<() => void>();

function save() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const mfg = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  update(mut: (s: MfgState) => void) { mut(state); state = { ...state }; save(); },
  replace(next: MfgState) { state = { ...state, ...next }; save(); },
  reset() { state = seed(); save(); },
};

export function useMfg<T>(sel: (s: MfgState) => T): T {
  return useSyncExternalStore(mfg.subscribe, () => sel(state), () => sel(state));
}

const crud = makeCrud<MfgState & Record<string, unknown>>(
  mfg as unknown as MutableStore<MfgState & Record<string, unknown>>,
);

export function nextCode(prefix: string, existing: string[]) {
  const year = new Date().getFullYear().toString().slice(-2);
  const nums = existing
    .map((c) => Number(c.split("-").pop()))
    .filter((n) => Number.isFinite(n)) as number[];
  const next = (nums.length ? Math.max(...nums) : 100) + 1;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

/** Upsert with document numbering, derived defaults and routing expansion. */
export function upsertMfg(key: string, record: Record<string, unknown>): string {
  const r: Record<string, unknown> = { ...record };
  const s = state;

  if (key === "orders") {
    if (!r.code) r.code = nextCode("MO", s.orders.map((o) => o.code));
    if (!r.createdAt) r.createdAt = new Date().toISOString();
    r.qty = Number(r.qty ?? 1);
    if (!r.uom) r.uom = "EA";
    if (!r.status) r.status = "planned";
    if (!r.priority) r.priority = "Normal";
    if (!r.source) r.source = "manual";
    for (const f of ["goodQty", "scrapQty", "reworkQty", "materialCost", "labourCost", "reservedValue"]) {
      r[f] = Number(r[f] ?? 0);
    }
    if (!r.plannedStart) r.plannedStart = new Date().toISOString().slice(0, 10);
    if (!r.dueDate) r.dueDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
    if (!r.plannedEnd) r.plannedEnd = r.dueDate;
    const routing = s.routings.find((x) => x.code === r.routingCode);
    if (routing) {
      if (!r.itemCode) r.itemCode = routing.itemCode;
      if (!r.itemName) r.itemName = routing.itemName;
    }
  }

  if (key === "routings") {
    if (!r.code) r.code = `RT-${String(s.routings.length + 1).padStart(3, "0")}`;
    if (!r.createdAt) r.createdAt = new Date().toISOString();
    if (r.active === undefined) r.active = true;
    if (!r.rev) r.rev = "A";
  }

  if (key === "routingOps") {
    r.seq = Number(r.seq ?? (s.routingOps.filter((o) => o.routingCode === r.routingCode).length + 1) * 10);
    r.setupMins = Number(r.setupMins ?? 0);
    r.runMinsPerUnit = Number(r.runMinsPerUnit ?? 0);
    r.inspection = Boolean(r.inspection);
    r.subcontract = Boolean(r.subcontract);
  }

  if (key === "workCenters") {
    if (r.active === undefined) r.active = true;
    for (const f of ["shifts", "capacityHrsPerShift", "hourlyRate", "oeeTarget"]) r[f] = Number(r[f] ?? 0);
  }

  if (key === "jobWork") {
    if (!r.code) r.code = nextCode("JW", s.jobWork.map((j) => j.code));
    if (!r.status) r.status = "issued";
    if (!r.issuedAt) r.issuedAt = new Date().toISOString().slice(0, 10);
    r.qty = Number(r.qty ?? 0);
    r.returnedQty = Number(r.returnedQty ?? 0);
    r.issuedValue = Number(r.issuedValue ?? 0);
    r.jobRate = Number(r.jobRate ?? 0);
  }

  if (key === "downtime") {
    if (!r.at) r.at = new Date().toISOString();
    r.mins = Number(r.mins ?? 0);
  }

  const id = crud.upsert(key as keyof MfgState & string, r);

  // Creating an order from a routing materialises its operation list.
  if (key === "orders" && !record.id && r.routingCode) {
    explodeRouting(id);
  }
  return id;
}

export const deleteMfg = (key: string, id: string) => {
  crud.remove(key as keyof MfgState & string, id);
  if (key === "orders") {
    mfg.update((s) => {
      s.operations = s.operations.filter((o) => o.orderId !== id);
      s.timeLogs = s.timeLogs.filter((t) => t.orderId !== id);
    });
  }
};

/** Build (or rebuild) the operation list of an order from its routing. */
export function explodeRouting(orderId: string) {
  mfg.update((s) => {
    const order = s.orders.find((o) => o.id === orderId);
    if (!order?.routingCode) return;
    const ops = s.routingOps.filter((o) => o.routingCode === order.routingCode).sort((a, b) => a.seq - b.seq);
    s.operations = s.operations.filter((o) => o.orderId !== orderId);
    s.operations = [
      ...ops.map((o) => ({
        id: crypto.randomUUID(),
        orderId,
        seq: o.seq,
        name: o.name,
        workCenterCode: o.workCenterCode,
        plannedMins: o.setupMins + o.runMinsPerUnit * order.qty,
        actualMins: 0,
        goodQty: 0,
        scrapQty: 0,
        status: "pending" as const,
        inspection: o.inspection,
        subcontract: o.subcontract,
      })),
      ...s.operations,
    ];
  });
}

export const orderOperations = (s: MfgState, orderId: string) =>
  s.operations.filter((o) => o.orderId === orderId).sort((a, b) => a.seq - b.seq);
