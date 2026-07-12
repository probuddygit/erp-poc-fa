import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowUpRight, Boxes, CheckCircle2, ClipboardList,
  Factory, FolderKanban, Gauge, LineChart as LineIcon, Sparkles, TrendingUp,
  TrendingDown, Wallet, Wrench, Truck, ShieldCheck, Cpu, Users, Clock,
  Target, Layers, Zap,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, RadialBar,
  RadialBarChart, PolarAngleAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useProjectsStore } from "@/lib/projects/store";
import { fmtCompact, RagBadge, Progress, shortDate } from "@/components/projects/shared";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Executive Command Center · Faith Automation ERP" },
      { name: "description", content: "Enterprise-wide executive dashboard: revenue, projects, milestones, engineering, procurement, manufacturing, finance and cash flow." },
    ],
  }),
  component: CommandCenter,
});

// ----- helpers -----
const CHART = {
  primary: "hsl(217 91% 60%)",
  primarySoft: "hsl(217 91% 60% / 0.15)",
  success: "hsl(160 84% 39%)",
  warning: "hsl(38 92% 50%)",
  danger: "hsl(0 84% 60%)",
  info: "hsl(199 89% 48%)",
  muted: "hsl(215 20% 65%)",
};

const revenueSeries = [
  { m: "Jan", plan: 42, actual: 38, forecast: 40 },
  { m: "Feb", plan: 48, actual: 46, forecast: 47 },
  { m: "Mar", plan: 55, actual: 58, forecast: 56 },
  { m: "Apr", plan: 60, actual: 55, forecast: 58 },
  { m: "May", plan: 62, actual: 66, forecast: 64 },
  { m: "Jun", plan: 70, actual: 72, forecast: 71 },
  { m: "Jul", plan: 74, actual: 78, forecast: 76 },
  { m: "Aug", plan: 80, actual: 84, forecast: 82 },
  { m: "Sep", plan: 86, actual: 88, forecast: 87 },
];

const cashFlowSeries = [
  { m: "Apr", inflow: 62, outflow: 48, net: 14 },
  { m: "May", inflow: 71, outflow: 55, net: 16 },
  { m: "Jun", inflow: 68, outflow: 62, net: 6 },
  { m: "Jul", inflow: 82, outflow: 60, net: 22 },
  { m: "Aug", inflow: 76, outflow: 71, net: 5 },
  { m: "Sep", inflow: 91, outflow: 68, net: 23 },
];

const engineeringMix = [
  { name: "Released", v: 142, fill: CHART.success },
  { name: "In Review", v: 38, fill: CHART.warning },
  { name: "Draft", v: 21, fill: CHART.muted },
  { name: "ECN Open", v: 12, fill: CHART.danger },
];

const procurementFunnel = [
  { s: "PR", v: 48 },
  { s: "RFQ", v: 32 },
  { s: "PO", v: 26 },
  { s: "GRN", v: 21 },
  { s: "QC", v: 19 },
];

const mfgHeatmap = (() => {
  const cells = ["Weld A", "Weld B", "Assy 1", "Assy 2", "CNC", "Paint"];
  const shifts = ["S1", "S2", "S3"];
  return cells.map((c) => ({
    cell: c,
    values: shifts.map(() => Math.round(45 + Math.random() * 55)),
  }));
})();

const departmentHeatmap = (() => {
  const depts = ["Sales", "Engg", "Procure", "Stores", "Prod", "Quality", "Finance"];
  const weeks = ["W1", "W2", "W3", "W4", "W5"];
  return depts.map((d) => ({
    dept: d,
    weeks: weeks.map(() => Math.round(30 + Math.random() * 70)),
  }));
})();

function heatColor(v: number) {
  if (v >= 85) return "bg-emerald-500/80 text-white";
  if (v >= 70) return "bg-emerald-400/60 text-emerald-950";
  if (v >= 55) return "bg-amber-400/60 text-amber-950";
  if (v >= 40) return "bg-orange-400/60 text-orange-950";
  return "bg-rose-500/70 text-white";
}

