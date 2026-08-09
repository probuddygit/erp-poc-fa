import { useSyncExternalStore } from "react";

export type ReportModule =
  | "CRM" | "Projects" | "Engineering" | "Procurement" | "Inventory"
  | "Manufacturing" | "Quality" | "Finance" | "HR" | "Cross";

export type ReportFormat = "PDF" | "Excel" | "CSV";
export type ScheduleFreq = "daily" | "weekly" | "monthly" | "quarterly";
export type RunStatus = "success" | "failed" | "running";

export interface SavedReport {
  id: string;
  code: string;
  name: string;
  module: ReportModule;
  category: "Executive" | "Operational" | "Compliance" | "Ad-hoc";
  owner: string;
  updated: string;
  runs: number;
  favorite: boolean;
  chart: "bar" | "line" | "pie" | "table";
  description: string;
  /** live dataset binding (e.g. "Projects.projects") */
  datasetId?: string;
  /** saved ad-hoc query definition */
  query?: {
    columns: string[];
    filters: { field: string; op: string; value: string }[];
    sort: { field: string; dir: "asc" | "desc" }[];
    groupBy?: string;
    aggField?: string;
    aggFn?: "count" | "sum" | "avg" | "min" | "max";
  };
}

export interface Schedule {
  id: string;
  reportId: string;
  freq: ScheduleFreq;
  nextRun: string;
  recipients: string[];
  format: ReportFormat;
  active: boolean;
  lastStatus: RunStatus;
}

export interface RunLog {
  id: string;
  reportId: string;
  when: string;
  by: string;
  format: ReportFormat;
  rows: number;
  status: RunStatus;
  sizeKb: number;
}

export interface AiNarrative {
  id: string;
  title: string;
  scope: ReportModule;
  generated: string;
  summary: string;
  insights: string[];
  tone: "positive" | "warning" | "neutral";
}

export interface ReportsState {
  reports: SavedReport[];
  schedules: Schedule[];
  runs: RunLog[];
  narratives: AiNarrative[];
}

const KEY = "faith-erp:reports:v1";

