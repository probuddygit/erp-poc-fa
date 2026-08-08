import { useMemo, useState } from "react";
import { IndianRupee, TrendingDown, TrendingUp, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjectsStore } from "@/lib/projects/store";
import { usePlm } from "@/lib/plm/store";
import { projectCost360, allProjectCosts } from "@/lib/plm/cost";
import { fmtINR } from "@/lib/plm/format";
import { exportCsv } from "@/lib/crud";

/** Project Cost 360 — planned vs committed vs actual vs forecast across every module. */
export function ProjectCost360View() {
  const projects = useProjectsStore((s) => s.projects);
  // subscribe to PLM so work-order / BOM changes refresh the roll-up
  usePlm((s) => s.workOrders?.length ?? 0);
  const [code, setCode] = useState<string>(projects[0]?.code ?? "");
  const active = code || projects[0]?.code || "";
  const cost = useMemo(() => (active ? projectCost360(active) : null), [active, projects]);
  const portfolio = useMemo(() => allProjectCosts(), [projects]);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-primary" />Project Cost 360
          </h2>
          <p className="text-sm text-muted-foreground">
            Planned, committed, actual and forecast cost consolidated from Engineering, Procurement, Inventory, Manufacturing, Labour, Quality and Finance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={active}
            onChange={(e) => setCode(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            aria-label="Select project"
          >
            {projects.map((p) => <option key={p.id} value={p.code}>{p.code} — {p.name}</option>)}
          </select>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportCsv("project-cost-360", portfolio as unknown as Array<Record<string, unknown>>)}>
            <Download className="h-4 w-4" />Export
          </Button>
        </div>
      </div>

      {!cost ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No projects available.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            {[
              { l: "Budget", v: fmtINR(cost.budget) },
              { l: "Committed", v: fmtINR(cost.committed) },
              { l: "Actual", v: fmtINR(cost.actual) },
              { l: "Remaining", v: fmtINR(cost.remaining), warn: cost.remaining < 0 },
              { l: "Variance", v: `${cost.variancePct}%`, warn: cost.variance < 0 },
              { l: "CPI", v: cost.cpi.toFixed(2), warn: cost.cpi < 1 },
              { l: "Forecast (EAC)", v: fmtINR(cost.eac), warn: cost.eac > cost.budget },
              { l: "Profit", v: `${cost.profitPct}%`, warn: cost.profit < 0 },
            ].map((m) => (
              <Card key={m.l}>
                <CardContent className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.l}</div>
                  <div className={`mt-0.5 font-display text-lg font-semibold ${m.warn ? "text-rose-600" : ""}`}>{m.v}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Category-wise budget vs consumption</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Category</th><th className="p-3 text-right">Planned</th>
                    <th className="p-3 text-right">Committed</th><th className="p-3 text-right">Actual</th>
                    <th className="p-3 text-right">Consumed %</th><th className="p-3 text-left">Utilisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cost.lines.map((l) => {
                    const consumed = l.planned ? Math.round(((l.actual + l.committed) / l.planned) * 100) : l.actual + l.committed > 0 ? 100 : 0;
                    return (
                      <tr key={l.category} className="hover:bg-muted/30">
                        <td className="p-3 font-medium">{l.category}</td>
                        <td className="p-3 text-right font-mono">{fmtINR(l.planned)}</td>
                        <td className="p-3 text-right font-mono">{fmtINR(l.committed)}</td>
                        <td className="p-3 text-right font-mono">{fmtINR(l.actual)}</td>
                        <td className={`p-3 text-right font-mono ${consumed > 100 ? "text-rose-600" : ""}`}>{consumed}%</td>
                        <td className="p-3">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className={`h-full ${consumed > 100 ? "bg-rose-500" : consumed > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, consumed)}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Portfolio cost performance</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Project</th><th className="p-3 text-right">Budget</th>
                    <th className="p-3 text-right">Committed</th><th className="p-3 text-right">Actual</th>
                    <th className="p-3 text-right">EAC</th><th className="p-3 text-right">CPI</th><th className="p-3 text-left">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {portfolio.map((p) => (
                    <tr key={p.projectCode} className="cursor-pointer hover:bg-muted/30" onClick={() => setCode(p.projectCode)}>
                      <td className="p-3"><span className="font-mono text-xs text-muted-foreground">{p.projectCode}</span> <span className="font-medium">{p.projectName}</span></td>
                      <td className="p-3 text-right font-mono">{fmtINR(p.budget)}</td>
                      <td className="p-3 text-right font-mono">{fmtINR(p.committed)}</td>
                      <td className="p-3 text-right font-mono">{fmtINR(p.actual)}</td>
                      <td className="p-3 text-right font-mono">{fmtINR(p.eac)}</td>
                      <td className="p-3 text-right font-mono">{p.cpi.toFixed(2)}</td>
                      <td className="p-3">
                        {p.cpi >= 1 ? (
                          <Badge variant="outline" className="gap-1 text-emerald-700"><TrendingUp className="h-3 w-3" />On budget</Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-rose-700"><TrendingDown className="h-3 w-3" />Overrun risk</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
