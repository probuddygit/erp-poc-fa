import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { exportCsv } from "@/lib/crud";
import { useFinance } from "@/lib/finance/store";
import { useProjectsStore } from "@/lib/projects/store";
import {
  computeWip, currentPeriod, periodLabel, postWipEntry, postWipPeriod, setPercentComplete,
  setWipMethod, wipPeriods, wipReconciliation, WIP_METHODS,
} from "@/lib/finance/wip";
import type { WipMethod } from "@/lib/finance/types";
import { FinToolbar, FinSearch, SegTabs } from "@/components/finance/shared";
import { fmtCompact, fmtINR } from "@/components/projects/shared";
import { Download, RefreshCw, CheckCircle2, Pencil, History, ScrollText } from "lucide-react";

type View = "ledger" | "recon" | "audit";

export function WipSection() {
  const s = useFinance((x) => x);
  const projects = useProjectsStore((p) => p.projects);
  const [period, setPeriod] = useState(currentPeriod());
  const [view, setView] = useState<View>("ledger");
  const [q, setQ] = useState("");
  const [method, setMethod] = useState<WipMethod>("poc-progress");
  const [edit, setEdit] = useState<{ code: string; name: string; pct: number } | null>(null);
  const [pctInput, setPctInput] = useState("0");
  const [reason, setReason] = useState("");

  // First visit to a period shows a live ledger rather than an empty table.
  useEffect(() => {
    if (!s.wipEntries.some((e) => e.period === period) && s.projectCosts.length) computeWip(period, method);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const periods = wipPeriods(s);
  const rows = useMemo(
    () => s.wipEntries.filter((e) => e.period === period && `${e.projectCode} ${e.projectName}`.toLowerCase().includes(q.toLowerCase())),
    [s.wipEntries, period, q],
  );
  const recon = useMemo(
    () => wipReconciliation(s, projects.map((p) => ({ code: p.code, name: p.name, progress: p.progress, spent: p.spent, budget: p.budget })), period),
    [s, projects, period],
  );

  const totals = rows.reduce(
    (t, r) => ({
      opening: t.opening + r.opening,
      additions: t.additions + r.additions,
      released: t.released + r.released,
      closing: t.closing + r.closing,
      revenue: t.revenue + r.revenueRecognised,
    }),
    { opening: 0, additions: 0, released: 0, closing: 0, revenue: 0 },
  );
  const drafts = rows.filter((r) => r.status === "draft").length;

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <FinToolbar>
        <FinSearch q={q} setQ={setQ} placeholder="Search project…" />
        <SegTabs
          value={view}
          onChange={setView}
          options={[{ k: "ledger" as View, l: "WIP ledger" }, { k: "recon" as View, l: "Reconciliation" }, { k: "audit" as View, l: "% complete audit" }]}
        />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-9 rounded-md border bg-background px-2 text-xs"
          aria-label="Accounting period"
        >
          {periods.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
        </select>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as WipMethod)}
          className="h-9 rounded-md border bg-background px-2 text-xs"
          aria-label="Revenue recognition method"
        >
          {WIP_METHODS.map((m) => <option key={m.k} value={m.k}>{m.l}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => {
            const r = computeWip(period, method);
            toast.success(`WIP computed — ${r.entries} project(s), revenue ${fmtCompact(r.revenue)}`);
          }}>
            <RefreshCw className="h-4 w-4" /> Compute WIP
          </Button>
          <Button size="sm" variant="outline" className="gap-2" disabled={!drafts} onClick={() => {
            const r = postWipPeriod(period);
            toast.success(`${r.posted} WIP entr(ies) posted · ${r.codes.length} journal(s)`);
          }}>
            <ScrollText className="h-4 w-4" /> Post period journals
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => { exportCsv(`wip-${period}`, rows as unknown as Array<Record<string, unknown>>); toast.success("WIP ledger exported"); }}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </FinToolbar>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="Opening WIP" value={fmtCompact(totals.opening)} />
        <Tile label="Additions" value={fmtCompact(totals.additions)} tone="good" />
        <Tile label="Released to billing" value={fmtCompact(totals.released)} />
        <Tile label="Closing WIP" value={fmtCompact(totals.closing)} />
        <Tile label="Revenue recognised" value={fmtCompact(totals.revenue)} />
      </div>

      {view === "ledger" && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-left">Method</th>
                  <th className="p-3 text-right">% complete</th>
                  <th className="p-3 text-right">Cost incurred</th>
                  <th className="p-3 text-right">Revenue recognised</th>
                  <th className="p-3 text-right">Opening</th>
                  <th className="p-3 text-right">Additions</th>
                  <th className="p-3 text-right">Released</th>
                  <th className="p-3 text-right">Closing</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium">{r.projectName}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.projectCode}</div>
                    </td>
                    <td className="p-3">
                      <select
                        value={r.method}
                        disabled={r.status === "posted"}
                        onChange={(e) => { setWipMethod(r.id, e.target.value as WipMethod); toast.success("Recognition method updated"); }}
                        className="h-7 rounded border bg-background px-1 text-[11px]"
                        aria-label={`Method for ${r.projectCode}`}
                      >
                        {WIP_METHODS.map((m) => <option key={m.k} value={m.k}>{m.l}</option>)}
                      </select>
                    </td>
                    <td className="p-3 text-right font-mono">
                      {r.percentComplete}%
                      {r.pcSource === "manual" && <Badge variant="outline" className="ml-1 text-[9px] uppercase">manual</Badge>}
                    </td>
                    <td className="p-3 text-right font-mono">{fmtINR(r.costIncurred)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(r.revenueRecognised)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{fmtINR(r.opening)}</td>
                    <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{r.additions ? fmtINR(r.additions) : "—"}</td>
                    <td className="p-3 text-right font-mono text-amber-600 dark:text-amber-400">{r.released ? fmtINR(r.released) : "—"}</td>
                    <td className="p-3 text-right font-mono font-semibold">{fmtINR(r.closing)}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] uppercase">{r.status}</Badge>
                      {r.journalCode && <div className="font-mono text-[10px] text-muted-foreground">{r.journalCode}</div>}
                    </td>
                    <td className="p-2">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Override % complete for ${r.projectCode}`}
                          onClick={() => { setEdit({ code: r.projectCode, name: r.projectName, pct: r.percentComplete }); setPctInput(String(r.percentComplete)); setReason(""); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={r.status === "posted"} aria-label={`Post WIP for ${r.projectCode}`}
                          onClick={() => { const c = postWipEntry(r.id); toast.success(c ? `Posted ${c}` : "No movement — entry marked posted"); }}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={11} className="p-8 text-center text-sm text-muted-foreground">No WIP rows for {periodLabel(period)} — run “Compute WIP”.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {view === "recon" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Projects ↔ Finance reconciliation</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-right">Finance %</th>
                  <th className="p-3 text-right">Projects %</th>
                  <th className="p-3 text-right">Δ %</th>
                  <th className="p-3 text-right">Finance cost</th>
                  <th className="p-3 text-right">Project spend</th>
                  <th className="p-3 text-right">Δ cost</th>
                  <th className="p-3 text-right">Revenue</th>
                  <th className="p-3 text-right">Billed</th>
                  <th className="p-3 text-right">WIP</th>
                  <th className="p-3 text-left">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recon.map((r) => (
                  <tr key={r.projectCode} className="hover:bg-muted/30">
                    <td className="p-3"><div className="font-medium">{r.projectName}</div><div className="font-mono text-[10px] text-muted-foreground">{r.projectCode}</div></td>
                    <td className="p-3 text-right font-mono">{r.financePct}%</td>
                    <td className="p-3 text-right font-mono">{r.projectsPct}%</td>
                    <td className={`p-3 text-right font-mono ${Math.abs(r.pctVariance) > 5 ? "text-rose-600 dark:text-rose-400" : ""}`}>{r.pctVariance > 0 ? "+" : ""}{r.pctVariance}%</td>
                    <td className="p-3 text-right font-mono">{fmtINR(r.financeCost)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(r.projectSpend)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(r.costVariance)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(r.revenueRecognised)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(r.billed)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(r.wipClosing)}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-[10px] uppercase ${r.flag === "review" ? "border-rose-500/40 text-rose-600 dark:text-rose-400" : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"}`}>{r.flag}</Badge>
                    </td>
                  </tr>
                ))}
                {!recon.length && <tr><td colSpan={11} className="p-8 text-center text-sm text-muted-foreground">No project cost sheets yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {view === "audit" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Percentage-complete audit trail</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {s.pcAudits.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
                <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">{a.projectCode} · {a.fromPct}% → {a.toPct}%</div>
                  <div className="text-xs text-muted-foreground">{a.reason ?? "No reason recorded"} · {a.by} · {new Date(a.at).toLocaleString("en-IN")}</div>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">{a.source}</Badge>
              </div>
            ))}
            {!s.pcAudits.length && <div className="p-6 text-center text-sm text-muted-foreground">No completion changes recorded yet.</div>}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Override % complete — {edit?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="pct">Approved completion %</label>
              <Input id="pct" type="number" min={0} max={100} value={pctInput} onChange={(e) => setPctInput(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="pct-reason">Reason (audited)</label>
              <Input id="pct-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer-certified progress for Aug" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!edit) return;
              setPercentComplete(edit.code, Number(pctInput) || 0, "Finance Controller", reason, period);
              toast.success(`${edit.code} completion set to ${pctInput}%`);
              setEdit(null);
            }}>Save & recompute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
