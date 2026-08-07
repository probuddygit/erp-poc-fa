/**
 * Inventory intelligence engine — deterministic ABC classification, stock-out
 * forecasting, reorder / EOQ suggestions, excess and expiry risk grounded in the
 * inventory store. Powers the AI Inventory Copilot.
 */
import type { InventoryState, InvItem } from "./types";
import { upsertInventory, refreshBatchStatuses } from "./store";
import { upsertProcurement } from "@/lib/procurement/store";
import type { AiAction } from "@/components/ai/module-copilot";

const DAY = 86_400_000;
const until = (iso?: string) => (iso ? Math.round((new Date(iso).getTime() - Date.now()) / DAY) : Infinity);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Deterministic pseudo-consumption rate per item, derived from stock posture. */
function dailyDemand(item: InvItem) {
  const base = Math.max(item.reorder, 1) / 15; // reorder point ≈ 15 days of cover
  const pressure = item.allocated > 0 ? 1.25 : 1;
  return Math.max(0.2, Math.round(base * pressure * 100) / 100);
}

export interface StockSignal {
  item: InvItem;
  free: number;
  daysOfCover: number;
  stockoutOn?: string;
  risk: number;
  abc: "A" | "B" | "C";
  suggestedQty: number;
  status: "stockout" | "critical" | "watch" | "healthy" | "excess";
}

/** Per-item stock-out forecast, ABC class and replenishment suggestion. */
export function stockSignals(s: InventoryState): StockSignal[] {
  const valued = s.items
    .map((i) => ({ i, value: i.onHand * i.stdCost }))
    .sort((a, b) => b.value - a.value);
  const total = valued.reduce((a, x) => a + x.value, 0) || 1;
  const abc = new Map<string, "A" | "B" | "C">();
  let run = 0;
  valued.forEach(({ i, value }) => {
    run += value;
    const pct = run / total;
    abc.set(i.code, pct <= 0.8 ? "A" : pct <= 0.95 ? "B" : "C");
  });

  return s.items
    .map((item) => {
      const free = item.onHand - item.allocated;
      const demand = dailyDemand(item);
      const daysOfCover = demand > 0 ? Math.round(free / demand) : 999;
      const klass = abc.get(item.code) ?? "C";
      // EOQ-style suggestion: refill to max level, or 30 days of cover minimum.
      const suggestedQty = Math.max(0, Math.round(Math.max(item.maxLevel - free, demand * 30)));
      const status: StockSignal["status"] =
        free <= 0
          ? "stockout"
          : free <= item.reorder * 0.5
            ? "critical"
            : free <= item.reorder
              ? "watch"
              : item.maxLevel > 0 && free > item.maxLevel * 1.5
                ? "excess"
                : "healthy";
      const risk = clamp(
        Math.round(
          (status === "stockout" ? 95 : status === "critical" ? 78 : status === "watch" ? 55 : 15) +
            (klass === "A" ? 8 : klass === "B" ? 3 : 0),
        ),
      );
      return {
        item,
        free,
        daysOfCover,
        stockoutOn: daysOfCover < 120 ? new Date(Date.now() + daysOfCover * DAY).toISOString().slice(0, 10) : undefined,
        risk,
        abc: klass,
        suggestedQty,
        status,
      };
    })
    .sort((a, b) => b.risk - a.risk);
}

/** Working-capital view: excess, slow-moving and dead stock exposure. */
export function excessAnalysis(s: InventoryState) {
  const signals = stockSignals(s);
  const excess = signals.filter((x) => x.status === "excess");
  const excessValue = excess.reduce((a, x) => a + Math.max(0, x.free - x.item.maxLevel) * x.item.stdCost, 0);
  const dead = s.stock.filter((r) => r.status === "quality-hold" || (r.qty > 0 && !r.projectCode && r.value > 0 && r.status === "reserved"));
  const totalValue = s.stock.reduce((a, r) => a + r.value, 0);
  return {
    excess,
    excessValue: Math.round(excessValue),
    excessPct: totalValue ? Math.round((excessValue / totalValue) * 100) : 0,
    blockedValue: dead.reduce((a, r) => a + r.value, 0),
    totalValue,
  };
}

