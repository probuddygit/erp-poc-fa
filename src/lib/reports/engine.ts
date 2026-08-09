/**
 * Deterministic in-memory query engine used by saved reports, the ad-hoc
 * builder and drill-downs: filter → sort → group → aggregate.
 */
import type { Row } from "./datasets";

export type FilterOp =
  | "contains" | "equals" | "notEquals" | "gt" | "gte" | "lt" | "lte" | "isEmpty" | "notEmpty";

export interface FilterRule { field: string; op: FilterOp; value: string }
export type SortDir = "asc" | "desc";
export interface SortRule { field: string; dir: SortDir }
export type AggFn = "count" | "sum" | "avg" | "min" | "max";

export interface QueryDef {
  datasetId: string;
  columns: string[];
  filters: FilterRule[];
  sort: SortRule[];
  groupBy?: string;
  aggField?: string;
  aggFn?: AggFn;
  limit?: number;
}

export const FILTER_OPS: { value: FilterOp; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "=" },
  { value: "notEquals", label: "≠" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "isEmpty", label: "is empty" },
  { value: "notEmpty", label: "is not empty" },
];

export function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

export function applyFilters(rows: Row[], filters: FilterRule[]): Row[] {
  if (!filters.length) return rows;
  return rows.filter((r) =>
    filters.every((f) => {
      const raw = r[f.field];
      const s = txt(raw).toLowerCase();
      const q = f.value.toLowerCase();
      switch (f.op) {
        case "contains": return s.includes(q);
        case "equals": return s === q;
        case "notEquals": return s !== q;
        case "gt": return num(raw) > num(f.value);
        case "gte": return num(raw) >= num(f.value);
        case "lt": return num(raw) < num(f.value);
        case "lte": return num(raw) <= num(f.value);
        case "isEmpty": return s === "";
        case "notEmpty": return s !== "";
        default: return true;
      }
    }),
  );
}

export function applySearch(rows: Row[], q: string): Row[] {
  const s = q.trim().toLowerCase();
  if (!s) return rows;
  return rows.filter((r) => Object.values(r).some((v) => txt(v).toLowerCase().includes(s)));
}

export function applySort(rows: Row[], sort: SortRule[]): Row[] {
  if (!sort.length) return rows;
  return [...rows].sort((a, b) => {
    for (const s of sort) {
      const av = a[s.field];
      const bv = b[s.field];
      const bothNum = typeof av === "number" || typeof bv === "number";
      const cmp = bothNum
        ? num(av) - num(bv)
        : txt(av).localeCompare(txt(bv), undefined, { numeric: true, sensitivity: "base" });
      if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

export interface GroupResult { key: string; value: number; count: number }

export function aggregate(rows: Row[], groupBy: string, fn: AggFn = "count", field?: string): GroupResult[] {
  const buckets = new Map<string, Row[]>();
  rows.forEach((r) => {
    const k = txt(r[groupBy]) || "—";
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(r);
  });
  const out: GroupResult[] = [];
  buckets.forEach((rs, key) => {
    const vals = field ? rs.map((r) => num(r[field])) : [];
    let value = rs.length;
    if (fn === "sum") value = vals.reduce((a, b) => a + b, 0);
    if (fn === "avg") value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    if (fn === "min") value = vals.length ? Math.min(...vals) : 0;
    if (fn === "max") value = vals.length ? Math.max(...vals) : 0;
    out.push({ key, value: Math.round(value * 100) / 100, count: rs.length });
  });
  return out.sort((a, b) => b.value - a.value);
}

export function project(rows: Row[], columns: string[]): Row[] {
  if (!columns.length) return rows;
  return rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c]])));
}

export function runQuery(rows: Row[], q: Omit<QueryDef, "datasetId">, search = ""): Row[] {
  let out = applySearch(rows, search);
  out = applyFilters(out, q.filters ?? []);
  out = applySort(out, q.sort ?? []);
  if (q.limit) out = out.slice(0, q.limit);
  return out;
}
