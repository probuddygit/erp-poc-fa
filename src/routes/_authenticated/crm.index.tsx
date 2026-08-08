import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  DollarSign,
  FileText,
  Target,
  TrendingUp,
  Trophy,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCrm } from "@/lib/crm/store";
import { StatusBadge, fmtCompact, fmtDate, fmtINR, relDate } from "@/components/crm/shared";
import { OPPORTUNITY_STAGES, TONE_HEX, statusLabel, statusTone } from "@/lib/crm/lifecycle";
import { findDuplicateLeads, leadScore, opportunityHealth } from "@/lib/crm/workflow";

export const Route = createFileRoute("/_authenticated/crm/")({
  head: () => ({ meta: [{ title: "Revenue Dashboard · Faith Automation ERP" }] }),
  component: CrmDashboard,
});

const STAGES = OPPORTUNITY_STAGES;
const STAGE_COLORS: Record<string, string> = Object.fromEntries(
  OPPORTUNITY_STAGES.map((st) => [st, TONE_HEX[statusTone(st)]]),
);

function CrmDashboard() {
  const s = useCrm((s) => s);

  const openOpps = s.opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost");
  const pipelineValue = openOpps.reduce((sum, o) => sum + o.value, 0);
  const weighted = openOpps.reduce((sum, o) => sum + (o.value * o.probability) / 100, 0);
  const wonYtd = s.opportunities.filter((o) => o.stage === "won").reduce((sum, o) => sum + o.value, 0);
  const winRate = (() => {
    const closed = s.opportunities.filter((o) => o.stage === "won" || o.stage === "lost");
    if (!closed.length) return 0;
    return Math.round(
      (s.opportunities.filter((o) => o.stage === "won").length / closed.length) * 100,
    );
  })();

  const kpis = [
    { label: "Open Pipeline", value: fmtCompact(pipelineValue), sub: `${openOpps.length} opportunities`, icon: TrendingUp, delta: "+12.4%" },
    { label: "Weighted Forecast", value: fmtCompact(weighted), sub: "Probability-adjusted", icon: Target, delta: "+8.1%" },
    { label: "Won (YTD)", value: fmtCompact(wonYtd), sub: `${s.opportunities.filter((o) => o.stage === "won").length} closed`, icon: Trophy, delta: "+18.7%" },
    { label: "Win Rate", value: `${winRate}%`, sub: "Last 90 days", icon: DollarSign, delta: "+3.2 pts" },
  ];

  const pipelineByStage = STAGES.map((stage) => {
    const rows = s.opportunities.filter((o) => o.stage === stage);
    return {
      stage,
      count: rows.length,
      value: rows.reduce((sum, o) => sum + o.value, 0),
    };
  });

  const funnel = [
    { name: "Leads", value: s.leads.length },
    { name: "Opportunities", value: s.opportunities.length },
    { name: "RFQs", value: s.rfqs.length },
    { name: "Proposals", value: s.proposals.length },
    { name: "Quotations", value: s.quotations.length },
    { name: "OAs", value: s.oas.length },
  ];

  const forecast = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    return {
      m: d.toLocaleDateString("en-IN", { month: "short" }),
      plan: 4000000 + i * 800000,
      actual: 3200000 + Math.round(Math.random() * 3500000) + i * 500000,
    };
  });

  const recentActivities = s.activities.slice(0, 6);
  const pendingOAs = s.oas.filter((o) =>
    ["sales-approval", "finance-validation", "management-approval"].includes(o.status),
  );

  const oppHealth = openOpps.map((o) => ({
    ...o,
    health: opportunityHealth(o as unknown as Record<string, unknown>, s),
  }));
  const healthBands = (
    [
      ["green", "Healthy", "bg-emerald-500"],
      ["amber", "Watch", "bg-amber-500"],
      ["red", "At risk", "bg-rose-500"],
    ] as const
  ).map(([key, label, dot]) => {
    const rows = oppHealth.filter((o) => o.health.rag === key);
    return { key, label, dot, count: rows.length, value: rows.reduce((t, o) => t + o.value, 0) };
  });
  const stalled = [...oppHealth]
    .filter((o) => o.health.stalled || o.health.rag === "red")
    .sort((a, b) => a.health.score - b.health.score)
    .slice(0, 4);

  const openLeads = s.leads.filter(
    (l) => l.status !== "converted" && l.status !== "disqualified",
  );
  const scoredLeads = openLeads.map((l) => leadScore(l as unknown as Record<string, unknown>, s));
  const leadBands = [
    { label: "Hot (60+)", tone: "bg-emerald-500", count: scoredLeads.filter((n) => n >= 60).length },
    { label: "Warm (40–59)", tone: "bg-amber-500", count: scoredLeads.filter((n) => n >= 40 && n < 60).length },
    { label: "Cold (<40)", tone: "bg-rose-500", count: scoredLeads.filter((n) => n < 40).length },
  ];
  const duplicateLeadCount = s.leads.filter(
    (l) => findDuplicateLeads(l as unknown as Record<string, unknown>, s).length > 0,
  ).length;


  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {k.label}
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{k.value}</div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{k.sub}</span>
                <span className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3 w-3" />
                  {k.delta}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline + Forecast */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="font-display text-base">Order Intake · Plan vs Actual</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">FY 26</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast}>
                  <defs>
                    <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="m" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis
                    className="text-xs"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => fmtCompact(Number(v))}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmtINR(v)}
                  />
                  <Area type="monotone" dataKey="plan" stroke="hsl(215 20% 65%)" strokeDasharray="4 4" fill="transparent" strokeWidth={2} />
                  <Area type="monotone" dataKey="actual" stroke="hsl(217 91% 60%)" fill="url(#fillActual)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Pipeline by Stage</CardTitle>
            <p className="text-xs text-muted-foreground">Value distribution</p>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineByStage}
                    dataKey="value"
                    nameKey="stage"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {pipelineByStage.map((entry) => (
                      <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmtINR(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5">
              {pipelineByStage.map((r) => (
                <div key={r.stage} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: STAGE_COLORS[r.stage] }} />
                  <span className="text-muted-foreground">{statusLabel(r.stage)}</span>
                  <span className="ml-auto font-medium">{fmtCompact(r.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Intelligence signals */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Deal Health</CardTitle>
            <p className="text-xs text-muted-foreground">Open opportunities by risk band</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {healthBands.map((b) => (
              <div
                key={b.key}
                className="flex items-center justify-between rounded-lg border p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${b.dot}`} />
                  <span className="text-sm font-medium">{b.label}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold">{fmtCompact(b.value)}</div>
                  <div className="text-[11px] text-muted-foreground">{b.count} deals</div>
                </div>
              </div>
            ))}
            <Link
              to="/crm/$entity"
              params={{ entity: "opportunities" }}
              className="block pt-1 text-xs font-medium text-primary hover:underline"
            >
              Open pipeline →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Stalled Deals</CardTitle>
            <p className="text-xs text-muted-foreground">Lowest health scores need attention</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {stalled.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                No stalled opportunities.
              </div>
            )}
            {stalled.map((o) => (
              <Link
                key={o.id}
                to="/crm/$entity/$id"
                params={{ entity: "opportunities", id: o.id }}
                className="block rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">{o.name}</div>
                  <span className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {o.health.score}
                  </span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {o.code} · stage age {o.health.stageAgeDays}d
                </div>
                <div className="mt-1 truncate text-[11px] text-muted-foreground">
                  {o.health.reasons[0]}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Lead Quality</CardTitle>
            <p className="text-xs text-muted-foreground">Score distribution across open leads</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {leadBands.map((b) => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{b.label}</span>
                  <span className="text-muted-foreground">{b.count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${b.tone}`}
                    style={{ width: `${openLeads.length ? (b.count / openLeads.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="rounded-lg border p-2.5 text-xs">
              <span className="font-semibold">{duplicateLeadCount}</span>{" "}
              <span className="text-muted-foreground">possible duplicate leads detected</span>
            </div>
            <Link
              to="/crm/$entity"
              params={{ entity: "leads" }}
              className="block text-xs font-medium text-primary hover:underline"
            >
              Review leads →
            </Link>
          </CardContent>
        </Card>
      </div>


      {/* Funnel + Approvals + Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Revenue Funnel</CardTitle>
            <p className="text-xs text-muted-foreground">Record counts across each stage</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(217 91% 60%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Pending OA Approvals</CardTitle>
            <p className="text-xs text-muted-foreground">Approve to auto-provision Projects</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingOAs.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                No OAs pending approval.
              </div>
            )}
            {pendingOAs.map((o) => (
              <Link
                key={o.id}
                to="/crm/$entity/$id"
                params={{ entity: "oas", id: o.id }}
                className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{o.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {o.code} · {o.customerName}
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-medium">{fmtINR(o.value)}</span>
                  <span className="text-muted-foreground">PO {o.poNumber}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Hot opps + recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="font-display text-base">Top Opportunities</CardTitle>
              <p className="text-xs text-muted-foreground">Ranked by weighted value</p>
            </div>
            <Link to="/crm/$entity" params={{ entity: "opportunities" }} className="text-xs font-medium text-primary hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {[...s.opportunities]
                .filter((o) => o.stage !== "lost")
                .sort((a, b) => (b.value * b.probability) - (a.value * a.probability))
                .slice(0, 5)
                .map((o) => (
                  <Link
                    key={o.id}
                    to="/crm/$entity/$id"
                    params={{ entity: "opportunities", id: o.id }}
                    className="grid grid-cols-[1fr_auto] gap-3 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{o.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {o.code} · {o.customerName} · Owner {o.owner}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold">{fmtCompact(o.value)}</div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <StatusBadge status={o.stage} />
                        <span className="text-muted-foreground">{o.probability}%</span>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.map((a) => (
              <div key={a.id} className="flex gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.actor} · {relDate(a.at)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Auto-provisioned Projects */}
      {s.projects.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <FileText className="h-4 w-4 text-primary" />
              Projects auto-provisioned from OA approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {s.projects.map((p) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.code} · {p.customerName}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold">{fmtINR(p.value)}</span>
                    <span className="text-muted-foreground">{fmtDate(p.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
