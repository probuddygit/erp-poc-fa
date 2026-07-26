import { createFileRoute } from "@tanstack/react-router";
import { Wallet, TrendingUp, AlertTriangle, Banknote, Receipt, Landmark, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFinance } from "@/lib/finance/store";
import { StatusPill, Progress, fmtCompact, shortDate } from "@/components/projects/shared";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/finance/")({
  head: () => ({ meta: [{ title: "Finance Dashboard · Faith Automation ERP" }] }),
  component: FinanceDashboard,
});

const COLORS = ["hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(0 84% 60%)", "hsl(271 76% 53%)", "hsl(199 89% 48%)"];

function FinanceDashboard() {
  const s = useFinance((s) => s);

  const arOutstanding = s.arInvoices.reduce((a, i) => a + Math.max(0, (i.amount + i.gst - i.tds) - i.received), 0);
  const arOverdue = s.arInvoices.filter((i) => i.status === "overdue").reduce((a, i) => a + (i.amount + i.gst - i.tds - i.received), 0);
  const apOutstanding = s.apBills.reduce((a, b) => a + Math.max(0, (b.amount + b.gst - b.tds) - b.paid), 0);
  const apOverdue = s.apBills.filter((b) => b.status === "overdue").reduce((a, b) => a + (b.amount + b.gst - b.tds - b.paid), 0);
  const cash = s.bankAccounts.reduce((a, b) => a + b.bookBalance, 0);
  const gstNet = s.taxLedgers.filter((t) => t.status === "open" || t.status === "prepared").reduce((a, t) => a + t.netPayable, 0);
  const wip = s.projectCosts.reduce((a, p) => a + p.wip, 0);
  const revenue = s.accounts.filter((a) => a.type === "income").reduce((a, x) => a + x.balance, 0);
  const expenses = s.accounts.filter((a) => a.type === "expense").reduce((a, x) => a + x.balance, 0);
  const ebitda = revenue - expenses + s.accounts.filter((a) => a.code === "6500").reduce((a, x) => a + x.balance, 0);

  const kpis = [
    { label: "Cash & Bank", value: fmtCompact(cash), sub: `${s.bankAccounts.length} accounts · ${s.bankTxns.filter((t) => t.status === "unmatched").length} unmatched`, icon: Banknote, tone: "from-emerald-500 via-emerald-500/50" },
    { label: "AR Outstanding", value: fmtCompact(arOutstanding), sub: `${fmtCompact(arOverdue)} overdue · ${s.arInvoices.filter((i) => i.status !== "paid").length} invoices`, icon: Receipt, tone: "from-primary via-primary/50" },
    { label: "AP Outstanding", value: fmtCompact(apOutstanding), sub: `${fmtCompact(apOverdue)} overdue · ${s.apBills.filter((b) => b.matchStatus !== "matched").length} unmatched`, icon: FileText, tone: "from-amber-500 via-amber-500/50" },
    { label: "GST + TDS Payable", value: fmtCompact(gstNet), sub: `${s.taxLedgers.filter((t) => t.status === "open").length} filings open`, icon: Landmark, tone: "from-rose-500 via-rose-500/50" },
  ];

  // Revenue vs Cost trend
  const trend = Array.from({ length: 9 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 8 + i);
    const rev = Math.round(38 + Math.sin(i / 1.4) * 6 + i * 1.6);
    const cost = Math.round(rev * (0.68 - Math.sin(i / 2) * 0.04));
    return { m: d.toLocaleDateString("en-IN", { month: "short" }), Revenue: rev, Cost: cost, Margin: rev - cost };
  });

  // Cash flow last 6 months
  const cashflow = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    return {
      m: d.toLocaleDateString("en-IN", { month: "short" }),
      Inflow: Math.round(42 + Math.sin(i) * 8 + i * 2),
      Outflow: Math.round(36 + Math.cos(i) * 6 + i * 1.5),
    };
  });

  // AR aging
  const aging = [
    { name: "Current (0-30)", value: 42 },
    { name: "31-60", value: 22 },
    { name: "61-90", value: 12 },
    { name: "> 90", value: 8 },
  ];

  // Expense mix from CoA
  const expenseMix = s.accounts
    .filter((a) => a.type === "expense")
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
    .map((a) => ({ name: a.name, value: Math.round(a.balance / 100000) }));

  const overdueAr = s.arInvoices.filter((i) => i.status === "overdue").slice(0, 5);
  const projectsRisk = s.projectCosts.filter((p) => p.status !== "on-track").slice(0, 5);

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
            <CardTitle className="font-display text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Revenue, Cost & Margin
            </CardTitle>
            <p className="text-xs text-muted-foreground">Trailing 9 months · ₹ Cr</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="frev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fcost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="m" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="Revenue" stroke="hsl(217 91% 60%)" fill="url(#frev)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Cost" stroke="hsl(38 92% 50%)" fill="url(#fcost)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">AR Aging</CardTitle>
            <p className="text-xs text-muted-foreground">Bucketed % of outstanding</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={aging} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {aging.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {aging.map((r, i) => (
                <div key={r.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="ml-auto font-mono">{r.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" /> Cash Flow — Inflow vs Outflow
            </CardTitle>
            <p className="text-xs text-muted-foreground">Last 6 months · ₹ Cr</p>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflow}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="m" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="Inflow" fill="hsl(142 71% 45%)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Outflow" fill="hsl(0 84% 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Finance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <AttnRow label="Overdue AR invoices" count={s.arInvoices.filter((i) => i.status === "overdue").length} tone="rose" />
            <AttnRow label="AP bills on hold / unmatched" count={s.apBills.filter((b) => b.status === "hold" || b.matchStatus !== "matched").length} tone="rose" />
            <AttnRow label="Bank txns unmatched" count={s.bankTxns.filter((t) => t.status !== "matched").length} tone="amber" />
            <AttnRow label="GSTR filings open" count={s.taxLedgers.filter((t) => t.status === "open").length} tone="amber" />
            <AttnRow label="Projects at risk (margin)" count={s.projectCosts.filter((p) => p.status === "risk").length} tone="rose" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Top Expense Heads</CardTitle>
            <p className="text-xs text-muted-foreground">₹ Lakh · YTD</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseMix} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={140} className="text-[10px]" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(217 91% 60%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Margin Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Monthly gross margin ₹ Cr</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="m" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="Margin" stroke="hsl(142 71% 45%)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="YTD Revenue" value={fmtCompact(revenue)} />
            <Row label="YTD Expenses" value={fmtCompact(expenses)} />
            <Row label="EBITDA (approx.)" value={fmtCompact(ebitda)} bold />
            <Row label="Project WIP" value={fmtCompact(wip)} />
            <Row label="Net working capital" value={fmtCompact(arOutstanding - apOutstanding)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-rose-500" /> Overdue Receivables
            </CardTitle>
            <Badge variant="outline">{overdueAr.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueAr.map((i) => {
              const days = Math.max(0, Math.round((Date.now() - new Date(i.dueAt).getTime()) / 86400000));
              return (
                <div key={i.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{i.code}</span>
                        <StatusPill status="critical" />
                      </div>
                      <div className="mt-0.5 truncate text-sm font-medium">{i.customerName}</div>
                      <div className="truncate text-xs text-muted-foreground">{i.projectCode ?? "—"} · due {shortDate(i.dueAt)}</div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className="text-rose-600 dark:text-rose-300">{fmtCompact(i.amount + i.gst - i.tds - i.received)}</div>
                      <div className="text-muted-foreground">{days}d overdue</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!overdueAr.length && <div className="p-6 text-center text-sm text-muted-foreground">No overdue AR.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Projects — Margin Watch
            </CardTitle>
            <Badge variant="outline">{projectsRisk.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {projectsRisk.map((p) => {
              const cost = p.materialCost + p.labourCost + p.overheadCost + p.subContractCost;
              const margin = Math.round(((p.contractValue - p.forecastCost) / p.contractValue) * 100);
              return (
                <div key={p.projectCode} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{p.projectCode}</span>
                        <StatusPill status={p.status === "risk" ? "critical" : "high"} />
                      </div>
                      <div className="mt-0.5 truncate text-sm font-medium">{p.projectName}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.customer} · cost {fmtCompact(cost)}</div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className={margin < 20 ? "text-rose-600 dark:text-rose-300" : "text-amber-600"}>{margin}% margin</div>
                      <div className="text-muted-foreground">{p.percentComplete}% done</div>
                    </div>
                  </div>
                  <div className="mt-2"><Progress value={p.percentComplete} /></div>
                </div>
              );
            })}
            {!projectsRisk.length && <div className="p-6 text-center text-sm text-muted-foreground">All projects on-track.</div>}
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

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${bold ? "text-base font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
