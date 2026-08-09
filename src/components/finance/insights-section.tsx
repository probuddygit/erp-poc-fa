import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModuleCopilot } from "@/components/ai/module-copilot";
import { useFinance, matchTxn, refreshBudgetActuals } from "@/lib/finance/store";
import {
  workingCapital, cashForecast, revenueForecast, detectAnomalies, reconciliationSuggestions,
  suggestGlAccount, financeKpis, financeNarrative, financeActions,
} from "@/lib/finance/intelligence";
import { fmtCompact } from "@/components/projects/shared";
import { AlertTriangle, Brain, Link2, Sparkles, Wand2 } from "lucide-react";

export function InsightsSection() {
  const state = useFinance((s) => s);
  const [narration, setNarration] = useState("");

  const kpis = useMemo(() => financeKpis(state), [state]);
  const wc = useMemo(() => workingCapital(state), [state]);
  const forecast = useMemo(() => cashForecast(state), [state]);
  const revForecast = useMemo(() => revenueForecast(state), [state]);
  const anomalies = useMemo(() => detectAnomalies(state), [state]);
  const matches = useMemo(() => reconciliationSuggestions(state), [state]);
  const narrative = useMemo(() => financeNarrative(state), [state]);
  const actions = useMemo(() => financeActions(state), [state]);
  const coding = useMemo(() => (narration.trim().length > 3 ? suggestGlAccount(state, narration) : []), [state, narration]);

  const cashChart = forecast.map((w) => ({ w: w.label, Closing: Math.round(w.closing / 100000), Net: Math.round(w.net / 100000) }));

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Net margin" value={`${kpis.netMarginPct.toFixed(1)}%`} />
        <Kpi label="EBITDA" value={fmtCompact(kpis.ebitda)} />
        <Kpi label="Current ratio" value={wc.currentRatio.toFixed(2)} />
        <Kpi label="DSO / DPO" value={`${wc.dso} / ${wc.dpo}d`} />
        <Kpi label="Cash conversion" value={`${wc.cashConversionDays}d`} />
        <Kpi label="Cash runway" value={`${wc.runwayDays}d`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> 13-week direct cash forecast · ₹ Lakh
            </CardTitle>
            <p className="text-xs text-muted-foreground">Built from open AR/AP maturities, payroll run-rate and statutory dues</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashChart}>
                  <defs>
                    <linearGradient id="cashg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="w" className="text-[10px]" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="Closing" stroke="hsl(217 91% 60%)" fill="url(#cashg)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {forecast.some((w) => w.risk) && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <span>Projected cash dips below zero in {forecast.filter((w) => w.risk).map((w) => w.label).join(", ")}. Accelerate collections or defer discretionary payouts.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> Executive narrative
            </CardTitle>
            <p className="text-xs text-muted-foreground">Every sentence traces to a live ledger number</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {narrative.map((n, i) => (
              <p key={i} className="rounded-md border bg-muted/20 p-2.5 text-xs leading-relaxed">{n}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <ModuleCopilot
        title="Finance Copilot"
        subtitle="Deterministic recommendations across AR, AP, budgets, cash and controls"
        narrative={narrative}
        actions={actions}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Anomaly detection
            </CardTitle>
            <p className="text-xs text-muted-foreground">{anomalies.length} exception(s) across payments, journals and compliance</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {anomalies.slice(0, 8).map((a) => (
              <div key={a.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] uppercase ${a.severity === "high" ? "border-rose-500/40 text-rose-600" : a.severity === "medium" ? "border-amber-500/40 text-amber-600" : "border-border text-muted-foreground"}`}>
                        {a.severity}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">{a.reference}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.detail}</div>
                  </div>
                  {a.amount !== undefined && <div className="shrink-0 font-mono text-xs">{fmtCompact(a.amount)}</div>}
                </div>
              </div>
            ))}
            {!anomalies.length && <div className="p-6 text-center text-sm text-muted-foreground">No control exceptions detected.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" /> Reconciliation suggestions
            </CardTitle>
            <p className="text-xs text-muted-foreground">Bank lines scored against open AR / AP documents</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {matches.slice(0, 8).map((m) => (
              <div key={m.txnId} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{m.narration}</div>
                    <div className="text-xs text-muted-foreground">Match to <span className="font-mono">{m.suggestedRef}</span> · {m.reason}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-xs">{fmtCompact(m.amount)}</div>
                    <div className="text-[10px] text-muted-foreground">{m.confidence}% confidence</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => { matchTxn(m.txnId, m.suggestedRef); toast.success(`Matched to ${m.suggestedRef}`); }}>
                  Accept match
                </Button>
              </div>
            ))}
            {!matches.length && <div className="p-6 text-center text-sm text-muted-foreground">Every bank line is reconciled.</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" /> AI account coding assistant
            </CardTitle>
            <p className="text-xs text-muted-foreground">Describe a transaction to get a grounded GL suggestion</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g. RTGS to Fanuc India for servo drives on PRJ-1021" />
            {coding.map((c) => (
              <div key={c.accountCode} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">{c.accountCode} · {c.accountName}</div>
                  <div className="text-xs text-muted-foreground">{c.reason}</div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">{c.confidence}%</Badge>
              </div>
            ))}
            {!coding.length && <p className="text-xs text-muted-foreground">Start typing to see suggested accounts from the live chart of accounts.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="font-display text-base">Revenue & expense forecast · ₹</CardTitle>
              <p className="text-xs text-muted-foreground">Next 6 months from run-rate plus unbilled pipeline</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { const n = refreshBudgetActuals(); toast.success(n ? `${n} budget line(s) refreshed` : "Budgets already current"); }}>
              Refresh budgets
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revForecast}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="month" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="Revenue" stroke="hsl(217 91% 60%)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Expense" stroke="hsl(38 92% 50%)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Margin" stroke="hsl(142 71% 45%)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1.5 font-display text-xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