function seed(): ReportsState {
  const iso = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString(); };
  const reports: SavedReport[] = [
    { id: "r1", code: "RPT-1001", name: "Executive Command Snapshot", module: "Cross", category: "Executive", owner: "Arjun Mehta", updated: iso(-1), runs: 128, favorite: true, chart: "bar", description: "Portfolio revenue, margin and delivery health for the CxO office." },
    { id: "r2", code: "RPT-1002", name: "Project Cost & WIP Waterfall", module: "Projects", category: "Operational", owner: "Ananya Rao", updated: iso(-3), runs: 74, favorite: true, chart: "bar", description: "Contract value → billed → collected → WIP for active projects." },
    { id: "r3", code: "RPT-1003", name: "Order Book & Pipeline", module: "CRM", category: "Executive", owner: "Kavya Menon", updated: iso(-2), runs: 96, favorite: true, chart: "pie", description: "Weighted pipeline, win rate and forecast rollup." },
    { id: "r4", code: "RPT-1004", name: "Vendor Spend Pareto", module: "Procurement", category: "Operational", owner: "Karan Verma", updated: iso(-5), runs: 41, favorite: false, chart: "bar", description: "80/20 Pareto of YTD spend by vendor and category." },
    { id: "r5", code: "RPT-1005", name: "Inventory Ageing & Reorder", module: "Inventory", category: "Operational", owner: "Rohit Jadhav", updated: iso(-4), runs: 55, favorite: false, chart: "table", description: "Stock buckets, reorder alerts and slow-moving lines." },
    { id: "r6", code: "RPT-1006", name: "First-Pass Yield Trend", module: "Quality", category: "Operational", owner: "Sneha Iyer", updated: iso(-2), runs: 63, favorite: true, chart: "line", description: "FPY vs defect rate across IQC / IPQC / FQC." },
    { id: "r7", code: "RPT-1007", name: "AR Ageing & Collections", module: "Finance", category: "Compliance", owner: "Ananya Rao", updated: iso(-6), runs: 38, favorite: false, chart: "pie", description: "0/30/60/90+ receivables bucket with collections trend." },
    { id: "r8", code: "RPT-1008", name: "GSTR-1 Filing Register", module: "Finance", category: "Compliance", owner: "Ananya Rao", updated: iso(-8), runs: 12, favorite: false, chart: "table", description: "Monthly outward supplies register for GSTR-1 filing." },
    { id: "r9", code: "RPT-1009", name: "Headcount & Attrition", module: "HR", category: "Executive", owner: "Manoj Pillai", updated: iso(-7), runs: 22, favorite: false, chart: "line", description: "Rolling 6-month headcount growth and attrition risk." },
    { id: "r10", code: "RPT-1010", name: "Engineering Change Cycle", module: "Engineering", category: "Operational", owner: "Priya Sharma", updated: iso(-9), runs: 18, favorite: false, chart: "bar", description: "ECR → ECN cycle-time, backlog and impact by project." },
    { id: "r11", code: "RPT-1011", name: "OEE by Cell", module: "Manufacturing", category: "Operational", owner: "Rahul Deshpande", updated: iso(-3), runs: 44, favorite: true, chart: "bar", description: "Availability × Performance × Quality across shop-floor cells." },
    { id: "r12", code: "RPT-1012", name: "Supplier Scorecard", module: "Quality", category: "Compliance", owner: "Sneha Iyer", updated: iso(-11), runs: 9, favorite: false, chart: "table", description: "OTD, PPM and NCR count per vendor grade A/B/C." },
  ];

  const schedules: Schedule[] = [
    { id: "sc1", reportId: "r1", freq: "daily",   nextRun: iso(1), recipients: ["ceo@faith.co.in","board@faith.co.in"], format: "PDF",   active: true,  lastStatus: "success" },
    { id: "sc2", reportId: "r2", freq: "weekly",  nextRun: iso(2), recipients: ["cfo@faith.co.in","pmo@faith.co.in"],  format: "Excel", active: true,  lastStatus: "success" },
    { id: "sc3", reportId: "r3", freq: "weekly",  nextRun: iso(3), recipients: ["sales-lead@faith.co.in"],             format: "PDF",   active: true,  lastStatus: "success" },
    { id: "sc4", reportId: "r6", freq: "daily",   nextRun: iso(1), recipients: ["quality@faith.co.in"],                format: "PDF",   active: true,  lastStatus: "success" },
    { id: "sc5", reportId: "r7", freq: "monthly", nextRun: iso(6), recipients: ["ar@faith.co.in","cfo@faith.co.in"],   format: "Excel", active: true,  lastStatus: "failed" },
    { id: "sc6", reportId: "r8", freq: "monthly", nextRun: iso(9), recipients: ["gst@faith.co.in"],                    format: "Excel", active: true,  lastStatus: "success" },
    { id: "sc7", reportId: "r11", freq: "weekly", nextRun: iso(4), recipients: ["plant-head@faith.co.in"],             format: "PDF",   active: false, lastStatus: "success" },
  ];

  const runs: RunLog[] = [
    { id: "rl1", reportId: "r1",  when: iso(0), by: "system",         format: "PDF",   rows: 42,  status: "success", sizeKb: 312 },
    { id: "rl2", reportId: "r3",  when: iso(-1), by: "Kavya Menon",    format: "Excel", rows: 118, status: "success", sizeKb: 176 },
    { id: "rl3", reportId: "r2",  when: iso(-1), by: "Ananya Rao",     format: "PDF",   rows: 34,  status: "success", sizeKb: 244 },
    { id: "rl4", reportId: "r7",  when: iso(-1), by: "system",         format: "Excel", rows: 0,   status: "failed",  sizeKb: 0 },
    { id: "rl5", reportId: "r6",  when: iso(-2), by: "Sneha Iyer",     format: "PDF",   rows: 96,  status: "success", sizeKb: 208 },
    { id: "rl6", reportId: "r11", when: iso(-2), by: "Rahul Deshpande",format: "CSV",   rows: 512, status: "success", sizeKb: 44 },
    { id: "rl7", reportId: "r4",  when: iso(-3), by: "Karan Verma",    format: "Excel", rows: 220, status: "success", sizeKb: 188 },
    { id: "rl8", reportId: "r5",  when: iso(-3), by: "Rohit Jadhav",   format: "CSV",   rows: 1240,status: "success", sizeKb: 96 },
  ];

  const narratives: AiNarrative[] = [
    { id: "n1", title: "Q3 delivery on-track, watch Hyundai Cell-3", scope: "Projects", generated: iso(-1), tone: "warning",
      summary: "Portfolio delivery is trending 3.2% ahead of plan, however Hyundai BIW Cell-3 has drifted 11 days on the fixture-tryout milestone driven by ECN-2041 rework.",
      insights: ["Hyundai Cell-3 milestone slip: 11 days", "Root cause: ECN-2041 (weld gun reach)", "Mitigation: parallel tryout on backup station saves 4 days"] },
    { id: "n2", title: "Cash position healthy, AR concentration rising", scope: "Finance", generated: iso(-2), tone: "warning",
      summary: "Cash & bank balance improved 6.4% MoM, but top-3 customers now represent 68% of open AR — concentration risk band moved from Amber to Red.",
      insights: ["Top-3 AR concentration: 68% (was 54%)", "DSO: 62 days (target 55)", "Suggested action: expedite Tata Motors PO-payment plan"] },
    { id: "n3", title: "Procurement spend trending under budget", scope: "Procurement", generated: iso(-3), tone: "positive",
      summary: "YTD spend is 4.1% under budget with material savings from steel rate negotiation, though logistics cost is up 9% due to expedited freight on 3 POs.",
      insights: ["Steel category savings: ₹1.8 Cr YTD", "Expedited freight overrun: ₹42 L", "Consolidation opportunity: KUKA + ABB robotics spend"] },
    { id: "n4", title: "Quality FPY stable, calibration drift emerging", scope: "Quality", generated: iso(-4), tone: "neutral",
      summary: "First-pass yield holds at 96.4%. Two gauges are due for calibration in the next 7 days — schedule to protect FQC throughput.",
      insights: ["FPY plant-wide: 96.4% (target 96)", "Calibration due (7d): 2 gauges", "Open CAPA: 4 · 2 past due"] },
  ];

  return { reports, schedules, runs, narratives };
}

