import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FileCheck2, Receipt, Truck, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGst } from "@/lib/gst/store";
import { StatusPill, fmtCompact } from "@/components/projects/shared";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/gst/")({
  head: () => ({
    meta: [
      { title: "GST Dashboard · Faith Automation ERP" },
      { name: "description", content: "Liability, input tax credit, filing status and e-invoicing health at a glance." },
      { property: "og:title", content: "GST Dashboard · Faith Automation ERP" },
      { property: "og:description", content: "Liability, input tax credit, filing status and e-invoicing health at a glance." },
    ],
  }),
  component: GstDashboard,
});

const COLORS = ["hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(0 84% 60%)"];

function Kpi({
  icon: Icon, label, value, sub, tone = "primary",
}: { icon: typeof Receipt; label: string; value: string; sub: string; tone?: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-${tone}/10 text-${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-display text-xl font-semibold tabular-nums">{value}</div>
          <div className="truncate text-xs text-muted-foreground">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function GstDashboard() {
  const s = useGst((x) => x);

  const outward = s.returns.filter((r) => r.type === "GSTR-1");
  const inward = s.returns.filter((r) => r.type === "GSTR-2B");
  const liability = outward.reduce((a, r) => a + r.igst + r.cgst + r.sgst, 0);
  const credit = inward.reduce((a, r) => a + r.igst + r.cgst + r.sgst, 0);
  const netPayable = liability - credit;

  const pendingFilings = s.returns.filter((r) => r.status !== "filed").length;
  const irnPending = s.eInvoices.filter((e) => e.status !== "generated").length;
  const ewbActive = s.eWayBills.filter((e) => e.status === "active").length;
  const mismatches = s.itc.filter((i) => i.match !== "matched");

  const trend = outward.map((r) => {
    const inw = inward.find((i) => i.period === r.period);
    const out = r.igst + r.cgst + r.sgst;
    const itc = inw ? inw.igst + inw.cgst + inw.sgst : 0;
    return { period: r.period.slice(5), Liability: out, ITC: itc, Net: out - itc };
  });

  const split = [
    { name: "IGST", value: outward.reduce((a, r) => a + r.igst, 0) },
    { name: "CGST", value: outward.reduce((a, r) => a + r.cgst, 0) },
    { name: "SGST", value: outward.reduce((a, r) => a + r.sgst, 0) },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Receipt} label="Output Liability" value={fmtCompact(liability)} sub="Last 6 periods · GSTR-1" />
        <Kpi icon={Wallet} label="Input Tax Credit" value={fmtCompact(credit)} sub="Auto-drafted GSTR-2B" tone="success" />
        <Kpi icon={FileCheck2} label="Net Cash Payable" value={fmtCompact(netPayable)} sub={`${pendingFilings} filings open`} tone="warning" />
        <Kpi icon={Truck} label="Active e-Way Bills" value={String(ewbActive)} sub={`${irnPending} IRNs pending`} tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Liability vs Input Tax Credit</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCompact(Number(v))} width={56} />
                <Tooltip formatter={(v) => fmtCompact(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Liability" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="ITC" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Net" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tax Head Split</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={split} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {split.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtCompact(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upcoming & Open Filings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {s.returns.filter((r) => r.status !== "filed").map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.type} · {r.period}</div>
                  <div className="text-xs text-muted-foreground">Due {r.dueDate} · {r.gstin}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{fmtCompact(r.igst + r.cgst + r.sgst)}</span>
                  <StatusPill status={r.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">ITC Exceptions</CardTitle>
            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning text-[10px]">
              {mismatches.length} to resolve
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {mismatches.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" /> Fully reconciled.
              </div>
            )}
            {mismatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{m.supplier}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.invoiceNo} · {m.gstin}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  <span className="text-xs capitalize text-muted-foreground">{m.match.replace(/-/g, " ")}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
