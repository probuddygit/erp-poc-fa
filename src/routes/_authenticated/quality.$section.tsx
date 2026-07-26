import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Download, Upload, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertOctagon } from "lucide-react";
import { useQuality } from "@/lib/quality/store";
import { StatusPill, Progress, fmtCompact, shortDate } from "@/components/projects/shared";

export const Route = createFileRoute("/_authenticated/quality/$section")({
  head: () => ({ meta: [{ title: "Quality · Faith Automation ERP" }] }),
  component: SectionView,
  notFoundComponent: () => (
    <div className="p-12 text-center text-sm text-muted-foreground">Section not found.</div>
  ),
});

const VALID = new Set(["plans", "inspections", "ncr", "capa", "calibration", "suppliers"]);

function SectionView() {
  const { section } = Route.useParams();
  if (!VALID.has(section)) throw notFound();
  if (section === "plans") return <PlansView />;
  if (section === "inspections") return <InspectionsView />;
  if (section === "ncr") return <NCRView />;
  if (section === "capa") return <CAPAView />;
  if (section === "calibration") return <CalibrationView />;
  return <SuppliersView />;
}

function Toolbar({ title, description, q, setQ }: { title: string; description: string; q: string; setQ: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-9 w-64 pl-8" />
        </div>
        <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" />Export</Button>
        <Button variant="outline" size="sm" className="gap-2"><Upload className="h-4 w-4" />Import</Button>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />New</Button>
      </div>
    </div>
  );
}

