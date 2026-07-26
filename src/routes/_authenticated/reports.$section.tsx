import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Star, Download, Play, Sparkles, Wand2, Send, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { reportsStore, useReports } from "@/lib/reports/store";
import { StatusPill, shortDate } from "@/components/projects/shared";

const SECTIONS = ["library", "builder", "schedules", "runs", "narratives"] as const;
type Section = typeof SECTIONS[number];

export const Route = createFileRoute("/_authenticated/reports/$section")({
  head: ({ params }) => ({ meta: [{ title: `${labelOf(params.section as Section)} · Reports` }] }),
  beforeLoad: ({ params }) => { if (!SECTIONS.includes(params.section as Section)) throw notFound(); },
  component: SectionPage,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">Section not found.</div>,
});

function labelOf(s: Section) {
  return ({ library: "Saved Reports", builder: "Report Builder", schedules: "Scheduled Delivery", runs: "Run History", narratives: "AI Narratives" } as const)[s];
}

function SectionPage() {
  const { section } = Route.useParams();
  const s = section as Section;
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {s === "library" && <Library />}
      {s === "builder" && <Builder />}
      {s === "schedules" && <Schedules />}
      {s === "runs" && <Runs />}
      {s === "narratives" && <Narratives />}
    </div>
  );
}

