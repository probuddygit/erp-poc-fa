import type { PurchaseOrder, Vendor } from "./types";

export interface PriceHistoryRow {
  key: string;
  poCode: string;
  poDate: string;
  vendorId: string;
  vendorName: string;
  projectCode?: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  receivedQty: number;
  status: string;
  currency: string;
}

export interface PriceHistoryVendorSummary {
  vendorId: string;
  vendorName: string;
  orders: number;
  totalQty: number;
  lastRate: number;
  lastDate: string;
  bestRate: number;
  avgRate: number;
  onTimePct?: number;
  qualityPct?: number;
  leadTimeDays?: number;
}

export interface PriceHistoryStats {
  count: number;
  totalQty: number;
  lastRate: number;
  lastDate: string;
  minRate: number;
  maxRate: number;
  avgRate: number;
  /** % change of the most recent rate against the historical average. */
  lastVsAvgPct: number;
}

export interface PriceHistory {
  rows: PriceHistoryRow[];
  stats: PriceHistoryStats | null;
  byVendor: PriceHistoryVendorSummary[];
}

/** Distinct items that have ever appeared on a purchase order line. */
export function listPurchasedItems(pos: PurchaseOrder[]): Array<{ code: string; description: string; count: number; projects: string[] }> {
  const map = new Map<string, { code: string; description: string; count: number; projects: Set<string> }>();
  for (const po of pos) {
    for (const l of po.lines ?? []) {
      if (!l.itemCode) continue;
      const e = map.get(l.itemCode) ?? { code: l.itemCode, description: l.description || "", count: 0, projects: new Set<string>() };
      e.count += 1;
      if (!e.description && l.description) e.description = l.description;
      if (po.projectCode) e.projects.add(po.projectCode);
      map.set(l.itemCode, e);
    }
  }
  return [...map.values()]
    .map((e) => ({ code: e.code, description: e.description, count: e.count, projects: [...e.projects] }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** Full purchase-price history of one item across all purchase orders. */
export function buildPriceHistory(pos: PurchaseOrder[], itemCode: string, vendors: Vendor[] = []): PriceHistory {
  if (!itemCode) return { rows: [], stats: null, byVendor: [] };
  const code = itemCode.trim().toUpperCase();
  const rows: PriceHistoryRow[] = [];

  for (const po of pos) {
    if (po.status === "cancelled") continue;
    for (const l of po.lines ?? []) {
      if ((l.itemCode ?? "").trim().toUpperCase() !== code) continue;
      const qty = Number(l.qty) || 0;
      const rate = Number(l.rate) || (qty ? (Number(l.amount) || 0) / qty : 0);
      rows.push({
        key: `${po.id}-${l.id ?? l.itemCode}`,
        poCode: po.code,
        poDate: po.createdAt,
        vendorId: po.vendorId,
        vendorName: po.vendorName,
        projectCode: po.projectCode,
        qty,
        uom: l.uom || "EA",
        rate,
        amount: Number(l.amount) || rate * qty,
        receivedQty: Number(l.receivedQty) || 0,
        status: po.status,
        currency: po.currency || "INR",
      });
    }
  }

  rows.sort((a, b) => new Date(b.poDate).getTime() - new Date(a.poDate).getTime());
  if (!rows.length) return { rows, stats: null, byVendor: [] };

  const rates = rows.map((r) => r.rate).filter((r) => r > 0);
  const avgRate = rates.length ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
  const stats: PriceHistoryStats = {
    count: rows.length,
    totalQty: rows.reduce((s, r) => s + r.qty, 0),
    lastRate: rows[0].rate,
    lastDate: rows[0].poDate,
    minRate: rates.length ? Math.min(...rates) : 0,
    maxRate: rates.length ? Math.max(...rates) : 0,
    avgRate,
    lastVsAvgPct: avgRate ? ((rows[0].rate - avgRate) / avgRate) * 100 : 0,
  };

  const vmap = new Map<string, PriceHistoryRow[]>();
  for (const r of rows) {
    const k = r.vendorId || r.vendorName;
    vmap.set(k, [...(vmap.get(k) ?? []), r]);
  }
  const byVendor: PriceHistoryVendorSummary[] = [...vmap.entries()].map(([k, list]) => {
    const v = vendors.find((x) => x.id === k || x.name === list[0].vendorName);
    const vr = list.map((x) => x.rate).filter((x) => x > 0);
    return {
      vendorId: k,
      vendorName: list[0].vendorName,
      orders: list.length,
      totalQty: list.reduce((s, x) => s + x.qty, 0),
      lastRate: list[0].rate,
      lastDate: list[0].poDate,
      bestRate: vr.length ? Math.min(...vr) : 0,
      avgRate: vr.length ? vr.reduce((s, x) => s + x, 0) / vr.length : 0,
      onTimePct: v?.onTimePct,
      qualityPct: v?.qualityPct,
      leadTimeDays: v?.leadTimeDays,
    };
  }).sort((a, b) => a.bestRate - b.bestRate);

  return { rows, stats, byVendor };
}
