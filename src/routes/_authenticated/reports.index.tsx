import { createFileRoute, Link } from "@tanstack/react-router";
import { FileBarChart, Clock, Send, Sparkles, Download, Star, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useReports } from "@/lib/reports/store";
import { StatusPill, shortDate } from "@/components/projects/shared";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Reports Dashboard · Faith Automation ERP" }] }),
  component: ReportsDashboard,
});

const COLORS = ["hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(0 84% 60%)", "hsl(271 76% 53%)", "hsl(199 89% 48%)"];

function ReportsDashboard() {
  const s = useReports((s) => s);
  const totalReports = s.reports.length;
  const favorites = s.reports.filter((r) => r.favorite).length;
  const activeSchedules = s.schedules.filter((x) => x.active).length;
  const failedRuns = s.runs.filter((r) => r.status === "failed").length;
  const totalRuns = s.runs.length;
  const totalRows = s.runs.reduce((a, r) => a + r.rows, 0);

  const trend = Array.from({ length: 8 }).map((_, i) => ({
    w: `W${i + 1}`,
    Runs: Math.round(24 + Math.sin(i / 1.4) * 8 + i * 2),
    Exports: Math.round(12 + Math.cos(i / 1.7) * 5 + i * 1.4),
  }));

  const catMap = new Map<string, number>();
  s.reports.forEach((r) => catMap.set(r.module, (catMap.get(r.module) || 0) + r.runs));
  const modMix = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

  const fmtDist = new Map<string, number>();
  s.runs.forEach((r) => fmtDist.set(r.format, (fmtDist.get(r.format) || 0) + 1));
  const formats = Array.from(fmtDist.entries()).map(([name, value]) => ({ name, value }));

  const topReports = [...s.reports].sort((a, b) => b.runs - a.runs).slice(0, 5);
  const recentRuns = s.runs.slice(0, 6);
  const upcoming = [...s.schedules].filter((x) => x.active).sort((a, b) => a.nextRun.localeCompare(b.nextRun)).slice(0, 5);
  const reportName = (id: string) => s.reports.find((r) => r.id === id)?.name ?? id;

  const kpis = [
    { label: "Saved Reports", value: String(totalReports), sub: `${favorites} favorites · 9 modules`, icon: FileBarChart, tone: "from-primary via-primary/50" },
    { label: "Active Schedules", value: String(activeSchedules), sub: `${s.schedules.length - activeSchedules} paused · next in 24h`, icon: Send, tone: "from-emerald-500 via-emerald-500/50" },
    { label: "Runs (7 days)", value: String(totalRuns), sub: `${totalRows.toLocaleString()} rows delivered`, icon: TrendingUp, tone: "from-amber-500 via-amber-500/50" },
    { label: "Failed Runs", value: String(failedRuns), sub: failedRuns ? "Investigate scheduled deliveries" : "All clear", icon: AlertCircle, tone: failedRuns ? "from-rose-500 via-rose-500/50" : "from-emerald-500 via-emerald-500/50" },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${k.tone} to-transparent`} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <k.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-2xl font-semibold">{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Report activity — last 8 weeks</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="rx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="w" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Runs" stroke="hsl(217 91% 60%)" fill="url(#rr)" strokeWidth={2} />
                <Area type="monotone" dataKey="Exports" stroke="hsl(38 92% 50%)" fill="url(#rx)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Consumption by module</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={modMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {modMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Top reports (by runs)</CardTitle>
            <Link to="/reports/$section" params={{ section: "library" }} className="text-xs text-primary hover:underline">Library</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {topReports.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{r.name}</span>
                    {r.favorite && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{r.code} · {r.module} · owner {r.owner}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{r.runs}</div>
                    <div className="text-[10px] text-muted-foreground">runs</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Delivery format mix</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formats} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(217 91% 60%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Upcoming deliveries</CardTitle>
            <Link to="/reports/$section" params={{ section: "schedules" }} className="text-xs text-primary hover:underline">All</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((sc) => (
              <div key={sc.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">{reportName(sc.reportId)}</div>
                  <Badge variant="outline" className="text-[10px] uppercase">{sc.freq}</Badge>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Next: {shortDate(sc.nextRun)} · {sc.format} · {sc.recipients.length} recipients
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4 text-primary" /> Recent runs</CardTitle>
            <Link to="/reports/$section" params={{ section: "runs" }} className="text-xs text-primary hover:underline">Log</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentRuns.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{reportName(r.reportId)}</div>
                  <div className="text-[11px] text-muted-foreground">{shortDate(r.when)} · {r.by} · {r.format} · {r.rows} rows</div>
                </div>
                <StatusPill status={r.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI narratives</CardTitle>
            <Link to="/reports/$section" params={{ section: "narratives" }} className="text-xs text-primary hover:underline">All</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.narratives.slice(0, 3).map((n) => (
              <div key={n.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">{n.title}</div>
                  <Badge variant="outline" className={
                    n.tone === "warning" ? "border-amber-500/40 text-amber-600" :
                    n.tone === "positive" ? "border-emerald-500/40 text-emerald-600" :
                    "text-[10px]"
                  }>{n.scope}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{n.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
