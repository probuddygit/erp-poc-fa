import { createFileRoute } from "@tanstack/react-router";
import { Package, Warehouse, AlertTriangle, TrendingUp, Layers, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInventory } from "@/lib/inventory/store";
import { StatusPill, Progress, fmtCompact, shortDate } from "@/components/projects/shared";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AiCopilotPanel, AiMetricStrip } from "@/components/ai/module-copilot";
import { inventoryActions, stockSignals, excessAnalysis, expiryRisk, countAccuracy, projectReadiness } from "@/lib/inventory/intelligence";

export const Route = createFileRoute("/_authenticated/inventory/")({
  head: () => ({ meta: [{ title: "Inventory Dashboard · Faith Automation ERP" }] }),
  component: InventoryDashboard,
});

const COLORS = ["hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(271 76% 53%)", "hsl(0 84% 60%)", "hsl(199 89% 48%)"];

function InventoryDashboard() {
  const s = useInventory((s) => s);

  const totalValue = s.stock.reduce((a, r) => a + r.value, 0);
  const reorderCount = s.items.filter((i) => i.onHand - i.allocated <= i.reorder).length;
  const expiring = s.batches.filter((b) => b.status === "expiring" || b.status === "expired").length;
  const activeCounts = s.counts.filter((c) => c.status === "in-progress" || c.status === "planned").length;
  const projectStock = s.stock.filter((r) => r.projectCode).reduce((a, r) => a + r.value, 0);

  const kpis = [
    { label: "Stock Value", value: fmtCompact(totalValue), sub: `${s.stock.length} rows across ${s.stores.length} stores`, icon: TrendingUp, tone: "from-emerald-500 via-emerald-500/50" },
    { label: "Items", value: String(s.items.length), sub: `${s.items.filter((i) => i.active).length} active SKUs`, icon: Package, tone: "from-primary via-primary/50" },
    { label: "Reorder Alerts", value: String(reorderCount), sub: `${s.items.filter((i) => i.onHand === 0).length} at zero`, icon: AlertTriangle, tone: "from-rose-500 via-rose-500/50" },
    { label: "Project-tagged", value: fmtCompact(projectStock), sub: `${s.stock.filter((r) => r.projectCode).length} reservations`, icon: Layers, tone: "from-amber-500 via-amber-500/50" },
  ];

  const valueByStore = s.stores.map((st) => ({
    name: st.name.length > 16 ? st.name.slice(0, 15) + "…" : st.name,
    value: s.stock.filter((r) => r.storeCode === st.code).reduce((a, r) => a + r.value, 0),
  }));

  const valueByCategory = Object.entries(
    s.items.reduce<Record<string, number>>((acc, i) => {
      const stk = s.stock.filter((r) => r.itemCode === i.code).reduce((a, r) => a + r.value, 0);
      acc[i.category] = (acc[i.category] || 0) + stk;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value })).filter((x) => x.value > 0);

  const movement = Array.from({ length: 9 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 8 + i);
    const inQ = Math.round(80 + Math.sin(i / 1.4) * 30 + i * 4);
    const outQ = Math.round(60 + Math.cos(i / 1.7) * 20 + i * 5);
    return { m: d.toLocaleDateString("en-IN", { month: "short" }), Receipts: inQ, Issues: outQ };
  });

  const reorderRows = s.items
    .map((i) => ({ ...i, free: i.onHand - i.allocated }))
    .filter((i) => i.free <= i.reorder)
    .sort((a, b) => a.free / (a.reorder || 1) - b.free / (b.reorder || 1))
    .slice(0, 6);

  const upcomingCounts = s.counts.filter((c) => c.status !== "posted").slice(0, 5);

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
            <CardTitle className="font-display text-base">Stock Movement — Receipts vs Issues</CardTitle>
            <p className="text-xs text-muted-foreground">Trailing 9 months · line quantity</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={movement}>
                  <defs>
                    <linearGradient id="rec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="iss" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="m" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="Receipts" stroke="hsl(142 71% 45%)" fill="url(#rec)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Issues" stroke="hsl(38 92% 50%)" fill="url(#iss)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Value by Category</CardTitle>
            <p className="text-xs text-muted-foreground">On-hand valuation</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={valueByCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {valueByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtCompact(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {valueByCategory.map((r, i) => (
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
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Stock Value by Store</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valueByStore} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(v as number)} />
                  <YAxis type="category" dataKey="name" className="text-xs" tickLine={false} axisLine={false} width={130} />
                  <Tooltip formatter={(v: number) => fmtCompact(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="hsl(217 91% 60%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" /> Reorder Watchlist
            </CardTitle>
            <Badge variant="outline">{reorderCount}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {reorderRows.map((i) => {
              const pct = Math.min(100, Math.round(((i.onHand - i.allocated) / (i.reorder || 1)) * 100));
              return (
                <div key={i.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-muted-foreground">{i.code}</div>
                      <div className="truncate text-sm font-medium">{i.description}</div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div>{i.onHand - i.allocated} / {i.reorder}</div>
                      <div className="text-muted-foreground">{i.uom}</div>
                    </div>
                  </div>
                  <div className="mt-2"><Progress value={pct} /></div>
                </div>
              );
            })}
            {!reorderRows.length && <div className="p-6 text-center text-sm text-muted-foreground">All items above reorder level.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <AttnRow label="Batches expiring / expired" count={expiring} tone="rose" />
            <AttnRow label="Quality-hold stock rows" count={s.stock.filter((r) => r.status === "quality-hold").length} tone="amber" />
            <AttnRow label="Transfers in transit" count={s.transfers.filter((t) => t.status === "in-transit").length} tone="blue" />
            <AttnRow label="Cycle counts open" count={activeCounts} tone="amber" />
            <AttnRow label="Stores over 75% capacity" count={s.stores.filter((st) => st.capacityUsedPct >= 75).length} tone="blue" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-primary" /> Store Utilization
            </CardTitle>
            <Badge variant="outline">{s.stores.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.stores.map((st) => (
              <div key={st.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{st.code}</span>
                      <Badge variant="outline" className="text-[10px]">{st.type}</Badge>
                    </div>
                    <div className="mt-0.5 truncate font-medium">{st.name}</div>
                    <div className="text-xs text-muted-foreground">{st.location} · {st.manager}</div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <div>{st.bins} bins</div>
                    <div className="text-muted-foreground">{st.capacityUsedPct}%</div>
                  </div>
                </div>
                <div className="mt-2"><Progress value={st.capacityUsedPct} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> Cycle Counts
            </CardTitle>
            <Badge variant="outline">{s.counts.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingCounts.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                    <StatusPill status={c.status === "in-progress" ? "in-progress" : c.status === "reconciled" ? "approved" : "upcoming"} />
                  </div>
                  <div className="mt-0.5 truncate text-sm font-medium">{c.storeName}</div>
                  <div className="text-xs text-muted-foreground">{shortDate(c.scheduledFor)} · {c.auditor}</div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div>{c.itemsCounted}/{c.itemsPlanned}</div>
                  <div className="text-muted-foreground">{c.variancesFound} var.</div>
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
