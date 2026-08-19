import { useMemo, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Play, Pause, Zap, CheckCircle2, Truck, Gauge, ListTree, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RowActions, useCrud } from "@/components/crud-kit";
import { useMfg, upsertMfg, deleteMfg, orderOperations, explodeRouting } from "@/lib/mfg/store";
import { MFG_SCHEMAS } from "@/lib/mfg/schemas";
import { useManufacturingOptions } from "@/lib/mfg/options";
import { capacityLoad, demandBoard, importEngineeringDemand, scheduleShop, applySchedule, orderShortages } from "@/lib/mfg/planning";
import { releaseOrder, startOperation, pauseOperation, reportProduction, completeOrder, receiveJobWork, orderProgressPct } from "@/lib/mfg/execution";
import { oeeByWorkCenter, downtimePareto, shopKpis } from "@/lib/mfg/oee";
import { DOWNTIME_REASONS } from "@/lib/mfg/types";
import { fmtINR } from "@/lib/plm/format";
import { exportCsv } from "@/lib/crud";

export const Route = createFileRoute("/_authenticated/manufacturing/$section")({
  head: () => ({ meta: [{ title: "Manufacturing · Faith Automation ERP" }] }),
  component: SectionView,
});

function SectionView() {
  const { section } = useParams({ from: "/_authenticated/manufacturing/$section" });
  const options = useManufacturingOptions();
  const crud = useCrud(MFG_SCHEMAS, upsertMfg, deleteMfg, options);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      {section === "plan" && <PlanView />}
      {section === "orders" && <OrdersView crud={crud} />}
      {section === "routings" && <RoutingsView crud={crud} />}
      {section === "terminal" && <TerminalView />}
      {section === "oee" && <OeeView crud={crud} />}
      {section === "jobwork" && <JobWorkView crud={crud} />}
      {crud.dialogs}
    </div>
  );
}

type Crud = ReturnType<typeof useCrud>;

