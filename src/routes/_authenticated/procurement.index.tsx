import { createFileRoute } from "@tanstack/react-router";
import { Package, FileCheck2, ShoppingBag, Truck, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProcurement } from "@/lib/procurement/store";
import { StatusPill, fmtCompact, shortDate } from "@/components/projects/shared";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/procurement/")({
  head: () => ({ meta: [{ title: "Procurement Dashboard · Faith Automation ERP" }] }),
  component: ProcurementDashboard,
});

const COLORS = ["hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(271 76% 53%)", "hsl(0 84% 60%)", "hsl(199 89% 48%)"];

function ProcurementDashboard() {
  const s = useProcurement((s) => s);

  const openPr = s.requisitions.filter((r) => r.status === "pending" || r.status === "draft").length;
  const openRfq = s.rfqs.filter((r) => r.status === "issued" || r.status === "responses" || r.status === "evaluating").length;
  const openPo = s.pos.filter((p) => !["closed", "cancelled", "received"].includes(p.status));
  const openPoValue = openPo.reduce((a, p) => a + p.amount - p.received, 0);
  const spendYtd = s.vendors.reduce((a, v) => a + v.spendYtd, 0);
  const qualified = s.vendors.filter((v) => v.qualification === "qualified").length;
  const overduePo = s.pos.filter((p) => new Date(p.promisedDate) < new Date() && !["received", "closed", "cancelled"].includes(p.status)).length;
  const unmatched = s.grns.filter((g) => g.invoiceMatch === "unmatched" || g.invoiceMatch === "hold").length;

  const kpis = [
    { label: "Vendors", value: String(s.vendors.length), sub: `${qualified} qualified`, icon: Package, tone: "from-primary via-primary/50" },
    { label: "Open Requisitions", value: String(openPr), sub: `${s.requisitions.length} lifetime`, icon: FileCheck2, tone: "from-blue-500 via-blue-500/50" },
    { label: "Active POs", value: String(openPo.length), sub: fmtCompact(openPoValue) + " open", icon: ShoppingBag, tone: "from-amber-500 via-amber-500/50" },
    { label: "Spend YTD", value: fmtCompact(spendYtd), sub: `${s.grns.length} receipts`, icon: TrendingUp, tone: "from-emerald-500 via-emerald-500/50" },
  ];

  const monthly = Array.from({ length: 9 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 8 + i);
    const base = 6 + Math.sin(i / 1.6) * 2 + i * 0.4;
    return {
      m: d.toLocaleDateString("en-IN", { month: "short" }),
      Plan: Math.round((base + 1) * 12) * 100000,
      Actual: Math.round(base * 12) * 100000,
    };
  });

  const spendByCategory = Object.entries(
    s.vendors.reduce<Record<string, number>>((acc, v) => ((acc[v.category] = (acc[v.category] || 0) + v.spendYtd), acc), {}),
  ).map(([name, value]) => ({ name, value }));

  const topVendors = [...s.vendors].sort((a, b) => b.spendYtd - a.spendYtd).slice(0, 5)
    .map((v) => ({ name: v.name.length > 18 ? v.name.slice(0, 17) + "…" : v.name, spend: v.spendYtd }));

  const funnel = [
    { stage: "PR", count: s.requisitions.length },
    { stage: "RFQ", count: s.rfqs.length },
    { stage: "PO", count: s.pos.length },
    { stage: "GRN", count: s.grns.length },
  ];

  const pendingApprovals = s.requisitions.filter((r) => r.status === "pending");
  const evalRfqs = s.rfqs.filter((r) => r.status === "responses" || r.status === "evaluating");

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
            <CardTitle className="font-display text-base">Monthly Spend — Plan vs Actual</CardTitle>
            <p className="text-xs text-muted-foreground">Trailing 9 months</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="p" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="a" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="m" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(v as number)} />
                  <Tooltip formatter={(v: number) => fmtCompact(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="Plan" stroke="hsl(217 91% 60%)" fill="url(#p)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Actual" stroke="hsl(38 92% 50%)" fill="url(#a)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Spend by Category</CardTitle>
            <p className="text-xs text-muted-foreground">YTD share</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={spendByCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {spendByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtCompact(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {spendByCategory.map((r, i) => (
                <div key={r.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="ml-auto font-mono">{fmtCompact(r.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Top Vendors by Spend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVendors} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(v as number)} />
                  <YAxis type="category" dataKey="name" className="text-xs" tickLine={false} axisLine={false} width={120} />
                  <Tooltip formatter={(v: number) => fmtCompact(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="spend" radius={[0, 6, 6, 0]} fill="hsl(217 91% 60%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Procurement Funnel</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="stage" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="hsl(271 76% 53%)" />
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
            <AttnRow label="Overdue POs" count={overduePo} tone="rose" />
            <AttnRow label="Unmatched invoices" count={unmatched} tone="amber" />
            <AttnRow label="Approvals pending" count={pendingApprovals.length} tone="amber" />
            <AttnRow label="RFQs to evaluate" count={evalRfqs.length} tone="blue" />
            <AttnRow label="Vendors in qualification" count={s.vendors.filter((v) => v.qualification === "in-review").length} tone="blue" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-primary" /> Pending PR Approvals
            </CardTitle>
            <Badge variant="outline">{pendingApprovals.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingApprovals.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                    <StatusPill status={r.priority} />
                  </div>
                  <div className="mt-0.5 truncate text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.department} · {r.requestedBy} · need by {shortDate(r.needBy)}</div>
                </div>
                <div className="text-right font-mono text-sm">{fmtCompact(r.totalEst)}</div>
              </div>
            ))}
            {!pendingApprovals.length && <div className="p-6 text-center text-sm text-muted-foreground">No PRs awaiting approval.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Recent Goods Receipts
            </CardTitle>
            <Badge variant="outline">{s.grns.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.grns.slice(0, 5).map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{g.code}</span>
                    <Badge variant="secondary">{g.poCode}</Badge>
                  </div>
                  <div className="mt-0.5 truncate text-sm font-medium">{g.vendorName}</div>
                  <div className="text-xs text-muted-foreground">{shortDate(g.receivedAt)} · {g.receivedBy}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="font-mono text-sm">{fmtCompact(g.amount)}</div>
                  <StatusPill status={g.invoiceMatch === "3-way-matched" ? "approved" : g.invoiceMatch === "hold" ? "on-hold" : g.invoiceMatch === "unmatched" ? "pending" : "in-progress"} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
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