// ----- component -----
function CommandCenter() {
  const s = useProjectsStore((s) => s);
  const [range, setRange] = useState<"D" | "W" | "M" | "Q">("M");

  const totals = useMemo(() => {
    const active = s.projects.filter((p) => p.status === "active");
    const value = s.projects.reduce((a, p) => a + p.value, 0);
    const budget = s.projects.reduce((a, p) => a + p.budget, 0);
    const spent = s.projects.reduce((a, p) => a + p.spent, 0);
    const upcoming = s.milestones.filter((m) => m.status === "upcoming" || m.status === "at-risk");
    const atRiskMs = s.milestones.filter((m) => m.status === "at-risk" || m.status === "missed");
    const delayedWbs = s.wbs.filter((w) => w.status !== "done" && new Date(w.end).getTime() < Date.now());
    const rag = { green: 0, amber: 0, red: 0 };
    s.projects.forEach((p) => rag[p.rag]++);
    const openIssues = s.issues.filter((i) => i.status !== "resolved").length;
    const openRisks = s.risks.filter((r) => r.status === "open").length;
    return { active, value, budget, spent, upcoming, atRiskMs, delayedWbs, rag, openIssues, openRisks };
  }, [s]);

  const healthGauge = [
    { name: "Health", value: 78, fill: CHART.success },
  ];

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-background via-background to-muted/20">
      {/* Command Header */}
      <div className="border-b bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.04]">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-primary/20">
                <Gauge className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                    Executive Command Center
                  </h1>
                  <Badge variant="outline" className="gap-1.5 text-[10px] uppercase tracking-wider">
                    <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Live
                  </Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Enterprise-wide operating view — revenue, projects, engineering, procurement, manufacturing,
                  quality, finance and cash flow. {totals.active.length} active projects · {totals.openIssues} open issues.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border bg-background p-0.5">
                {(["D", "W", "M", "Q"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition",
                      range === r ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <ClipboardList className="h-4 w-4" /> Brief
              </Button>
              <Button size="sm" className="gap-2">
                <Sparkles className="h-4 w-4" /> Ask AI
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Tier 1 — Interactive KPI cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            to="/crm"
            icon={Wallet}
            label="Revenue (YTD)"
            value={fmtCompact(totals.value)}
            delta="+12.4%"
            up
            spark={revenueSeries.map((r) => ({ v: r.actual }))}
            color={CHART.primary}
            hint="vs plan · FY26"
          />
          <KpiCard
            to="/projects"
            icon={FolderKanban}
            label="Active Projects"
            value={String(totals.active.length)}
            delta={`${totals.rag.green}G · ${totals.rag.amber}A · ${totals.rag.red}R`}
            up
            spark={[{v:3},{v:4},{v:4},{v:5},{v:5},{v:6},{v:6},{v:totals.active.length}]}
            color={CHART.info}
            hint={`${fmtCompact(totals.budget)} portfolio budget`}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Delayed Activities"
            value={String(totals.delayedWbs.length)}
            delta={`${totals.atRiskMs.length} milestones at risk`}
            up={false}
            spark={[{v:12},{v:14},{v:11},{v:9},{v:10},{v:8},{v:9},{v:totals.delayedWbs.length}]}
            color={CHART.danger}
            hint="Behind planned end date"
          />
          <KpiCard
            to="/finance"
            icon={TrendingUp}
            label="Cash Position"
            value="₹ 18.4 Cr"
            delta="+₹2.3 Cr WoW"
            up
            spark={cashFlowSeries.map((c) => ({ v: c.net }))}
            color={CHART.success}
            hint="Bank + liquid · net"
          />
        </section>

        {/* Tier 2 — Revenue + Cash Flow + Health Gauge */}
        <section className="grid gap-4 lg:grid-cols-6">
          <Card className="lg:col-span-4">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="font-display text-base">Revenue — Plan / Actual / Forecast</CardTitle>
                <p className="text-xs text-muted-foreground">₹ Cr · trailing 9 months</p>
              </div>
              <Badge variant="outline" className="gap-1.5">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> +8.1% ahead
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rev-act" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="rev-fc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.info} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={CHART.info} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="m" tickLine={false} axisLine={false} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} className="text-xs" />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="forecast" stroke={CHART.info} fill="url(#rev-fc)" strokeDasharray="4 4" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="actual" stroke={CHART.primary} fill="url(#rev-act)" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="plan" stroke={CHART.muted} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Project Health</CardTitle>
              <p className="text-xs text-muted-foreground">Composite RAG score</p>
            </CardHeader>
            <CardContent>
              <div className="relative h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="70%" outerRadius="100%" data={healthGauge} startAngle={220} endAngle={-40}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={12} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-4xl font-semibold">78</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">of 100</div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {(["green","amber","red"] as const).map((r) => (
                  <div key={r} className="rounded-lg border bg-muted/30 p-2">
                    <RagBadge rag={r} />
                    <div className="mt-1 font-mono text-lg font-semibold">{totals.rag[r]}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tier 3 — Cash Flow + Engineering Mix + Procurement funnel */}
        <section className="grid gap-4 lg:grid-cols-6">
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-base">Cash Flow</CardTitle>
                  <p className="text-xs text-muted-foreground">Inflow · Outflow · Net (₹ Cr)</p>
                </div>
                <Link to="/finance" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Finance <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="m" tickLine={false} axisLine={false} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} className="text-xs" />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="inflow" fill={CHART.success} radius={[4,4,0,0]} />
                    <Bar dataKey="outflow" fill={CHART.danger} radius={[4,4,0,0]} />
                    <Line type="monotone" dataKey="net" stroke={CHART.primary} strokeWidth={2.5} dot={{ r: 3 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-base">Engineering Progress</CardTitle>
                  <p className="text-xs text-muted-foreground">Drawings & change control</p>
                </div>
                <Link to="/engineering" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  PLM <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={engineeringMix} dataKey="v" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={2}>
                      {engineeringMix.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {engineeringMix.map((e) => (
                  <div key={e.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-sm" style={{ background: e.fill }} />
                      <span className="text-muted-foreground">{e.name}</span>
                    </div>
                    <span className="font-mono font-semibold">{e.v}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Procurement</CardTitle>
              <p className="text-xs text-muted-foreground">Funnel</p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {procurementFunnel.map((f, i) => {
                const max = procurementFunnel[0].v;
                const pct = (f.v / max) * 100;
                const icons = [ClipboardList, Layers, Truck, Boxes, ShieldCheck];
                const Icon = icons[i];
                return (
                  <div key={f.s}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Icon className="h-3 w-3 text-muted-foreground" /> {f.s}
                      </span>
                      <span className="font-mono text-muted-foreground">{f.v}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/50" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <Link to="/procurement" className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border py-1.5 text-xs font-medium hover:bg-muted">
                Open Procurement <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* Tier 4 — Manufacturing heatmap + Delayed activities */}
        <section className="grid gap-4 lg:grid-cols-6">
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Factory className="h-4 w-4 text-primary" /> Manufacturing — OEE Heatmap
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Cell × Shift · today</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-rose-500/70"/>&lt;40</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-amber-400/60"/>55-70</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-emerald-500/80"/>85+</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-1 text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left font-medium">Cell</th>
                      <th className="font-medium">Shift 1</th>
                      <th className="font-medium">Shift 2</th>
                      <th className="font-medium">Shift 3</th>
                      <th className="font-medium">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mfgHeatmap.map((row) => {
                      const avg = Math.round(row.values.reduce((a,b)=>a+b,0)/row.values.length);
                      return (
                        <tr key={row.cell}>
                          <td className="py-1 pr-2 font-medium">{row.cell}</td>
                          {row.values.map((v, i) => (
                            <td key={i} className="w-20">
                              <div className={cn("grid h-9 place-items-center rounded font-mono font-semibold", heatColor(v))}>
                                {v}%
                              </div>
                            </td>
                          ))}
                          <td className="w-16 text-center font-mono font-semibold">{avg}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                <MiniStat icon={Cpu} label="OEE" value="82%" tone="success" />
                <MiniStat icon={Zap} label="Throughput" value="1.24K" tone="info" />
                <MiniStat icon={ShieldCheck} label="FPY" value="97.8%" tone="success" />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-rose-500" /> Delayed Activities
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">{totals.delayedWbs.length} overdue</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-72 divide-y overflow-y-auto">
                {totals.delayedWbs.slice(0, 8).map((w) => {
                  const proj = s.projects.find((p) => p.id === w.projectId);
                  const daysLate = Math.round((Date.now() - new Date(w.end).getTime()) / 86400000);
                  return (
                    <Link
                      key={w.id}
                      to="/projects/$id"
                      params={{ id: w.projectId }}
                      className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-muted/40"
                    >
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">{w.code}</span>
                          <span className="truncate text-sm font-medium">{w.name}</span>
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {proj?.code} · {proj?.name} · Owner {w.owner}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-sm font-semibold text-rose-600">+{daysLate}d</div>
                        <div className="text-[10px] text-muted-foreground">due {shortDate(w.end)}</div>
                      </div>
                    </Link>
                  );
                })}
                {totals.delayedWbs.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">All activities on schedule.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tier 5 — Projects + Milestones */}
        <section className="grid gap-4 lg:grid-cols-6">
          <Card className="lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-display text-base">Portfolio — Active Projects</CardTitle>
              <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                View portfolio <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {s.projects.map((p) => (
                  <Link
                    key={p.id}
                    to="/projects/$id"
                    params={{ id: p.id }}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_auto] items-center gap-4 px-4 py-3 transition hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{p.code}</span>
                        <RagBadge rag={p.rag} />
                      </div>
                      <div className="mt-0.5 truncate text-sm font-medium">{p.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{p.customerName} · PM {p.manager}</div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-mono font-semibold">{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} />
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold">{fmtCompact(p.value)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {Math.round((p.spent / p.budget) * 100)}% of budget
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Upcoming Milestones
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">{totals.upcoming.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {totals.upcoming.slice(0, 6).map((m) => {
                const proj = s.projects.find((p) => p.id === m.projectId);
                const daysLeft = Math.round((new Date(m.due).getTime() - Date.now()) / 86400000);
                const tone = m.status === "at-risk" ? "text-amber-600" : daysLeft < 14 ? "text-primary" : "text-muted-foreground";
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-xs font-semibold",
                      m.status === "at-risk" ? "border-amber-500/40 bg-amber-500/10 text-amber-600" : "border-primary/30 bg-primary/10 text-primary",
                    )}>
                      {new Date(m.due).getDate()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{m.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{proj?.code} · {proj?.name}</div>
                    </div>
                    <div className={cn("shrink-0 text-right font-mono text-xs font-semibold", tone)}>
                      {daysLeft >= 0 ? `${daysLeft}d` : `${-daysLeft}d late`}
                    </div>
                  </div>
                );
              })}
              {totals.upcoming.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">No upcoming milestones.</div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Tier 6 — Department heatmap + AI + Activity */}
        <section className="grid gap-4 lg:grid-cols-6">
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Departmental Load — 5 Weeks</CardTitle>
              <p className="text-xs text-muted-foreground">Utilization heatmap across functions</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-1 text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left font-medium">Dept</th>
                      {["W1","W2","W3","W4","W5"].map((w) => <th key={w} className="font-medium">{w}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {departmentHeatmap.map((row) => (
                      <tr key={row.dept}>
                        <td className="py-1 pr-2 font-medium">{row.dept}</td>
                        {row.weeks.map((v, i) => (
                          <td key={i}>
                            <div className={cn("grid h-8 place-items-center rounded font-mono text-[11px] font-semibold", heatColor(v))}>
                              {v}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="font-display text-base">AI Insights</CardTitle>
                  <p className="text-xs text-muted-foreground">Prioritised for executives</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: AlertTriangle, tone: "warning", t: "Cash squeeze forecast W38", d: "3 large POs land before customer receipt on PRJ-1001." },
                { icon: TrendingUp, tone: "success", t: "Weld Cell A trending +7% OEE", d: "Sustained gain after fixture calibration." },
                { icon: Clock, tone: "info", t: "PRJ-1003 handover risk", d: "88% progress but 3 open NCRs · site readiness pending." },
                { icon: Wrench, tone: "warning", t: "ECN-118 blocking release", d: "12 drawings waiting on design review." },
              ].map((a) => (
                <button key={a.t} className="group flex w-full items-start gap-3 rounded-lg border bg-background/60 p-2.5 text-left transition hover:border-primary/40 hover:bg-background">
                  <div className={cn(
                    "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md",
                    a.tone === "warning" ? "bg-amber-500/15 text-amber-600" :
                    a.tone === "success" ? "bg-emerald-500/15 text-emerald-600" : "bg-sky-500/15 text-sky-600",
                  )}>
                    <a.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{a.t}</div>
                    <div className="text-xs text-muted-foreground">{a.d}</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Live Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4 pl-5">
                <span className="absolute left-1.5 top-1 h-full w-px bg-border" />
                {[
                  { t: "success", w: "S. Iyer", a: "approved PO-1042", when: "2m" },
                  { t: "info", w: "Engg", a: "released ECN-118", when: "22m" },
                  { t: "warning", w: "QC", a: "raised NCR-77", when: "1h" },
                  { t: "primary", w: "CRM", a: "logged Tata RFQ", when: "3h" },
                  { t: "muted", w: "Prod", a: "closed WO-5521", when: "5h" },
                ].map((e, i) => (
                  <div key={i} className="relative">
                    <span className={cn(
                      "absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                      e.t === "success" ? "bg-emerald-500" :
                      e.t === "warning" ? "bg-amber-500" :
                      e.t === "info" ? "bg-sky-500" :
                      e.t === "primary" ? "bg-primary" : "bg-muted-foreground",
                    )}/>
                    <div className="text-xs">
                      <span className="font-medium">{e.w}</span>{" "}
                      <span className="text-muted-foreground">{e.a}</span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">{e.when} ago</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

// ----- sub-components -----
function KpiCard({
  icon: Icon, label, value, delta, up, hint, spark, color, to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; delta: string; up: boolean; hint: string;
  spark: { v: number }[]; color: string; to?: string;
}) {
  const inner = (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <div className="font-display text-3xl font-semibold tracking-tight">{value}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px]">
              <span className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono font-semibold",
                up ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600",
              )}>
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta}
              </span>
              <span className="text-muted-foreground">{hint}</span>
            </div>
          </div>
          <div className="h-10 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark}>
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function MiniStat({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: "success" | "info" | "warning";
}) {
  const map = {
    success: "text-emerald-600 bg-emerald-500/10",
    info: "text-sky-600 bg-sky-500/10",
    warning: "text-amber-600 bg-amber-500/10",
  };
  return (
    <div>
      <div className={cn("mx-auto grid h-8 w-8 place-items-center rounded-lg", map[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-1 font-mono text-sm font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
