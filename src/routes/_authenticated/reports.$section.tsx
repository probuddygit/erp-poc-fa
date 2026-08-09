import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Star, Download, Play, Sparkles, Wand2, Send, Clock, CheckCircle2, XCircle,
  RefreshCw, Plus, Pencil, Trash2, Printer, Mail, Upload, MoreHorizontal, FileSpreadsheet,
  FileText, Database,
} from "lucide-react";
import { reportsStore, useReports, type SavedReport, type ReportFormat, type ScheduleFreq } from "@/lib/reports/store";
import { bindingFor } from "@/lib/reports/bindings";
import { DataExplorer, type ExplorerConfig } from "@/components/reports/data-explorer";
import { DATASETS, DATASET_MODULES, findDataset, inferColumns } from "@/lib/reports/datasets";
import {
  emailRows, exportCsvRows, exportExcelRows, exportPdfRows, parseCsv, printRows, readFileText,
} from "@/lib/reports/export";
import { RecordDialog, ConfirmDialog, type FieldSpec } from "@/components/record-dialog";
import { StatusPill, shortDate } from "@/components/projects/shared";

const SECTIONS = ["library", "explorer", "builder", "schedules", "runs", "narratives"] as const;
type Section = typeof SECTIONS[number];

export const Route = createFileRoute("/_authenticated/reports/$section")({
  head: ({ params }) => ({ meta: [{ title: `${labelOf(params.section as Section)} · Reports` }] }),
  beforeLoad: ({ params }) => { if (!SECTIONS.includes(params.section as Section)) throw notFound(); },
  component: SectionPage,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">Section not found.</div>,
});

function labelOf(s: Section) {
  return ({
    library: "Saved Reports", explorer: "Data Explorer", builder: "Report Builder",
    schedules: "Scheduled Delivery", runs: "Run History", narratives: "AI Narratives",
  } as const)[s];
}

function SectionPage() {
  const { section } = Route.useParams();
  const s = section as Section;
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {s === "library" && <Library />}
      {s === "explorer" && <Explorer />}
      {s === "builder" && <Builder />}
      {s === "schedules" && <Schedules />}
      {s === "runs" && <Runs />}
      {s === "narratives" && <Narratives />}
    </div>
  );
}

/* ------------------------------------------------------------------ Runner */

