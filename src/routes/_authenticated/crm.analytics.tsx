import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TrendingUp, Users, Factory, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtINR } from "@/components/crm/shared";
import { useProcurement } from "@/lib/procurement/store";
import {
  budgetSummary,
  capacityPlan,
  customerAnalytics,
  projectProfitability,
  useRevenue,
} from "@/lib/crm/revenue";

export const Route = createFileRoute("/_authenticated/crm/analytics")({
  head: () => ({
    meta: [
      { title: "Revenue Analytics · Faith Automation ERP" },
      {
        name: "description",
        content:
          "Customer analytics, project profitability, budget consumption, project-wise procurement visibility and capacity planning.",
      },
      { property: "og:title", content: "Revenue Analytics" },
      {
        property: "og:description",
        content: "Profitability, budget consumption and capacity insight across the revenue lifecycle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RevenueAnalyticsPage,
});

function RevenueAnalyticsPage() {
  const budgets = useRevenue((s) => s.budgets);
  const consumption = useRevenue((s) => s.consumption);
  const pos = useProcurement((s) => s.pos);
  const [capacity, setCapacity] = useState(60000000);

  const committedByProject = useMemo(() => {
    const map: Record<string, number> = {};
    pos
      .filter((p) => p.status !== "cancelled")
      .forEach((p) => {
        const key = p.projectCode ?? "unassigned";
        map[key] = (map[key] ?? 0) + (p.amount ?? 0);
      });
    return map;
  }, [pos]);

  const customers = useMemo(() => customerAnalytics(), []);
  const profitability = useMemo(() => projectProfitability(committedByProject), [committedByProject, consumption]);
  const buckets = useMemo(() => capacityPlan(capacity), [capacity]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Tabs defaultValue="customers">
        <TabsList className="flex-wrap">
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" /> Customers
          </TabsTrigger>
          <TabsTrigger value="profitability" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Project profitability
          </TabsTrigger>
          <TabsTrigger value="budgets" className="gap-2">
            <Wallet className="h-4 w-4" /> Budgets &amp; consumption
          </TabsTrigger>
          <TabsTrigger value="capacity" className="gap-2">
            <Factory className="h-4 w-4" /> Capacity plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer analytics</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Enquiries</TableHead>
                    <TableHead className="text-right">Opportunities</TableHead>
                    <TableHead className="text-right">Quotes</TableHead>
                    <TableHead className="text-right">Win rate</TableHead>
                    <TableHead className="text-right">Weighted pipeline</TableHead>
                    <TableHead className="text-right">Order value</TableHead>
                    <TableHead className="text-right">Avg order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.customerName}>
                      <TableCell className="font-medium">{c.customerName}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.leads}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.opportunities}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.quotations}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={c.winRate >= 50 ? "default" : "outline"}>{c.winRate}%</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtINR(Math.round(c.pipeline))}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtINR(c.orderValue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtINR(c.avgOrder)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project profitability &amp; procurement visibility</CardTitle>
              <p className="text-xs text-muted-foreground">
                Order value against budget, committed purchase orders and consumed cost — lowest margin first.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project / order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Order value</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">PO committed</TableHead>
                    <TableHead className="text-right">Consumed</TableHead>
                    <TableHead className="text-right">Forecast cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitability.map((p) => (
                    <TableRow key={p.key}>
                      <TableCell>
                        <div className="font-medium">{p.code}</div>
                        <div className="text-xs text-muted-foreground">{p.name}</div>
                      </TableCell>
                      <TableCell>{p.customerName}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtINR(p.orderValue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtINR(p.budget)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtINR(p.committed)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtINR(p.consumed)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtINR(p.forecastCost)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.marginPct >= 15 ? "default" : "outline"}>
                          {fmtINR(p.margin)} · {p.marginPct}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!profitability.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        Approve an order acceptance to start tracking profitability.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4 pt-4">
          {budgets.map((b) => {
            const sum = budgetSummary(b.id);
            return (
              <Card key={b.id}>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      {b.projectCode ?? b.customerName}{" "}
                      <span className="text-xs text-muted-foreground">v{b.version}</span>

                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Planned {fmtINR(sum.planned)} · consumed {fmtINR(sum.consumed)} ({sum.utilisation}%)
                    </p>
                  </div>
                  <Badge variant={b.status === "approved" ? "default" : "outline"} className="capitalize">
                    {b.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sum.rows.map((r) => (
                    <div key={r.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{r.category}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {fmtINR(r.consumed)} / {fmtINR(r.planned)}
                        </span>
                      </div>
                      <Progress value={Math.min(100, r.utilisation)} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
          {!budgets.length && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No category budgets yet — they are created automatically from order line items on approval.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="capacity" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">Capacity plan</CardTitle>
                <p className="text-xs text-muted-foreground">Confirmed delivery load against monthly shop capacity.</p>
              </div>
              <div className="w-56">
                <Label className="text-xs">Monthly capacity (₹)</Label>
                <Input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value) || 1)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {buckets.map((b) => (
                <div key={b.month} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>
                      {b.month} · {b.orders} order(s)
                    </span>
                    <span className={b.loadPct > 100 ? "font-medium text-rose-500" : "text-muted-foreground"}>
                      {fmtINR(b.value)} · {b.loadPct}%
                    </span>
                  </div>
                  <Progress value={Math.min(100, b.loadPct)} />
                </div>
              ))}
              {!buckets.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">No confirmed delivery load yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