function Library() {
  const reports = useReports((s) => s.reports);
  const [q, setQ] = useState("");
  const [mod, setMod] = useState<string>("all");
  const filtered = reports.filter((r) =>
    (mod === "all" || r.module === mod) &&
    (q === "" || r.name.toLowerCase().includes(q.toLowerCase()) || r.code.toLowerCase().includes(q.toLowerCase()))
  );
  const modules = Array.from(new Set(reports.map((r) => r.module)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports…" className="pl-9 w-72" />
        </div>
        <Select value={mod} onValueChange={setMod}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} of {reports.length} reports</div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => (
          <Card key={r.id} className="group relative">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{r.name}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{r.code} · {r.module} · {r.category}</div>
                </div>
                <button onClick={() => reportsStore.toggleFavorite(r.id)} aria-label="favorite">
                  <Star className={"h-4 w-4 " + (r.favorite ? "fill-amber-500 text-amber-500" : "text-muted-foreground hover:text-foreground")} />
                </button>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Owner: {r.owner}</span>
                <span>Updated {shortDate(r.updated)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" className="h-8 gap-1.5"><Play className="h-3.5 w-3.5" /> Run</Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
                <Badge variant="outline" className="ml-auto text-[10px]">{r.runs} runs</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Builder() {
  const [name, setName] = useState("Untitled Report");
  const [source, setSource] = useState("Projects");
  const [chart, setChart] = useState("bar");
  const [fields, setFields] = useState<string[]>(["Project", "Budget", "Actual", "Variance %"]);

  const availableFields: Record<string, string[]> = {
    Projects: ["Project", "Customer", "Manager", "Start", "End", "Budget", "Actual", "Variance %", "Health", "Progress %"],
    CRM: ["Opportunity", "Customer", "Stage", "Value", "Probability", "Owner", "Expected Close"],
    Procurement: ["PO", "Vendor", "Category", "Value", "OTD", "Status"],
    Inventory: ["Item", "Store", "Bin", "On Hand", "Reorder", "Value"],
    Finance: ["Invoice", "Customer", "Amount", "Ageing", "Status"],
    Quality: ["Stage", "FPY", "Defect Rate", "NCRs"],
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Data & shape</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-[11px] uppercase text-muted-foreground">Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <div className="text-[11px] uppercase text-muted-foreground">Source module</div>
            <Select value={source} onValueChange={(v) => { setSource(v); setFields(availableFields[v].slice(0, 4)); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(availableFields).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-[11px] uppercase text-muted-foreground">Visualization</div>
            <Select value={chart} onValueChange={setChart}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="pie">Pie</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-[11px] uppercase text-muted-foreground">Fields</div>
            <div className="mt-1 space-y-1.5">
              {availableFields[source].map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={fields.includes(f)} onChange={(e) => setFields(e.target.checked ? [...fields, f] : fields.filter((x) => x !== f))} />
                  {f}
                </label>
              ))}
            </div>
          </div>
          <Button className="w-full gap-2"><Wand2 className="h-4 w-4" /> Generate preview</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">{name}</CardTitle>
            <div className="text-[11px] text-muted-foreground">{source} · {chart.toUpperCase()} · {fields.length} fields</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Ask AI</Button>
            <Button size="sm" className="h-8 gap-1.5"><Play className="h-3.5 w-3.5" /> Run</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/20 p-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-medium">Ad-hoc query builder</div>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Pick a source, choose columns, apply filters and save the definition. Preview will render as {chart}.
              Ask AI to translate a natural-language question into a report definition.
            </p>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[11px] uppercase text-muted-foreground">Filters (optional)</div>
            <Textarea placeholder='e.g. status = "in-progress" AND variance_pct > 5' className="min-h-[80px] font-mono text-xs" />
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[11px] uppercase text-muted-foreground">Preview columns</div>
            <Table>
              <TableHeader><TableRow>{fields.map((f) => <TableHead key={f}>{f}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {fields.map((f) => <TableCell key={f} className="text-xs text-muted-foreground">—</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Schedules() {
  const s = useReports((s) => s);
  const nameOf = (id: string) => s.reports.find((r) => r.id === id)?.name ?? id;
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Scheduled deliveries</CardTitle>
        <Button size="sm" className="h-8 gap-1.5"><Clock className="h-3.5 w-3.5" /> New schedule</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead>Next run</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Last</TableHead>
              <TableHead className="text-right">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.schedules.map((sc) => (
              <TableRow key={sc.id}>
                <TableCell className="font-medium">{nameOf(sc.reportId)}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] uppercase">{sc.freq}</Badge></TableCell>
                <TableCell className="text-xs">{shortDate(sc.nextRun)}</TableCell>
                <TableCell>{sc.format}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{sc.recipients.join(", ")}</TableCell>
                <TableCell><StatusPill status={sc.lastStatus} /></TableCell>
                <TableCell className="text-right">
                  <Switch checked={sc.active} onCheckedChange={() => reportsStore.toggleSchedule(sc.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Runs() {
  const s = useReports((s) => s);
  const nameOf = (id: string) => s.reports.find((r) => r.id === id)?.name ?? id;
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm">Run history</CardTitle>
        <Button size="sm" variant="outline" className="h-8 gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Triggered by</TableHead>
              <TableHead>Format</TableHead>
              <TableHead className="text-right">Rows</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{nameOf(r.reportId)}</TableCell>
                <TableCell className="text-xs">{shortDate(r.when)}</TableCell>
                <TableCell className="text-xs">{r.by}</TableCell>
                <TableCell>{r.format}</TableCell>
                <TableCell className="text-right tabular-nums">{r.rows.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{r.sizeKb} KB</TableCell>
                <TableCell>
                  {r.status === "success" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Success</span>
                  ) : r.status === "failed" ? (
                    <span className="inline-flex items-center gap-1 text-rose-600 text-xs"><XCircle className="h-3.5 w-3.5" /> Failed</span>
                  ) : <StatusPill status={r.status} />}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="h-7 gap-1.5"><Download className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Narratives() {
  const narratives = useReports((s) => s.narratives);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {narratives.map((n) => (
        <Card key={n.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {n.title}</CardTitle>
              <Badge variant="outline" className={
                n.tone === "warning" ? "border-amber-500/40 text-amber-600" :
                n.tone === "positive" ? "border-emerald-500/40 text-emerald-600" :
                ""
              }>{n.scope}</Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">Generated {shortDate(n.generated)}</div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{n.summary}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {n.insights.map((i, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1.5"><Download className="h-3.5 w-3.5" /> Export PDF</Button>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Regenerate</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
