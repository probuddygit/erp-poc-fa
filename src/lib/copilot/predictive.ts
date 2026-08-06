// Predictive / forecasting responses for the copilot — deterministic maths only.
import type { CopilotResponse } from "./engine";
import {
  cashForecast,
  projectForecasts,
  qualityForecast,
  revenueForecast,
  stockRisks,
  supplierRisks,
} from "./forecast";

const inr = (n: number) =>
  n >= 1e7
    ? `₹${(n / 1e7).toFixed(2)}Cr`
    : n >= 1e5
      ? `₹${(n / 1e5).toFixed(1)}L`
      : `₹${Math.round(n).toLocaleString("en-IN")}`;

function has(q: string, ...keys: string[]) {
  const s = q.toLowerCase();
  return keys.some((k) => s.includes(k));
}

function scheduleForecast(): CopilotResponse {
  const rows = projectForecasts();
  const late = rows.filter((r) => r.slipDays > 0);
  const avgSpi = rows.length ? rows.reduce((a, r) => a + r.spi, 0) / rows.length : 1;
  const avgCpi = rows.length ? rows.reduce((a, r) => a + r.cpi, 0) / rows.length : 1;
  const vac = rows.reduce((a, r) => a + r.varianceAtCompletion, 0);

  return {
    headline: `Delivery forecast: ${late.length} of ${rows.length} projects predicted to finish late`,
    summary: `Earned-value forecast. Portfolio SPI ${avgSpi.toFixed(2)}, CPI ${avgCpi.toFixed(2)}. Estimate-at-completion implies ${
      vac < 0 ? `an overrun of ${inr(Math.abs(vac))}` : `a saving of ${inr(vac)}`
    } against budget.`,
    cards: [
      {
        kind: "kpi",
        label: "Portfolio SPI",
        value: avgSpi.toFixed(2),
        tone: avgSpi < 0.95 ? "danger" : avgSpi < 1 ? "warning" : "positive",
      },
      {
        kind: "kpi",
        label: "Portfolio CPI",
        value: avgCpi.toFixed(2),
        tone: avgCpi < 0.95 ? "danger" : avgCpi < 1 ? "warning" : "positive",
      },
      {
        kind: "kpi",
        label: "Predicted late",
        value: String(late.length),
        tone: late.length ? "warning" : "positive",
      },
      {
        kind: "kpi",
        label: "Variance at completion",
        value: inr(Math.abs(vac)),
        tone: vac < 0 ? "danger" : "positive",
      },
      {
        kind: "chart",
        chart: "bar",
        title: "Predicted schedule slip (days)",
        data: rows.slice(0, 8).map((r) => ({
          name: r.code,
          value: r.slipDays,
          tone: r.slipDays > 21 ? "danger" : r.slipDays > 7 ? "warning" : "positive",
        })),
      },
      {
        kind: "table",
        title: "Earned-value forecast by project",
        columns: [
          { key: "code", label: "Project" },
          { key: "spi", label: "SPI", align: "right" },
          { key: "cpi", label: "CPI", align: "right" },
          { key: "eac", label: "EAC", align: "right" },
          { key: "finish", label: "Forecast finish" },
          { key: "slip", label: "Slip (d)", align: "right" },
          { key: "otd", label: "On-time prob.", align: "right" },
        ],
        rows: rows.slice(0, 10).map((r) => ({
          code: r.code,
          spi: r.spi.toFixed(2),
          cpi: r.cpi.toFixed(2),
          eac: inr(r.eac),
          finish: r.forecastFinish,
          slip: r.slipDays,
          otd: `${r.onTimeProbability}%`,
        })),
        emptyText: "No active projects to forecast.",
      },
    ],
    references: rows
      .slice(0, 5)
      .map((r) => ({ label: `${r.code} · ${r.name}`, to: `/projects/${r.id}` })),
    followUps: [
      "Forecast revenue for next 6 months",
      "Forecast cash flow",
      "Which items will stock out?",
    ],
  };
}

function revenueForecastCard(): CopilotResponse {
  const f = revenueForecast();
  return {
    headline: `Weighted revenue forecast ${inr(f.months.reduce((a, m) => a + m.total, 0))} over 6 months`,
    summary: `Probability-weighted pipeline ${inr(f.weightedPipelineTotal)} (best case ${inr(f.bestCase)}, commit ${inr(
      f.commit,
    )}). Historic win rate ${f.winRatePct}%. Backlog burn is spread across remaining project duration.`,
    cards: [
      { kind: "kpi", label: "Weighted pipeline", value: inr(f.weightedPipelineTotal) },
      { kind: "kpi", label: "Commit (≥70%)", value: inr(f.commit), tone: "positive" },
      { kind: "kpi", label: "Best case", value: inr(f.bestCase) },
      {
        kind: "kpi",
        label: "Win rate",
        value: `${f.winRatePct}%`,
        tone: f.winRatePct >= 40 ? "positive" : "warning",
      },
      {
        kind: "chart",
        chart: "bar",
        title: "Forecast revenue by month (₹L)",
        data: f.months.map((m) => ({ name: m.month, value: Math.round(m.total / 1e5) })),
      },
      {
        kind: "table",
        title: "Monthly build-up",
        columns: [
          { key: "month", label: "Month" },
          { key: "pipeline", label: "Weighted pipeline", align: "right" },
          { key: "burn", label: "Backlog burn", align: "right" },
          { key: "total", label: "Total", align: "right" },
        ],
        rows: f.months.map((m) => ({
          month: m.month,
          pipeline: inr(m.weightedPipeline),
          burn: inr(m.backlogBurn),
          total: inr(m.total),
        })),
      },
    ],
    references: [
      { label: "Revenue lifecycle", to: "/crm" },
      { label: "Project portfolio", to: "/projects" },
    ],
    followUps: [
      "Forecast cash flow",
      "Which projects will finish late?",
      "Predict quality defect rate",
    ],
  };
}

