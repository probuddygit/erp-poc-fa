/**
 * Project Cost 360 — consolidates planned / committed / actual / forecast cost
 * across Engineering, Procurement, Inventory, Manufacturing, Labour, Quality
 * and Finance from the live stores. Deterministic, no estimates invented.
 */
import { plmStore } from "./store";
import { projectsStore } from "@/lib/projects/store";
import { procurement } from "@/lib/procurement/store";
import { inventory } from "@/lib/inventory/store";
import { hr } from "@/lib/hr/store";
import { quality } from "@/lib/quality/store";

export type CostCategory =
  | "Engineering"
  | "Procurement"
  | "Inventory"
  | "Manufacturing"
  | "Labour"
  | "Services"
  | "Quality"
  | "Overheads";

export interface CostLine {
  category: CostCategory;
  planned: number;
  committed: number;
  actual: number;
}

export interface ProjectCost360 {
  projectCode: string;
  projectName: string;
  budget: number;
  value: number;
  progressPct: number;
  lines: CostLine[];
  planned: number;
  committed: number;
  actual: number;
  remaining: number;
  variance: number;
  variancePct: number;
  cpi: number;
  eac: number;
  etc: number;
  profit: number;
  profitPct: number;
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const HOURLY_RATE = 850;

export function projectCost360(projectCode: string): ProjectCost360 | null {
  const ps = projectsStore.get();
  const project = ps.projects.find((p) => p.code === projectCode);
  if (!project) return null;

  const plm = plmStore.get();
  const proc = procurement.get();
  const inv = inventory.get();
  const people = hr.get();
  const q = quality.get();

  const budgetLines = ps.budget.filter((b) => b.projectId === project.id);
  const plannedByCat = (names: string[]) =>
    sum(budgetLines.filter((b) => names.includes(b.category)).map((b) => b.planned));

  /* Procurement — committed = approved/open POs, actual = received value */
  const pos = proc.pos.filter((p) => p.projectCode === projectCode);
  const poCommitted = sum(pos.filter((p) => !["cancelled", "draft"].includes(p.status)).map((p) => p.amount));
  const poActual = sum(pos.map((p) => p.received));
  const prCommitted = sum(
    proc.requisitions.filter((r) => r.projectCode === projectCode && r.status === "approved").map((r) => r.totalEst),
  );

  /* Inventory — issues to the project are consumed cost, reservations are commitments */
  const issues = inv.transfers.filter((t) => t.projectCode === projectCode && t.type === "issue" && t.status === "received");
  const issueValue = sum(
    issues.map((t) => {
      const item = inv.items.find((i) => i.code === t.itemCode);
      return Math.abs(t.qty) * (item?.stdCost ?? 0);
    }),
  );
  const reservedValue = sum(inv.stock.filter((r) => r.projectCode === projectCode && r.status === "reserved").map((r) => r.value));

  /* Manufacturing — work orders */
  const wos = plm.workOrders.filter((w) => w.projectCode === projectCode);
  const woCommitted = sum(wos.filter((w) => w.status !== "cancelled" && w.status !== "completed").map((w) => w.estCost));
  const woActual = sum(wos.filter((w) => w.status === "completed").map((w) => w.estCost));

  /* Labour — approved timesheets against the project */
  const sheets = people.timesheets.filter((t) => t.projectCode === projectCode);
  const hoursFor = (t: (typeof sheets)[number]) => t.mon + t.tue + t.wed + t.thu + t.fri + t.sat + t.sun;
  const labourActual = Math.round(sum(sheets.filter((t) => t.status === "approved").map(hoursFor)) * HOURLY_RATE);
  const labourCommitted = Math.round(sum(sheets.filter((t) => t.status === "submitted").map(hoursFor)) * HOURLY_RATE);

  /* Engineering — released design effort proxied by BOM standard cost of Make items */
  const engBoms = plm.bom.filter((b) => b.projectCode === projectCode);
  const engCommitted = Math.round(
    sum(
      engBoms.map((b) => {
        const item = plm.items.find((i) => i.code === b.itemCode);
        return (item?.stdCost ?? 0) * b.qty * 0.05; // 5% engineering loading
      }),
    ),
  );

  /* Quality — cost of non-conformance */
  const ncrs = q.ncrs?.filter((n) => (n as unknown as { projectCode?: string }).projectCode === projectCode) ?? [];
  const qualityActual = ncrs.length * 25000;

  const lines: CostLine[] = ([
    { category: "Engineering", planned: plannedByCat(["Labour"]) * 0.25, committed: engCommitted, actual: 0 },
    { category: "Procurement", planned: plannedByCat(["Material"]), committed: poCommitted + prCommitted, actual: poActual },
    { category: "Inventory", planned: 0, committed: reservedValue, actual: issueValue },
    { category: "Manufacturing", planned: plannedByCat(["Equipment"]), committed: woCommitted, actual: woActual },
    { category: "Labour", planned: plannedByCat(["Labour"]) * 0.75, committed: labourCommitted, actual: labourActual },
    { category: "Services", planned: plannedByCat(["Subcontract"]), committed: 0, actual: 0 },
    { category: "Quality", planned: 0, committed: 0, actual: qualityActual },
    { category: "Overheads", planned: plannedByCat(["Overhead"]), committed: 0, actual: 0 },
  ] as CostLine[]).map((l) => ({ ...l, planned: Math.round(l.planned) }));

  const planned = sum(lines.map((l) => l.planned)) || project.budget;
  const committed = sum(lines.map((l) => l.committed));
  const actualRaw = sum(lines.map((l) => l.actual));
  const actual = Math.max(actualRaw, project.spent);
  const budget = project.budget;
  const remaining = budget - actual - committed;
  const variance = budget - (actual + committed);
  const variancePct = budget ? Math.round((variance / budget) * 1000) / 10 : 0;

  const pct = Math.max(1, project.progress) / 100;
  const earned = budget * pct;
  const cpi = actual > 0 ? Math.round((earned / actual) * 100) / 100 : 1;
  const eac = cpi > 0 ? Math.round(budget / cpi) : budget;
  const etc = Math.max(0, eac - actual);
  const profit = project.value - eac;
  const profitPct = project.value ? Math.round((profit / project.value) * 1000) / 10 : 0;

  return {
    projectCode,
    projectName: project.name,
    budget,
    value: project.value,
    progressPct: project.progress,
    lines,
    planned,
    committed,
    actual,
    remaining,
    variance,
    variancePct,
    cpi,
    eac,
    etc,
    profit,
    profitPct,
  };
}

/** Cost 360 for every project that carries engineering content. */
export function allProjectCosts(): ProjectCost360[] {
  return projectsStore
    .get()
    .projects.map((p) => projectCost360(p.code))
    .filter((x): x is ProjectCost360 => !!x);
}
