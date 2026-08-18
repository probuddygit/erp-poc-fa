import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportCsv } from "@/lib/crud";
import { useFinance } from "@/lib/finance/store";
import { allProjectBalanceSheets, allProjectPnl, projectPnl } from "@/lib/finance/project-pnl";
import { currentPeriod, periodLabel, wipPeriods } from "@/lib/finance/wip";
import { FinToolbar, FinSearch, SegTabs } from "@/components/finance/shared";
import { fmtCompact, fmtINR } from "@/components/projects/shared";
import { Download, LineChart, Scale } from "lucide-react";

type View = "pnl" | "bs";

export function ProjectPnlSection() {
  const s = useFinance((x) => x);
  const [view, setView] = useState<View>("pnl");
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState(currentPeriod());
  const [drill, setDrill] = useState<string | null>(null);

  const pnls = useMemo(
    () => allProjectPnl(s, period).filter((p) => `${p.projectCode} ${p.projectName} ${p.customer}`.toLowerCase().includes(q.toLowerCase())),
    [s, period, q],
  );
  const sheets = useMemo(
    () => allProjectBalanceSheets(s, period).filter((b) => `${b.projectCode} ${b.projectName}`.toLowerCase().includes(q.toLowerCase())),
    [s, period, q],
  );
  const detail = drill ? projectPnl(s, drill, period) : null;

  const t = pnls.reduce(
    (a, p) => ({
      revenue: a.revenue + p.revenueRecognised,
      cost: a.cost + p.totalCost,
      gross: a.gross + p.grossMargin,
      net: a.net + p.netMargin,
    }),
    { revenue: 0, cost: 0, gross: 0, net: 0 },
  );

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <FinToolbar>
        <FinSearch q={q} setQ={setQ} placeholder="Search project or customer…" />
        <SegTabs value={view} onChange={setView} options={[{ k: "pnl" as View, l: "Project P&L" }, { k: "bs" as View, l: "Project balance sheet" }]} />
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs" aria-label="Period">
          {wipPeriods(s).map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
        </select>
        <div className="ml-auto">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => {
            const rows = view === "pnl" ? pnls : sheets;
            exportCsv(`project-${view}-${period}`, rows as unknown as Array<Record<string, unknown>>);
            toast.success("Exported");
          }}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </FinToolbar>

      {view === "pnl" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Revenue recognised" value={fmtCompact(t.revenue)} />
            <Tile label="Total cost" value={fmtCompact(t.cost)} />
            <Tile label="Gross margin" value={fmtCompact(t.gross)} tone={t.gross >= 0 ? "good" : "bad"} />
            <Tile label="Net margin" value={`${fmtCompact(t.net)} · ${t.revenue ? Math.round((t.net / t.revenue) * 100) : 0}%`} tone={t.net >= 0 ? "good" : "bad"} />
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Project</th>
                    <th className="p-3 text-right">Contract</th>
                    <th className="p-3 text-right">Revenue</th>
                    <th className="p-3 text-right">Direct cost</th>
                    <th className="p-3 text-right">Indirect</th>
                    <th className="p-3 text-right">Gross %</th>
                    <th className="p-3 text-right">Net margin</th>
                    <th className="p-3 text-right">Forecast margin</th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pnls.map((p) => (
                    <tr key={p.projectCode} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{p.projectName}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{p.projectCode} · {p.customer}</div>
                      </td>
                      <td className="p-3 text-right font-mono">{fmtINR(p.contractValue)}</td>
                      <td className="p-3 text-right font-mono">{fmtINR(p.revenueRecognised)}</td>
                      <td className="p-3 text-right font-mono">{fmtINR(p.directCost)}</td>
                      <td className="p-3 text-right font-mono">{fmtINR(p.indirectCost)}</td>
                      <td className={`p-3 text-right font-mono ${p.grossMarginPct < 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>{p.grossMarginPct}%</td>
                      <td className={`p-3 text-right font-mono ${p.netMargin < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{fmtINR(p.netMargin)}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{fmtINR(p.forecastMargin)}</td>
                      <td className="p-2 text-right">
                        <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => setDrill(p.projectCode)}>
                          <LineChart className="h-3.5 w-3.5" /> Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!pnls.length && <tr><td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">No projects match this search.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 font-display text-base"><Scale className="h-4 w-4" /> Project-level financial position</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-right">Receivables</th>
                  <th className="p-3 text-right">Unbilled WIP</th>
                  <th className="p-3 text-right">Assets (NBV)</th>
                  <th className="p-3 text-right">Total assets</th>
                  <th className="p-3 text-right">Payables</th>
                  <th className="p-3 text-right">Advances</th>
                  <th className="p-3 text-right">Accruals</th>
                  <th className="p-3 text-right">Net position</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sheets.map((b) => (
                  <tr key={b.projectCode} className="hover:bg-muted/30">
                    <td className="p-3"><div className="font-medium">{b.projectName}</div><div className="font-mono text-[10px] text-muted-foreground">{b.projectCode}</div></td>
                    <td className="p-3 text-right font-mono">{fmtINR(b.receivables)}<div className="text-[10px] text-muted-foreground">{b.receivablesDocs} open</div></td>
                    <td className="p-3 text-right font-mono">{fmtINR(b.unbilledWip)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(b.assetsNbv)}<div className="text-[10px] text-muted-foreground">{b.assetsCount} asset(s)</div></td>
                    <td className="p-3 text-right font-mono font-semibold">{fmtINR(b.totalAssets)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(b.payables)}<div className="text-[10px] text-muted-foreground">{b.payablesDocs} bill(s)</div></td>
                    <td className="p-3 text-right font-mono">{fmtINR(b.customerAdvances)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(b.accruals)}</td>
                    <td className={`p-3 text-right font-mono font-semibold ${b.netPosition < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{fmtINR(b.netPosition)}</td>
                  </tr>
                ))}
                {!sheets.length && <tr><td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">No project balance sheets yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!drill} onOpenChange={(v) => !v && setDrill(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{detail?.projectName} — profit & loss ({periodLabel(period)})</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="Contract" value={fmtINR(detail.contractValue)} />
                <Stat label="Billed" value={fmtINR(detail.billed)} />
                <Stat label="Collected" value={fmtINR(detail.collected)} />
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  <tr className="font-medium"><td className="py-2">Revenue recognised ({detail.percentComplete}% complete)</td><td className="py-2 text-right font-mono">{fmtINR(detail.revenueRecognised)}</td></tr>
                  {detail.costs.map((c) => (
                    <tr key={c.key}>
                      <td className="py-2 pl-4 text-muted-foreground">{c.label}{c.docs ? <span className="ml-2 text-[10px]">({c.docs} doc)</span> : null}</td>
                      <td className="py-2 text-right font-mono">({fmtINR(c.amount)})</td>
                    </tr>
                  ))}
                  <tr className="font-medium"><td className="py-2">Gross margin</td><td className="py-2 text-right font-mono">{fmtINR(detail.grossMargin)} · {detail.grossMarginPct}%</td></tr>
                  <tr className="font-semibold"><td className="py-2">Net margin</td><td className="py-2 text-right font-mono">{fmtINR(detail.netMargin)} · {detail.netMarginPct}%</td></tr>
                </tbody>
              </table>
              <Badge variant="outline" className="text-[10px] uppercase">Status {detail.status}</Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-1.5 font-display text-2xl font-semibold tracking-tight ${tone === "bad" ? "text-rose-600 dark:text-rose-400" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