function cashForecastCard(): CopilotResponse {
  const f = cashForecast();
  return {
    headline: `Net cash position ${inr(f.net90)} projected over 90 days`,
    summary: `AR outstanding ${inr(f.arOutstanding)} (${inr(f.overdueAr)} overdue) against AP ${inr(f.apOutstanding)} (${inr(
      f.overdueAp,
    )} overdue). 30-day net ${inr(f.net30)}.`,
    cards: [
      { kind: "kpi", label: "AR outstanding", value: inr(f.arOutstanding) },
      { kind: "kpi", label: "AP outstanding", value: inr(f.apOutstanding) },
      {
        kind: "kpi",
        label: "Overdue receivables",
        value: inr(f.overdueAr),
        tone: f.overdueAr > 0 ? "danger" : "positive",
      },
      {
        kind: "kpi",
        label: "Net 30-day",
        value: inr(f.net30),
        tone: f.net30 < 0 ? "danger" : "positive",
      },
      {
        kind: "chart",
        chart: "bar",
        title: "Net cash by ageing bucket (₹L)",
        data: f.buckets.map((b) => ({
          name: b.bucket,
          value: Math.round(b.net / 1e5),
          tone: b.net < 0 ? "danger" : "positive",
        })),
      },
      {
        kind: "table",
        title: "Inflow vs outflow",
        columns: [
          { key: "bucket", label: "Bucket" },
          { key: "in", label: "Inflow", align: "right" },
          { key: "out", label: "Outflow", align: "right" },
          { key: "net", label: "Net", align: "right" },
        ],
        rows: f.buckets.map((b) => ({
          bucket: b.bucket,
          in: inr(b.inflow),
          out: inr(b.outflow),
          net: inr(b.net),
        })),
      },
    ],
    references: [
      { label: "Receivables", to: "/finance/ar" },
      { label: "Payables", to: "/finance/ap" },
    ],
    followUps: [
      "Forecast revenue for next 6 months",
      "Which suppliers will deliver late?",
      "Show budget variance",
    ],
  };
}

function stockForecastCard(): CopilotResponse {
  const rows = stockRisks();
  const critical = rows.filter((r) => r.severity === "critical");
  const watch = rows.filter((r) => r.severity === "watch");
  return {
    headline: `${critical.length} items predicted to stock out within 14 days`,
    summary: `Consumption run-rate over the last 90 days projected against available stock (on-hand less allocated). ${watch.length} further items fall below cover inside 30 days.`,
    cards: [
      {
        kind: "kpi",
        label: "Critical (<14d)",
        value: String(critical.length),
        tone: critical.length ? "danger" : "positive",
      },
      {
        kind: "kpi",
        label: "Watch (<30d)",
        value: String(watch.length),
        tone: watch.length ? "warning" : "positive",
      },
      { kind: "kpi", label: "Items tracked", value: String(rows.length) },
      {
        kind: "table",
        title: "Predicted stock-outs",
        columns: [
          { key: "item", label: "Item" },
          { key: "desc", label: "Description" },
          { key: "avail", label: "Available", align: "right" },
          { key: "burn", label: "Daily burn", align: "right" },
          { key: "days", label: "Days cover", align: "right" },
          { key: "order", label: "Suggested order", align: "right" },
        ],
        rows: [...critical, ...watch].slice(0, 10).map((r) => ({
          item: r.itemCode,
          desc: r.description,
          avail: r.available,
          burn: r.dailyBurn,
          days: r.daysToStockout >= 999 ? "—" : r.daysToStockout,
          order: r.suggestedOrderQty,
        })),
        emptyText: "No stock-out risk detected.",
      },
    ],
    references: [
      { label: "Stock ledger", to: "/inventory/stock" },
      { label: "Purchase requisitions", to: "/procurement/requisitions" },
    ],
    followUps: [
      "Which suppliers will deliver late?",
      "Forecast cash flow",
      "Predict quality defect rate",
    ],
  };
}

