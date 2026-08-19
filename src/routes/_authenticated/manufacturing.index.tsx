import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AiCopilotPanel, AiMetricStrip } from "@/components/ai/module-copilot";
import { useMfg } from "@/lib/mfg/store";
import { manufacturingActions, manufacturingMetrics } from "@/lib/mfg/intelligence";
import { capacityLoad } from "@/lib/mfg/planning";
import { oeeByWorkCenter, downtimePareto, throughputTrend } from "@/lib/mfg/oee";
import { fmtINR } from "@/lib/plm/format";

export const Route = createFileRoute("/_authenticated/manufacturing/")({
  head: () => ({ meta: [{ title: "Manufacturing Command Center · Faith Automation ERP" }] }),
  component: ManufacturingDashboard,
});

function ManufacturingDashboard() {
  const s = useMfg((st) => st);
  const load = capacityLoad(s);
  const oee = oeeByWorkCenter(s);
  const pareto = downtimePareto(s);
  const trend = throughputTrend(s);

  const openOrders = s.orders
    .filter((o) => ["planned", "released", "in-progress"].includes(o.status))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <AiMetricStrip items={manufacturingMetrics(s)} />

      <AiCopilotPanel
        title="AI Manufacturing Copilot"
        subtitle="Grounded in live orders, capacity, material coverage, downtime and quality data — every recommendation is one click from being applied."
        actions={manufacturingActions(s)}
        askQuery="What should the production team fix on the shop floor today?"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Throughput & scrap — last 7 days</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="good" name="Good qty" stroke="hsl(142 71% 45%)" strokeWidth={2} />
                <Line type="monotone" dataKey="scrap" name="Scrap qty" stroke="hsl(0 84% 60%)" strokeWidth={2} />
                <Line type="monotone" dataKey="hours" name="Hours run" stroke="hsl(217 91% 60%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Capacity utilisation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {load.map((l) => (
              <div key={l.workCenterCode}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{l.name}</span>
                  <span className={l.utilisationPct > 100 ? "font-semibold text-rose-600" : "text-muted-foreground"}>
                    {l.utilisationPct}%
                  </span>
                </div>
                <Progress value={Math.min(100, l.utilisationPct)} className="mt-1 h-1.5" />
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {l.loadHrs}h load / {l.capacityHrs}h capacity · {l.orders} order(s)
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">OEE by work center</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={oee}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="workCenterCode" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="oee" name="OEE %" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target %" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Downtime Pareto — last 14 days</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pareto.slice(0, 6).map((p) => (
              <div key={p.reason} className="flex items-center gap-3 text-xs">
                <span className="w-44 shrink-0 truncate">{p.reason}</span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-rose-500/70" style={{ width: `${p.sharePct}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right font-mono text-muted-foreground">{p.mins}m · {p.sharePct}%</span>
              </div>
            ))}
            {!pareto.length && <p className="py-8 text-center text-xs text-muted-foreground">No downtime reported in the window.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Orders on the floor</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Order</th><th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">Project</th><th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Good</th><th className="p-2 text-right">Scrap</th>
                <th className="p-2 text-left">Due</th><th className="p-2 text-right">WIP value</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {openOrders.map((o) => (
                <tr key={o.id} className={o.dueDate < today ? "bg-rose-500/[0.04]" : ""}>
                  <td className="p-2 font-mono">{o.code}</td>
                  <td className="p-2"><div className="font-medium">{o.itemName}</div><div className="font-mono text-[10px] text-muted-foreground">{o.itemCode}</div></td>
                  <td className="p-2 font-mono text-muted-foreground">{o.projectCode ?? "—"}</td>
                  <td className="p-2 text-right font-mono">{o.qty} {o.uom}</td>
                  <td className="p-2 text-right font-mono">{o.goodQty}</td>
                  <td className="p-2 text-right font-mono">{o.scrapQty}</td>
                  <td className="p-2 font-mono">{o.dueDate}</td>
                  <td className="p-2 text-right font-mono">{fmtINR(o.materialCost + o.labourCost)}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px] capitalize">{o.status}</Badge></td>
                </tr>
              ))}
              {!openOrders.length && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No open manufacturing orders.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
