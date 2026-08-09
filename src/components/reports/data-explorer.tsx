import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowDown, ArrowUp, ChevronRight, Copy, Download, FileSpreadsheet, FileText,
  Filter, Mail, Printer, Search, Sparkles, X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { findDataset, inferColumns, labelize, type Row } from "@/lib/reports/datasets";
import {
  FILTER_OPS, aggregate, applyFilters, applySearch, applySort, num,
  type AggFn, type FilterRule, type SortRule,
} from "@/lib/reports/engine";
import {
  copyRows, emailRows, exportCsvRows, exportExcelRows, exportPdfRows, printRows,
} from "@/lib/reports/export";

const COLORS = [
  "hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(0 84% 60%)",
  "hsl(271 76% 53%)", "hsl(199 89% 48%)", "hsl(24 95% 53%)", "hsl(160 84% 39%)",
];

export interface ExplorerConfig {
  columns?: string[];
  filters?: FilterRule[];
  sort?: SortRule[];
  groupBy?: string;
  aggFn?: AggFn;
  aggField?: string;
  chart?: "table" | "bar" | "line" | "pie";
}

export function DataExplorer({
  datasetId,
  title,
  config,
  onConfigChange,
  compact,
}: {
  datasetId: string;
  title: string;
  config?: ExplorerConfig;
  onConfigChange?: (c: ExplorerConfig) => void;
  compact?: boolean;
}) {
  const ds = findDataset(datasetId);
  const allRows = useMemo(() => (ds ? ds.get() : []), [ds, datasetId]);
  const allColumns = useMemo(() => inferColumns(allRows), [allRows]);

  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState<string[]>(config?.columns?.length ? config.columns : allColumns.slice(0, 8));
  const [filters, setFilters] = useState<FilterRule[]>(config?.filters ?? []);
  const [sort, setSort] = useState<SortRule[]>(config?.sort ?? []);
  const [groupBy, setGroupBy] = useState<string>(config?.groupBy ?? "none");
  const [aggFn, setAggFn] = useState<AggFn>(config?.aggFn ?? "count");
  const [aggField, setAggField] = useState<string>(config?.aggField ?? "none");
  const [chart, setChart] = useState<"table" | "bar" | "line" | "pie">(config?.chart ?? "table");
  const [drill, setDrill] = useState<string | null>(null);

  const push = (patch: Partial<ExplorerConfig>) =>
    onConfigChange?.({
      columns, filters, sort, chart,
      groupBy: groupBy === "none" ? undefined : groupBy,
      aggFn, aggField: aggField === "none" ? undefined : aggField,
      ...patch,
    });

  const numericColumns = useMemo(
    () => allColumns.filter((c) => allRows.some((r) => typeof r[c] === "number")),
    [allColumns, allRows],
  );

  const filtered = useMemo(() => {
    let out = applySearch(allRows, search);
    out = applyFilters(out, filters);
    if (drill && groupBy !== "none") out = out.filter((r) => (String(r[groupBy] ?? "") || "—") === drill);
    return applySort(out, sort);
  }, [allRows, search, filters, sort, drill, groupBy]);

  const groups = useMemo(
    () => (groupBy === "none" ? [] : aggregate(filtered, groupBy, aggFn, aggField === "none" ? undefined : aggField)),
    [filtered, groupBy, aggFn, aggField],
  );

  const chartData = groups.slice(0, 12).map((g) => ({ name: g.key, value: g.value }));
  const visibleCols = columns.length ? columns : allColumns.slice(0, 8);
  const exportRows = filtered.map((r) => Object.fromEntries(visibleCols.map((c) => [c, r[c]])));

  const toggleSort = (field: string) => {
    const cur = sort.find((s) => s.field === field);
    const next: SortRule[] = !cur
      ? [{ field, dir: "asc" }]
      : cur.dir === "asc" ? [{ field, dir: "desc" }] : [];
    setSort(next);
    push({ sort: next });
  };

  if (!ds) return <div className="p-6 text-sm text-muted-foreground">Dataset not available.</div>;

  return (
    <div className="space-y-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rows…" className="h-9 w-56 pl-9" />
        </div>

        <Select value={groupBy} onValueChange={(v) => { setGroupBy(v); setDrill(null); push({ groupBy: v === "none" ? undefined : v }); }}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Group by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No grouping</SelectItem>
            {allColumns.map((c) => <SelectItem key={c} value={c}>Group by {labelize(c)}</SelectItem>)}
          </SelectContent>
        </Select>

        {groupBy !== "none" && (
          <>
            <Select value={aggFn} onValueChange={(v) => { setAggFn(v as AggFn); push({ aggFn: v as AggFn }); }}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["count", "sum", "avg", "min", "max"] as AggFn[]).map((f) => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            {aggFn !== "count" && (
              <Select value={aggField} onValueChange={(v) => { setAggField(v); push({ aggField: v === "none" ? undefined : v }); }}>
                <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Measure" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select measure</SelectItem>
                  {(numericColumns.length ? numericColumns : allColumns).map((c) => <SelectItem key={c} value={c}>{labelize(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={chart} onValueChange={(v) => { setChart(v as typeof chart); push({ chart: v as typeof chart }); }}>
              <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="pie">Pie</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {/* columns */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">Columns <Badge variant="secondary" className="ml-1">{visibleCols.length}</Badge></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 w-56 overflow-y-auto">
            <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allColumns.map((c) => (
              <DropdownMenuItem
                key={c}
                onSelect={(e) => {
                  e.preventDefault();
                  const next = visibleCols.includes(c) ? visibleCols.filter((x) => x !== c) : [...visibleCols, c];
                  setColumns(next);
                  push({ columns: next });
                }}
              >
                <input type="checkbox" readOnly checked={visibleCols.includes(c)} className="mr-2" />
                {labelize(c)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline" size="sm" className="h-9 gap-1.5"
          onClick={() => { const next = [...filters, { field: allColumns[0] ?? "", op: "contains" as const, value: "" }]; setFilters(next); push({ filters: next }); }}
        >
          <Filter className="h-3.5 w-3.5" /> Filter
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filtered.length} of {allRows.length} rows</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => exportCsvRows(title, exportRows, visibleCols)}><FileText className="mr-2 h-4 w-4" /> Download CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportExcelRows(title, exportRows, visibleCols)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPdfRows(title, exportRows, visibleCols, ds.label)}><FileText className="mr-2 h-4 w-4" /> Download PDF</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => printRows(title, exportRows, visibleCols, ds.label)}><Printer className="mr-2 h-4 w-4" /> Print</DropdownMenuItem>
              <DropdownMenuItem onClick={() => emailRows(title, exportRows, "", visibleCols)}><Mail className="mr-2 h-4 w-4" /> Email / Share</DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyRows(exportRows, visibleCols)}><Copy className="mr-2 h-4 w-4" /> Copy to clipboard</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild size="sm" variant="outline" className="h-9 gap-1.5">
            <Link to="/ai-assistant" search={{ q: `Analyse the ${ds.label} dataset from ${ds.module} and highlight risks and trends` }}>
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Ask AI
            </Link>
          </Button>
        </div>
      </div>

      {/* filter rules */}
      {filters.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-2">
          {filters.map((f, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Select value={f.field} onValueChange={(v) => { const n = filters.map((x, j) => j === i ? { ...x, field: v } : x); setFilters(n); push({ filters: n }); }}>
                <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{allColumns.map((c) => <SelectItem key={c} value={c}>{labelize(c)}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={f.op} onValueChange={(v) => { const n = filters.map((x, j) => j === i ? { ...x, op: v as FilterRule["op"] } : x); setFilters(n); push({ filters: n }); }}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{FILTER_OPS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              {!["isEmpty", "notEmpty"].includes(f.op) && (
                <Input
                  value={f.value}
                  onChange={(e) => { const n = filters.map((x, j) => j === i ? { ...x, value: e.target.value } : x); setFilters(n); push({ filters: n }); }}
                  placeholder="value" className="h-8 w-48"
                />
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const n = filters.filter((_, j) => j !== i); setFilters(n); push({ filters: n }); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* drill breadcrumb */}
      {drill && (
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline">{labelize(groupBy)}</Badge>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{drill}</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setDrill(null)}>Clear drill-down</Button>
        </div>
      )}

      {/* chart */}
      {groupBy !== "none" && chart !== "table" && chartData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chart === "bar" ? (
                  <BarChart data={chartData} onClick={(e: { activeLabel?: string }) => e?.activeLabel && setDrill(e.activeLabel)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} className="cursor-pointer">
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                ) : chart === "line" ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                ) : (
                  <PieChart>
                    <Tooltip />
                    <Pie
                      data={chartData} dataKey="value" nameKey="name" outerRadius={90} label={{ fontSize: 10 }}
                      onClick={(d: { name?: string }) => d?.name && setDrill(d.name)}
                    >
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* grouped summary */}
      {groupBy !== "none" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labelize(groupBy)}</TableHead>
                  <TableHead className="text-right">{aggFn.toUpperCase()}{aggField !== "none" && aggFn !== "count" ? ` · ${labelize(aggField)}` : ""}</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.slice(0, 20).map((g) => (
                  <TableRow key={g.key} className="cursor-pointer" onClick={() => setDrill(g.key)}>
                    <TableCell className="font-medium">{g.key}</TableCell>
                    <TableCell className="text-right tabular-nums">{g.value.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{g.count}</TableCell>
                    <TableCell className="text-right"><ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* detail rows */}
      <Card>
        <CardContent className="p-0">
          <div className={cn("overflow-x-auto", compact ? "max-h-[320px]" : "max-h-[520px]", "overflow-y-auto")}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  {visibleCols.map((c) => {
                    const s = sort.find((x) => x.field === c);
                    return (
                      <TableHead key={c} onClick={() => toggleSort(c)} className="cursor-pointer select-none whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          {labelize(c)}
                          {s?.dir === "asc" && <ArrowUp className="h-3 w-3" />}
                          {s?.dir === "desc" && <ArrowDown className="h-3 w-3" />}
                        </span>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((r, i) => (
                  <TableRow key={i}>
                    {visibleCols.map((c) => (
                      <TableCell key={c} className={cn("whitespace-nowrap text-xs", typeof r[c] === "number" && "text-right tabular-nums")}>
                        {formatCell(r[c])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={visibleCols.length} className="py-10 text-center text-sm text-muted-foreground">No rows match the current filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 200 && (
            <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">Showing first 200 of {filtered.length} rows — export for the full set.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatCell(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toLocaleString("en-IN");
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

export { COLORS as CHART_COLORS, num };