function qualityForecastCard(): CopilotResponse {
  const f = qualityForecast();
  return {
    headline: `Defect rate forecast ${f.forecastPpm.toLocaleString("en-IN")} PPM next month`,
    summary: `Linear trend on ${f.monthly.length} months of inspection data. Current ${f.currentPpm.toLocaleString(
      "en-IN",
    )} PPM and ${f.trend}. ${f.openNcrs} open NCRs, ${f.overdueCapas} overdue CAPAs, cost of poor quality ${inr(f.costOfPoorQuality)}.`,
    cards: [
      { kind: "kpi", label: "Current PPM", value: f.currentPpm.toLocaleString("en-IN") },
      {
        kind: "kpi",
        label: "Forecast PPM",
        value: f.forecastPpm.toLocaleString("en-IN"),
        tone: f.trend === "worsening" ? "danger" : f.trend === "improving" ? "positive" : "default",
      },
      {
        kind: "kpi",
        label: "Open NCRs",
        value: String(f.openNcrs),
        tone: f.openNcrs ? "warning" : "positive",
      },
      {
        kind: "kpi",
        label: "Gauges due (30d)",
        value: String(f.gaugesDueIn30),
        tone: f.gaugesDueIn30 ? "warning" : "positive",
      },
      {
        kind: "chart",
        chart: "bar",
        title: "Defect PPM trend",
        data: f.monthly.map((m) => ({ name: m.month, value: m.ppm, tone: "warning" })),
      },
      {
        kind: "table",
        title: "Quality run-rate",
        columns: [
          { key: "month", label: "Month" },
          { key: "insp", label: "Inspections", align: "right" },
          { key: "fail", label: "Failed", align: "right" },
          { key: "ncr", label: "NCRs", align: "right" },
          { key: "ppm", label: "PPM", align: "right" },
        ],
        rows: f.monthly.map((m) => ({
          month: m.month,
          insp: m.inspections,
          fail: m.failures,
          ncr: m.ncrs,
          ppm: m.ppm,
        })),
      },
    ],
    references: [
      { label: "Inspections", to: "/quality/inspections" },
      { label: "NCR register", to: "/quality/ncr" },
    ],
    followUps: [
      "Which suppliers will deliver late?",
      "Which items will stock out?",
      "Which projects will finish late?",
    ],
  };
}

function supplierForecastCard(): CopilotResponse {
  const rows = supplierRisks();
  const atRisk = rows.filter((r) => r.latePos > 0);
  const exposure = atRisk.reduce((a, r) => a + r.predictedLateValue, 0);
  return {
    headline: `${atRisk.length} suppliers carrying late purchase orders`,
    summary: `Open PO value at delivery risk ≈ ${inr(exposure)}. On-time delivery is measured against the promised date on each open PO.`,
    cards: [
      {
        kind: "kpi",
        label: "Suppliers at risk",
        value: String(atRisk.length),
        tone: atRisk.length ? "warning" : "positive",
      },
      {
        kind: "kpi",
        label: "Value at risk",
        value: inr(exposure),
        tone: exposure ? "danger" : "positive",
      },
      {
        kind: "kpi",
        label: "Suppliers with open POs",
        value: String(rows.filter((r) => r.openPos > 0).length),
      },
      {
        kind: "table",
        title: "Supplier delivery outlook",
        columns: [
          { key: "vendor", label: "Supplier" },
          { key: "open", label: "Open POs", align: "right" },
          { key: "late", label: "Late", align: "right" },
          { key: "otd", label: "OTD", align: "right" },
          { key: "delay", label: "Avg delay (d)", align: "right" },
          { key: "value", label: "Value at risk", align: "right" },
        ],
        rows: rows.slice(0, 10).map((r) => ({
          vendor: r.vendorName,
          open: r.openPos,
          late: r.latePos,
          otd: `${r.otdPct}%`,
          delay: r.avgDelayDays,
          value: inr(r.predictedLateValue),
        })),
        emptyText: "No open purchase orders.",
      },
    ],
    references: [
      { label: "Purchase orders", to: "/procurement/pos" },
      { label: "Vendor master", to: "/procurement/vendors" },
    ],
    followUps: ["Which items will stock out?", "Forecast cash flow", "Predict quality defect rate"],
  };
}

/** Returns a predictive response when the question is forward-looking, else null. */
export function predictiveAnswer(query: string): CopilotResponse | null {
  const q = query.toLowerCase();
  const forwardLooking = has(
    q,
    "forecast",
    "predict",
    "projection",
    "outlook",
    "will ",
    "expected",
    "eac",
    "spi",
    "cpi",
    "risk of",
  );
  if (!forwardLooking) return null;

  if (has(q, "cash", "receivable", "payable", "liquidity", "collection")) return cashForecastCard();
  if (has(q, "revenue", "sales", "pipeline", "booking", "order intake"))
    return revenueForecastCard();
  if (has(q, "stock", "inventory", "material", "shortage", "stock out", "stockout"))
    return stockForecastCard();
  if (has(q, "quality", "defect", "ppm", "ncr", "scrap", "reject")) return qualityForecastCard();
  if (has(q, "supplier", "vendor", "delivery", "procure", "po ")) return supplierForecastCard();
  return scheduleForecast();
}

export const PREDICTIVE_SUGGESTIONS = [
  "Which projects will finish late?",
  "Forecast revenue for next 6 months",
  "Forecast cash flow",
  "Which items will stock out?",
  "Predict quality defect rate",
  "Which suppliers will deliver late?",
];
