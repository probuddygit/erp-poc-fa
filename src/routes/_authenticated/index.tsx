import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Factory,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Wallet,
  Wrench,
  AlertTriangle,
  Clock,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Command Center · Faith Automation ERP" },
      {
        name: "description",
        content:
          "Real-time command center for projects, production, procurement, quality, and finance across Faith Automation.",
      },
    ],
  }),
  component: DashboardPage,
});

const revenueSeries = [
  { m: "Jan", plan: 42, actual: 38 },
  { m: "Feb", plan: 48, actual: 46 },
  { m: "Mar", plan: 55, actual: 58 },
  { m: "Apr", plan: 60, actual: 55 },
  { m: "May", plan: 62, actual: 66 },
  { m: "Jun", plan: 70, actual: 72 },
  { m: "Jul", plan: 74, actual: 78 },
  { m: "Aug", plan: 80, actual: 84 },
];

const throughputSeries = [
  { d: "Mon", weld: 84, assy: 72 },
  { d: "Tue", weld: 92, assy: 80 },
  { d: "Wed", weld: 88, assy: 78 },
  { d: "Thu", weld: 96, assy: 86 },
  { d: "Fri", weld: 90, assy: 82 },
  { d: "Sat", weld: 60, assy: 55 },
];

function DashboardPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary via-primary to-[oklch(0.30_0.08_255)] p-6 text-primary-foreground shadow-elevated sm:p-8">
        <div className="surface-grid absolute inset-0 opacity-30" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary-foreground/70">
              <span className="inline-flex h-2 w-2 rounded-full bg-accent" />
              Command Center · Live
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Good morning, Faith Automation
            </h1>
            <p className="mt-1 max-w-xl text-sm text-primary-foreground/75">
              12 active projects · 4 shop floors online · 3 AI insights waiting for review.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="secondary" className="gap-2 bg-white/10 text-primary-foreground hover:bg-white/20">
              <ClipboardList className="h-4 w-4" />
              Today's plan
            </Button>
            <Button size="sm" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Sparkles className="h-4 w-4" />
              Ask Faith AI
            </Button>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Order Book (YTD)"
          value="₹ 128.4 Cr"
          delta="+12.4%"
          up
          hint="vs. plan"
          accent="primary"
        />
        <KpiCard
          icon={Factory}
          label="On-Time Delivery"
          value="94.2%"
          delta="+2.1%"
          up
          hint="last 30 days"
          accent="success"
        />
        <KpiCard
          icon={CheckCircle2}
          label="First Pass Yield"
          value="97.8%"
          delta="-0.6%"
          up={false}
          hint="Quality · WoW"
          accent="warning"
        />
        <KpiCard
          icon={Boxes}
          label="Inventory Turns"
          value="6.4x"
          delta="+0.3x"
          up
          hint="rolling 12M"
          accent="info"
        />
      </section>

      {/* Charts row */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Revenue vs. Plan</CardTitle>
              <p className="text-xs text-muted-foreground">₹ Cr · FY26</p>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <TrendingUp className="h-3 w-3 text-success" />
              +8.1% ahead
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="plan" stroke="var(--color-chart-2)" fill="url(#g2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="actual" stroke="var(--color-chart-1)" fill="url(#g1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shop Floor Throughput</CardTitle>
            <p className="text-xs text-muted-foreground">Units / day · this week</p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={throughputSeries} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="weld" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="assy" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Projects + Activity + AI */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Active BIW Projects</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View all <ArrowUpRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { code: "BIW-2041", name: "Tata Nexon EV — Underbody Line", pm: "R. Menon", pct: 78, status: "On Track", tone: "success" },
              { code: "BIW-2038", name: "Mahindra XUV — Side Frame Cell", pm: "S. Iyer", pct: 54, status: "At Risk", tone: "warning" },
              { code: "BIW-2044", name: "Ashok Leyland — Cabin Welding", pm: "A. Khan", pct: 32, status: "On Track", tone: "success" },
              { code: "BIW-2029", name: "Bajaj — Chassis Robotic Cell", pm: "D. Rao", pct: 91, status: "Commissioning", tone: "info" },
            ].map((p) => (
              <div key={p.code} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{p.code}</span>
                    <StatusBadge tone={p.tone as StatusTone}>{p.status}</StatusBadge>
                  </div>
                  <div className="mt-0.5 truncate text-sm font-medium">{p.name}</div>
                  <div className="mt-2 flex items-center gap-3">
                    <Progress value={p.pct} className="h-1.5 flex-1" />
                    <span className="w-10 text-right font-mono text-xs text-muted-foreground">{p.pct}%</span>
                  </div>
                </div>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                    {p.pm.split(" ").map((s) => s[0]).join("")}
                  </AvatarFallback>
                </Avatar>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Faith AI Insights</CardTitle>
                <p className="text-xs text-muted-foreground">Prioritized for today</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: AlertTriangle, tone: "warning", t: "3 POs likely to slip", d: "Vendor lead-time drift on BIW-2038." },
              { icon: TrendingUp, tone: "success", t: "Yield improving on Cell 7", d: "+2.4% after fixture re-calibration." },
              { icon: Clock, tone: "info", t: "Design review overdue", d: "BIW-2044 · Underbody CAD sign-off." },
            ].map((a) => (
              <button
                key={a.t}
                className="group flex w-full items-start gap-3 rounded-lg border bg-background/60 p-3 text-left transition hover:border-primary/40 hover:bg-background"
              >
                <div
                  className={
                    "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md " +
                    (a.tone === "warning"
                      ? "bg-warning/15 text-warning"
                      : a.tone === "success"
                        ? "bg-success/15 text-success"
                        : "bg-info/15 text-info")
                  }
                >
                  <a.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.d}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </button>
            ))}
            <Button className="w-full gap-2" size="sm">
              <MessageSquare className="h-4 w-4" />
              Open AI assistant
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Activity feed + quick stats */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-5 pl-6">
              <span className="absolute left-2 top-1 h-full w-px bg-border" />
              {[
                { icon: CheckCircle2, tone: "success", who: "S. Iyer", what: "approved PO-1042 for ₹4.2L", when: "2m" },
                { icon: Wrench, tone: "info", who: "Engineering", what: "released ECN-118 on fixture F-203", when: "22m" },
                { icon: AlertTriangle, tone: "warning", who: "QC", what: "raised NCR-77 on Weld-Cell 3", when: "1h" },
                { icon: Users, tone: "primary", who: "CRM", what: "logged RFQ from Tata Motors", when: "3h" },
                { icon: Activity, tone: "muted", who: "Production", what: "closed WO-5521", when: "5h" },
              ].map((e, i) => (
                <div key={i} className="relative">
                  <div
                    className={
                      "absolute -left-6 top-0 grid h-4 w-4 place-items-center rounded-full ring-4 ring-background " +
                      (e.tone === "success"
                        ? "bg-success"
                        : e.tone === "warning"
                          ? "bg-warning"
                          : e.tone === "info"
                            ? "bg-info"
                            : e.tone === "primary"
                              ? "bg-primary"
                              : "bg-muted-foreground")
                    }
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm">
                      <span className="font-medium">{e.who}</span>{" "}
                      <span className="text-muted-foreground">{e.what}</span>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{e.when}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Approvals Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { t: "PR-2201 · ₹ 1.8L", d: "Procurement" },
                { t: "ECN-119 · Rev B", d: "Engineering" },
                { t: "Leave · 3 days", d: "HR" },
              ].map((a) => (
                <div key={a.t} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.t}</div>
                    <div className="text-xs text-muted-foreground">{a.d}</div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0">
                    Review
                  </Button>
                </div>
              ))}
              <Separator />
              <div className="text-xs text-muted-foreground">7 items pending · avg. cycle 2.4h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { l: "Weld Cells", v: 82 },
                { l: "Assembly", v: 74 },
                { l: "CNC Machining", v: 68 },
                { l: "Paint Shop", v: 55 },
              ].map((u) => (
                <div key={u.l}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{u.l}</span>
                    <span className="font-mono font-medium">{u.v}%</span>
                  </div>
                  <Progress value={u.v} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

type StatusTone = "success" | "warning" | "info" | "destructive" | "muted";

function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  const map: Record<StatusTone, string> = {
    success: "bg-success/12 text-success border-success/20",
    warning: "bg-warning/15 text-warning-foreground border-warning/30",
    info: "bg-info/12 text-info border-info/20",
    destructive: "bg-destructive/12 text-destructive border-destructive/20",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
        map[tone]
      }
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {children}
    </span>
  );
}

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: string;
  up: boolean;
  hint: string;
  accent: "primary" | "success" | "warning" | "info";
}

function KpiCard({ icon: Icon, label, value, delta, up, hint, accent }: KpiCardProps) {
  const tint: Record<KpiCardProps["accent"], string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    info: "bg-info/12 text-info",
  };
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={"grid h-10 w-10 place-items-center rounded-lg " + tint[accent]}>
            <Icon className="h-5 w-5" />
          </div>
          <span
            className={
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium " +
              (up ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive")
            }
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </span>
        </div>
        <div className="mt-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-semibold tracking-tight">{value}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
        </div>
      </CardContent>
    </Card>
  );
}
