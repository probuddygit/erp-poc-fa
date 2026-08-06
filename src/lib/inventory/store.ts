import { useSyncExternalStore } from "react";
import type { InventoryState } from "./types";
import { makeCrud, type MutableStore } from "@/lib/crud";

const KEY = "faith-erp:inventory:v1";

function iso(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

function seed(): InventoryState {
  const items: InventoryState["items"] = [
    { id: "i1", code: "ITM-1101", description: "EN31 Steel plate 30mm", category: "Raw Material", uom: "EA", hsn: "7208", stdCost: 185000, reorder: 8, maxLevel: 40, tracking: "batch", onHand: 22, allocated: 12, active: true },
    { id: "i2", code: "ITM-2201", description: "ER70S-6 MIG wire 1.2mm", category: "Consumable", uom: "KG", hsn: "8311", stdCost: 210, reorder: 250, maxLevel: 1200, tracking: "batch", shelfLifeDays: 730, onHand: 640, allocated: 120, active: true },
    { id: "i3", code: "ITM-2202", description: "Argon-CO2 mix cylinder", category: "Consumable", uom: "EA", hsn: "2804", stdCost: 6400, reorder: 12, maxLevel: 60, tracking: "serial", onHand: 34, allocated: 6, active: true },
    { id: "i4", code: "ITM-4402", description: "AC Servo Drive 5kW", category: "Component", uom: "EA", hsn: "8504", stdCost: 210000, reorder: 4, maxLevel: 20, tracking: "serial", onHand: 6, allocated: 6, active: true },
    { id: "i5", code: "ITM-4403", description: "Encoder cable 10m", category: "Component", uom: "EA", hsn: "8544", stdCost: 8500, reorder: 20, maxLevel: 80, tracking: "none", onHand: 38, allocated: 6, active: true },
    { id: "i6", code: "ITM-5501", description: "Weld gun assembly", category: "Sub-Assembly", uom: "EA", stdCost: 145000, reorder: 3, maxLevel: 15, tracking: "serial", onHand: 5, allocated: 2, active: true },
    { id: "i7", code: "ITM-6601", description: "Passivation chemical 20L", category: "Consumable", uom: "EA", hsn: "3824", stdCost: 15600, reorder: 6, maxLevel: 24, tracking: "batch", shelfLifeDays: 365, onHand: 4, allocated: 0, active: true },
    { id: "i8", code: "ITM-7701", description: "BIW Underbody Sub-Assembly", category: "Finished Good", uom: "EA", stdCost: 92000, reorder: 2, maxLevel: 30, tracking: "serial", onHand: 12, allocated: 8, active: true },
    { id: "i9", code: "ITM-3301", description: "M8 x 25 Bolt DIN 933", category: "Component", uom: "EA", hsn: "7318", stdCost: 4.2, reorder: 5000, maxLevel: 20000, tracking: "lot", onHand: 12400, allocated: 800, active: true },
    { id: "i10", code: "ITM-3302", description: "Rubber grommet 12mm", category: "Component", uom: "EA", stdCost: 8, reorder: 2000, maxLevel: 10000, tracking: "lot", onHand: 1450, allocated: 400, active: true },
  ];

  const stores: InventoryState["stores"] = [
    { id: "s1", code: "STR-C01", name: "Central Warehouse", type: "Central", location: "Chakan - Bay A", manager: "R. Deshpande", bins: 320, capacityUsedPct: 78, active: true },
    { id: "s2", code: "STR-F01", name: "Weld Shop Store", type: "Shop-floor", location: "Chakan - Line 1", manager: "S. Kulkarni", bins: 84, capacityUsedPct: 62, active: true },
    { id: "s3", code: "STR-F02", name: "Assembly Store", type: "Shop-floor", location: "Chakan - Line 2", manager: "N. Iyer", bins: 96, capacityUsedPct: 71, active: true },
    { id: "s4", code: "STR-B01", name: "Bonded Warehouse", type: "Bonded", location: "JNPT - Nhava Sheva", manager: "M. Fernandes", bins: 40, capacityUsedPct: 34, active: true },
    { id: "s5", code: "STR-P21", name: "Hyundai BIW Cell 3 (Project)", type: "Project", location: "Sriperumbudur - Site", manager: "A. Menon", bins: 24, capacityUsedPct: 42, active: true },
    { id: "s6", code: "STR-X01", name: "Scrap Yard", type: "Scrap", location: "Chakan - Yard", manager: "V. Patil", bins: 12, capacityUsedPct: 55, active: true },
  ];

  const bins: InventoryState["bins"] = [
    { id: "b1", storeCode: "STR-C01", code: "A-01-02-03", zone: "A", aisle: "01", rack: "02", level: "03", itemCode: "ITM-1101", qty: 22, uom: "EA" },
    { id: "b2", storeCode: "STR-C01", code: "A-02-01-01", zone: "A", aisle: "02", rack: "01", level: "01", itemCode: "ITM-2201", qty: 640, uom: "KG" },
    { id: "b3", storeCode: "STR-C01", code: "B-01-01-02", zone: "B", aisle: "01", rack: "01", level: "02", itemCode: "ITM-4402", qty: 4, uom: "EA" },
    { id: "b4", storeCode: "STR-F01", code: "F1-A-03", zone: "F1", aisle: "A", rack: "03", level: "-", itemCode: "ITM-2202", qty: 12, uom: "EA" },
    { id: "b5", storeCode: "STR-F01", code: "F1-A-04", zone: "F1", aisle: "A", rack: "04", level: "-", itemCode: "ITM-5501", qty: 3, uom: "EA" },
    { id: "b6", storeCode: "STR-F02", code: "F2-B-01", zone: "F2", aisle: "B", rack: "01", level: "-", itemCode: "ITM-7701", qty: 12, uom: "EA" },
    { id: "b7", storeCode: "STR-P21", code: "P-01", zone: "P", aisle: "01", rack: "-", level: "-", itemCode: "ITM-4402", qty: 2, uom: "EA" },
    { id: "b8", storeCode: "STR-P21", code: "P-02", zone: "P", aisle: "02", rack: "-", level: "-", itemCode: "ITM-5501", qty: 2, uom: "EA" },
    { id: "b9", storeCode: "STR-B01", code: "BW-01", zone: "BW", aisle: "01", rack: "-", level: "-", itemCode: "ITM-4402", qty: 0, uom: "EA" },
    { id: "b10", storeCode: "STR-C01", code: "C-03-02-01", zone: "C", aisle: "03", rack: "02", level: "01", itemCode: "ITM-3301", qty: 12400, uom: "EA" },
  ];

  const stock: InventoryState["stock"] = [
    { id: "st1", itemCode: "ITM-1101", description: "EN31 Steel plate 30mm", storeCode: "STR-C01", storeName: "Central Warehouse", binCode: "A-01-02-03", qty: 22, uom: "EA", value: 22 * 185000, status: "available" },
    { id: "st2", itemCode: "ITM-2201", description: "ER70S-6 MIG wire 1.2mm", storeCode: "STR-C01", storeName: "Central Warehouse", binCode: "A-02-01-01", qty: 640, uom: "KG", value: 640 * 210, status: "available" },
    { id: "st3", itemCode: "ITM-2202", description: "Argon-CO2 cylinder", storeCode: "STR-F01", storeName: "Weld Shop Store", binCode: "F1-A-03", qty: 12, uom: "EA", value: 12 * 6400, status: "available" },
    { id: "st4", itemCode: "ITM-4402", description: "AC Servo Drive 5kW", storeCode: "STR-P21", storeName: "Hyundai BIW Cell 3", binCode: "P-01", projectCode: "PRJ-1021", qty: 2, uom: "EA", value: 2 * 210000, status: "reserved" },
    { id: "st5", itemCode: "ITM-4402", description: "AC Servo Drive 5kW", storeCode: "STR-C01", storeName: "Central Warehouse", binCode: "B-01-01-02", qty: 4, uom: "EA", value: 4 * 210000, status: "available" },
    { id: "st6", itemCode: "ITM-5501", description: "Weld gun assembly", storeCode: "STR-P21", storeName: "Hyundai BIW Cell 3", binCode: "P-02", projectCode: "PRJ-1021", qty: 2, uom: "EA", value: 2 * 145000, status: "reserved" },
    { id: "st7", itemCode: "ITM-6601", description: "Passivation chemical 20L", storeCode: "STR-C01", storeName: "Central Warehouse", qty: 4, uom: "EA", value: 4 * 15600, status: "quality-hold" },
    { id: "st8", itemCode: "ITM-7701", description: "BIW Underbody Sub-Assembly", storeCode: "STR-F02", storeName: "Assembly Store", binCode: "F2-B-01", projectCode: "PRJ-1024", qty: 12, uom: "EA", value: 12 * 92000, status: "available" },
    { id: "st9", itemCode: "ITM-4402", description: "AC Servo Drive 5kW", storeCode: "STR-B01", storeName: "Bonded Warehouse", qty: 0, uom: "EA", value: 0, status: "in-transit" },
    { id: "st10", itemCode: "ITM-3301", description: "M8 x 25 Bolt DIN 933", storeCode: "STR-C01", storeName: "Central Warehouse", binCode: "C-03-02-01", qty: 12400, uom: "EA", value: 12400 * 4.2, status: "available" },
  ];

  const batches: InventoryState["batches"] = [
    { id: "bt1", itemCode: "ITM-2201", description: "ER70S-6 MIG wire 1.2mm", batchNo: "BAT/TS/2401", mfgDate: iso(-40), expiryDate: iso(690), vendorName: "Tata Steel Ltd", qty: 400, uom: "KG", storeCode: "STR-C01", status: "available" },
    { id: "bt2", itemCode: "ITM-2201", description: "ER70S-6 MIG wire 1.2mm", batchNo: "BAT/TS/2402", mfgDate: iso(-2), expiryDate: iso(728), vendorName: "Tata Steel Ltd", qty: 240, uom: "KG", storeCode: "STR-C01", status: "available" },
    { id: "bt3", itemCode: "ITM-6601", description: "Passivation chemical 20L", batchNo: "SRF/24/PC-778", mfgDate: iso(-300), expiryDate: iso(45), vendorName: "SRF Industrial Chemicals", qty: 4, uom: "EA", storeCode: "STR-C01", status: "expiring" },
    { id: "bt4", itemCode: "ITM-4402", description: "AC Servo Drive 5kW", batchNo: "FANUC-24-A11", serialFrom: "FN-5K-000112", serialTo: "FN-5K-000115", mfgDate: iso(-20), vendorName: "Fanuc Automation", qty: 4, uom: "EA", storeCode: "STR-C01", status: "available" },
    { id: "bt5", itemCode: "ITM-2202", description: "Argon-CO2 cylinder", batchNo: "AGCO-24-770", serialFrom: "CYL-24-0770", serialTo: "CYL-24-0781", mfgDate: iso(-10), vendorName: "Air Liquide", qty: 12, uom: "EA", storeCode: "STR-F01", status: "available" },
    { id: "bt6", itemCode: "ITM-6601", description: "Passivation chemical 20L (old lot)", batchNo: "SRF/23/PC-660", mfgDate: iso(-380), expiryDate: iso(-15), vendorName: "SRF Industrial Chemicals", qty: 2, uom: "EA", storeCode: "STR-X01", status: "expired" },
    { id: "bt7", itemCode: "ITM-3301", description: "M8 x 25 Bolt DIN 933", batchNo: "LOT-8830", mfgDate: iso(-90), vendorName: "Sundram Fasteners", qty: 12400, uom: "EA", storeCode: "STR-C01", status: "available" },
  ];

  const transfers: InventoryState["transfers"] = [
    { id: "t1", code: "STO-9001", type: "transfer", itemCode: "ITM-4402", description: "AC Servo Drive 5kW", qty: 2, uom: "EA", fromStore: "STR-C01", toStore: "STR-P21", projectCode: "PRJ-1021", requestedBy: "A. Menon", createdAt: iso(-2), status: "in-transit", reason: "Project allocation - Cell 3" },
    { id: "t2", code: "STO-9002", type: "transfer", itemCode: "ITM-2201", description: "MIG wire 1.2mm", qty: 60, uom: "KG", fromStore: "STR-C01", toStore: "STR-F01", requestedBy: "S. Kulkarni", createdAt: iso(-1), status: "received", reason: "Line replenishment" },
    { id: "t3", code: "ISS-9003", type: "issue", itemCode: "ITM-5501", description: "Weld gun assembly", qty: 1, uom: "EA", fromStore: "STR-F01", projectCode: "PRJ-1021", requestedBy: "K. Nair", createdAt: iso(0), status: "requested", reason: "Shop floor issue" },
    { id: "t4", code: "ADJ-9004", type: "adjustment", itemCode: "ITM-3302", description: "Rubber grommet 12mm", qty: -18, uom: "EA", fromStore: "STR-C01", requestedBy: "R. Deshpande", createdAt: iso(-4), status: "received", reason: "Cycle count variance write-off" },
    { id: "t5", code: "RET-9005", type: "return", itemCode: "ITM-6601", description: "Passivation chemical 20L", qty: 2, uom: "EA", fromStore: "STR-C01", toStore: "STR-X01", requestedBy: "P. Deshmukh", createdAt: iso(-3), status: "received", reason: "Expired stock scrap" },
    { id: "t6", code: "STO-9006", type: "transfer", itemCode: "ITM-4403", description: "Encoder cable 10m", qty: 6, uom: "EA", fromStore: "STR-C01", toStore: "STR-P21", projectCode: "PRJ-1021", requestedBy: "A. Menon", createdAt: iso(0), status: "draft", reason: "Prepare Cell 3 dispatch" },
  ];

  const counts: InventoryState["counts"] = [
    { id: "c1", code: "CC-2401", storeCode: "STR-C01", storeName: "Central Warehouse", scheduledFor: iso(2), auditor: "R. Deshpande", status: "planned", itemsPlanned: 120, itemsCounted: 0, variancesFound: 0, variancePct: 0, varianceValue: 0 },
    { id: "c2", code: "CC-2402", storeCode: "STR-F01", storeName: "Weld Shop Store", scheduledFor: iso(-1), auditor: "S. Kulkarni", status: "in-progress", itemsPlanned: 45, itemsCounted: 28, variancesFound: 3, variancePct: 6.7, varianceValue: 42000 },
    { id: "c3", code: "CC-2403", storeCode: "STR-F02", storeName: "Assembly Store", scheduledFor: iso(-10), auditor: "N. Iyer", status: "reconciled", itemsPlanned: 60, itemsCounted: 60, variancesFound: 4, variancePct: 6.6, varianceValue: 118000 },
    { id: "c4", code: "CC-2404", storeCode: "STR-P21", storeName: "Hyundai BIW Cell 3", scheduledFor: iso(-25), auditor: "A. Menon", status: "posted", itemsPlanned: 30, itemsCounted: 30, variancesFound: 1, variancePct: 3.3, varianceValue: 14000 },
    { id: "c5", code: "CC-2405", storeCode: "STR-B01", storeName: "Bonded Warehouse", scheduledFor: iso(9), auditor: "M. Fernandes", status: "planned", itemsPlanned: 25, itemsCounted: 0, variancesFound: 0, variancePct: 0, varianceValue: 0 },
  ];

  return { items, stores, bins, stock, batches, transfers, counts };
}

function load(): InventoryState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as InventoryState;
  } catch {
    return seed();
  }
}

