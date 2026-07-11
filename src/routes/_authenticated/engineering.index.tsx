import { createFileRoute } from "@tanstack/react-router";
import { Package, FileText, GitBranch, ClipboardCheck, RefreshCcw, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlm } from "@/lib/plm/store";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { StatusPill } from "@/components/projects/shared";

export const Route = createFileRoute("/_authenticated/engineering/")({
  head: () => ({ meta: [{ title: "Engineering Dashboard · Faith Automation ERP" }] }),
  component: EngineeringDashboard,
});

const COLORS = ["hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(271 76% 53%)", "hsl(0 84% 60%)", "hsl(199 89% 48%)"];

function EngineeringDashboard() {
  const s = usePlm((s) => s);

  const openEcns = s.ecns.filter((e) => e.status !== "approved" && e.status !== "released" && e.status !== "rejected").length;
  const openEcrs = s.ecrs.filter((e) => e.status !== "approved" && e.status !== "rejected").length;
  const releasedDrawings = s.drawings.filter((d) => d.status === "Released").length;
  const totalBom = new Set(s.bom.filter((b) => !b.parentId).map((b) => b.rootId)).size;

  const kpis = [
    { label: "Item Master", value: String(s.items.length), sub: `${s.items.filter((i) => i.make_buy === "Make").length} Make · ${s.items.filter((i) => i.make_buy === "Buy").length} Buy`, icon: Package },
    { label: "Drawings", value: String(s.drawings.length), sub: `${releasedDrawings} Released`, icon: FileText },
    { label: "BOM Structures", value: String(totalBom), sub: "EBOM + MBOM", icon: Layers },
    { label: "Open Changes", value: String(openEcns + openEcrs), sub: `${openEcns} ECN · ${openEcrs} ECR`, icon: RefreshCcw },
  ];

  const itemByType = Object.entries(
    s.items.reduce<Record<string, number>>((acc, i) => ((acc[i.type] = (acc[i.type] || 0) + 1), acc), {}),
  ).map(([name, value]) => ({ name, value }));

  const partsByCategory = Object.entries(
    s.parts.reduce<Record<string, number>>((acc, p) => ((acc[p.category] = (acc[p.category] || 0) + 1), acc), {}),
  ).map(([name, value]) => ({ name, value }));

  const changeTrend = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    return {
      m: d.toLocaleDateString("en-IN", { month: "short" }),
      ECN: Math.floor(3 + Math.random() * 8),
      ECR: Math.floor(2 + Math.random() * 6),
    };
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
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
            <CardTitle className="font-display text-base">Engineering Change Trend</CardTitle>
            <p className="text-xs text-muted-foreground">ECN vs ECR volume, last 6 months</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={changeTrend}>
                  <defs>
                    <linearGradient id="ecn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ecr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="m" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="ECN" stroke="hsl(217 91% 60%)" fill="url(#ecn)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="ECR" stroke="hsl(38 92% 50%)" fill="url(#ecr)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Item Master Mix</CardTitle>
            <p className="text-xs text-muted-foreground">By classification</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={itemByType} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {itemByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {itemByType.map((r, i) => (
                <div key={r.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="ml-auto font-mono">{r.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Parts by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partsByCategory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(217 91% 60%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" /> Open Change Requests
            </CardTitle>
            <Badge variant="outline">{openEcns + openEcrs}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...s.ecns.filter((e) => e.status === "pending" || e.status === "draft"),
              ...s.ecrs.filter((e) => e.status === "under-review" || e.status === "draft")].slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.code} · {c.itemCode}</div>
                </div>
                <StatusPill status={c.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Upcoming Design Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {s.reviews.map((r) => (
              <div key={r.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                    <div className="mt-0.5 text-sm font-medium">{r.title}</div>
                  </div>
                  <StatusPill status={r.outcome === "Pending" ? "pending" : r.outcome === "Passed" ? "achieved" : r.outcome === "Failed" ? "rejected" : "in-progress"} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {new Date(r.scheduled).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · {r.reviewers.length} reviewers · {r.actions} actions
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
