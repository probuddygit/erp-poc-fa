// Deterministic predictive analytics across modules.
// Every number here is computed from live store data — no model output, no guesses.
import { projectsStore } from "@/lib/projects/store";
import { crm } from "@/lib/crm/store";
import { procurement } from "@/lib/procurement/store";
import { inventory } from "@/lib/inventory/store";
import { quality } from "@/lib/quality/store";
import { finance } from "@/lib/finance/store";

const DAY = 86400000;

/** Least-squares slope/intercept over evenly spaced points. */
export function linearTrend(values: number[]) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  const slope = den ? num / den : 0;
  return { slope, intercept: meanY - slope * meanX };
}

export function projectNext(values: number[], stepsAhead = 1) {
  const { slope, intercept } = linearTrend(values);
  return Math.max(0, intercept + slope * (values.length - 1 + stepsAhead));
}

export type ProjectForecast = {
  code: string;
  name: string;
  id: string;
  progress: number;
  plannedPct: number;
  spi: number;
  cpi: number;
  eac: number;
  budget: number;
  varianceAtCompletion: number;
  forecastFinish: string;
  slipDays: number;
  onTimeProbability: number;
  risk: "low" | "medium" | "high";
};

export function projectForecasts(): ProjectForecast[] {
  const { projects } = projectsStore.get();
  const today = Date.now();
  return projects
    .filter((p) => p.status !== "closed")
    .map((p) => {
      const start = new Date(p.startDate).getTime();
      const end = new Date(p.endDate).getTime();
      const span = Math.max(DAY, end - start);
      const plannedPct = Math.max(0, Math.min(100, ((today - start) / span) * 100));
      const spi = plannedPct > 0 ? p.progress / plannedPct : 1;
      const earned = p.budget * (p.progress / 100);
      const cpi = p.spent > 0 ? earned / p.spent : 1;
      const eac = cpi > 0 ? p.budget / cpi : p.budget;
      // Forecast finish = start + planned duration / SPI (capped to a sane band).
      const factor = Math.max(0.5, Math.min(2.5, spi > 0 ? 1 / spi : 2.5));
      const forecastEnd = start + span * factor;
      const slipDays = Math.round((forecastEnd - end) / DAY);
      const onTimeProbability = Math.max(
        2,
        Math.min(98, Math.round(100 - Math.max(0, slipDays) * 2.5 - (p.rag === "red" ? 20 : p.rag === "amber" ? 8 : 0))),
      );
      return {
        code: p.code,
        name: p.name,
        id: p.id,
        progress: p.progress,
        plannedPct: Number(plannedPct.toFixed(1)),
        spi: Number(spi.toFixed(2)),
        cpi: Number(cpi.toFixed(2)),
        eac: Math.round(eac),
        budget: p.budget,
        varianceAtCompletion: Math.round(p.budget - eac),
        forecastFinish: new Date(forecastEnd).toISOString().slice(0, 10),
        slipDays,
        onTimeProbability,
        risk: (slipDays > 21 || cpi < 0.9 ? "high" : slipDays > 7 || cpi < 0.98 ? "medium" : "low") as ProjectForecast["risk"],
      };
    })
    .sort((a, b) => b.slipDays - a.slipDays);
}

export type RevenueForecast = {
  months: { month: string; weightedPipeline: number; backlogBurn: number; total: number }[];
  weightedPipelineTotal: number;
  bestCase: number;
  commit: number;
  winRatePct: number;
};