function load(): ReportsState {
  if (typeof window === "undefined") return seed();
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch {}
  const s = seed();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  return s;
}

let state: ReportsState = load();
const listeners = new Set<() => void>();
function emit() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
}

export const reportsStore = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  toggleFavorite: (id: string) => {
    state = { ...state, reports: state.reports.map((r) => r.id === id ? { ...r, favorite: !r.favorite } : r) };
    emit();
  },
  toggleSchedule: (id: string) => {
    state = { ...state, schedules: state.schedules.map((s) => s.id === id ? { ...s, active: !s.active } : s) };
    emit();
  },
  update(mut: (s: ReportsState) => void) {
    mut(state);
    state = { ...state };
    emit();
  },
  reset() { state = seed(); emit(); },

  saveReport(record: Partial<SavedReport>): string {
    const id = record.id || crypto.randomUUID();
    const now = new Date().toISOString();
    if (record.id) {
      state = { ...state, reports: state.reports.map((r) => r.id === id ? { ...r, ...record, updated: now } as SavedReport : r) };
    } else {
      const nextNum = 1000 + state.reports.length + 1;
      const next: SavedReport = {
        id, code: record.code || `RPT-${nextNum}`, name: record.name || "Untitled report",
        module: (record.module as ReportModule) || "Cross", category: record.category || "Ad-hoc",
        owner: record.owner || "Current user", updated: now, runs: 0, favorite: false,
        chart: record.chart || "table", description: record.description || "",
        datasetId: record.datasetId, query: record.query,
      };
      state = { ...state, reports: [next, ...state.reports] };
    }
    emit();
    return id;
  },
  deleteReports(ids: string[]) {
    const set = new Set(ids);
    state = {
      ...state,
      reports: state.reports.filter((r) => !set.has(r.id)),
      schedules: state.schedules.filter((s) => !set.has(s.reportId)),
    };
    emit();
  },
  setFavorites(ids: string[], value: boolean) {
    const set = new Set(ids);
    state = { ...state, reports: state.reports.map((r) => set.has(r.id) ? { ...r, favorite: value } : r) };
    emit();
  },
  importReports(rows: Partial<SavedReport>[]) {
    const now = new Date().toISOString();
    const added = rows.map((r, i) => ({
      id: crypto.randomUUID(),
      code: r.code || `RPT-${2000 + i}`,
      name: r.name || `Imported report ${i + 1}`,
      module: (r.module as ReportModule) || "Cross",
      category: (r.category as SavedReport["category"]) || "Ad-hoc",
      owner: r.owner || "Import",
      updated: now, runs: 0, favorite: false,
      chart: (r.chart as SavedReport["chart"]) || "table",
      description: r.description || "Imported definition",
    })) as SavedReport[];
    state = { ...state, reports: [...added, ...state.reports] };
    emit();
    return added.length;
  },

  saveSchedule(record: Partial<Schedule>): string {
    const id = record.id || crypto.randomUUID();
    if (record.id) {
      state = { ...state, schedules: state.schedules.map((s) => s.id === id ? { ...s, ...record } as Schedule : s) };
    } else {
      const next: Schedule = {
        id, reportId: record.reportId || state.reports[0]?.id || "",
        freq: (record.freq as ScheduleFreq) || "weekly",
        nextRun: record.nextRun || new Date(Date.now() + 864e5).toISOString(),
        recipients: record.recipients ?? [], format: (record.format as ReportFormat) || "PDF",
        active: record.active ?? true, lastStatus: "success",
      };
      state = { ...state, schedules: [next, ...state.schedules] };
    }
    emit();
    return id;
  },
  deleteSchedules(ids: string[]) {
    const set = new Set(ids);
    state = { ...state, schedules: state.schedules.filter((s) => !set.has(s.id)) };
    emit();
  },

  /** Record an execution against a report and bump its run counter. */
  logRun(reportId: string, opts: { by?: string; format?: ReportFormat; rows?: number; status?: RunStatus }) {
    const run: RunLog = {
      id: crypto.randomUUID(), reportId, when: new Date().toISOString(),
      by: opts.by || "Current user", format: opts.format || "PDF",
      rows: opts.rows ?? 0, status: opts.status || "success",
      sizeKb: Math.max(4, Math.round((opts.rows ?? 0) * 0.42)),
    };
    state = {
      ...state,
      runs: [run, ...state.runs].slice(0, 200),
      reports: state.reports.map((r) => r.id === reportId ? { ...r, runs: r.runs + 1, updated: run.when } : r),
    };
    emit();
    return run;
  },
  clearRuns() { state = { ...state, runs: [] }; emit(); },

  addNarrative(n: Omit<AiNarrative, "id" | "generated">) {
    const item: AiNarrative = { ...n, id: crypto.randomUUID(), generated: new Date().toISOString() };
    state = { ...state, narratives: [item, ...state.narratives] };
    emit();
    return item;
  },
  deleteNarrative(id: string) {
    state = { ...state, narratives: state.narratives.filter((n) => n.id !== id) };
    emit();
  },
};

export function useReports<T>(sel: (s: ReportsState) => T): T {
  return useSyncExternalStore(reportsStore.subscribe, () => sel(state), () => sel(state));
}
