import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RowActions, useCrud } from "@/components/crud-kit";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useQualityDoc } from "@/components/quality-doc-dialog";
import { exportCsv } from "@/lib/crud";
import { FINANCE_SCHEMAS } from "@/lib/finance/schemas";
import { useFinanceOptions } from "@/lib/finance/options";
import { closeChecklistDocument } from "@/lib/finance/documents";
import {
  useFinance, upsertFinance, deleteFinance, setCloseTaskStatus, bulkSetCloseTaskStatus, runCloseValidations, syncOperationalPostings,
} from "@/lib/finance/store";
import { FinToolbar, FinSearch } from "@/components/finance/shared";
import { CheckCircle2, Download, Plus, Printer, ShieldCheck, RefreshCw, Clock, Ban } from "lucide-react";

export function CloseSection() {
  const tasks = useFinance((s) => s.closeTasks);
  const options = useFinanceOptions();
  const crud = useCrud(FINANCE_SCHEMAS, upsertFinance, deleteFinance, options);
  const doc = useQualityDoc();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const period = tasks[0]?.period ?? new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const sorted = useMemo(() => [...tasks].sort((a, b) => a.sequence - b.sequence), [tasks]);
  const filtered = sorted.filter((t) => `${t.title} ${t.area} ${t.owner} ${t.status}`.toLowerCase().includes(q.toLowerCase()));

  const done = tasks.filter((t) => t.status === "done").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <FinToolbar>
        <FinSearch q={q} setQ={setQ} placeholder="Search close task, area, owner…" />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => {
            void syncOperationalPostings().then((r) => {
              toast.success(`Operational postings synced — ${r.bills} bill(s), ${r.payroll} payroll journal(s), ${r.projects} project cost row(s)`);
            });
          }}>
            <RefreshCw className="h-4 w-4" /> Sync ERP postings
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => {
            const r = runCloseValidations();
            setLog(r.messages);
            toast[r.blocked ? "warning" : "success"](`${r.passed} check(s) passed · ${r.blocked} blocker(s)`);
          }}>
            <ShieldCheck className="h-4 w-4" /> Run validations
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => { exportCsv("close-checklist", filtered as unknown as Array<Record<string, unknown>>); toast.success("Checklist exported"); }}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => doc.show(closeChecklistDocument(period, filtered))}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button size="sm" className="gap-2" onClick={() => crud.openNew("closeTasks", "New Close Task", { period, status: "pending", automated: "no", sequence: tasks.length + 1, dueAt: new Date().toISOString().slice(0, 10) })}>
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>
      </FinToolbar>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Period" value={period} />
        <Tile label="Completion" value={`${pct}%`} />
        <Tile label="Open tasks" value={String(tasks.length - done)} />
        <Tile label="Blockers" value={String(blocked)} tone={blocked ? "bad" : "good"} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Close progress</span><span>{done} of {tasks.length} complete</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </CardContent>
      </Card>

      {log.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Automated validation results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {log.map((m, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                {m.startsWith("✓") ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <Ban className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />}
                <span>{m.replace(/^[✓✗]\s*/, "")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {sel.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <span className="text-sm font-medium">{sel.length} selected</span>
          <Button size="sm" variant="outline" onClick={() => { bulkSetCloseTaskStatus(sel, "in-progress"); toast.success("Tasks moved to in-progress"); setSel([]); }}>Start</Button>
          <Button size="sm" variant="outline" onClick={() => { bulkSetCloseTaskStatus(sel, "done"); toast.success("Tasks completed"); setSel([]); }}>Complete</Button>
          <Button size="sm" variant="outline" onClick={() => { bulkSetCloseTaskStatus(sel, "blocked"); toast.success("Tasks flagged as blocked"); setSel([]); }}>Block</Button>
          <Button size="sm" variant="ghost" onClick={() => setSel([])}>Clear</Button>
        </div>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 p-3">
                  <Checkbox checked={filtered.length > 0 && sel.length === filtered.length} onCheckedChange={(v) => setSel(v ? filtered.map((t) => t.id) : [])} aria-label="Select all" />
                </th>
                <th className="w-10 p-3 text-left">#</th>
                <th className="p-3 text-left">Task</th>
                <th className="p-3 text-left">Area</th>
                <th className="p-3 text-left">Owner</th>
                <th className="p-3 text-left">Due</th>
                <th className="p-3 text-left">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="p-3"><Checkbox checked={sel.includes(t.id)} onCheckedChange={() => toggle(t.id)} aria-label={`Select ${t.title}`} /></td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{t.sequence}</td>
                  <td className="p-3">
                    <div className="font-medium">{t.title}</div>
                    {t.note && <div className="text-[10px] text-muted-foreground">{t.note}</div>}
                  </td>
                  <td className="p-3"><Badge variant="outline" className="text-[10px] uppercase">{t.area}</Badge></td>
                  <td className="p-3 text-xs text-muted-foreground">{t.owner}</td>
                  <td className="p-3 text-xs text-muted-foreground">{t.dueAt}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${
                      t.status === "done" ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300"
                        : t.status === "blocked" ? "bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:text-rose-300"
                        : t.status === "in-progress" ? "bg-blue-500/10 text-blue-700 ring-blue-500/30 dark:text-blue-300"
                        : "bg-muted text-muted-foreground ring-border"}`}>
                      {t.status === "done" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />} {t.status}
                    </span>
                  </td>
                  <td className="p-1">
                    <RowActions
                      onEdit={() => crud.openEdit("closeTasks", { ...t }, `Edit task`)}
                      onDelete={() => crud.askDelete("closeTasks", t.id, t.title)}
                      extra={
                        <>
                          <DropdownMenuItem onClick={() => { setCloseTaskStatus(t.id, "in-progress"); toast.success("Task started"); }}>Start</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setCloseTaskStatus(t.id, "done"); toast.success("Task completed"); }}>Complete</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setCloseTaskStatus(t.id, "blocked"); toast.success("Task blocked"); }}>Block</DropdownMenuItem>
                        </>
                      }
                    />
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No close tasks match this search.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {crud.dialogs}
      {doc.dialog}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-1.5 font-display text-2xl font-semibold tracking-tight ${tone === "bad" ? "text-rose-600 dark:text-rose-400" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