function monthKey(d: Date) {
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export function revenueForecast(monthsAhead = 6): RevenueForecast {
  const state = crm.get();
  const { projects } = projectsStore.get();
  const now = new Date();
  const buckets: RevenueForecast["months"] = [];

  for (let i = 0; i < monthsAhead; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const weighted = state.opportunities
      .filter((o) => {
        const t = new Date(o.expectedClose).getTime();
        return t >= d.getTime() && t < next.getTime();
      })
      .reduce((a, o) => a + o.value * (o.probability / 100), 0);

    // Backlog burn: remaining project value spread across remaining months.
    const burn = projects
      .filter((p) => p.status !== "closed")
      .reduce((a, p) => {
        const end = new Date(p.endDate).getTime();
        const monthsLeft = Math.max(1, Math.ceil((end - now.getTime()) / (30 * DAY)));
        if (d.getTime() > end) return a;
        return a + (p.value * (1 - p.progress / 100)) / monthsLeft;
      }, 0);

    buckets.push({
      month: monthKey(d),
      weightedPipeline: Math.round(weighted),
      backlogBurn: Math.round(burn),
      total: Math.round(weighted + burn),
    });
  }

  const won = state.oas.filter((o) => o.status === "approved").length;
  const lost = state.opportunities.filter((o) => o.stage === "lost").length;
  const winRatePct = won + lost > 0 ? (won / (won + lost)) * 100 : 0;

  return {
    months: buckets,
    weightedPipelineTotal: Math.round(state.opportunities.reduce((a, o) => a + o.value * (o.probability / 100), 0)),
    bestCase: Math.round(state.opportunities.reduce((a, o) => a + o.value, 0)),
    commit: Math.round(
      state.opportunities.filter((o) => o.probability >= 70).reduce((a, o) => a + o.value, 0),
    ),
    winRatePct: Number(winRatePct.toFixed(1)),
  };
}

export type CashForecast = {
  buckets: { bucket: string; inflow: number; outflow: number; net: number }[];
  arOutstanding: number;
  apOutstanding: number;
  overdueAr: number;
  overdueAp: number;
  net30: number;
  net90: number;
};

export function cashForecast(): CashForecast {
  const { arInvoices, apBills } = finance.get();
  const today = Date.now();
  const bands = [
    { bucket: "Overdue", from: -Infinity, to: 0 },
    { bucket: "0-30 days", from: 0, to: 30 },
    { bucket: "31-60 days", from: 30, to: 60 },
    { bucket: "61-90 days", from: 60, to: 90 },
    { bucket: "90+ days", from: 90, to: Infinity },
  ];

  const openAr = arInvoices.filter((i) => i.status !== "paid" && i.status !== "void");
  const openAp = apBills.filter((b) => b.status !== "paid");

  const buckets = bands.map((b) => {
    const inflow = openAr
      .filter((i) => {
        const days = (new Date(i.dueAt).getTime() - today) / DAY;
        return days >= b.from && days < b.to;
      })
      .reduce((a, i) => a + (i.amount + i.gst - i.received), 0);
    const outflow = openAp
      .filter((i) => {
        const days = (new Date(i.dueAt).getTime() - today) / DAY;
        return days >= b.from && days < b.to;
      })
      .reduce((a, i) => a + (i.amount + i.gst - i.paid), 0);
    return {
      bucket: b.bucket,
      inflow: Math.round(inflow),
      outflow: Math.round(outflow),
      net: Math.round(inflow - outflow),
    };
  });

  const sumTo = (days: number) =>
    buckets
      .filter((_, idx) => idx <= bands.findIndex((b) => b.to === days))
      .reduce((a, b) => a + b.net, 0);

  return {
    buckets,
    arOutstanding: Math.round(openAr.reduce((a, i) => a + (i.amount + i.gst - i.received), 0)),
    apOutstanding: Math.round(openAp.reduce((a, i) => a + (i.amount + i.gst - i.paid), 0)),
    overdueAr: buckets[0]?.inflow ?? 0,
    overdueAp: buckets[0]?.outflow ?? 0,
    net30: sumTo(30),
    net90: sumTo(90),
  };
}

export type StockRisk = {
  itemCode: string;
  description: string;
  available: number;
  reorder: number;
  dailyBurn: number;
  daysToStockout: number;
  suggestedOrderQty: number;
  severity: "critical" | "watch" | "ok";
};

export function stockRisks(): StockRisk[] {
  const { items, transfers } = inventory.get();
  const horizonDays = 90;
  const since = Date.now() - horizonDays * DAY;

  return items
    .filter((i) => i.active)
    .map((i) => {
      const issued = transfers
        .filter(
          (t) =>
            t.itemCode === i.code &&
            (t.type === "issue" || t.type === "transfer") &&
            new Date(t.createdAt).getTime() >= since,
        )
        .reduce((a, t) => a + t.qty, 0);
      // Fallback burn: assume reorder level covers ~30 days of demand.
      const dailyBurn = issued > 0 ? issued / horizonDays : i.reorder > 0 ? i.reorder / 30 : 0;
      const available = i.onHand - i.allocated;
      const daysToStockout = dailyBurn > 0 ? Math.max(0, Math.round(available / dailyBurn)) : 999;
      const suggestedOrderQty = Math.max(0, Math.round(i.maxLevel > 0 ? i.maxLevel - available : i.reorder * 2 - available));
      return {
        itemCode: i.code,
        description: i.description,
        available,
        reorder: i.reorder,
        dailyBurn: Number(dailyBurn.toFixed(2)),
        daysToStockout,
        suggestedOrderQty,
        severity: (daysToStockout <= 14 ? "critical" : daysToStockout <= 30 ? "watch" : "ok") as StockRisk["severity"],
      };
    })
    .sort((a, b) => a.daysToStockout - b.daysToStockout);
}

export type QualityForecast = {
  monthly: { month: string; inspections: number; failures: number; ncrs: number; ppm: number }[];
  currentPpm: number;
  forecastPpm: number;
  trend: "improving" | "worsening" | "flat";
  openNcrs: number;
  overdueCapas: number;
  gaugesDueIn30: number;
  costOfPoorQuality: number;
};

export function qualityForecast(): QualityForecast {
  const { inspections, ncrs, capas, gauges } = quality.get();
  const now = new Date();
  const monthly: QualityForecast["monthly"] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const within = (iso?: string) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= d.getTime() && t < next.getTime();
    };
    const insp = inspections.filter((x) => within(x.completedAt ?? x.scheduledFor));
    const fails = insp.filter((x) => x.status === "failed");
    const qty = insp.reduce((a, x) => a + (x.qty || 0), 0);
    const defective = insp.reduce(
      (a, x) => a + (x.qty || 0) * (1 - (x.passRate ?? 100) / 100),
      0,
    );
    monthly.push({
      month: monthKey(d),
      inspections: insp.length,
      failures: fails.length,
      ncrs: ncrs.filter((n) => within(n.raisedAt)).length,
      ppm: qty > 0 ? Math.round((defective / qty) * 1e6) : 0,
    });
  }

  const ppmSeries = monthly.map((m) => m.ppm);
  const currentPpm = ppmSeries[ppmSeries.length - 1] ?? 0;
  const forecastPpm = Math.round(projectNext(ppmSeries, 1));
  const { slope } = linearTrend(ppmSeries);

  return {
    monthly,
    currentPpm,
    forecastPpm,
    trend: slope < -50 ? "improving" : slope > 50 ? "worsening" : "flat",
    openNcrs: ncrs.filter((n) => n.status !== "closed").length,
    overdueCapas: capas.filter(
      (c) => c.status !== "closed" && new Date(c.targetClose).getTime() < Date.now(),
    ).length,
    gaugesDueIn30: gauges.filter(
      (g) => new Date(g.nextDue).getTime() - Date.now() < 30 * DAY && g.status !== "out-of-service",
    ).length,
    costOfPoorQuality: Math.round(ncrs.reduce((a, n) => a + (n.costImpact || 0), 0)),
  };
}