const Toolbar = ({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
    </div>
    <div className="flex gap-2">{children}</div>
  </div>
);

/* -------------------------------------------------------------- plan */

function PlanView() {
  const s = useMfg((st) => st);
  const demand = demandBoard(s);
  const load = capacityLoad(s);
  const plan = scheduleShop(s);

  return (
    <>
      <Toolbar
        title="Production Plan"
        subtitle="Demand netted from Engineering MBOM work orders and project milestones, sequenced against finite work-center capacity."
      >
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
          const r = importEngineeringDemand();
          r.created.length ? toast.success(`${r.created.length} manufacturing order(s) created`, { description: r.created.join(", ") })
            : toast.info("All engineering demand is already covered");
        }}>
          <ListTree className="h-3.5 w-3.5" />Pull engineering demand
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => {
          const r = applySchedule();
          toast.success(`Schedule applied to ${r.updated} order(s)`, { description: r.late ? `${r.late} order(s) still finish after the due date.` : "All orders fit within their due dates." });
        }}>
          <Wand2 className="h-3.5 w-3.5" />Run finite-capacity plan
        </Button>
      </Toolbar>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {load.map((l) => (
          <Card key={l.workCenterCode}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{l.name}</span>
                <Badge variant={l.utilisationPct > 100 ? "destructive" : "outline"} className="text-[10px]">{l.utilisationPct}%</Badge>
              </div>
              <Progress value={Math.min(100, l.utilisationPct)} className="mt-2 h-1.5" />
              <div className="mt-1 text-[11px] text-muted-foreground">{l.loadHrs}h of {l.capacityHrs}h · {l.orders} order(s)</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Demand board</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-2 text-left">Source</th><th className="p-2 text-left">Reference</th><th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-left">Project</th><th className="p-2 text-left">Need by</th><th className="p-2 text-left">Coverage</th></tr>
            </thead>
            <tbody className="divide-y">
              {demand.map((d) => (
                <tr key={`${d.reference}-${d.itemCode}`}>
                  <td className="p-2">{d.source}</td>
                  <td className="p-2 font-mono">{d.reference}</td>
                  <td className="p-2"><div className="font-medium">{d.itemName}</div><div className="font-mono text-[10px] text-muted-foreground">{d.itemCode}</div></td>
                  <td className="p-2 text-right font-mono">{d.qty}</td>
                  <td className="p-2 font-mono text-muted-foreground">{d.projectCode ?? "—"}</td>
                  <td className="p-2 font-mono">{d.needBy}</td>
                  <td className="p-2">{d.covered ? <Badge variant="secondary" className="text-[10px]">Covered</Badge> : <Badge variant="destructive" className="text-[10px]">Uncovered</Badge>}</td>
                </tr>
              ))}
              {!demand.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No open demand.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Finite-capacity schedule preview</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-2 text-left">Order</th><th className="p-2 text-left">Operation</th><th className="p-2 text-left">Work center</th><th className="p-2 text-left">Start</th><th className="p-2 text-left">Finish</th><th className="p-2 text-right">Hours</th><th className="p-2 text-left">Risk</th></tr>
            </thead>
            <tbody className="divide-y">
              {plan.map((p) => (
                <tr key={p.operationId} className={p.late ? "bg-rose-500/[0.04]" : ""}>
                  <td className="p-2 font-mono">{p.orderCode}</td>
                  <td className="p-2">{p.name}</td>
                  <td className="p-2 font-mono">{p.workCenterCode}</td>
                  <td className="p-2 font-mono">{p.start.slice(0, 16).replace("T", " ")}</td>
                  <td className="p-2 font-mono">{p.end.slice(0, 16).replace("T", " ")}</td>
                  <td className="p-2 text-right font-mono">{p.hrs}</td>
                  <td className="p-2">{p.late ? <span className="font-medium text-rose-600">Late</span> : <span className="text-emerald-600">On time</span>}</td>
                </tr>
              ))}
              {!plan.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nothing scheduled — release orders with routings first.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------ orders */

function OrdersView({ crud }: { crud: Crud }) {
  const s = useMfg((st) => st);
  const [expanded, setExpanded] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Toolbar title="Manufacturing Orders" subtitle="Full lifecycle: plan → release (material reservation + auto-PR) → execute → complete → close, with costs flowing to Projects and Finance.">
        <Button size="sm" variant="outline" onClick={() => exportCsv("manufacturing-orders", s.orders as unknown as Record<string, unknown>[])}>Export</Button>
        <Button size="sm" className="gap-1.5" onClick={() => crud.openNew("orders", "New Manufacturing Order", { status: "planned", priority: "Normal", uom: "EA" })}>
          <Plus className="h-3.5 w-3.5" />New order
        </Button>
      </Toolbar>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Order</th><th className="p-2 text-left">Item</th><th className="p-2 text-left">Project</th>
                <th className="p-2 text-right">Qty</th><th className="p-2 text-left">Progress</th><th className="p-2 text-left">Due</th>
                <th className="p-2 text-right">Cost</th><th className="p-2 text-left">Status</th><th className="p-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {s.orders.map((o) => {
                const ops = orderOperations(s, o.id);
                const gaps = orderShortages(o);
                return (
                  <>
                    <tr key={o.id} className={o.dueDate < today && o.status !== "closed" ? "bg-rose-500/[0.04]" : ""}>
                      <td className="p-2">
                        <button className="font-mono underline-offset-2 hover:underline" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>{o.code}</button>
                        {o.sourceWoCode && <div className="text-[10px] text-muted-foreground">from {o.sourceWoCode}</div>}
                      </td>
                      <td className="p-2"><div className="font-medium">{o.itemName}</div><div className="font-mono text-[10px] text-muted-foreground">{o.itemCode}</div></td>
                      <td className="p-2 font-mono text-muted-foreground">{o.projectCode ?? "—"}</td>
                      <td className="p-2 text-right font-mono">{o.qty} {o.uom}</td>
                      <td className="p-2 w-32"><Progress value={orderProgressPct(o, ops)} className="h-1.5" /><div className="mt-0.5 text-[10px] text-muted-foreground">{orderProgressPct(o, ops)}% · {ops.length} ops</div></td>
                      <td className="p-2 font-mono">{o.dueDate}</td>
                      <td className="p-2 text-right font-mono">{fmtINR(o.materialCost + o.labourCost)}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{o.status}</Badge>
                        {gaps.length > 0 && o.status === "planned" && <div className="mt-0.5 text-[10px] text-amber-600">{gaps.length} shortage(s)</div>}
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1">
                          {!ops.length && o.routingCode && (
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => { explodeRouting(o.id); toast.success("Routing exploded into operations"); }}>
                              <ListTree className="h-3.5 w-3.5" />Explode
                            </Button>
                          )}
                          {o.status === "planned" && (
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => { const r = releaseOrder(o.id); r.ok ? toast.success(r.message) : toast.error(r.message); }}>
                              <Zap className="h-3.5 w-3.5" />Release
                            </Button>
                          )}
                          {(o.status === "in-progress" || o.status === "released") && (
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => { completeOrder(o.id); toast.success(`${o.code} completed — finished goods received`); }}>
                              <CheckCircle2 className="h-3.5 w-3.5" />Complete
                            </Button>
                          )}
                          <RowActions onEdit={() => crud.openEdit("orders", o as unknown as Record<string, unknown>, `Edit ${o.code}`)} onDelete={() => crud.askDelete("orders", o.id, o.code)} />
                        </div>
                      </td>
                    </tr>
                    {expanded === o.id && (
                      <tr key={`${o.id}-x`}>
                        <td colSpan={9} className="bg-muted/20 p-3">
                          <div className="grid gap-3 lg:grid-cols-2">
                            <div>
                              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Operations</div>
                              <div className="space-y-1">
                                {ops.map((op) => (
                                  <div key={op.id} className="flex items-center justify-between rounded border bg-background p-2">
                                    <span><span className="font-mono text-[10px] text-muted-foreground">{op.seq}0</span> {op.name} · <span className="font-mono">{op.workCenterCode}</span></span>
                                    <span className="text-[11px] text-muted-foreground">{op.actualMins}/{op.plannedMins} min · {op.goodQty} good · <Badge variant="outline" className="text-[10px] capitalize">{op.status}</Badge></span>
                                  </div>
                                ))}
                                {!ops.length && <p className="text-[11px] text-muted-foreground">No operations — attach a routing and explode it.</p>}
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Material coverage</div>
                              <div className="space-y-1">
                                {gaps.map((g) => (
                                  <div key={g.itemCode} className="flex items-center justify-between rounded border bg-background p-2">
                                    <span>{g.itemName} <span className="font-mono text-[10px] text-muted-foreground">{g.itemCode}</span></span>
                                    <span className="text-[11px] text-rose-600">short {g.shortage} · {fmtINR(g.value)} · {g.sourcing}</span>
                                  </div>
                                ))}
                                {!gaps.length && <p className="text-[11px] text-emerald-600">All material covered by stock or open POs.</p>}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {!s.orders.length && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No manufacturing orders yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

/* ---------------------------------------------------------- routings */

function RoutingsView({ crud }: { crud: Crud }) {
  const s = useMfg((st) => st);

  return (
    <>
      <Toolbar title="Routings & Work Centers" subtitle="Standard operation sequences with setup/run times and conversion rates — the basis for capacity, costing and OEE.">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => crud.openNew("workCenters", "New Work Center", { shifts: 2, capacityHrsPerShift: 8, oeeTarget: 80, active: true })}>
          <Plus className="h-3.5 w-3.5" />Work center
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => crud.openNew("routings", "New Routing", { rev: "A" })}>
          <Plus className="h-3.5 w-3.5" />Routing
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => crud.openNew("routingOps", "New Routing Operation", { seq: 1, setupMins: 30, runMinsPerUnit: 10, inspection: "false", subcontract: "false" })}>
          <Plus className="h-3.5 w-3.5" />Operation
        </Button>
      </Toolbar>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Work centers</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-2 text-left">Code</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Location</th><th className="p-2 text-right">Capacity/day</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">OEE target</th><th className="p-2" /></tr>
            </thead>
            <tbody className="divide-y">
              {s.workCenters.map((w) => (
                <tr key={w.id}>
                  <td className="p-2 font-mono">{w.code}</td>
                  <td className="p-2 font-medium">{w.name}</td>
                  <td className="p-2"><Badge variant="secondary" className="text-[10px]">{w.type}</Badge></td>
                  <td className="p-2 text-muted-foreground">{w.location}</td>
                  <td className="p-2 text-right font-mono">{w.shifts * w.capacityHrsPerShift} h</td>
                  <td className="p-2 text-right font-mono">₹{w.hourlyRate}/hr</td>
                  <td className="p-2 text-right font-mono">{w.oeeTarget}%</td>
                  <td className="p-2 text-right"><RowActions onEdit={() => crud.openEdit("workCenters", w as unknown as Record<string, unknown>, `Edit ${w.code}`)} onDelete={() => crud.askDelete("workCenters", w.id, w.code)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {s.routings.map((r) => {
        const ops = s.routingOps.filter((o) => o.routingCode === r.code).sort((a, b) => a.seq - b.seq);
        const totalMins = ops.reduce((a, o) => a + o.setupMins + o.runMinsPerUnit, 0);
        return (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">
                <span className="font-mono">{r.code}</span> · {r.itemName}
                <Badge variant="outline" className="ml-2 text-[10px]">Rev {r.rev}</Badge>
                <span className="ml-2 text-xs font-normal text-muted-foreground">{ops.length} operations · {totalMins} min / unit incl. setup</span>
              </CardTitle>
              <RowActions onEdit={() => crud.openEdit("routings", r as unknown as Record<string, unknown>, `Edit ${r.code}`)} onDelete={() => crud.askDelete("routings", r.id, r.code)} />
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
                  <tr><th className="p-2 text-left">Seq</th><th className="p-2 text-left">Operation</th><th className="p-2 text-left">Work center</th><th className="p-2 text-right">Setup</th><th className="p-2 text-right">Run/unit</th><th className="p-2 text-left">Flags</th><th className="p-2" /></tr>
                </thead>
                <tbody className="divide-y">
                  {ops.map((o) => (
                    <tr key={o.id}>
                      <td className="p-2 font-mono">{o.seq}0</td>
                      <td className="p-2 font-medium">{o.name}</td>
                      <td className="p-2 font-mono">{o.workCenterCode}</td>
                      <td className="p-2 text-right font-mono">{o.setupMins} min</td>
                      <td className="p-2 text-right font-mono">{o.runMinsPerUnit} min</td>
                      <td className="p-2">
                        {o.inspection && <Badge variant="secondary" className="mr-1 text-[10px]">Inspection</Badge>}
                        {o.subcontract && <Badge variant="outline" className="text-[10px]">Sub-contract</Badge>}
                      </td>
                      <td className="p-2 text-right"><RowActions onEdit={() => crud.openEdit("routingOps", o as unknown as Record<string, unknown>, `Edit ${o.name}`)} onDelete={() => crud.askDelete("routingOps", o.id, o.name)} /></td>
                    </tr>
                  ))}
                  {!ops.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No operations defined.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}

/* ---------------------------------------------------------- terminal */

function TerminalView() {
  const s = useMfg((st) => st);
  const liveOps = useMemo(
    () => s.operations
      .filter((o) => o.status !== "done" && s.orders.some((x) => x.id === o.orderId && ["released", "in-progress"].includes(x.status)))
      .sort((a, b) => a.seq - b.seq),
    [s],
  );
  const [opId, setOpId] = useState<string>("");
  const active = liveOps.find((o) => o.id === opId) ?? liveOps[0];
  const order = s.orders.find((o) => o.id === active?.orderId);

  const [form, setForm] = useState({ operator: "Shop Operator", mins: "60", goodQty: "1", scrapQty: "0", reworkQty: "0", downtimeMins: "0", downtimeReason: DOWNTIME_REASONS[0] as string, note: "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!active) return;
    const r = reportProduction({
      operationId: active.id,
      operator: form.operator,
      mins: Number(form.mins) || 0,
      goodQty: Number(form.goodQty) || 0,
      scrapQty: Number(form.scrapQty) || 0,
      reworkQty: Number(form.reworkQty) || 0,
      downtimeMins: Number(form.downtimeMins) || 0,
      downtimeReason: form.downtimeReason,
      note: form.note,
    });
    toast.success(r.message, {
      description: [r.ncrCode ? `NCR ${r.ncrCode} raised for scrap` : null, `Material ${fmtINR(r.materialValue)} · Labour ${fmtINR(r.labourValue)} posted`]
        .filter(Boolean).join(" · "),
    });
  };

  return (
    <>
      <Toolbar title="Shop Floor Terminal" subtitle="Operators clock time, report good/scrap/rework and log downtime. Every post back-flushes material, absorbs conversion cost, raises NCRs for scrap and posts WIP journals." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Live operations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {liveOps.map((op) => {
              const ord = s.orders.find((o) => o.id === op.orderId);
              const isActive = active?.id === op.id;
              return (
                <button key={op.id} onClick={() => setOpId(op.id)} className={`w-full rounded-lg border p-2 text-left text-xs transition-colors ${isActive ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{ord?.code}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{op.status}</Badge>
                  </div>
                  <div className="mt-0.5 font-medium">{op.seq}0 · {op.name}</div>
                  <div className="text-[10px] text-muted-foreground">{op.workCenterCode} · {op.actualMins}/{op.plannedMins} min · {op.goodQty}/{ord?.qty ?? 0} done</div>
                </button>
              );
            })}
            {!liveOps.length && <p className="py-8 text-center text-xs text-muted-foreground">Nothing on the floor — release an order first.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold">
              <span>{active ? `${order?.code} · ${active.name}` : "No operation selected"}</span>
              {active && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { startOperation(active.id, form.operator); toast.success("Clocked in"); }}>
                    <Play className="h-3.5 w-3.5" />Start
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { pauseOperation(active.id); toast.success("Paused"); }}>
                    <Pause className="h-3.5 w-3.5" />Pause
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {active ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {([["operator", "Operator", "text"], ["mins", "Minutes worked", "number"], ["goodQty", "Good qty", "number"], ["scrapQty", "Scrap qty", "number"], ["reworkQty", "Rework qty", "number"], ["downtimeMins", "Downtime (mins)", "number"]] as const).map(([k, label, type]) => (
                    <div key={k}>
                      <Label className="text-xs">{label}</Label>
                      <Input className="mt-1 h-8" type={type} value={form[k]} onChange={(e) => set(k, e.target.value)} />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Downtime reason</Label>
                    <Select value={form.downtimeReason} onValueChange={(v) => set("downtimeReason", v)}>
                      <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{DOWNTIME_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Note</Label>
                    <Input className="mt-1 h-8" value={form.note} onChange={(e) => set("note", e.target.value)} />
                  </div>
                </div>
                <Button size="sm" className="gap-1.5" onClick={submit}><CheckCircle2 className="h-3.5 w-3.5" />Post production</Button>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Select a live operation to report against.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Recent shop-floor postings</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-2 text-left">When</th><th className="p-2 text-left">Order</th><th className="p-2 text-left">Work center</th><th className="p-2 text-left">Operator</th><th className="p-2 text-right">Mins</th><th className="p-2 text-right">Good</th><th className="p-2 text-right">Scrap</th><th className="p-2 text-left">Note</th></tr>
            </thead>
            <tbody className="divide-y">
              {s.timeLogs.slice(0, 15).map((t) => (
                <tr key={t.id}>
                  <td className="p-2 font-mono">{t.at.slice(0, 16).replace("T", " ")}</td>
                  <td className="p-2 font-mono">{s.orders.find((o) => o.id === t.orderId)?.code ?? "—"}</td>
                  <td className="p-2 font-mono">{t.workCenterCode}</td>
                  <td className="p-2">{t.operator}</td>
                  <td className="p-2 text-right font-mono">{t.mins}</td>
                  <td className="p-2 text-right font-mono">{t.goodQty}</td>
                  <td className={`p-2 text-right font-mono ${t.scrapQty ? "text-rose-600" : ""}`}>{t.scrapQty}</td>
                  <td className="p-2 text-muted-foreground">{t.note ?? "—"}</td>
                </tr>
              ))}
              {!s.timeLogs.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No production reported yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

/* --------------------------------------------------------------- oee */

function OeeView({ crud }: { crud: Crud }) {
  const s = useMfg((st) => st);
  const rows = oeeByWorkCenter(s);
  const pareto = downtimePareto(s);
  const k = shopKpis(s);

  return (
    <>
      <Toolbar title="OEE & Downtime" subtitle="Availability × Performance × Quality computed from actual clocked time, planned operation times and reported scrap.">
        <Button size="sm" className="gap-1.5" onClick={() => crud.openNew("downtime", "Log Downtime", { mins: 30, at: new Date().toISOString() })}>
          <Plus className="h-3.5 w-3.5" />Log downtime
        </Button>
      </Toolbar>

      <div className="grid gap-3 md:grid-cols-4">
        {[["Average OEE", `${k.avgOee}%`], ["Scrap rate", `${k.scrapRate}%`], ["Labour hours", `${k.labourHrs} h`], ["WIP value", fmtINR(k.wipValue)]].map(([l, v]) => (
          <Card key={l}><CardContent className="p-4"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div><div className="mt-0.5 font-display text-lg font-semibold">{v}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Gauge className="h-4 w-4 text-primary" />OEE by work center — last 7 days</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-2 text-left">Work center</th><th className="p-2 text-right">Availability</th><th className="p-2 text-right">Performance</th><th className="p-2 text-right">Quality</th><th className="p-2 text-right">OEE</th><th className="p-2 text-right">Target</th><th className="p-2 text-right">Run / Down</th></tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.workCenterCode}>
                  <td className="p-2"><div className="font-medium">{r.name}</div><div className="font-mono text-[10px] text-muted-foreground">{r.workCenterCode}</div></td>
                  <td className="p-2 text-right font-mono">{r.availability}%</td>
                  <td className="p-2 text-right font-mono">{r.performance}%</td>
                  <td className="p-2 text-right font-mono">{r.quality}%</td>
                  <td className={`p-2 text-right font-mono font-semibold ${r.oee >= r.target ? "text-emerald-600" : "text-amber-600"}`}>{r.oee}%</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">{r.target}%</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">{r.runMins}m / {r.downMins}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Downtime log</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-2 text-left">When</th><th className="p-2 text-left">Work center</th><th className="p-2 text-left">Reason</th><th className="p-2 text-right">Mins</th><th className="p-2 text-left">Note</th><th className="p-2" /></tr>
            </thead>
            <tbody className="divide-y">
              {s.downtime.slice(0, 20).map((d) => (
                <tr key={d.id}>
                  <td className="p-2 font-mono">{d.at.slice(0, 16).replace("T", " ")}</td>
                  <td className="p-2 font-mono">{d.workCenterCode}</td>
                  <td className="p-2">{d.reason}</td>
                  <td className="p-2 text-right font-mono">{d.mins}</td>
                  <td className="p-2 text-muted-foreground">{d.note ?? "—"}</td>
                  <td className="p-2 text-right"><RowActions onEdit={() => crud.openEdit("downtime", d as unknown as Record<string, unknown>, "Edit downtime")} onDelete={() => crud.askDelete("downtime", d.id, d.reason)} /></td>
                </tr>
              ))}
              {!s.downtime.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No downtime logged.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Pareto of losses</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pareto.map((p) => (
            <div key={p.reason} className="flex items-center gap-3 text-xs">
              <span className="w-48 shrink-0 truncate">{p.reason}</span>
              <div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full bg-rose-500/70" style={{ width: `${p.sharePct}%` }} /></div>
              <span className="w-28 shrink-0 text-right font-mono text-muted-foreground">{p.mins}m · {p.events} evt</span>
            </div>
          ))}
          {!pareto.length && <p className="py-6 text-center text-xs text-muted-foreground">No downtime in the window.</p>}
        </CardContent>
      </Card>
    </>
  );
}

/* ----------------------------------------------------------- jobwork */

function JobWorkView({ crud }: { crud: Crud }) {
  const s = useMfg((st) => st);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Toolbar title="Sub-contracting & Job Work" subtitle="Material issued to vendors for outside processing, tracked against expected return dates with job-rate costing routed to the order and project.">
        <Button size="sm" className="gap-1.5" onClick={() => crud.openNew("jobWork", "New Job Work Challan", { status: "issued", returnedQty: 0, issuedAt: today })}>
          <Plus className="h-3.5 w-3.5" />Issue job work
        </Button>
      </Toolbar>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-2 text-left">Challan</th><th className="p-2 text-left">Vendor</th><th className="p-2 text-left">Item</th><th className="p-2 text-right">Issued</th><th className="p-2 text-right">Returned</th><th className="p-2 text-right">Job value</th><th className="p-2 text-left">Due</th><th className="p-2 text-left">Status</th><th className="p-2" /></tr>
            </thead>
            <tbody className="divide-y">
              {s.jobWork.map((j) => (
                <tr key={j.id} className={j.status !== "received" && j.status !== "closed" && j.dueAt < today ? "bg-rose-500/[0.04]" : ""}>
                  <td className="p-2 font-mono">{j.code}</td>
                  <td className="p-2 font-medium">{j.vendor}</td>
                  <td className="p-2"><div>{j.itemName}</div><div className="font-mono text-[10px] text-muted-foreground">{j.itemCode}</div></td>
                  <td className="p-2 text-right font-mono">{j.qty}</td>
                  <td className="p-2 text-right font-mono">{j.returnedQty}</td>
                  <td className="p-2 text-right font-mono">{fmtINR(j.qty * j.jobRate)}</td>
                  <td className="p-2 font-mono">{j.dueAt}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px] capitalize">{j.status}</Badge></td>
                  <td className="p-2 text-right">
                    <div className="flex justify-end gap-1">
                      {j.status !== "received" && j.status !== "closed" && (
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => { receiveJobWork(j.id, j.qty - j.returnedQty); toast.success(`${j.code} received back from ${j.vendor}`); }}>
                          <Truck className="h-3.5 w-3.5" />Receive
                        </Button>
                      )}
                      <RowActions onEdit={() => crud.openEdit("jobWork", j as unknown as Record<string, unknown>, `Edit ${j.code}`)} onDelete={() => crud.askDelete("jobWork", j.id, j.code)} />
                    </div>
                  </td>
                </tr>
              ))}
              {!s.jobWork.length && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No job work issued.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