let state: InventoryState = load();
const listeners = new Set<() => void>();

function save() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const inventory = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  update(mut: (s: InventoryState) => void) { mut(state); state = { ...state }; save(); },
  reset() { state = seed(); save(); },
};

export function useInventory<T>(sel: (s: InventoryState) => T): T {
  return useSyncExternalStore(inventory.subscribe, () => sel(state), () => sel(state));
}

/* ---------------- CRUD ---------------- */
const invCrud = makeCrud<InventoryState & Record<string, unknown>>(
  inventory as unknown as MutableStore<InventoryState & Record<string, unknown>>,
);

/* ---------------- helpers used by the automation below ---------------- */

function nextSeq(existing: string[], prefix: string) {
  const nums = existing
    .map((c) => Number(c.replace(/\D+/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  const next = (nums.length ? Math.max(...nums) : 9000) + 1;
  return `${prefix}-${next}`;
}

const TRANSFER_PREFIX: Record<string, string> = {
  transfer: "STO",
  issue: "ISS",
  adjustment: "ADJ",
  return: "RET",
};

function batchStatusFor(expiry?: string, current?: string): string | undefined {
  if (current === "quarantined") return current;
  if (!expiry) return current ?? "available";
  const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
  if (days < 0) return "expired";
  if (days <= 60) return "expiring";
  return "available";
}

/**
 * Upsert with intelligent data population — auto document numbers, master-driven
 * defaults, derived valuation and consistency between code / name pairs.
 */
export function upsertInventory(key: string, record: Record<string, unknown>): string {
  const r: Record<string, unknown> = { ...record };
  const s = state;
  const item = r.itemCode ? s.items.find((i) => i.code === r.itemCode) : undefined;

  if ((key === "items" || key === "stores") && r.active === undefined) r.active = true;

  // Item-driven population — description, UoM and costing.
  if (item) {
    if (!r.description) r.description = item.description;
    if (!r.uom) r.uom = item.uom;
  }

  // Store code / name always stay in sync with the store master.
  if (r.storeCode || r.storeName) {
    const store =
      s.stores.find((x) => x.code === r.storeCode) ??
      s.stores.find((x) => x.name === r.storeName);
    if (store) {
      r.storeCode = store.code;
      if (key === "stock" || key === "counts") r.storeName = store.name;
    }
  }

  // Bin selection implies its parent store.
  if (r.binCode && !r.storeCode) {
    const bin = s.bins.find((b) => b.code === r.binCode);
    if (bin) r.storeCode = bin.storeCode;
  }

  if (key === "stock") {
    const qty = Number(r.qty ?? 0);
    if (r.value === undefined || r.value === null || r.value === "" || Number(r.value) === 0) {
      r.value = item ? Math.round(qty * item.stdCost) : 0;
    }
    if (!r.status) r.status = "available";
  }

  if (key === "batches") {
    r.status = batchStatusFor(r.expiryDate as string | undefined, r.status as string | undefined);
    if (!r.batchNo) r.batchNo = nextSeq(s.batches.map((b) => b.batchNo), "LOT");
  }

  if (key === "transfers") {
    if (!r.createdAt) r.createdAt = new Date().toISOString();
    if (!r.code) {
      const prefix = TRANSFER_PREFIX[String(r.type ?? "transfer")] ?? "STO";
      r.code = nextSeq(s.transfers.map((t) => t.code), prefix);
    }
    // Adjustments and issues never have a receiving store.
    if (r.type === "adjustment" || r.type === "issue") r.toStore = undefined;
    if (!r.status) r.status = "draft";
  }

  if (key === "counts") {
    if (!r.code) r.code = nextSeq(s.counts.map((c) => c.code), "CC");
    const planned = Number(r.itemsPlanned ?? 0);
    const counted = Number(r.itemsCounted ?? 0);
    const variances = Number(r.variancesFound ?? 0);
    r.variancePct = planned ? Math.round((variances / planned) * 1000) / 10 : 0;
    if (counted >= planned && planned > 0 && r.status === "in-progress") r.status = "reconciled";
  }

  return invCrud.upsert(key, r);
}

export const deleteInventory = (key: string, id: string) => invCrud.remove(key, id);

/** Post a cycle count — closes it out, marks all items counted and clears variance. */
export function postCycleCount(id: string) {
  inventory.update((s) => {
    const c = s.counts.find((x) => x.id === id);
    if (!c) return;
    c.itemsCounted = c.itemsPlanned;
    c.status = "posted";
    c.variancePct = c.itemsPlanned ? Math.round((c.variancesFound / c.itemsPlanned) * 1000) / 10 : 0;
  });
}

/** Apply the physical stock movement implied by a received transfer. */
function applyMovement(s: InventoryState, t: InventoryState["transfers"][number]) {
  const item = s.items.find((i) => i.code === t.itemCode);
  const rate = item?.stdCost ?? 0;
  const qty = Math.abs(t.qty);

  const findRow = (storeCode: string) =>
    s.stock.find((r) => r.itemCode === t.itemCode && r.storeCode === storeCode);

  const ensureRow = (storeCode: string) => {
    const existing = findRow(storeCode);
    if (existing) return existing;
    const store = s.stores.find((x) => x.code === storeCode);
    const row: InventoryState["stock"][number] = {
      id: crypto.randomUUID(),
      itemCode: t.itemCode,
      description: t.description,
      storeCode,
      storeName: store?.name ?? storeCode,
      projectCode: t.projectCode,
      qty: 0,
      uom: t.uom,
      value: 0,
      status: "available",
    };
    s.stock = [row, ...s.stock];
    return row;
  };

  const revalue = (row: InventoryState["stock"][number]) => {
    row.qty = Math.max(0, row.qty);
    row.value = Math.round(row.qty * rate);
  };

  if (t.type === "adjustment") {
    const row = ensureRow(t.fromStore);
    row.qty += t.qty; // adjustments carry their own sign
    revalue(row);
  } else {
    const from = findRow(t.fromStore);
    if (from) {
      from.qty -= qty;
      revalue(from);
    }
    if (t.toStore) {
      const to = ensureRow(t.toStore);
      to.qty += qty;
      if (t.projectCode) to.projectCode = t.projectCode;
      revalue(to);
    }
  }

  if (item) {
    const onHand = s.stock
      .filter((r) => r.itemCode === item.code)
      .reduce((a, r) => a + r.qty, 0);
    item.onHand = onHand;
  }
}

/** Move a transfer to the next lifecycle state, posting stock on receipt. */
export function setTransferStatus(id: string, status: InventoryState["transfers"][number]["status"]) {
  inventory.update((s) => {
    const t = s.transfers.find((x) => x.id === id);
    if (!t) return;
    const wasReceived = t.status === "received";
    t.status = status;

    // In-transit stock is visible at the destination store.
    if (status === "in-transit" && t.toStore) {
      const row = s.stock.find((r) => r.itemCode === t.itemCode && r.storeCode === t.toStore);
      if (row && row.qty === 0) row.status = "in-transit";
    }

    if (status === "received" && !wasReceived) applyMovement(s, t);
  });
}

/** Re-evaluate batch expiry flags — run whenever the batch list is displayed. */
export function refreshBatchStatuses() {
  inventory.update((s) => {
    for (const b of s.batches) {
      const next = batchStatusFor(b.expiryDate, b.status);
      if (next && next !== b.status) b.status = next as typeof b.status;
    }
  });
}