export type SupplierRisk = {
  vendorName: string;
  openPos: number;
  openValue: number;
  latePos: number;
  otdPct: number;
  avgDelayDays: number;
  predictedLateValue: number;
};

export function supplierRisks(): SupplierRisk[] {
  const { pos } = procurement.get();
  const today = Date.now();
  const byVendor = new Map<string, SupplierRisk>();

  for (const po of pos) {
    if (po.status === "cancelled") continue;
    const key = po.vendorName;
    const row =
      byVendor.get(key) ??
      ({
        vendorName: key,
        openPos: 0,
        openValue: 0,
        latePos: 0,
        otdPct: 100,
        avgDelayDays: 0,
        predictedLateValue: 0,
      } satisfies SupplierRisk);

    const open = po.status !== "closed" && po.status !== "received";
    const delayDays = Math.round((today - new Date(po.promisedDate).getTime()) / DAY);
    if (open) {
      row.openPos += 1;
      row.openValue += po.amount - (po.received || 0);
      if (delayDays > 0) {
        row.latePos += 1;
        row.avgDelayDays += delayDays;
        row.predictedLateValue += po.amount - (po.received || 0);
      }
    }
    byVendor.set(key, row);
  }

  return [...byVendor.values()]
    .map((r) => ({
      ...r,
      openValue: Math.round(r.openValue),
      predictedLateValue: Math.round(r.predictedLateValue),
      avgDelayDays: r.latePos ? Math.round(r.avgDelayDays / r.latePos) : 0,
      otdPct: r.openPos ? Number((((r.openPos - r.latePos) / r.openPos) * 100).toFixed(1)) : 100,
    }))
    .sort((a, b) => b.predictedLateValue - a.predictedLateValue);
}

export function forecastBundle() {
  return {
    projects: projectForecasts(),
    revenue: revenueForecast(),
    cash: cashForecast(),
    stock: stockRisks().filter((s) => s.severity !== "ok").slice(0, 15),
    quality: qualityForecast(),
    suppliers: supplierRisks().slice(0, 10),
  };
}
