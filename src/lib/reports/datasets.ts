/**
 * Live dataset registry for the Reports module.
 * Every ERP module store is exposed as a set of queryable datasets so reports,
 * the ad-hoc builder and drill-downs always read real, current data.
 */
import { crm } from "@/lib/crm/store";
import { projectsStore } from "@/lib/projects/store";
import { plmStore } from "@/lib/plm/store";
import { procurement } from "@/lib/procurement/store";
import { inventory } from "@/lib/inventory/store";
import { quality } from "@/lib/quality/store";
import { finance } from "@/lib/finance/store";
import { hr } from "@/lib/hr/store";
import { gstStore } from "@/lib/gst/store";
import { adminStore } from "@/lib/admin/store";
import { mdmStore } from "@/lib/mdm/store";

export type Row = Record<string, unknown>;

export interface DatasetDef {
  id: string;
  module: string;
  label: string;
  get: () => Row[];
}

function safe(fn: () => unknown): Row[] {
  try {
    const v = fn();
    return Array.isArray(v) ? (v as Row[]) : [];
  } catch {
    return [];
  }
}

function pack(module: string, get: () => Record<string, unknown>, keys: [string, string][]): DatasetDef[] {
  return keys.map(([key, label]) => ({
    id: `${module}.${key}`,
    module,
    label,
    get: () => safe(() => (get() as Record<string, unknown>)[key]),
  }));
}

export const DATASETS: DatasetDef[] = [
  ...pack("CRM", () => crm.get() as unknown as Record<string, unknown>, [
    ["customers", "Customers"], ["leads", "Leads"], ["opportunities", "Opportunities"],
    ["rfqs", "RFQs"], ["proposals", "Proposals"], ["quotations", "Quotations"],
    ["oas", "Order Acceptances"], ["salesOrders", "Sales Orders"], ["activities", "Activities"],
  ]),
  ...pack("Projects", () => projectsStore.get() as unknown as Record<string, unknown>, [
    ["projects", "Projects"], ["milestones", "Milestones"], ["wbs", "WBS Tasks"],
    ["risks", "Risks"], ["issues", "Issues"], ["changes", "Change Requests"],
    ["budget", "Budget Lines"], ["team", "Project Team"], ["docs", "Project Documents"],
  ]),
  ...pack("Engineering", () => plmStore.get() as unknown as Record<string, unknown>, [
    ["items", "Engineering Items"], ["parts", "Parts"], ["bom", "BOM Nodes"],
    ["drawings", "Drawings"], ["ecrs", "ECRs"], ["ecns", "ECNs"],
    ["reviews", "Design Reviews"], ["workOrders", "Work Orders"], ["designDocs", "Design Documents"],
  ]),
  ...pack("Procurement", () => procurement.get() as unknown as Record<string, unknown>, [
    ["vendors", "Vendors"], ["requisitions", "Purchase Requisitions"], ["rfqs", "Purchase RFQs"],
    ["pos", "Purchase Orders"], ["grns", "GRNs"],
  ]),
  ...pack("Inventory", () => inventory.get() as unknown as Record<string, unknown>, [
    ["items", "Inventory Items"], ["stock", "Stock Ledger"], ["stores", "Stores"],
    ["bins", "Bins"], ["batches", "Batches / Lots"], ["transfers", "Transfers"], ["counts", "Cycle Counts"],
  ]),
  ...pack("Quality", () => quality.get() as unknown as Record<string, unknown>, [
    ["inspections", "Inspections"], ["ncrs", "Non-Conformances"], ["capas", "CAPAs"],
    ["checklists", "Quality Plans"], ["gauges", "Gauges"], ["suppliers", "Supplier Scores"],
  ]),
  ...pack("Finance", () => finance.get() as unknown as Record<string, unknown>, [
    ["arInvoices", "AR Invoices"], ["apBills", "AP Bills"], ["journals", "Journals"],
    ["accounts", "Chart of Accounts"], ["projectCosts", "Project Costs"],
    ["bankAccounts", "Bank Accounts"], ["bankTxns", "Bank Transactions"], ["taxLedgers", "Tax Ledgers"],
  ]),
  ...pack("HR", () => hr.get() as unknown as Record<string, unknown>, [
    ["employees", "Employees"], ["attendance", "Attendance"], ["leaves", "Leave Requests"],
    ["timesheets", "Timesheets"], ["payrollRuns", "Payroll Runs"], ["payslips", "Payslips"],
    ["trainings", "Trainings"], ["reviews", "Performance Reviews"], ["skills", "Skills"],
  ]),
  ...pack("Compliance", () => gstStore.get() as unknown as Record<string, unknown>, [
    ["returns", "GST Returns"], ["invoices", "GST Invoices"], ["eWayBills", "e-Way Bills"],
    ["reconciliations", "GSTR-2B Reconciliation"],
  ]),
  ...pack("Administration", () => adminStore.get() as unknown as Record<string, unknown>, [
    ["users", "Users"], ["branches", "Branches"], ["workflows", "Approval Workflows"],
    ["series", "Numbering Series"], ["audit", "Audit Log"], ["permissions", "Permission Matrix"],
  ]),
  ...pack("Master Data", () => mdmStore.get() as unknown as Record<string, unknown>, [
    ["records", "Master Records"],
  ]),
].filter((d) => d.id !== "");

export function findDataset(id: string) {
  return DATASETS.find((d) => d.id === id);
}

export const DATASET_MODULES = Array.from(new Set(DATASETS.map((d) => d.module)));

/** Infer displayable, scalar columns from a set of rows. */
export function inferColumns(rows: Row[], limit = 40): string[] {
  const seen = new Map<string, number>();
  rows.slice(0, 50).forEach((r) => {
    Object.entries(r).forEach(([k, v]) => {
      if (k === "id" || k.endsWith("Id") || k === "attachments") return;
      if (v !== null && typeof v === "object") return;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    });
  });
  return Array.from(seen.keys()).slice(0, limit);
}

export function labelize(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bInr\b/i, "INR")
    .replace(/\bPct\b/i, "%");
}
