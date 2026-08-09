import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQualityDoc } from "@/components/quality-doc-dialog";
import { exportCsv } from "@/lib/crud";
import { profitabilityDocument } from "@/lib/finance/documents";
import { useFinance } from "@/lib/finance/store";
import { profitability, type ProfitDimension } from "@/lib/finance/intelligence";
import { fmtCompact, fmtINR } from "@/components/projects/shared";
import { FinToolbar, FinSearch, SegTabs } from "@/components/finance/shared";
import { Download, Printer, TrendingDown, TrendingUp } from "lucide-react";

const DIMS: { k: ProfitDimension; l: string }[] = [
  { k: "project", l: "Project" },
  { k: "customer", l: "Customer" },
  { k: "costCentre", l: "Cost Centre" },
  { k: "businessUnit", l: "Business Unit" },
  { k: "account", l: "Account" },
];

export function ProfitabilitySection() {
  const state = useFinance((s) => s);
  const doc = useQualityDoc();
  const [dim, setDim] = useState<ProfitDimension>("project");
  const [q, setQ] = useState("");

  const rows = useMemo(() => profitability(state, dim), [state, dim]);
  const filtered = rows.filter((r) => `${r.label} ${r.meta ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  const totals = filtered.reduce((a, r) => ({ revenue: a.revenue + r.revenue, cost: a.cost + r.cost, margin: a.margin + r.margin }), { revenue: 0, cost: 0, margin: 0 });
  const marginPct = totals.revenue ? (totals.margin / totals.revenue) * 100 : 0;
  const chart = filtered.slice(0, 10).map((r) => ({
    name: r.label.length > 18 ? `${r.label.slice(0, 17)}…` : r.label,
    Margin: Math.round(r.margin / 100000),
  }));
  const best = filtered.filter((r) => r.revenue > 0).slice().sort((a, b) => b.marginPct - a.marginPct)[0];
  const worst = filtered.filter((r) => r.revenue > 0).slice().sort((a, b) => a.marginPct - b.marginPct)[0];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <FinToolbar>
        <SegTabs value={dim} onChange={setDim} options={DIMS} />
        <FinSearch q={q} setQ={setQ} placeholder="Search dimension…" />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => { exportCsv(`profitability-${dim}`, filtered as unknown as Array<Record<string, unknown>>); toast.success("Profitability exported"); }}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => doc.show(profitabilityDocument(dim, filtered))}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </FinToolbar>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={fmtCompact(totals.revenue)} />
        <Stat label="Cost" value={fmtCompact(totals.cost)} />
        <Stat label="Margin" value={fmtCompact(totals.margin)} tone={totals.margin >= 0 ? "good" : "bad"} />
        <Stat label="Margin %" value={`${marginPct.toFixed(1)}%`} tone={marginPct >= 20 ? "good" : marginPct >= 10 ? "warn" : "bad"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Margin contribution · ₹ Lakh</CardTitle>
            <p className="text-xs text-muted-foreground">Top 10 by {DIMS.find((d) => d.k === dim)?.l.toLowerCase()}</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={140} className="text-[10px]" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="Margin" radius={[0, 6, 6, 0]}>
                    {chart.map((c, i) => <Cell key={i} fill={c.Margin >= 0 ? "hsl(142 71% 45%)" : "hsl(0 84% 60%)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">AI read-out</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {best && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600"><TrendingUp className="h-3.5 w-3.5" /> Strongest</div>
                <div className="mt-1 font-medium">{best.label}</div>
                <div className="text-xs text-muted-foreground">{best.marginPct.toFixed(1)}% margin on {fmtCompact(best.revenue)} revenue{best.meta ? ` · ${best.meta}` : ""}</div>
              </div>
            )}
            {worst && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600"><TrendingDown className="h-3.5 w-3.5" /> Weakest</div>
                <div className="mt-1 font-medium">{worst.label}</div>
                <div className="text-xs text-muted-foreground">{worst.marginPct.toFixed(1)}% margin on {fmtCompact(worst.revenue)} revenue{worst.meta ? ` · ${worst.meta}` : ""}</div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {filtered.filter((r) => r.marginPct < 15 && r.revenue > 0).length} of {filtered.length} lines sit below the 15% margin floor. Figures are derived from posted journals, project cost sheets and AR/AP ledgers — no estimates.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">{DIMS.find((d) => d.k === dim)?.l}</th>
                <th className="p-3 text-right">Revenue</th>
                <th className="p-3 text-right">Cost</th>
                <th className="p-3 text-right">Margin</th>
                <th className="p-3 text-right">Margin %</th>
                <th className="p-3 text-left">Band</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.key} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{r.label}</div>
                    {r.meta && <div className="text-[10px] text-muted-foreground">{r.meta}</div>}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">{fmtINR(r.revenue)}</td>
                  <td className="p-3 text-right font-mono text-xs">{fmtINR(r.cost)}</td>
                  <td className={`p-3 text-right font-mono text-xs ${r.margin < 0 ? "text-rose-600 dark:text-rose-300" : ""}`}>{fmtINR(r.margin)}</td>
                  <td className="p-3 text-right font-mono text-xs">{r.marginPct.toFixed(1)}%</td>
                  <td className="p-3">
                    <Badge variant="outline" className={`text-[10px] uppercase ${r.marginPct >= 20 ? "border-emerald-500/40 text-emerald-600" : r.marginPct >= 10 ? "border-amber-500/40 text-amber-600" : "border-rose-500/40 text-rose-600"}`}>
                      {r.marginPct >= 20 ? "healthy" : r.marginPct >= 10 ? "watch" : "erosion"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No data for this dimension.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {doc.dialog}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-rose-600 dark:text-rose-400" : "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-1.5 font-display text-2xl font-semibold tracking-tight ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
