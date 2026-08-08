import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Factory, Plus, Download, Search, PlayCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RowActions, useCrud } from "@/components/crud-kit";
import { PLM_SCHEMAS } from "@/lib/plm/schemas";
import { useEngineeringOptions } from "@/lib/plm/options";
import { usePlm, upsertPlm, deletePlm } from "@/lib/plm/store";
import { exportCsv } from "@/lib/crud";
import { fmtINR } from "@/lib/plm/format";

const TONE: Record<string, string> = {
  planned: "bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/25",
  released: "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/25",
  "in-progress": "bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-500/25",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
  cancelled: "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/25",
};

export function WorkOrders() {
  const wos = usePlm((s) => s.workOrders ?? []);
  const options = useEngineeringOptions();
  const [q, setQ] = useState("");
  const { openNew, openEdit, askDelete, dialogs } = useCrud(PLM_SCHEMAS, upsertPlm, deletePlm, options);

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return wos.filter((w) => !q || [w.code, w.itemCode, w.itemName, w.projectCode, w.workCenter].filter(Boolean).some((v) => String(v).toLowerCase().includes(l)));
  }, [wos, q]);

  const advance = (id: string, status: string, code: string) => {
    upsertPlm("workOrders", { id, status });
    toast.success(`${code} → ${status}`, { description: "Production planning and project cost updated." });
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />Manufacturing Work Orders
          </h2>
          <p className="text-sm text-muted-foreground">
            Auto-generated from Make items on the MBOM, with material reserved against the project.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search work orders…" className="h-9 w-56 pl-8" />
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportCsv("work-orders", rows as unknown as Array<Record<string, unknown>>)}>
            <Download className="h-4 w-4" />Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => openNew("workOrders", "New Work Order", { status: "planned", qty: 1, uom: "EA", workCenter: "Assembly Line", plannedStart: new Date().toISOString(), plannedEnd: new Date(Date.now() + 12 * 86400000).toISOString(), estCost: 0 })}>
            <Plus className="h-4 w-4" />New
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Open orders", wos.filter((w) => w.status !== "completed" && w.status !== "cancelled").length],
          ["In progress", wos.filter((w) => w.status === "in-progress").length],
          ["Reserved value", fmtINR(wos.reduce((a, w) => a + w.reservedValue, 0))],
          ["Planned cost", fmtINR(wos.reduce((a, w) => a + w.estCost, 0))],
        ].map(([l, v]) => (
          <Card key={l as string}><CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
            <div className="mt-0.5 font-display text-xl font-semibold">{v}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">WO</th><th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Project</th><th className="p-3 text-left">Work Center</th>
                <th className="p-3 text-right">Qty</th><th className="p-3 text-right">Est. Cost</th>
                <th className="p-3 text-right">Reserved</th><th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Actions</th><th className="w-12 p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((w) => (
                <tr key={w.id} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{w.code}</td>
                  <td className="p-3"><div className="font-medium">{w.itemName}</div><div className="font-mono text-xs text-muted-foreground">{w.itemCode}</div></td>
                  <td className="p-3 font-mono text-xs">{w.projectCode ?? "—"}</td>
                  <td className="p-3">{w.workCenter}</td>
                  <td className="p-3 text-right font-mono">{w.qty} {w.uom}</td>
                  <td className="p-3 text-right font-mono">{fmtINR(w.estCost)}</td>
                  <td className="p-3 text-right font-mono">{fmtINR(w.reservedValue)}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE[w.status]}`}>{w.status}</span>
                    {w.source === "mbom-auto" && <Badge variant="outline" className="ml-1 text-[9px]">auto</Badge>}
                  </td>
                  <td className="p-3 text-right">
                    {w.status === "planned" && (
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => advance(w.id, "released", w.code)}>
                        <PlayCircle className="h-3.5 w-3.5" />Release
                      </Button>
                    )}
                    {w.status === "released" && (
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => advance(w.id, "in-progress", w.code)}>Start</Button>
                    )}
                    {w.status === "in-progress" && (
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => advance(w.id, "completed", w.code)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />Complete
                      </Button>
                    )}
                  </td>
                  <td className="p-3">
                    <RowActions
                      onEdit={() => openEdit("workOrders", w as unknown as Record<string, unknown>, `Edit ${w.code}`)}
                      onDelete={() => askDelete("workOrders", w.id, w.code)}
                    />
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={10} className="p-10 text-center text-sm text-muted-foreground">No work orders yet — run sourcing on an MBOM to generate them.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {dialogs}
    </div>
  );
}
