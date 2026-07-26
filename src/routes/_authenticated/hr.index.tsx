import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, CalendarClock, GraduationCap, Wallet, Clock3, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHR } from "@/lib/hr/store";
import { StatusPill, Progress, fmtCompact, shortDate } from "@/components/projects/shared";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/hr/")({
  head: () => ({ meta: [{ title: "HR Dashboard · Faith Automation ERP" }] }),
  component: HRDashboard,
});

const COLORS = ["hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(0 84% 60%)", "hsl(271 76% 53%)", "hsl(199 89% 48%)"];

function HRDashboard() {
  const s = useHR((s) => s);
  const headcount = s.employees.filter((e) => e.status !== "exited").length;
  const active = s.employees.filter((e) => e.status === "active").length;
  const onLeave = s.employees.filter((e) => e.status === "on-leave").length;
  const notice = s.employees.filter((e) => e.status === "notice").length;
  const pendingLeaves = s.leaves.filter((l) => l.status === "pending").length;
  const openTs = s.timesheets.filter((t) => t.status !== "approved").length;
  const netPayroll = s.payrollRuns.find((p) => p.status === "released")?.net ?? 0;
  const trainingSeats = s.trainings.filter((t) => t.status === "planned" || t.status === "in-progress").reduce((a, t) => a + t.seats, 0);
  const trainingFilled = s.trainings.filter((t) => t.status === "planned" || t.status === "in-progress").reduce((a, t) => a + t.enrolled, 0);

  // Headcount trend (last 6 months, synthetic anchored at current)
  const trend = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    return {
      m: d.toLocaleDateString("en-IN", { month: "short" }),
      Headcount: headcount - (5 - i) + Math.round(Math.sin(i) * 0.6),
      Attrition: +(1.4 + Math.sin(i / 1.5) * 0.6).toFixed(1),
    };
  });

  // Department mix
  const deptMap = new Map<string, number>();
  s.employees.forEach((e) => deptMap.set(e.department, (deptMap.get(e.department) || 0) + 1));
  const deptMix = Array.from(deptMap.entries()).map(([name, value]) => ({ name, value }));

  // Attendance last 14 days
  const dayMap = new Map<string, { day: string; Present: number; Leave: number; WFH: number }>();
  s.attendance.forEach((a) => {
    const key = a.date;
    const row = dayMap.get(key) || { day: key.slice(5), Present: 0, Leave: 0, WFH: 0 };
    if (a.status === "present") row.Present++;
    else if (a.status === "leave") row.Leave++;
    else if (a.status === "wfh") row.WFH++;
    dayMap.set(key, row);
  });
  const attendanceTrend = Array.from(dayMap.values()).sort((a, b) => a.day.localeCompare(b.day)).slice(-10);

  const upcomingTrainings = s.trainings.filter((t) => t.status === "planned" || t.status === "in-progress").slice(0, 4);
  const pending = s.leaves.filter((l) => l.status === "pending").slice(0, 5);
  const openReviews = s.reviews.filter((r) => r.status !== "closed").slice(0, 5);
  const nameOf = (id: string) => s.employees.find((e) => e.id === id)?.name ?? id;

  const kpis = [
    { label: "Total Headcount", value: String(headcount), sub: `${active} active · ${onLeave} on leave · ${notice} notice`, icon: Users, tone: "from-primary via-primary/50" },
    { label: "Pending Approvals", value: String(pendingLeaves + openTs), sub: `${pendingLeaves} leaves · ${openTs} timesheets`, icon: CalendarClock, tone: "from-amber-500 via-amber-500/50" },
    { label: "Payroll Released", value: fmtCompact(netPayroll), sub: `${s.payrollRuns.find((p) => p.status === "released")?.period ?? "—"} · net paid`, icon: Wallet, tone: "from-emerald-500 via-emerald-500/50" },
    { label: "Training Utilization", value: `${trainingSeats ? Math.round((trainingFilled / trainingSeats) * 100) : 0}%`, sub: `${trainingFilled}/${trainingSeats} seats filled`, icon: GraduationCap, tone: "from-rose-500 via-rose-500/50" },
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Headcount vs Attrition</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="hc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Area yAxisId="l" type="monotone" dataKey="Headcount" stroke="hsl(217 91% 60%)" fill="url(#hc)" strokeWidth={2} />
                <Line yAxisId="r" type="monotone" dataKey="Attrition" stroke="hsl(0 84% 60%)" strokeWidth={2} dot />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Workforce by Department</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deptMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {deptMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Attendance — last 10 days</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceTrend} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="Present" stackId="a" fill="hsl(142 71% 45%)" />
                <Bar dataKey="WFH" stackId="a" fill="hsl(217 91% 60%)" />
                <Bar dataKey="Leave" stackId="a" fill="hsl(38 92% 50%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Pending leave approvals</CardTitle>
            <Link to="/hr/$section" params={{ section: "attendance" }} className="text-xs text-primary hover:underline">Open</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 ? (
              <div className="text-xs text-muted-foreground">No pending requests.</div>
            ) : pending.map((l) => (
              <div key={l.id} className="flex items-start justify-between gap-3 rounded-md border p-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{nameOf(l.empId)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {l.code} · {l.type} · {l.days}d · {shortDate(l.from)} → {shortDate(l.to)}
                  </div>
                </div>
                <StatusPill status={l.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /> Upcoming training</CardTitle>
            <Link to="/hr/$section" params={{ section: "skills" }} className="text-xs text-primary hover:underline">All</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTrainings.map((t) => (
              <div key={t.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <StatusPill status={t.status} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{t.provider} · {t.hours}h · {shortDate(t.startDate)} → {shortDate(t.endDate)}</div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Progress value={(t.enrolled / t.seats) * 100} className="flex-1" />
                  <span className="text-muted-foreground">{t.enrolled}/{t.seats}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Reviews in progress</CardTitle>
            <Link to="/hr/$section" params={{ section: "reviews" }} className="text-xs text-primary hover:underline">Open</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {openReviews.map((r) => (
              <div key={r.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">{nameOf(r.empId)}</div>
                  <StatusPill status={r.status} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{r.code} · {r.cycle} · reviewer: {r.reviewer}</div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Progress value={(r.goalsAchieved / Math.max(1, r.goals)) * 100} className="flex-1" />
                  <span className="text-muted-foreground">{r.goalsAchieved}/{r.goals} goals</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> People risks</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Notice period</div>
              <div className="mt-1 font-medium">{notice} employee(s) serving notice</div>
              <div className="text-[11px] text-muted-foreground">Aditya Joshi (Robotics) — knowledge transfer due</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Timesheet compliance</div>
              <div className="mt-1 font-medium">{openTs} timesheet(s) pending</div>
              <div className="text-[11px] text-muted-foreground">Billing risk on active projects if not approved</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Certification expiry</div>
              <div className="mt-1 font-medium">Robotics Safety batch expired</div>
              <div className="text-[11px] text-muted-foreground">18 operators need re-certification</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
