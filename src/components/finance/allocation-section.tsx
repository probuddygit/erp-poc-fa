import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RowActions, useCrud } from "@/components/crud-kit";
import { exportCsv } from "@/lib/crud";
import { FINANCE_SCHEMAS } from "@/lib/finance/schemas";
import { useFinanceOptions } from "@/lib/finance/options";
import { useFinance, upsertFinance, deleteFinance } from "@/lib/finance/store";
import {
  ALLOCATION_METHODS, previewAllocation, poolForRule, runAllAllocations, runAllocation,
  toggleAllocationRule, unallocatedPool,
} from "@/lib/finance/allocation";
import { currentPeriod, periodLabel, wipPeriods } from "@/lib/finance/wip";
import { FinToolbar, FinSearch, SegTabs } from "@/components/finance/shared";
import { fmtCompact, fmtINR, shortDate } from "@/components/projects/shared";
import { Download, Plus, PlayCircle, Layers, Power } from "lucide-react";

type View = "rules" | "pool" | "runs";

export function AllocationSection() {
  const s = useFinance((x) => x);
  const options = useFinanceOptions();
  const crud = useCrud(FINANCE_SCHEMAS, upsertFinance, deleteFinance, options);
  const [view, setView] = useState<View>("rules");
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState(currentPeriod());

  const pool = useMemo(() => unallocatedPool(s, period), [s, period]);
  const poolTotal = pool.reduce((t, r) => t + r.amount, 0);
  const rules = s.allocationRules.filter((r) => `${r.code} ${r.name} ${r.method}`.toLowerCase().includes(q.toLowerCase()));
  const runs = s.allocationRuns.filter((r) => r.period === period);
  const allocatedThisPeriod = runs.reduce((t, r) => t + r.amount, 0);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <FinToolbar>
        <FinSearch q={q} setQ={setQ} placeholder="Search allocation rule…" />
        <SegTabs value={view} onChange={setView} options={[
          { k: "rules" as View, l: "Rules" }, { k: "pool" as View, l: "Unallocated pool" }, { k: "runs" as View, l: "Run history" },
        ]} />
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs" aria-label="Period">
          {wipPeriods(s).map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => {
            const r = runAllAllocations(period);
            toast[r.posted ? "success" : "warning"](`${r.posted} of ${r.rules} active rule(s) allocated — ${fmtCompact(r.amount)}`);
          }}>
            <PlayCircle className="h-4 w-4" /> Run all active rules
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => { exportCsv(`unallocated-${period}`, pool as unknown as Array<Record<string, unknown>>); toast.success("Pool exported"); }}>
            <Download className="h-4 w-4" /> Export pool
          </Button>
          <Button size="sm" className="gap-2" onClick={() => crud.openNew("allocationRules", "New Allocation Rule", { method: "percentage", active: "yes", targets: [] })}>
            <Plus className="h-4 w-4" /> New Rule
          </Button>
        </div>
      </FinToolbar>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Unallocated pool" value={fmtCompact(poolTotal)} tone={poolTotal ? "bad" : "good"} />
        <Tile label="Pooled documents" value={String(pool.length)} />
        <Tile label="Allocated this period" value={fmtCompact(allocatedThisPeriod)} />
        <Tile label="Active rules" value={`${s.allocationRules.filter((r) => r.active).length} of ${s.allocationRules.length}`} />
      </div>

      {view === "rules" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {rules.map((r) => {
            const preview = previewAllocation(r, period);
            const matched = poolForRule(s, r, period);
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{r.code}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">{ALLOCATION_METHODS.find((m) => m.k === r.method)?.l ?? r.method}</Badge>
                      <Badge variant="outline" className={`text-[10px] uppercase ${r.active ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{r.active ? "active" : "inactive"}</Badge>
                    </div>
                    <div className="mt-1 font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Pool: {matched.length} doc(s) · {fmtINR(preview.pool)} · account {r.accountCode ?? "any"} · {r.department ?? "all departments"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => { toggleAllocationRule(r.id); toast.success(r.active ? "Rule deactivated" : "Rule activated"); }}>
                      <Power className="h-3.5 w-3.5" /> {r.active ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" className="h-7 gap-1.5 text-xs" disabled={!preview.lines.length} onClick={() => {
                      const res = runAllocation(r.code, period);
                      toast[res.journalCode ? "success" : "warning"](res.journalCode ? `Allocated ${fmtCompact(res.pool)} via ${res.journalCode}` : res.warning ?? "Nothing to allocate");
                    }}>
                      <Layers className="h-3.5 w-3.5" /> Allocate
                    </Button>
                    <RowActions
                      onEdit={() => crud.openEdit("allocationRules", { ...r, active: r.active ? "yes" : "no" }, `Edit ${r.code}`)}
                      onDelete={() => crud.askDelete("allocationRules", r.id, r.code)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="p-2 text-left">Project</th><th className="p-2 text-right">Share</th><th className="p-2 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.lines.map((l) => (
                        <tr key={l.projectCode}>
                          <td className="p-2"><span className="font-mono text-xs">{l.projectCode}</span> <span className="text-muted-foreground">{l.projectName}</span></td>
                          <td className="p-2 text-right font-mono">{l.pct}%</td>
                          <td className="p-2 text-right font-mono">{fmtINR(l.amount)}</td>
                        </tr>
                      ))}
                      {!preview.lines.length && <tr><td colSpan={3} className="p-4 text-center text-xs text-muted-foreground">{preview.warning}</td></tr>}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
          {!rules.length && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No allocation rules yet.</CardContent></Card>}
        </div>
      )}

      {view === "pool" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Costs without a project code</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Document</th><th className="p-3 text-left">Source</th><th className="p-3 text-left">Account</th>
                  <th className="p-3 text-left">Department</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Date</th><th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pool.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="p-3"><div className="font-mono text-xs">{r.code}</div><div className="text-xs text-muted-foreground">{r.description}</div></td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px] uppercase">{r.source}</Badge></td>
                    <td className="p-3 font-mono text-xs">{r.accountCode}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.department ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.expenseCategory ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{shortDate(r.date)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(r.amount)}</td>
                  </tr>
                ))}
                {!pool.length && <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">Every cost in this period carries a project code.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {view === "runs" && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3 text-left">Rule</th><th className="p-3 text-left">Journal</th><th className="p-3 text-left">Projects</th><th className="p-3 text-left">Run by</th><th className="p-3 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{r.ruleCode}</td>
                    <td className="p-3 font-mono text-xs">{r.journalCode ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.lines.map((l) => l.projectCode).join(", ")}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.by} · {shortDate(r.at)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(r.amount)}</td>
                  </tr>
                ))}
                {!runs.length && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No allocations run for {periodLabel(period)}.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {crud.dialogs}
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
