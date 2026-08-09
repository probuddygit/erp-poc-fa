import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
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
import { budgetDocument } from "@/lib/finance/documents";
import {
  useFinance, upsertFinance, deleteFinance, setBudgetStatus, bulkSetBudgetStatus, refreshBudgetActuals,
} from "@/lib/finance/store";
import { budgetVariances } from "@/lib/finance/intelligence";
import { StatusPill, fmtCompact, fmtINR } from "@/components/projects/shared";
import { FinToolbar, FinSearch, SegTabs } from "@/components/finance/shared";
import {
  Download, Plus, Printer, RefreshCw, CheckCircle2, XCircle, Send, Lock, Target, Building2,
} from "lucide-react";

export function BudgetsSection() {
  const budgets = useFinance((s) => s.budgets);
  const centres = useFinance((s) => s.costCentres);
  const state = useFinance((s) => s);
  const options = useFinanceOptions();
  const crud = useCrud(FINANCE_SCHEMAS, upsertFinance, deleteFinance, options);
  const doc = useQualityDoc();
  const [tab, setTab] = useState<"budgets" | "centres">("budgets");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);

  const variances = useMemo(() => budgetVariances(state), [state]);
  const filtered = variances.filter((v) =>
    `${v.code} ${v.costCentre} ${v.category} ${v.accountCode}`.toLowerCase().includes(q.toLowerCase()),
  );

  const totals = filtered.reduce(
    (a, v) => ({
      budget: a.budget + v.annualBudget,
      ytdBudget: a.ytdBudget + v.ytdBudget,
      actual: a.actual + v.ytdActual,
      committed: a.committed + v.committed,
      projected: a.projected + v.projectedYear,
    }),
    { budget: 0, ytdBudget: 0, actual: 0, committed: 0, projected: 0 },
  );

  const chart = filtered.slice(0, 8).map((v) => ({
    name: v.category.length > 16 ? `${v.category.slice(0, 15)}…` : v.category,
    Budget: Math.round(v.ytdBudget / 100000),
    Actual: Math.round(v.ytdActual / 100000),
  }));

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = filtered.length > 0 && sel.length === filtered.length;

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <FinToolbar>
        <SegTabs
          value={tab}
          onChange={setTab}
          options={[{ k: "budgets" as const, l: "Budget vs Actual" }, { k: "centres" as const, l: "Cost Centres" }]}
        />
        <FinSearch q={q} setQ={setQ} placeholder="Search budget line, cost centre, category…" />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => {
            const n = refreshBudgetActuals();
            toast.success(n ? `${n} budget line(s) refreshed from posted journals` : "No posted actuals to pull");
          }}>
            <RefreshCw className="h-4 w-4" /> Refresh actuals
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => {
            exportCsv("budget-vs-actual", filtered as unknown as Array<Record<string, unknown>>);
            toast.success("Budget report exported");
          }}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => doc.show(budgetDocument(filtered))}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          {tab === "budgets" ? (
            <Button size="sm" className="gap-2" onClick={() => crud.openNew("budgets", "New Budget Line", { fiscalYear: "FY2026", status: "draft", committed: 0, ytdActual: 0 })}>
              <Plus className="h-4 w-4" /> New Budget Line
            </Button>
          ) : (
            <Button size="sm" className="gap-2" onClick={() => crud.openNew("costCentres", "New Cost Centre", { type: "department", status: "active", actual: 0 })}>
              <Plus className="h-4 w-4" /> New Cost Centre
            </Button>
          )}
        </div>
      </FinToolbar>

      {tab === "budgets" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Annual budget" value={fmtCompact(totals.budget)} icon={Target} />
            <Kpi label="YTD budget" value={fmtCompact(totals.ytdBudget)} />
            <Kpi label="YTD actual" value={fmtCompact(totals.actual)} warn={totals.actual > totals.ytdBudget} />
            <Kpi label="Committed" value={fmtCompact(totals.committed)} />
            <Kpi label="Projected year-end" value={fmtCompact(totals.projected)} warn={totals.projected > totals.budget} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">YTD Budget vs Actual · ₹ Lakh</CardTitle>
              <p className="text-xs text-muted-foreground">Top spend categories by budget line</p>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="name" className="text-[10px]" tickLine={false} axisLine={false} />
                    <YAxis className="text-xs" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Budget" fill="hsl(217 91% 60%)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Actual" radius={[6, 6, 0, 0]}>
                      {chart.map((c, i) => (
                        <Cell key={i} fill={c.Actual > c.Budget ? "hsl(0 84% 60%)" : "hsl(142 71% 45%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {sel.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
              <span className="text-sm font-medium">{sel.length} selected</span>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { bulkSetBudgetStatus(sel, "submitted"); toast.success(`${sel.length} line(s) submitted for approval`); setSel([]); }}>
                <Send className="h-3.5 w-3.5" /> Submit
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { bulkSetBudgetStatus(sel, "approved"); toast.success(`${sel.length} line(s) approved`); setSel([]); }}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { bulkSetBudgetStatus(sel, "rejected"); toast.success(`${sel.length} line(s) rejected`); setSel([]); }}>
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { bulkSetBudgetStatus(sel, "locked"); toast.success(`${sel.length} line(s) locked`); setSel([]); }}>
                <Lock className="h-3.5 w-3.5" /> Lock
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSel([])}>Clear</Button>
            </div>
          )}

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 p-3">
                      <Checkbox checked={allSelected} onCheckedChange={(v) => setSel(v ? filtered.map((f) => f.id) : [])} aria-label="Select all" />
                    </th>
                    <th className="p-3 text-left">Line</th>
                    <th className="p-3 text-left">Cost centre</th>
                    <th className="p-3 text-right">Annual</th>
                    <th className="p-3 text-right">YTD budget</th>
                    <th className="p-3 text-right">YTD actual</th>
                    <th className="p-3 text-right">Variance</th>
                    <th className="p-3 text-right">Projected</th>
                    <th className="p-3 text-left">Risk</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((v) => {
                    const src = budgets.find((b) => b.id === v.id);
                    return (
                      <tr key={v.id} className="hover:bg-muted/30">
                        <td className="p-3"><Checkbox checked={sel.includes(v.id)} onCheckedChange={() => toggle(v.id)} aria-label={`Select ${v.code}`} /></td>
                        <td className="p-3">
                          <div className="font-medium">{v.category}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{v.code} · GL {v.accountCode}</div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{v.costCentre}</td>
                        <td className="p-3 text-right font-mono text-xs">{fmtINR(v.annualBudget)}</td>
                        <td className="p-3 text-right font-mono text-xs">{fmtINR(v.ytdBudget)}</td>
                        <td className="p-3 text-right font-mono text-xs">{fmtINR(v.ytdActual)}</td>
                        <td className={`p-3 text-right font-mono text-xs ${v.variance < 0 ? "text-rose-600 dark:text-rose-300" : "text-emerald-600"}`}>
                          {fmtINR(v.variance)}
                          <div className="text-[10px] text-muted-foreground">{v.variancePct.toFixed(1)}%</div>
                        </td>
                        <td className="p-3 text-right font-mono text-xs">{fmtINR(v.projectedYear)}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-[10px] uppercase ${v.overrunRisk === "high" ? "border-rose-500/40 text-rose-600" : v.overrunRisk === "medium" ? "border-amber-500/40 text-amber-600" : "border-emerald-500/40 text-emerald-600"}`}>
                            {v.overrunRisk}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <StatusPill status={v.status === "approved" || v.status === "locked" ? "approved" : v.status === "rejected" ? "rejected" : v.status === "submitted" ? "pending" : "draft"} />
                        </td>
                        <td className="p-1">
                          <RowActions
                            onEdit={() => src && crud.openEdit("budgets", { ...src }, `Edit ${v.code}`)}
                            onDelete={() => crud.askDelete("budgets", v.id, `${v.code} — ${v.category}`)}
                            extra={
                              <>
                                <DropdownMenuItem onClick={() => { setBudgetStatus(v.id, "submitted"); toast.success("Submitted for approval"); }}>Submit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setBudgetStatus(v.id, "approved"); toast.success("Budget approved"); }}>Approve</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setBudgetStatus(v.id, "rejected"); toast.success("Budget rejected"); }}>Reject</DropdownMenuItem>
                              </>
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && <tr><td colSpan={11} className="p-8 text-center text-sm text-muted-foreground">No budget lines match this search.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "centres" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {centres.map((c) => {
            const util = c.budget ? Math.round((c.actual / c.budget) * 100) : 0;
            return (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="font-display text-base">{c.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{c.code}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">{c.type}</Badge>
                    </div>
                  </div>
                  <RowActions
                    onEdit={() => crud.openEdit("costCentres", { ...c }, `Edit ${c.code}`)}
                    onDelete={() => crud.askDelete("costCentres", c.id, c.name)}
                  />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Owner</span>
                    <span>{c.owner}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-mono">{fmtINR(c.budget)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Actual</span>
                    <span className={`font-mono ${c.actual > c.budget ? "text-rose-600 dark:text-rose-300" : ""}`}>{fmtINR(c.actual)}</span>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>Utilisation</span><span>{util}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${util > 100 ? "bg-rose-500" : util > 85 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, util)}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!centres.length && (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground"><Building2 className="mx-auto mb-2 h-5 w-5" />No cost centres defined.</CardContent></Card>
          )}
        </div>
      )}

      {crud.dialogs}
      {doc.dialog}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, warn }: { label: string; value: string; icon?: typeof Target; warn?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        </div>
        <div className={`mt-1.5 font-display text-2xl font-semibold tracking-tight ${warn ? "text-rose-600 dark:text-rose-400" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
