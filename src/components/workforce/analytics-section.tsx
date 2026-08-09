import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useHR } from "@/lib/hr/store";
import { useWorkforce } from "@/lib/workforce/store";
import { AiMetricStrip } from "@/components/ai/module-copilot";
import { fmtCompact } from "@/components/projects/shared";
import { attritionRisk } from "@/lib/workforce/intelligence";

const COLORS = ["hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(0 84% 60%)", "hsl(271 76% 53%)", "hsl(199 89% 48%)"];
const n = (v: unknown) => Number(v ?? 0);

/** Executive analytics across people, training, safety, admin and compliance. */
export function WorkforceAnalytics() {
  const hr = useHR((s) => s);
  const w = useWorkforce((s) => s);

  const headcount = hr.employees.filter((e) => e.status !== "exited").length;
  const openReqs = w.requisitions.filter((r) => r.status === "approved").length;
  const ltis = w.incidents.filter((i) => i.type === "Lost time injury").length;
  const overdueCompliance = w.complianceItems.filter((c) => c.status === "overdue").length;
  const travelSpend = w.travelRequests.reduce((a, t) => a + n(t.estimatedCost), 0);
  const trainingSpend = w.trainingPlans.reduce((a, t) => a + n(t.budget), 0);
  const adminSpend =
    w.utilityBills.reduce((a, b) => a + n(b.amount), 0) +
    w.adminInvoices.reduce((a, b) => a + n(b.amount), 0) +
    w.canteen.reduce((a, b) => a + n(b.amount), 0);

  const atRisk = useMemo(
    () =>
      hr.employees
        .filter((e) => e.status === "active")
        .map((e) => ({ name: e.name.split(" ")[0], risk: attritionRisk(e.id, hr, w) }))
        .sort((a, b) => b.risk - a.risk)
        .slice(0, 6),
    [hr, w],
  );

  const deptMix = useMemo(() => {
    const m = new Map<string, number>();
    hr.employees.forEach((e) => m.set(e.department, (m.get(e.department) ?? 0) + 1));
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [hr.employees]);

  const funnel = [
    { stage: "Applications", value: w.jobPostings.reduce((a, j) => a + n(j.applications), 0) },
    { stage: "Shortlisted", value: w.jobPostings.reduce((a, j) => a + n(j.shortlisted), 0) },
    { stage: "Interviewed", value: w.interviews.length },
    { stage: "Offers", value: w.offers.length },
    { stage: "Joined", value: w.onboarding.filter((o) => o.status === "completed").length },
  ];

  const safetyTrend = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    return {
      m: d.toLocaleDateString("en-IN", { month: "short" }),
      Incidents: Math.max(0, 3 - i + (i % 2)),
      "Near misses": 4 + ((i * 3) % 5),
    };
  });

  const spendMix = [
    { name: "Utilities", value: w.utilityBills.reduce((a, b) => a + n(b.amount), 0) },
    { name: "Canteen", value: w.canteen.reduce((a, b) => a + n(b.amount), 0) },
    { name: "Transport", value: w.transport.reduce((a, b) => a + n(b.monthlyCost), 0) },
    { name: "Housekeeping", value: w.housekeeping.reduce((a, b) => a + n(b.monthlyCost), 0) },
    { name: "Travel", value: travelSpend },
    { name: "Training", value: trainingSpend },
  ];

  const trainingKpi = [
    { name: "Plan adherence", value: Math.round((w.trainingPlans.filter((t) => t.status !== "draft").length / Math.max(1, w.trainingPlans.length)) * 100), fill: COLORS[0] },
    { name: "Effectiveness", value: Math.round((w.trainingFeedback.filter((f) => f.effectiveness === "high").length / Math.max(1, w.trainingFeedback.length)) * 100), fill: COLORS[2] },
    { name: "Competency cover", value: Math.round((w.competencies.filter((c) => n(c.gap) < 0.5).length / Math.max(1, w.competencies.length)) * 100), fill: COLORS[5] },
  ];

  const complianceByType = useMemo(() => {
    const m = new Map<string, { name: string; Filed: number; Pending: number; Overdue: number }>();
    w.complianceItems.forEach((c) => {
      const k = String(c.type);
      const row = m.get(k) ?? { name: k, Filed: 0, Pending: 0, Overdue: 0 };
      if (c.status === "filed") row.Filed++;
      else if (c.status === "overdue") row.Overdue++;
      else row.Pending++;
      m.set(k, row);
    });
    return Array.from(m.values());
  }, [w.complianceItems]);

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">Analytics & Dashboards</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Executive view across employee, recruitment, training, safety, payroll, travel, facility and compliance KPIs.
        </p>
      </div>

      <AiMetricStrip
        items={[
          { label: "Headcount", value: String(headcount), sub: `${hr.employees.filter((e) => e.status === "notice").length} on notice` },
          { label: "Open Positions", value: String(openReqs), sub: `${w.candidates.length} candidates in pipeline` },
          { label: "Lost Time Injuries", value: String(ltis), warn: ltis > 0, sub: `${w.nearMisses.length} near misses logged` },
          { label: "Compliance Overdue", value: String(overdueCompliance), warn: overdueCompliance > 0 },
          { label: "Admin & Facility Spend", value: fmtCompact(adminSpend) },
          { label: "Travel Spend", value: fmtCompact(travelSpend) },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recruitment funnel</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Workforce by department</CardTitle></CardHeader>
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
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">AI attrition risk — top 6</CardTitle></CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={atRisk} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="risk" radius={[0, 4, 4, 0]}>
                  {atRisk.map((r, i) => <Cell key={i} fill={r.risk >= 70 ? COLORS[3] : r.risk >= 50 ? COLORS[1] : COLORS[2]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Safety trend — incidents vs near misses</CardTitle></CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={safetyTrend} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Near misses" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.15} />
                <Line type="monotone" dataKey="Incidents" stroke={COLORS[3]} strokeWidth={2} dot />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Training KPIs</CardTitle></CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart data={trainingKpi} innerRadius="35%" outerRadius="95%" startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={6} background />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Administration & facility spend mix</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendMix} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCompact(Number(v))} />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => fmtCompact(Number(v))} />
                <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance status by type</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceByType} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Filed" stackId="a" fill={COLORS[2]} />
                <Bar dataKey="Pending" stackId="a" fill={COLORS[1]} />
                <Bar dataKey="Overdue" stackId="a" fill={COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