/* ============== INSPECTION PLANS ============== */
function PlansView() {
  const checklists = useQuality((s) => s.checklists);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [selected, setSelected] = useState<string>(checklists[0]?.code ?? "");

  const filtered = useMemo(() => {
    const l = q.toLowerCase();
    return checklists.filter((c) => (stage === "all" || c.stage === stage)
      && (!q || [c.code, c.title, c.itemCode ?? "", c.itemDescription ?? ""].some((x) => x.toLowerCase().includes(l))));
  }, [checklists, q, stage]);

  const stages = ["all", "incoming", "in-process", "final"];
  const active = checklists.find((c) => c.code === selected) ?? filtered[0] ?? checklists[0];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Inspection Plans & Checklists" description="Reusable inspection templates with dimensional, visual, functional, material, torque and weld checks — versioned by revision." q={q} setQ={setQ} />

      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <button key={s} onClick={() => setStage(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${stage === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {s.replace("-", " ")} <span className="ml-1 text-[10px] opacity-60">{s === "all" ? checklists.length : checklists.filter((c) => c.stage === s).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <Card>
          <CardContent className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => setSelected(c.code)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${c.code === active?.code ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{c.stage.replace("-", " ")}</Badge>
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium">{c.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.itemDescription ?? "—"}</div>
                  </div>
                  <div className="text-right font-mono text-[10px] text-muted-foreground">
                    <div>{c.revision}</div>
                    <div>{c.checks.length} checks</div>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            {active && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{active.code}</span>
                      <StatusPill status={active.status === "approved" ? "approved" : active.status === "draft" ? "draft" : "rejected"} />
                      <Badge variant="outline" className="text-[10px]">{active.revision}</Badge>
                    </div>
                    <h3 className="mt-0.5 font-display text-lg font-semibold">{active.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {active.itemCode ? <><span className="font-mono">{active.itemCode}</span> · </> : null}
                      Owner {active.owner} · updated {shortDate(active.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Clone</Button>
                    <Button size="sm">New Revision</Button>
                  </div>
                </div>

                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left">#</th>
                        <th className="p-3 text-left">Parameter</th>
                        <th className="p-3 text-left">Type</th>
                        <th className="p-3 text-left">Method</th>
                        <th className="p-3 text-left">Nominal</th>
                        <th className="p-3 text-left">LSL / USL</th>
                        <th className="p-3 text-left">Critical</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {active.checks.map((ck, i) => (
                        <tr key={ck.id} className="hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{i + 1}</td>
                          <td className="p-3 font-medium">{ck.parameter}</td>
                          <td className="p-3"><Badge variant="secondary" className="border-0 capitalize">{ck.type}</Badge></td>
                          <td className="p-3 text-xs text-muted-foreground">{ck.method}</td>
                          <td className="p-3 font-mono text-xs">{ck.nominal ?? "—"} {ck.unit ?? ""}</td>
                          <td className="p-3 font-mono text-xs">
                            {ck.lsl !== undefined || ck.usl !== undefined ? `${ck.lsl ?? "—"} / ${ck.usl ?? "—"}` : "—"}
                          </td>
                          <td className="p-3">
                            {ck.critical
                              ? <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-300"><AlertOctagon className="h-3 w-3" /> Critical</span>
                              : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ============== INSPECTIONS ============== */
function InspectionsView() {
  const inspections = useQuality((s) => s.inspections);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return inspections.filter((i) => (stage === "all" || i.stage === stage)
      && (status === "all" || i.status === status)
      && (!q || [i.code, i.itemCode, i.itemDescription, i.refCode, i.vendorName ?? "", i.projectCode ?? ""].some((x) => x.toLowerCase().includes(l))));
  }, [inspections, q, stage, status]);

  const stages = ["all", "incoming", "in-process", "final"];
  const statuses = ["all", "planned", "in-progress", "passed", "failed", "rework"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Inspections — IQC · IPQC · FQC" description="Incoming, in-process and final inspections tied to GRNs, work orders and finished-goods lots with defect tally and disposition." q={q} setQ={setQ} />

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {stages.map((s) => (
            <button key={s} onClick={() => setStage(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${stage === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              {s.replace("-", " ")}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-l pl-3">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${status === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              {s.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Inspection</th>
                <th className="p-3 text-left">Stage</th>
                <th className="p-3 text-left">Reference</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-left">Inspector</th>
                <th className="p-3 text-left w-32">Pass Rate</th>
                <th className="p-3 text-left">Defects (C/M/m)</th>
                <th className="p-3 text-left">Scheduled</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((i) => (
                <tr key={i.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-mono text-xs">{i.code}</div>
                    <div className="text-[10px] text-muted-foreground">Plan {i.checklistCode}</div>
                  </td>
                  <td className="p-3"><Badge variant="outline" className="capitalize">{i.stage.replace("-", " ")}</Badge></td>
                  <td className="p-3">
                    <div className="font-mono text-xs">{i.refCode}</div>
                    <div className="text-[10px] text-muted-foreground">{i.refType}{i.vendorName ? ` · ${i.vendorName}` : ""}{i.projectCode ? ` · ${i.projectCode}` : ""}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-mono text-[11px] text-muted-foreground">{i.itemCode}</div>
                    <div className="text-sm">{i.itemDescription}</div>
                  </td>
                  <td className="p-3 text-right font-mono">{i.qty} <span className="text-[10px] text-muted-foreground">{i.uom}</span></td>
                  <td className="p-3 text-xs">{i.inspector}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><Progress value={i.passRate} /></div>
                      <span className="w-8 text-right font-mono text-[10px]">{i.passRate}%</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    <span className="text-rose-600 dark:text-rose-300">{i.criticalDefects}</span>
                    {" / "}
                    <span className="text-amber-600 dark:text-amber-300">{i.majorDefects}</span>
                    {" / "}
                    <span className="text-muted-foreground">{i.minorDefects}</span>
                  </td>
                  <td className="p-3 text-xs">
                    <div>{shortDate(i.scheduledFor)}</div>
                    {i.completedAt && <div className="text-[10px] text-muted-foreground">done {shortDate(i.completedAt)}</div>}
                  </td>
                  <td className="p-3">
                    <StatusPill status={i.status === "passed" ? "approved" : i.status === "failed" ? "rejected" : i.status === "rework" ? "high" : i.status === "in-progress" ? "in-progress" : "upcoming"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============== NCR ============== */
function NCRView() {
  const ncrs = useQuality((s) => s.ncrs);
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<string>("all");

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return ncrs.filter((n) => (sev === "all" || n.severity === sev)
      && (!q || [n.code, n.itemCode, n.itemDescription, n.defect, n.vendorName ?? "", n.projectCode ?? ""].some((x) => x.toLowerCase().includes(l))));
  }, [ncrs, q, sev]);

  const sevs = ["all", "critical", "high", "medium", "low"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Non-Conformance (NCR)" description="Defects raised from incoming, in-process, final, customer complaints and audits with disposition and cost impact." q={q} setQ={setQ} />

      <div className="flex flex-wrap gap-2">
        {sevs.map((s) => (
          <button key={s} onClick={() => setSev(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${sev === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {s} <span className="ml-1 text-[10px] opacity-60">{s === "all" ? ncrs.length : ncrs.filter((n) => n.severity === s).length}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">NCR</th>
                <th className="p-3 text-left">Source</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-left">Defect</th>
                <th className="p-3 text-left">Severity</th>
                <th className="p-3 text-left">Disposition</th>
                <th className="p-3 text-right">Cost</th>
                <th className="p-3 text-left">CAPA</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((n) => (
                <tr key={n.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-mono text-xs">{n.code}</div>
                    <div className="text-[10px] text-muted-foreground">{shortDate(n.raisedAt)} · {n.raisedBy}</div>
                  </td>
                  <td className="p-3"><Badge variant="outline" className="capitalize">{n.source.replace("-", " ")}</Badge></td>
                  <td className="p-3">
                    <div className="font-mono text-[11px] text-muted-foreground">{n.itemCode}</div>
                    <div className="text-sm">{n.itemDescription}</div>
                    <div className="text-[10px] text-muted-foreground">{n.vendorName ?? n.projectCode ?? "—"}</div>
                  </td>
                  <td className="p-3 text-right font-mono">{n.qty} <span className="text-[10px] text-muted-foreground">{n.uom}</span></td>
                  <td className="p-3 text-sm max-w-xs">{n.defect}</td>
                  <td className="p-3"><StatusPill status={n.severity} /></td>
                  <td className="p-3 text-xs capitalize">{n.disposition?.replace(/-/g, " ") ?? "—"}</td>
                  <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-300">{fmtCompact(n.costImpact)}</td>
                  <td className="p-3">{n.linkedCapa ? <Badge variant="outline" className="font-mono text-[10px]">{n.linkedCapa}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="p-3">
                    <StatusPill status={n.status === "closed" ? "approved" : n.status === "resolved" ? "resolved" : n.status === "containment" || n.status === "investigation" ? "in-progress" : "open"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============== CAPA / 8D ============== */
function CAPAView() {
  const capas = useQuality((s) => s.capas);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<string>(capas[0]?.code ?? "");

  const filtered = useMemo(() => {
    const l = q.toLowerCase();
    return capas.filter((c) => (status === "all" || c.status === status)
      && (!q || [c.code, c.title, c.owner, c.ncrCode ?? ""].some((x) => x.toLowerCase().includes(l))));
  }, [capas, q, status]);

  const statuses = ["all", "open", "in-progress", "verification", "closed", "overdue"];
  const active = capas.find((c) => c.code === selected) ?? filtered[0] ?? capas[0];
  const stages = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] as const;

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="CAPA & 8D Workflows" description="Corrective and preventive action tracked through the 8D methodology with root cause, containment, actions and effectiveness verification." q={q} setQ={setQ} />

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${status === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {s.replace("-", " ")} <span className="ml-1 text-[10px] opacity-60">{s === "all" ? capas.length : capas.filter((c) => c.status === s).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardContent className="p-2 space-y-1 max-h-[640px] overflow-y-auto">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => setSelected(c.code)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${c.code === active?.code ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                      <Badge variant="outline" className="text-[10px]">{c.stage}</Badge>
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground">Owner {c.owner}{c.ncrCode ? ` · ${c.ncrCode}` : ""}</div>
                  </div>
                  <StatusPill status={c.status === "closed" ? "approved" : c.status === "overdue" ? "critical" : c.status === "verification" ? "pending" : c.status === "in-progress" ? "in-progress" : "open"} />
                </div>
                <div className="mt-2"><Progress value={c.effectivenessPct} /></div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-5">
            {active && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{active.code}</span>
                      <StatusPill status={active.status === "closed" ? "approved" : active.status === "overdue" ? "critical" : active.status === "verification" ? "pending" : active.status === "in-progress" ? "in-progress" : "open"} />
                    </div>
                    <h3 className="mt-0.5 font-display text-lg font-semibold">{active.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Opened {shortDate(active.openedAt)} · target {shortDate(active.targetClose)}
                      {active.actualClose ? ` · closed ${shortDate(active.actualClose)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Effectiveness</div>
                    <div className="font-display text-2xl font-semibold">{active.effectivenessPct}%</div>
                  </div>
                </div>

                {/* 8D stepper */}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">8D progress</div>
                  <div className="flex items-center gap-1">
                    {stages.map((s, idx) => {
                      const currentIdx = stages.indexOf(active.stage);
                      const done = idx <= currentIdx;
                      return (
                        <div key={s} className="flex flex-1 items-center gap-1">
                          <div className={`grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold ring-1 ${
                            done ? "bg-primary text-primary-foreground ring-primary" : "bg-muted text-muted-foreground ring-border"
                          }`}>{done ? <CheckCircle2 className="h-4 w-4" /> : s}</div>
                          {idx < stages.length - 1 && <div className={`h-0.5 flex-1 ${done ? "bg-primary" : "bg-border"}`} />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">Currently at {active.stage}</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Team</div>
                    <div className="mt-1 text-sm">{active.team.join(" · ")}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Owner</div>
                    <div className="mt-1 text-sm">{active.owner}</div>
                  </div>
                  <div className="rounded-lg border p-3 sm:col-span-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Root cause (D4)</div>
                    <div className="mt-1 text-sm">{active.rootCause ?? "Pending analysis"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Corrective action (D5)</div>
                    <div className="mt-1 text-sm">{active.correctiveAction ?? "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preventive action (D7)</div>
                    <div className="mt-1 text-sm">{active.preventiveAction ?? "—"}</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ============== CALIBRATION ============== */
function CalibrationView() {
  const gauges = useQuality((s) => s.gauges);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return gauges.filter((g) => (status === "all" || g.status === status)
      && (!q || [g.code, g.name, g.type, g.location, g.provider].some((x) => x.toLowerCase().includes(l))));
  }, [gauges, q, status]);

  const statuses = ["all", "in-cal", "due-soon", "overdue", "out-of-service"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Gauge & Instrument Calibration" description="Gauge master with least count, calibration frequency, last / next due dates and NABL / provider certificate tracking." q={q} setQ={setQ} />

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${status === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {s.replace(/-/g, " ")} <span className="ml-1 text-[10px] opacity-60">{s === "all" ? gauges.length : gauges.filter((g) => g.status === s).length}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Gauge</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Location / Owner</th>
                <th className="p-3 text-left">Range · LC</th>
                <th className="p-3 text-left">Last Cal</th>
                <th className="p-3 text-left">Next Due</th>
                <th className="p-3 text-left w-32">Cycle</th>
                <th className="p-3 text-left">Provider</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((g) => {
                const days = Math.round((new Date(g.nextDue).getTime() - Date.now()) / 86400000);
                const pct = Math.max(0, Math.min(100, Math.round(((g.frequencyDays - Math.max(0, days)) / g.frequencyDays) * 100)));
                return (
                  <tr key={g.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-mono text-xs">{g.code}</div>
                      <div className="text-sm font-medium">{g.name}</div>
                      {g.certificateNo && <div className="text-[10px] text-muted-foreground">Cert {g.certificateNo}</div>}
                    </td>
                    <td className="p-3 text-xs">{g.type}</td>
                    <td className="p-3 text-xs">
                      <div>{g.location}</div>
                      <div className="text-muted-foreground">{g.owner}</div>
                    </td>
                    <td className="p-3 text-xs">
                      <div>{g.range}</div>
                      <div className="text-muted-foreground">LC {g.leastCount}</div>
                    </td>
                    <td className="p-3 text-xs">{shortDate(g.lastCalibrated)}</td>
                    <td className={`p-3 text-xs font-medium ${days < 0 ? "text-rose-600 dark:text-rose-300" : days < 30 ? "text-amber-700 dark:text-amber-300" : ""}`}>
                      {shortDate(g.nextDue)}
                      <div className="text-[10px] font-normal">{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><Progress value={pct} /></div>
                        <span className="w-8 text-right font-mono text-[10px]">{g.frequencyDays}d</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs">{g.provider}</td>
                    <td className="p-3">
                      <StatusPill status={g.status === "in-cal" ? "approved" : g.status === "due-soon" ? "pending" : g.status === "overdue" ? "high" : "rejected"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============== SUPPLIER QUALITY ============== */
function SuppliersView() {
  const suppliers = useQuality((s) => s.suppliers);
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState<string>("all");

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return [...suppliers]
      .filter((v) => (grade === "all" || v.grade === grade)
        && (!q || [v.vendorCode, v.vendorName, v.category].some((x) => x.toLowerCase().includes(l))))
      .sort((a, b) => b.score - a.score);
  }, [suppliers, q, grade]);

  const grades = ["all", "A", "B", "C", "D"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Supplier Quality Scorecards" description="Vendor performance across acceptance rate, PPM, on-time delivery, NCR count and response time with A/B/C/D grading." q={q} setQ={setQ} />

      <div className="flex flex-wrap gap-2">
        {grades.map((g) => (
          <button key={g} onClick={() => setGrade(g)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${grade === g ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {g === "all" ? "All grades" : `Grade ${g}`} <span className="ml-1 text-[10px] opacity-60">{g === "all" ? suppliers.length : suppliers.filter((v) => v.grade === g).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.slice(0, 4).map((v) => {
          const accept = Math.round((v.lotsAccepted / (v.lotsReceived || 1)) * 100);
          return (
            <Card key={v.id} className="relative overflow-hidden">
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${v.grade === "A" ? "from-emerald-500" : v.grade === "B" ? "from-primary" : v.grade === "C" ? "from-amber-500" : "from-rose-500"} via-transparent to-transparent`} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] text-muted-foreground">{v.vendorCode}</div>
                    <div className="truncate font-medium">{v.vendorName}</div>
                    <div className="text-[10px] text-muted-foreground">{v.category}</div>
                  </div>
                  <StatusPill status={v.grade === "A" ? "approved" : v.grade === "B" ? "medium" : v.grade === "C" ? "high" : "critical"} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="font-display text-3xl font-semibold">{v.score}</div>
                    <div className="text-[10px] text-muted-foreground">composite score</div>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${v.trend === "up" ? "text-emerald-600 dark:text-emerald-300" : v.trend === "down" ? "text-rose-600 dark:text-rose-300" : "text-muted-foreground"}`}>
                    {v.trend === "up" ? <TrendingUp className="h-3 w-3" /> : v.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {v.trend}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="font-mono text-sm">{accept}%</div>
                    <div className="text-muted-foreground">Accept</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="font-mono text-sm">{v.ppm}</div>
                    <div className="text-muted-foreground">PPM</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="font-mono text-sm">{v.otdPct}%</div>
                    <div className="text-muted-foreground">OTD</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-right">Lots Rec.</th>
                <th className="p-3 text-right">Accepted</th>
                <th className="p-3 text-right">PPM</th>
                <th className="p-3 text-right">OTD %</th>
                <th className="p-3 text-right">NCRs</th>
                <th className="p-3 text-right">Resp (h)</th>
                <th className="p-3 text-left w-40">Score</th>
                <th className="p-3 text-left">Grade</th>
                <th className="p-3 text-left">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{v.vendorName}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{v.vendorCode}</div>
                  </td>
                  <td className="p-3"><Badge variant="outline">{v.category}</Badge></td>
                  <td className="p-3 text-right font-mono">{v.lotsReceived}</td>
                  <td className="p-3 text-right font-mono">{v.lotsAccepted}</td>
                  <td className="p-3 text-right font-mono">{v.ppm}</td>
                  <td className="p-3 text-right font-mono">{v.otdPct}%</td>
                  <td className="p-3 text-right font-mono">{v.ncrCount}</td>
                  <td className="p-3 text-right font-mono">{v.responseHours}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><Progress value={v.score} /></div>
                      <span className="w-8 text-right font-mono text-[10px]">{v.score}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusPill status={v.grade === "A" ? "approved" : v.grade === "B" ? "medium" : v.grade === "C" ? "high" : "critical"} />
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 text-xs ${v.trend === "up" ? "text-emerald-600 dark:text-emerald-300" : v.trend === "down" ? "text-rose-600 dark:text-rose-300" : "text-muted-foreground"}`}>
                      {v.trend === "up" ? <TrendingUp className="h-3 w-3" /> : v.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {v.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
