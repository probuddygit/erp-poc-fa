import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, AlertTriangle, ClipboardList, Ruler, TrendingUp, Factory } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuality } from "@/lib/quality/store";
import { StatusPill, Progress, fmtCompact, shortDate } from "@/components/projects/shared";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/quality/")({
  head: () => ({ meta: [{ title: "Quality Dashboard · Faith Automation ERP" }] }),
  component: QualityDashboard,
});

const COLORS = ["hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(0 84% 60%)", "hsl(271 76% 53%)", "hsl(199 89% 48%)"];

function QualityDashboard() {
  const s = useQuality((s) => s);

  const done = s.inspections.filter((i) => i.status === "passed" || i.status === "failed" || i.status === "rework");
  const passed = done.filter((i) => i.status === "passed").length;
  const firstPass = done.length ? Math.round((passed / done.length) * 100) : 0;
  const openNcr = s.ncrs.filter((n) => n.status !== "closed").length;
  const criticalNcr = s.ncrs.filter((n) => n.status !== "closed" && n.severity === "critical").length;
  const openCapa = s.capas.filter((c) => c.status !== "closed").length;
  const overdueCapa = s.capas.filter((c) => c.status === "overdue").length;
  const overdueGauges = s.gauges.filter((g) => g.status === "overdue" || g.status === "out-of-service").length;
  const dueSoon = s.gauges.filter((g) => g.status === "due-soon").length;
  const costImpact = s.ncrs.filter((n) => n.status !== "closed").reduce((a, n) => a + n.costImpact, 0);

  const kpis = [
    { label: "First-Pass Yield", value: `${firstPass}%`, sub: `${passed}/${done.length} completed inspections`, icon: TrendingUp, tone: "from-emerald-500 via-emerald-500/50" },
    { label: "Open NCRs", value: String(openNcr), sub: `${criticalNcr} critical · ${fmtCompact(costImpact)} exposure`, icon: AlertTriangle, tone: "from-rose-500 via-rose-500/50" },
    { label: "CAPA in Flight", value: String(openCapa), sub: `${overdueCapa} overdue · 8D methodology`, icon: ClipboardList, tone: "from-primary via-primary/50" },
    { label: "Calibration Health", value: `${s.gauges.length - overdueGauges}/${s.gauges.length}`, sub: `${dueSoon} due soon · ${overdueGauges} overdue`, icon: Ruler, tone: "from-amber-500 via-amber-500/50" },
  ];

  // Trend — trailing 9 months FPY vs Defects
  const trend = Array.from({ length: 9 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 8 + i);
    const fpy = Math.round(88 + Math.sin(i / 1.3) * 4 + i * 0.6);
    const def = Math.round(60 - Math.sin(i / 1.5) * 20 - i * 3);
    return { m: d.toLocaleDateString("en-IN", { month: "short" }), FPY: Math.min(100, fpy), Defects: Math.max(4, def) };
  });

  // Pareto — defects by stage
  const byStage = (["incoming", "in-process", "final"] as const).map((st) => ({
    name: st === "incoming" ? "Incoming (IQC)" : st === "in-process" ? "In-Process (IPQC)" : "Final (FQC)",
    Critical: s.inspections.filter((i) => i.stage === st).reduce((a, i) => a + i.criticalDefects, 0),
    Major: s.inspections.filter((i) => i.stage === st).reduce((a, i) => a + i.majorDefects, 0),
    Minor: s.inspections.filter((i) => i.stage === st).reduce((a, i) => a + i.minorDefects, 0),
  }));

  // NCR by severity
  const bySeverity = (["critical", "high", "medium", "low"] as const).map((sv) => ({
    name: sv,
    value: s.ncrs.filter((n) => n.severity === sv && n.status !== "closed").length,
  })).filter((x) => x.value > 0);

  const openNcrs = s.ncrs.filter((n) => n.status !== "closed").slice(0, 5);
  const dueGauges = [...s.gauges].sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime()).slice(0, 5);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden">
            <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${k.tone} to-transparent`} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">First-Pass Yield vs Defects</CardTitle>
            <p className="text-xs text-muted-foreground">Trailing 9 months · plant-wide</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="qfpy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="qdef" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="m" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="l" className="text-xs" tickLine={false} axisLine={false} unit="%" />
                  <YAxis yAxisId="r" orientation="right" className="text-xs" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area yAxisId="l" type="monotone" dataKey="FPY" stroke="hsl(142 71% 45%)" fill="url(#qfpy)" strokeWidth={2.5} />
                  <Area yAxisId="r" type="monotone" dataKey="Defects" stroke="hsl(0 84% 60%)" fill="url(#qdef)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Open NCRs by Severity</CardTitle>
            <p className="text-xs text-muted-foreground">{openNcr} open · {criticalNcr} critical</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bySeverity} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {bySeverity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {bySeverity.map((r, i) => (
                <div key={r.name} className="flex items-center gap-2 text-xs capitalize">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="ml-auto font-mono">{r.value}</span>
                </div>
              ))}
              {!bySeverity.length && <div className="text-xs text-muted-foreground">No open NCRs.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Factory className="h-4 w-4 text-primary" /> Defects by Stage
            </CardTitle>
            <p className="text-xs text-muted-foreground">Stacked · critical / major / minor</p>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStage}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="Critical" stackId="d" fill="hsl(0 84% 60%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Major" stackId="d" fill="hsl(38 92% 50%)" />
                  <Bar dataKey="Minor" stackId="d" fill="hsl(217 91% 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <AttnRow label="Critical NCRs open" count={criticalNcr} tone="rose" />
            <AttnRow label="CAPAs overdue" count={overdueCapa} tone="rose" />
            <AttnRow label="Gauges overdue / OOS" count={overdueGauges} tone="rose" />
            <AttnRow label="Calibrations due <30d" count={dueSoon} tone="amber" />
            <AttnRow label="Suppliers grade C/D" count={s.suppliers.filter((v) => v.grade === "C" || v.grade === "D").length} tone="amber" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" /> Open NCRs
            </CardTitle>
            <Badge variant="outline">{openNcr}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {openNcrs.map((n) => (
              <div key={n.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{n.code}</span>
                      <StatusPill status={n.severity === "critical" ? "critical" : n.severity === "high" ? "high" : n.severity === "medium" ? "medium" : "low"} />
                      <StatusPill status={n.status === "open" ? "open" : n.status === "containment" ? "in-progress" : n.status === "investigation" ? "in-progress" : "approved"} />
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium">{n.itemDescription}</div>
                    <div className="truncate text-xs text-muted-foreground">{n.defect}</div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <div className="text-rose-600 dark:text-rose-300">{fmtCompact(n.costImpact)}</div>
                    <div className="text-muted-foreground">{shortDate(n.raisedAt)}</div>
                  </div>
                </div>
              </div>
            ))}
            {!openNcrs.length && <div className="p-6 text-center text-sm text-muted-foreground">No open NCRs.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" /> Calibration — Upcoming
            </CardTitle>
            <Badge variant="outline">{s.gauges.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {dueGauges.map((g) => {
              const days = Math.round((new Date(g.nextDue).getTime() - Date.now()) / 86400000);
              const pct = Math.max(0, Math.min(100, Math.round(((g.frequencyDays - Math.max(0, days)) / g.frequencyDays) * 100)));
              return (
                <div key={g.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{g.code}</span>
                        <StatusPill status={g.status === "in-cal" ? "approved" : g.status === "due-soon" ? "pending" : g.status === "overdue" ? "high" : "rejected"} />
                      </div>
                      <div className="mt-0.5 truncate text-sm font-medium">{g.name}</div>
                      <div className="text-xs text-muted-foreground">{g.location} · {g.provider}</div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className={days < 0 ? "text-rose-600 dark:text-rose-300" : ""}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</div>
                      <div className="text-muted-foreground">{shortDate(g.nextDue)}</div>
                    </div>
                  </div>
                  <div className="mt-2"><Progress value={pct} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Supplier Quality Snapshot
          </CardTitle>
          <Badge variant="outline">{s.suppliers.length} vendors</Badge>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-right">Lots (Acc/Rec)</th>
                <th className="p-3 text-right">PPM</th>
                <th className="p-3 text-right">OTD %</th>
                <th className="p-3 text-right">NCRs</th>
                <th className="p-3 text-left w-40">Score</th>
                <th className="p-3 text-left">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...s.suppliers].sort((a, b) => b.score - a.score).slice(0, 6).map((v) => (
                <tr key={v.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{v.vendorName}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{v.vendorCode}</div>
                  </td>
                  <td className="p-3"><Badge variant="outline">{v.category}</Badge></td>
                  <td className="p-3 text-right font-mono">{v.lotsAccepted}/{v.lotsReceived}</td>
                  <td className="p-3 text-right font-mono">{v.ppm}</td>
                  <td className="p-3 text-right font-mono">{v.otdPct}%</td>
                  <td className="p-3 text-right font-mono">{v.ncrCount}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><Progress value={v.score} /></div>
                      <span className="w-8 text-right font-mono text-[10px]">{v.score}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusPill status={v.grade === "A" ? "approved" : v.grade === "B" ? "medium" : v.grade === "C" ? "high" : "critical"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function AttnRow({ label, count, tone }: { label: string; count: number; tone: "rose" | "amber" | "blue" }) {
  const toneCls = tone === "rose" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/30"
    : tone === "amber" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30"
    : "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/30";
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm">{label}</span>
      <span className={`inline-flex min-w-8 justify-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${toneCls}`}>{count}</span>
    </div>
  );
}