/** Batches at or nearing end of shelf life. */
export function expiryRisk(s: InventoryState) {
  return s.batches
    .map((b) => ({ batch: b, daysLeft: until(b.expiryDate) }))
    .filter((x) => x.daysLeft <= 60 || x.batch.status === "expired" || x.batch.status === "expiring")
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Inventory record accuracy from posted cycle counts. */
export function countAccuracy(s: InventoryState) {
  const done = s.counts.filter((c) => c.status === "posted" || c.status === "reconciled");
  const accuracy = done.length ? Math.round(100 - done.reduce((a, c) => a + c.variancePct, 0) / done.length) : 100;
  const neverCounted = s.stores.filter((st) => !s.counts.some((c) => c.storeCode === st.code));
  return { accuracy: clamp(accuracy), done: done.length, open: s.counts.filter((c) => c.status !== "posted"), neverCounted };
}

/** Store utilisation and rebalancing candidates. */
export function storeBalance(s: InventoryState) {
  const over = s.stores.filter((st) => st.capacityUsedPct >= 85);
  const under = s.stores.filter((st) => st.capacityUsedPct <= 40);
  return { over, under };
}

/** Project material readiness — allocated vs available for project-tagged stock. */
export function projectReadiness(s: InventoryState) {
  const byProject = new Map<string, { value: number; rows: number; shortRows: number }>();
  s.stock.forEach((r) => {
    if (!r.projectCode) return;
    const cur = byProject.get(r.projectCode) ?? { value: 0, rows: 0, shortRows: 0 };
    cur.value += r.value;
    cur.rows += 1;
    if (r.qty <= 0 || r.status === "quality-hold") cur.shortRows += 1;
    byProject.set(r.projectCode, cur);
  });
  return [...byProject.entries()]
    .map(([code, v]) => ({ code, ...v, readinessPct: v.rows ? Math.round(((v.rows - v.shortRows) / v.rows) * 100) : 100 }))
    .sort((a, b) => a.readinessPct - b.readinessPct);
}

/** Ranked next-best actions for the Inventory Copilot, each with a one-click fix. */
export function inventoryActions(s: InventoryState): AiAction[] {
  const out: AiAction[] = [];
  const signals = stockSignals(s);
  const excess = excessAnalysis(s);
  const expiry = expiryRisk(s);
  const counts = countAccuracy(s);
  const balance = storeBalance(s);

  const critical = signals.filter((x) => x.status === "stockout" || x.status === "critical");
  if (critical.length) {
    const top = critical[0]!;
    out.push({
      id: "inv-replenish",
      severity: "high",
      title: `${critical.length} items below safety stock`,
      detail: `${top.item.code} — ${top.item.description}: ${top.free} ${top.item.uom} free, ${top.daysOfCover} days of cover${top.stockoutOn ? `, projected stock-out ${top.stockoutOn}` : ""} (class ${top.abc}).`,
      impact: `Suggested buy quantity ${top.suggestedQty} ${top.item.uom}`,
      cta: "Raise requisition",
      run: () => {
        upsertProcurement("requisitions", {
          code: `PR-AI-${Date.now().toString().slice(-5)}`,
          title: `Replenishment — ${top.item.description}`,
          requestedBy: "Inventory Copilot",
          department: "Stores",
          needBy: new Date(Date.now() + 14 * DAY).toISOString().slice(0, 10),
          priority: top.status === "stockout" ? "critical" : "high",
          status: "pending",
          approver: "Purchase Head",
          totalEst: Math.round(top.suggestedQty * top.item.stdCost),
          lines: [
            {
              id: crypto.randomUUID(),
              itemCode: top.item.code,
              description: top.item.description,
              qty: top.suggestedQty,
              uom: top.item.uom,
              estRate: top.item.stdCost,
              needBy: new Date(Date.now() + 14 * DAY).toISOString().slice(0, 10),
            },
          ],
          notes: "Auto-generated from stock-out forecast",
        });
        return `Replenishment requisition raised for ${top.item.code}`;
      },
    });
  }

  const expired = expiry.filter((x) => x.daysLeft <= 0);
  if (expiry.length) {
    const top = expiry[0]!;
    out.push({
      id: "inv-expiry",
      severity: expired.length ? "high" : "medium",
      title: `${expiry.length} batches expiring or expired`,
      detail: `${top.batch.batchNo} (${top.batch.description}) — ${top.daysLeft <= 0 ? `expired ${Math.abs(top.daysLeft)} days ago` : `${top.daysLeft} days left`}, ${top.batch.qty} ${top.batch.uom} in ${top.batch.storeCode}.`,
      impact: `${expired.length} batches must be quarantined and written off`,
      cta: "Re-evaluate",
      run: () => {
        refreshBatchStatuses();
        expired.forEach((x) => upsertInventory("batches", { id: x.batch.id, status: "quarantined" }));
        return `Batch statuses refreshed — ${expired.length} expired lots quarantined`;
      },
    });
  }

  if (excess.excessPct >= 10) {
    out.push({
      id: "inv-excess",
      severity: "medium",
      title: `₹${excess.excessValue.toLocaleString("en-IN")} tied up in excess stock`,
      detail: `${excess.excess.length} items sit above 1.5× their maximum level — ${excess.excessPct}% of total inventory value.`,
      impact: "Redeploy to projects or defer the next replenishment cycle",
    });
  }

  if (balance.over.length && balance.under.length) {
    const from = balance.over[0]!;
    const to = balance.under[0]!;
    const candidate = s.stock.find((r) => r.storeCode === from.code && r.qty > 0);
    out.push({
      id: "inv-rebalance",
      severity: "low",
      title: `${from.name} at ${from.capacityUsedPct}% capacity`,
      detail: `Rebalance to ${to.name} (${to.capacityUsedPct}% used) to relieve congestion at goods-in.`,
      impact: candidate ? `Suggested move: ${candidate.itemCode}` : undefined,
      cta: candidate ? "Draft transfer" : undefined,
      run: candidate
        ? () => {
            upsertInventory("transfers", {
              type: "transfer",
              itemCode: candidate.itemCode,
              description: candidate.description,
              qty: Math.max(1, Math.round(candidate.qty * 0.3)),
              uom: candidate.uom,
              fromStore: from.code,
              toStore: to.code,
              requestedBy: "Inventory Copilot",
              status: "draft",
              reason: "Capacity rebalancing recommended by AI",
            });
            return `Draft transfer created from ${from.name} to ${to.name}`;
          }
        : undefined,
    });
  }

  if (counts.accuracy < 97 || counts.neverCounted.length) {
    const store = counts.neverCounted[0];
    out.push({
      id: "inv-count",
      severity: counts.accuracy < 95 ? "high" : "medium",
      title: `Record accuracy at ${counts.accuracy}%`,
      detail: counts.neverCounted.length
        ? `${counts.neverCounted.length} stores have never been cycle counted (${counts.neverCounted.map((x) => x.name).slice(0, 2).join(", ")}).`
        : `${counts.open.length} counts still open with unreconciled variances.`,
      impact: "Below the 98% enterprise target for perpetual inventory",
      cta: store ? "Schedule count" : undefined,
      run: store
        ? () => {
            upsertInventory("counts", {
              storeCode: store.code,
              storeName: store.name,
              scheduledFor: new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10),
              auditor: "Stores Audit",
              status: "planned",
              itemsPlanned: Math.max(10, s.stock.filter((r) => r.storeCode === store.code).length),
              itemsCounted: 0,
              variancesFound: 0,
              varianceValue: 0,
            });
            return `Cycle count scheduled for ${store.name}`;
          }
        : undefined,
    });
  }

  const readiness = projectReadiness(s).filter((p) => p.readinessPct < 100);
  if (readiness.length) {
    const p = readiness[0]!;
    out.push({
      id: "inv-project",
      severity: "medium",
      title: `Material readiness gap on ${p.code}`,
      detail: `${p.shortRows} of ${p.rows} reserved lines are short or on quality hold — readiness ${p.readinessPct}%.`,
      impact: "Downstream production schedule at risk",
    });
  }

  return out;
}
