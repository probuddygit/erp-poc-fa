import type { SavedReport } from "./store";
import { DATASETS } from "./datasets";
import type { ExplorerConfig } from "@/components/reports/data-explorer";

/** Maps a report code (seeded library) to a live dataset + default shaping. */
const BY_CODE: Record<string, { datasetId: string; config?: ExplorerConfig }> = {
  "RPT-1001": { datasetId: "Projects.projects", config: { groupBy: "status", aggFn: "count", chart: "bar" } },
  "RPT-1002": { datasetId: "Projects.budget", config: { groupBy: "category", aggFn: "sum", chart: "bar" } },
  "RPT-1003": { datasetId: "CRM.opportunities", config: { groupBy: "stage", aggFn: "count", chart: "pie" } },
  "RPT-1004": { datasetId: "Procurement.pos", config: { groupBy: "vendor", aggFn: "sum", chart: "bar" } },
  "RPT-1005": { datasetId: "Inventory.stock", config: { groupBy: "store", aggFn: "sum", chart: "table" } },
  "RPT-1006": { datasetId: "Quality.inspections", config: { groupBy: "result", aggFn: "count", chart: "line" } },
  "RPT-1007": { datasetId: "Finance.arInvoices", config: { groupBy: "status", aggFn: "sum", chart: "pie" } },
  "RPT-1008": { datasetId: "Compliance.invoices", config: { chart: "table" } },
  "RPT-1009": { datasetId: "HR.employees", config: { groupBy: "department", aggFn: "count", chart: "line" } },
  "RPT-1010": { datasetId: "Engineering.ecns", config: { groupBy: "status", aggFn: "count", chart: "bar" } },
  "RPT-1011": { datasetId: "Engineering.workOrders", config: { groupBy: "status", aggFn: "count", chart: "bar" } },
  "RPT-1012": { datasetId: "Quality.suppliers", config: { chart: "table" } },
};

const MODULE_FALLBACK: Record<string, string> = {
  CRM: "CRM.opportunities",
  Projects: "Projects.projects",
  Engineering: "Engineering.ecns",
  Procurement: "Procurement.pos",
  Inventory: "Inventory.stock",
  Manufacturing: "Engineering.workOrders",
  Quality: "Quality.ncrs",
  Finance: "Finance.arInvoices",
  HR: "HR.employees",
  Cross: "Projects.projects",
};

export function bindingFor(r: SavedReport): { datasetId: string; config: ExplorerConfig } {
  if (r.datasetId) return { datasetId: r.datasetId, config: (r.query as ExplorerConfig) ?? { chart: r.chart } };
  const hit = BY_CODE[r.code];
  if (hit) return { datasetId: hit.datasetId, config: { chart: r.chart, ...hit.config } };
  const fb = MODULE_FALLBACK[r.module] ?? DATASETS[0]?.id ?? "Projects.projects";
  return { datasetId: fb, config: { chart: r.chart } };
}