function ReportRunner({ report, onClose }: { report: SavedReport | null; onClose: () => void }) {
  const binding = report ? bindingFor(report) : null;
  return (
    <Dialog open={!!report} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] xl:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {report?.name}
            <Badge variant="outline" className="text-[10px] uppercase">{report?.module}</Badge>
          </DialogTitle>
          <DialogDescription>{report?.description}</DialogDescription>
        </DialogHeader>
        {report && binding && (
          <DataExplorer datasetId={binding.datasetId} title={report.name} config={binding.config} compact />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- Library */

const REPORT_FIELDS: FieldSpec[] = [
  { name: "name", label: "Report name", type: "text", required: true, colSpan: 2 },
  { name: "module", label: "Module", type: "select", options: ["CRM", "Projects", "Engineering", "Procurement", "Inventory", "Manufacturing", "Quality", "Finance", "HR", "Cross"], required: true },
  { name: "category", label: "Category", type: "select", options: ["Executive", "Operational", "Compliance", "Ad-hoc"], required: true },
  { name: "chart", label: "Visualization", type: "select", options: ["table", "bar", "line", "pie"] },
  { name: "owner", label: "Owner", type: "text" },
  { name: "description", label: "Description", type: "textarea", colSpan: 2 },
];

function Library() {
  const reports = useReports((s) => s.reports);
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("all");
  const [cat, setCat] = useState("all");
  const [favOnly, setFavOnly] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [edit, setEdit] = useState<{ record?: Record<string, unknown> } | null>(null);
  const [del, setDel] = useState<{ ids: string[]; label: string } | null>(null);
  const [running, setRunning] = useState<SavedReport | null>(null);

  const filtered = reports.filter((r) =>
    (mod === "all" || r.module === mod) &&
    (cat === "all" || r.category === cat) &&
    (!favOnly || r.favorite) &&
    (q === "" || r.name.toLowerCase().includes(q.toLowerCase()) || r.code.toLowerCase().includes(q.toLowerCase()) || r.owner.toLowerCase().includes(q.toLowerCase()))
  );
  const modules = Array.from(new Set(reports.map((r) => r.module)));

  const rowsFor = (list: SavedReport[]) => list.map((r) => ({
    code: r.code, name: r.name, module: r.module, category: r.category,
    owner: r.owner, chart: r.chart, runs: r.runs, updated: shortDate(r.updated), description: r.description,
  }));

  const run = (r: SavedReport) => {
    const b = bindingFor(r);
    const rows = findDataset(b.datasetId)?.get() ?? [];
    reportsStore.logRun(r.id, { rows: rows.length, format: "PDF" });
    setRunning(r);
  };

  const selected = reports.filter((r) => sel.includes(r.id));
  const allSelected = filtered.length > 0 && filtered.every((r) => sel.includes(r.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports…" className="w-64 pl-9" />
        </div>
        <Select value={mod} onValueChange={setMod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {["Executive", "Operational", "Compliance", "Ad-hoc"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={favOnly ? "default" : "outline"} size="sm" className="h-9 gap-1.5" onClick={() => setFavOnly((v) => !v)}>
          <Star className="h-3.5 w-3.5" /> Favourites
        </Button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{filtered.length} of {reports.length}</span>
          <Button
            size="sm" variant="outline" className="h-9 gap-1.5"
            onClick={async () => {
              const file = await readFileText(".csv");
              if (!file) return;
              const n = reportsStore.importReports(parseCsv(file.text) as Partial<SavedReport>[]);
              toast.success(`${n} report definitions imported`);
            }}
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCsvRows("report-library", rowsFor(filtered))}><FileText className="mr-2 h-4 w-4" /> CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportExcelRows("report-library", rowsFor(filtered))}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPdfRows("Report library", rowsFor(filtered))}><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => printRows("Report library", rowsFor(filtered))}><Printer className="mr-2 h-4 w-4" /> Print</DropdownMenuItem>
              <DropdownMenuItem onClick={() => emailRows("Report library", rowsFor(filtered))}><Mail className="mr-2 h-4 w-4" /> Email</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-9 gap-1.5" onClick={() => setEdit({})}><Plus className="h-3.5 w-3.5" /> New report</Button>
        </div>
      </div>

      {/* bulk bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(v) => setSel(v ? filtered.map((r) => r.id) : [])}
          aria-label="Select all"
        />
        <span className="text-xs text-muted-foreground">{sel.length ? `${sel.length} selected` : "Select all visible"}</span>
        {sel.length > 0 && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8" onClick={() => { reportsStore.setFavorites(sel, true); toast.success("Marked as favourite"); }}>Favourite</Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => { reportsStore.setFavorites(sel, false); toast.success("Removed from favourites"); }}>Unfavourite</Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => exportExcelRows("selected-reports", rowsFor(selected))}>Export selection</Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => { selected.forEach((r) => reportsStore.logRun(r.id, { rows: findDataset(bindingFor(r).datasetId)?.get().length ?? 0 })); toast.success(`${sel.length} reports queued`); }}>Run selected</Button>
            <Button size="sm" variant="destructive" className="h-8" onClick={() => setDel({ ids: sel, label: `${sel.length} reports` })}>Delete</Button>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => (
          <Card key={r.id} className="group relative">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <Checkbox
                    className="mt-0.5"
                    checked={sel.includes(r.id)}
                    onCheckedChange={(v) => setSel((s) => v ? [...s, r.id] : s.filter((x) => x !== r.id))}
                    aria-label={`Select ${r.name}`}
                  />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{r.name}</span>
                    <div className="text-[11px] text-muted-foreground">{r.code} · {r.module} · {r.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => reportsStore.toggleFavorite(r.id)} aria-label="favorite">
                    <Star className={"h-4 w-4 " + (r.favorite ? "fill-amber-500 text-amber-500" : "text-muted-foreground hover:text-foreground")} />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => run(r)}><Play className="mr-2 h-4 w-4" /> Run / View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEdit({ record: r as unknown as Record<string, unknown> })}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { const rows = findDataset(bindingFor(r).datasetId)?.get() ?? []; exportCsvRows(r.name, rows); reportsStore.logRun(r.id, { format: "CSV", rows: rows.length }); }}><FileText className="mr-2 h-4 w-4" /> Download CSV</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const rows = findDataset(bindingFor(r).datasetId)?.get() ?? []; exportExcelRows(r.name, rows); reportsStore.logRun(r.id, { format: "Excel", rows: rows.length }); }}><FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const rows = findDataset(bindingFor(r).datasetId)?.get() ?? []; exportPdfRows(r.name, rows, undefined, r.module); reportsStore.logRun(r.id, { format: "PDF", rows: rows.length }); }}><FileText className="mr-2 h-4 w-4" /> Download PDF</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => printRows(r.name, findDataset(bindingFor(r).datasetId)?.get() ?? [], undefined, r.module)}><Printer className="mr-2 h-4 w-4" /> Print</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => emailRows(r.name, findDataset(bindingFor(r).datasetId)?.get() ?? [])}><Mail className="mr-2 h-4 w-4" /> Email / Share</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => { reportsStore.saveSchedule({ reportId: r.id, freq: "weekly", format: "PDF", recipients: [] }); toast.success("Schedule created — configure recipients"); }}
                      ><Clock className="mr-2 h-4 w-4" /> Schedule</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDel({ ids: [r.id], label: r.name })}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Owner: {r.owner} · {r.runs} runs</span>
                <span>Updated {shortDate(r.updated)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" className="h-8 gap-1.5" onClick={() => run(r)}><Play className="h-3.5 w-3.5" /> Run</Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setEdit({ record: r as unknown as Record<string, unknown> })}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button asChild size="sm" variant="ghost" className="ml-auto h-8 gap-1.5">
                  <Link to="/ai-assistant" search={{ q: `Summarise the report "${r.name}" and highlight anomalies` }}><Sparkles className="h-3.5 w-3.5 text-primary" /> Ask AI</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3"><CardContent className="py-12 text-center text-sm text-muted-foreground">No reports match your filters.</CardContent></Card>
        )}
      </div>

      <RecordDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title={edit?.record ? "Edit report" : "New report"}
        fields={REPORT_FIELDS}
        initial={edit?.record}
        onSubmit={(values) => {
          reportsStore.saveReport({ ...(edit?.record ?? {}), ...values } as Partial<SavedReport>);
          toast.success(edit?.record ? "Report updated" : "Report created");
          setEdit(null);
        }}
      />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete report?"
        message={del ? `“${del.label}” and any linked schedules will be removed.` : ""}
        onConfirm={() => { if (del) { reportsStore.deleteReports(del.ids); setSel([]); toast.success("Deleted"); } setDel(null); }}
      />
      <ReportRunner report={running} onClose={() => setRunning(null)} />
    </div>
  );
}

/* ---------------------------------------------------------------- Explorer */

function Explorer() {
  const [module, setModule] = useState(DATASET_MODULES[0] ?? "CRM");
  const datasets = DATASETS.filter((d) => d.module === module);
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? DATASETS[0]?.id ?? "");
  const active = findDataset(datasetId) ?? datasets[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><Database className="h-4 w-4 text-primary" /> Real-time cross-module explorer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Select
            value={module}
            onValueChange={(v) => {
              setModule(v);
              const first = DATASETS.find((d) => d.module === v);
              if (first) setDatasetId(first.id);
            }}
          >
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{DATASET_MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={datasetId} onValueChange={setDatasetId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px] uppercase">Live data</Badge>
        </CardContent>
      </Card>

      {active && <DataExplorer key={active.id} datasetId={active.id} title={`${active.module} · ${active.label}`} />}
    </div>
  );
}

/* ----------------------------------------------------------------- Builder */

function Builder() {
  const [name, setName] = useState("Untitled Report");
  const [datasetId, setDatasetId] = useState(DATASETS[0]?.id ?? "");
  const [config, setConfig] = useState<ExplorerConfig>({});
  const ds = findDataset(datasetId);
  const rows = useMemo(() => ds?.get() ?? [], [ds]);
  const columns = useMemo(() => inferColumns(rows), [rows]);

  const save = () => {
    if (!ds) return;
    reportsStore.saveReport({
      name,
      module: (["CRM", "Projects", "Engineering", "Procurement", "Inventory", "Manufacturing", "Quality", "Finance", "HR"].includes(ds.module) ? ds.module : "Cross") as SavedReport["module"],
      category: "Ad-hoc",
      chart: (config.chart ?? "table") as SavedReport["chart"],
      description: `Ad-hoc report over ${ds.module} · ${ds.label}`,
      datasetId,
      query: {
        columns: config.columns ?? columns.slice(0, 8),
        filters: (config.filters ?? []).map((f) => ({ field: f.field, op: f.op, value: f.value })),
        sort: config.sort ?? [],
        groupBy: config.groupBy,
        aggField: config.aggField,
        aggFn: config.aggFn,
      },
    });
    toast.success("Report definition saved to library");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><Wand2 className="h-4 w-4 text-primary" /> Ad-hoc report builder</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-56" placeholder="Report name" />
            <Select value={datasetId} onValueChange={(v) => { setDatasetId(v); setConfig({}); }}>
              <SelectTrigger className="h-9 w-64"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-80">
                {DATASETS.map((d) => <SelectItem key={d.id} value={d.id}>{d.module} · {d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-9 gap-1.5" onClick={save}><Plus className="h-3.5 w-3.5" /> Save to library</Button>
          </div>
        </CardHeader>
      </Card>

      {ds && (
        <DataExplorer
          key={datasetId}
          datasetId={datasetId}
          title={name}
          config={config}
          onConfigChange={setConfig}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Schedules */

function Schedules() {
  const s = useReports((x) => x);
  const [edit, setEdit] = useState<{ record?: Record<string, unknown> } | null>(null);
  const [del, setDel] = useState<{ id: string; label: string } | null>(null);
  const nameOf = (id: string) => s.reports.find((r) => r.id === id)?.name ?? "—";

  const fields: FieldSpec[] = [
    { name: "reportId", label: "Report", type: "select", options: s.reports.map((r) => r.name), required: true, colSpan: 2 },
    { name: "freq", label: "Cadence", type: "select", options: ["daily", "weekly", "monthly", "quarterly"], required: true },
    { name: "format", label: "Format", type: "select", options: ["PDF", "Excel", "CSV"], required: true },
    { name: "nextRun", label: "Next run", type: "date" },
    { name: "recipientsText", label: "Recipients (comma separated)", type: "text", colSpan: 2 },
  ];

  const rows = s.schedules.map((sc) => ({
    report: nameOf(sc.reportId), cadence: sc.freq, nextRun: shortDate(sc.nextRun),
    format: sc.format, recipients: sc.recipients.join("; "), active: sc.active, last: sc.lastStatus,
  }));

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Send className="h-4 w-4 text-primary" /> Scheduled deliveries</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => exportExcelRows("report-schedules", rows)}><Download className="h-3.5 w-3.5" /> Export</Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => printRows("Report schedules", rows)}><Printer className="h-3.5 w-3.5" /> Print</Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setEdit({})}><Clock className="h-3.5 w-3.5" /> New schedule</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead><TableHead>Cadence</TableHead><TableHead>Next run</TableHead>
              <TableHead>Format</TableHead><TableHead>Recipients</TableHead><TableHead>Last</TableHead>
              <TableHead className="text-right">Active</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.schedules.map((sc) => (
              <TableRow key={sc.id}>
                <TableCell className="font-medium">{nameOf(sc.reportId)}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] uppercase">{sc.freq}</Badge></TableCell>
                <TableCell className="text-xs">{shortDate(sc.nextRun)}</TableCell>
                <TableCell>{sc.format}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{sc.recipients.join(", ") || "—"}</TableCell>
                <TableCell><StatusPill status={sc.lastStatus} /></TableCell>
                <TableCell className="text-right"><Switch checked={sc.active} onCheckedChange={() => reportsStore.toggleSchedule(sc.id)} /></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          const rep = s.reports.find((r) => r.id === sc.reportId);
                          const data = rep ? findDataset(bindingFor(rep).datasetId)?.get() ?? [] : [];
                          reportsStore.logRun(sc.reportId, { by: "Scheduler (manual)", format: sc.format, rows: data.length });
                          toast.success("Schedule executed now");
                        }}
                      ><Play className="mr-2 h-4 w-4" /> Run now</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setEdit({ record: { ...(sc as unknown as Record<string, unknown>), reportId: nameOf(sc.reportId), recipientsText: sc.recipients.join(", ") } })}
                      ><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => emailRows(nameOf(sc.reportId), rows, sc.recipients.join(","))}><Mail className="mr-2 h-4 w-4" /> Send test email</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDel({ id: sc.id, label: nameOf(sc.reportId) })}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {s.schedules.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No schedules configured.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <RecordDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title={edit?.record ? "Edit schedule" : "New schedule"}
        fields={fields}
        initial={edit?.record}
        onSubmit={(values) => {
          const reportName = String(values.reportId ?? "");
          const reportId = s.reports.find((r) => r.name === reportName)?.id ?? reportName;
          reportsStore.saveSchedule({
            ...(edit?.record ? { id: (edit.record as { id: string }).id } : {}),
            reportId,
            freq: values.freq as ScheduleFreq,
            format: values.format as ReportFormat,
            nextRun: values.nextRun ? new Date(String(values.nextRun)).toISOString() : undefined,
            recipients: String(values.recipientsText ?? "").split(",").map((x) => x.trim()).filter(Boolean),
          });
          toast.success(edit?.record ? "Schedule updated" : "Schedule created");
          setEdit(null);
        }}
      />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete schedule?"
        message={del ? `The delivery schedule for “${del.label}” will be removed.` : ""}
        onConfirm={() => { if (del) { reportsStore.deleteSchedules([del.id]); toast.success("Schedule deleted"); } setDel(null); }}
      />
    </Card>
  );
}

/* -------------------------------------------------------------------- Runs */

function Runs() {
  const s = useReports((x) => x);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const nameOf = (id: string) => s.reports.find((r) => r.id === id)?.name ?? "—";
  const list = s.runs.filter((r) =>
    (status === "all" || r.status === status) &&
    (q === "" || nameOf(r.reportId).toLowerCase().includes(q.toLowerCase()) || r.by.toLowerCase().includes(q.toLowerCase()))
  );
  const rows = list.map((r) => ({ report: nameOf(r.reportId), when: shortDate(r.when), by: r.by, format: r.format, rows: r.rows, sizeKb: r.sizeKb, status: r.status }));

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm">Run history</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search runs…" className="h-8 w-56 pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => exportCsvRows("report-run-history", rows)}><Download className="h-3.5 w-3.5" /> Export</Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => printRows("Report run history", rows)}><Printer className="h-3.5 w-3.5" /> Print</Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => toast.success("Run history refreshed")}><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { reportsStore.clearRuns(); toast.success("History cleared"); }}><Trash2 className="h-3.5 w-3.5" /> Clear</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead><TableHead>When</TableHead><TableHead>Triggered by</TableHead>
              <TableHead>Format</TableHead><TableHead className="text-right">Rows</TableHead>
              <TableHead className="text-right">Size</TableHead><TableHead>Status</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{nameOf(r.reportId)}</TableCell>
                <TableCell className="text-xs">{shortDate(r.when)}</TableCell>
                <TableCell className="text-xs">{r.by}</TableCell>
                <TableCell>{r.format}</TableCell>
                <TableCell className="text-right tabular-nums">{r.rows.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{r.sizeKb} KB</TableCell>
                <TableCell>
                  {r.status === "success" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Success</span>
                  ) : r.status === "failed" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-rose-600"><XCircle className="h-3.5 w-3.5" /> Failed</span>
                  ) : <StatusPill status={r.status} />}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm" variant="ghost" className="h-7 gap-1.5"
                      onClick={() => {
                        const rep = s.reports.find((x) => x.id === r.reportId);
                        const data = rep ? findDataset(bindingFor(rep).datasetId)?.get() ?? [] : [];
                        if (r.format === "Excel") exportExcelRows(nameOf(r.reportId), data);
                        else if (r.format === "CSV") exportCsvRows(nameOf(r.reportId), data);
                        else exportPdfRows(nameOf(r.reportId), data);
                      }}
                    ><Download className="h-3.5 w-3.5" /></Button>
                    <Button
                      size="sm" variant="ghost" className="h-7 gap-1.5"
                      onClick={() => {
                        const rep = s.reports.find((x) => x.id === r.reportId);
                        const data = rep ? findDataset(bindingFor(rep).datasetId)?.get() ?? [] : [];
                        reportsStore.logRun(r.reportId, { format: r.format, rows: data.length });
                        toast.success("Report re-run");
                      }}
                    ><RefreshCw className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No runs recorded.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------- Narratives */

function Narratives() {
  const narratives = useReports((s) => s.narratives);
  const [scope, setScope] = useState("Projects");

  const generate = () => {
    const ds = DATASETS.filter((d) => d.module === scope);
    const counts = ds.map((d) => ({ label: d.label, n: d.get().length })).filter((x) => x.n > 0);
    const total = counts.reduce((a, b) => a + b.n, 0);
    const top = counts.sort((a, b) => b.n - a.n).slice(0, 3);
    reportsStore.addNarrative({
      title: `${scope} operating snapshot`,
      scope: (["CRM", "Projects", "Engineering", "Procurement", "Inventory", "Manufacturing", "Quality", "Finance", "HR"].includes(scope) ? scope : "Cross") as never,
      tone: total === 0 ? "neutral" : "positive",
      summary: `${scope} currently carries ${total.toLocaleString("en-IN")} live records across ${counts.length} datasets. Largest volume sits in ${top[0]?.label ?? "—"}.`,
      insights: top.map((t) => `${t.label}: ${t.n.toLocaleString("en-IN")} records`),
    });
    toast.success("Narrative generated from live data");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{DATASET_MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" className="h-9 gap-1.5" onClick={generate}><Sparkles className="h-3.5 w-3.5" /> Generate narrative</Button>
        <Button asChild size="sm" variant="outline" className="h-9 gap-1.5">
          <Link to="/ai-assistant" search={{ q: `Write an executive narrative for the ${scope} module with risks and recommended actions` }}>
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Ask AI Assistant
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {narratives.map((n) => (
          <Card key={n.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">{n.title}</CardTitle>
                  <div className="mt-1 text-[11px] text-muted-foreground">{n.scope} · {shortDate(n.generated)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={
                    n.tone === "positive" ? "border-emerald-500/40 text-emerald-600" :
                      n.tone === "warning" ? "border-amber-500/40 text-amber-600" : ""
                  }>{n.tone}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { reportsStore.deleteNarrative(n.id); toast.success("Narrative removed"); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{n.summary}</p>
              <ul className="space-y-1">
                {n.insights.map((i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md border p-2 text-xs">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {i}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => printRows(n.title, n.insights.map((i) => ({ insight: i })), ["insight"], n.summary)}><Printer className="h-3.5 w-3.5" /> Print</Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => emailRows(n.title, n.insights.map((i) => ({ insight: i })))}><Mail className="h-3.5 w-3.5" /> Share</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
