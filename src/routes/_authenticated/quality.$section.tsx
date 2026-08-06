import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Plus, Download, TrendingUp, TrendingDown, Minus, CheckCircle2,
  AlertOctagon, Printer, Play, ShieldAlert, RefreshCw, Trash2, Pencil, FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  useQuality, upsertQuality, deleteQuality, cloneChecklist, newChecklistRevision,
  setChecklistStatus, upsertCheck, removeCheck, startInspection, completeInspection,
  setNcrStatus, setNcrDisposition, createCapaFromNcr, advanceCapa, closeCapa, reopenCapa,
  recordCalibration, setGaugeStatus, refreshCalibrationStatuses, recomputeSupplierScores,
} from "@/lib/quality/store";
import { QUALITY_SCHEMAS } from "@/lib/quality/schemas";
import { useQualityOptions } from "@/lib/quality/options";
import {
  inspectionDocument, ncrDocument, capaDocument, calibrationDocument, checklistDocument,
} from "@/lib/quality/documents";
import { useQualityDoc } from "@/components/quality-doc-dialog";
import { RowActions, useCrud } from "@/components/crud-kit";
import { RecordDialog } from "@/components/record-dialog";
import { exportCsv } from "@/lib/crud";
import { StatusPill, Progress, fmtCompact, shortDate } from "@/components/projects/shared";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

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

function Toolbar({
  title, description, q, setQ, newLabel = "New", onNew, onExport, extra,
}: {
  title: string;
  description: string;
  q: string;
  setQ: (v: string) => void;
  newLabel?: string;
  onNew?: () => void;
  onExport?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-9 w-64 pl-8" />
        </div>
        {extra}
        {onExport && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
            <Download className="h-4 w-4" />Export
          </Button>
        )}
        {onNew && (
          <Button size="sm" className="gap-2" onClick={onNew}>
            <Plus className="h-4 w-4" />{newLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterChips({
  values, active, onChange, count,
}: {
  values: string[];
  active: string;
  onChange: (v: string) => void;
  count: (v: string) => number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <button key={v} onClick={() => onChange(v)}
          className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${active === v ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
          {v.replace(/-/g, " ")} <span className="ml-1 text-[10px] opacity-60">{count(v)}</span>
        </button>
      ))}
    </div>
  );
}

/* ============== INSPECTION PLANS ============== */
function PlansView() {
  const checklists = useQuality((s) => s.checklists);
  const lookups = useQualityOptions();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [selected, setSelected] = useState<string>("");
  const { openNew, openEdit, askDelete, dialogs } = useCrud(QUALITY_SCHEMAS, upsertQuality, deleteQuality, lookups);
  const { show, dialog } = useQualityDoc();
  const [checkEdit, setCheckEdit] = useState<{ planId: string; record?: Record<string, unknown> } | null>(null);

  const filtered = useMemo(() => {
    const l = q.toLowerCase();
    return checklists.filter((c) => (stage === "all" || c.stage === stage)
      && (!q || [c.code, c.title, c.itemCode ?? "", c.itemDescription ?? ""].some((x) => x.toLowerCase().includes(l))));
  }, [checklists, q, stage]);

  const active = checklists.find((c) => c.code === selected) ?? filtered[0] ?? checklists[0];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Inspection Plans & Checklists" newLabel="New Plan"
        description="Reusable inspection templates with dimensional, visual, functional, material, torque and weld checks — versioned by revision."
        q={q} setQ={setQ}
        onExport={() => exportCsv("inspection-plans", filtered.map((c) => ({ ...c, checks: c.checks.length })) as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("checklists", "New Inspection Plan", { stage: "incoming", status: "draft", revision: "R1", owner: "", checks: [] })} />

      <FilterChips values={["all", "incoming", "in-process", "final"]} active={stage} onChange={setStage}
        count={(v) => (v === "all" ? checklists.length : checklists.filter((c) => c.stage === v).length)} />

      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <Card>
          <CardContent className="p-2 space-y-1 max-h-[640px] overflow-y-auto">
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
            {!filtered.length && <div className="p-8 text-center text-sm text-muted-foreground">No plans.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            {active ? (
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
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => show(checklistDocument(active))}>
                      <Printer className="h-4 w-4" />Print
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit("checklists", active as unknown as Record<string, unknown>, "Edit Inspection Plan")}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => { const id = cloneChecklist(active.id); if (id) toast.success(`${active.code} cloned`); }}>Clone</Button>
                    <Button size="sm" variant="outline" onClick={() => { newChecklistRevision(active.id); toast.success(`New revision created from ${active.revision}`); }}>New Revision</Button>
                    {active.status !== "approved" ? (
                      <Button size="sm" className="gap-1.5" onClick={() => { setChecklistStatus(active.id, "approved"); toast.success(`${active.code} approved`); }}>
                        <CheckCircle2 className="h-4 w-4" />Approve
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setChecklistStatus(active.id, "obsolete"); toast.success(`${active.code} marked obsolete`); }}>Obsolete</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive"
                      onClick={() => askDelete("checklists", active.id, active.code)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Check parameters</div>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCheckEdit({ planId: active.id })}>
                    <Plus className="h-4 w-4" />Add Check
                  </Button>
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
                        <th className="p-3 w-12"></th>
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
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit check"
                                onClick={() => setCheckEdit({ planId: active.id, record: { ...ck, critical: ck.critical ? "yes" : "no" } })}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Delete check"
                                onClick={() => { removeCheck(active.id, ck.id); toast.success("Check removed"); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!active.checks.length && (
                        <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No checks defined — add the first parameter.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">Create an inspection plan to get started.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <RecordDialog
        open={!!checkEdit}
        onOpenChange={(v) => !v && setCheckEdit(null)}
        title={checkEdit?.record ? "Edit Check Parameter" : "Add Check Parameter"}
        fields={QUALITY_SCHEMAS.checks}
        initial={checkEdit?.record}
        dynamicOptions={lookups}
        onSubmit={(values) => {
          if (!checkEdit) return;
          upsertCheck(checkEdit.planId, { ...(checkEdit.record ?? {}), ...values });
          toast.success(checkEdit.record ? "Check updated" : "Check added");
          setCheckEdit(null);
        }}
      />
      {dialogs}
      {dialog}
    </div>
  );
}

/* ============== INSPECTIONS ============== */
function InspectionsView() {
  const inspections = useQuality((s) => s.inspections);
  const checklists = useQuality((s) => s.checklists);
  const lookups = useQualityOptions();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const { openNew, openEdit, askDelete, dialogs } = useCrud(QUALITY_SCHEMAS, upsertQuality, deleteQuality, lookups);
  const { show, dialog } = useQualityDoc();

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return inspections.filter((i) => (stage === "all" || i.stage === stage)
      && (status === "all" || i.status === status)
      && (!q || [i.code, i.itemCode, i.itemDescription, i.refCode, i.vendorName ?? "", i.projectCode ?? ""].some((x) => x.toLowerCase().includes(l))));
  }, [inspections, q, stage, status]);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Inspections — IQC · IPQC · FQC" newLabel="New Inspection"
        description="Incoming, in-process and final inspections tied to GRNs, work orders and finished-goods lots. Failures auto-raise a linked NCR."
        q={q} setQ={setQ}
        onExport={() => exportCsv("inspections", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("inspections", "New Inspection", {
          stage: "incoming", refType: "GRN", status: "planned", qty: 1, uom: "EA",
          criticalDefects: 0, majorDefects: 0, minorDefects: 0, scheduledFor: new Date().toISOString(),
        })} />

      <div className="flex flex-wrap gap-3">
        <FilterChips values={["all", "incoming", "in-process", "final"]} active={stage} onChange={setStage}
          count={(v) => (v === "all" ? inspections.length : inspections.filter((i) => i.stage === v).length)} />
        <div className="border-l pl-3">
          <FilterChips values={["all", "planned", "in-progress", "passed", "failed", "rework"]} active={status} onChange={setStatus}
            count={(v) => (v === "all" ? inspections.length : inspections.filter((i) => i.status === v).length)} />
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
                <th className="p-3 text-left w-56">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((i) => (
                <tr key={i.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-mono text-xs">{i.code}</div>
                    <div className="text-[10px] text-muted-foreground">Plan {i.checklistCode}</div>
                    {i.ncrCode && <Badge variant="outline" className="mt-1 font-mono text-[10px]">{i.ncrCode}</Badge>}
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
                    <span className="text-rose-600 dark:text-rose-300">{i.criticalDefects}</span>{" / "}
                    <span className="text-amber-600 dark:text-amber-300">{i.majorDefects}</span>{" / "}
                    <span className="text-muted-foreground">{i.minorDefects}</span>
                  </td>
                  <td className="p-3 text-xs">
                    <div>{shortDate(i.scheduledFor)}</div>
                    {i.completedAt && <div className="text-[10px] text-muted-foreground">done {shortDate(i.completedAt)}</div>}
                  </td>
                  <td className="p-3">
                    <StatusPill status={i.status === "passed" ? "approved" : i.status === "failed" ? "rejected" : i.status === "rework" ? "high" : i.status === "in-progress" ? "in-progress" : "upcoming"} />
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {i.status === "planned" && (
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs"
                          onClick={() => { startInspection(i.id); toast.success(`${i.code} started`); }}>
                          <Play className="h-3 w-3" />Start
                        </Button>
                      )}
                      {i.status === "in-progress" && (
                        <>
                          <Button size="sm" className="h-7 px-2 text-xs"
                            onClick={() => { completeInspection(i.id, "passed"); toast.success(`${i.code} passed`); }}>Pass</Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                            onClick={() => { completeInspection(i.id, "rework"); toast.warning(`${i.code} sent to rework — NCR raised`); }}>Rework</Button>
                          <Button size="sm" variant="destructive" className="h-7 px-2 text-xs"
                            onClick={() => { completeInspection(i.id, "failed"); toast.error(`${i.code} failed — NCR raised`); }}>Fail</Button>
                        </>
                      )}
                      <RowActions
                        onEdit={() => openEdit("inspections", i as unknown as Record<string, unknown>, "Edit Inspection")}
                        onDelete={() => askDelete("inspections", i.id, i.code)}
                        extra={
                          <DropdownMenuItem onClick={() => show(inspectionDocument(i, checklists.find((c) => c.code === i.checklistCode)))}>
                            <FileText className="mr-2 h-4 w-4" /> Report
                          </DropdownMenuItem>
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={11} className="p-8 text-center text-sm text-muted-foreground">No inspections.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {dialogs}
      {dialog}
    </div>
  );
}

/* ============== NCR ============== */
function NCRView() {
  const ncrs = useQuality((s) => s.ncrs);
  const lookups = useQualityOptions();
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<string>("all");
  const { openNew, openEdit, askDelete, dialogs } = useCrud(QUALITY_SCHEMAS, upsertQuality, deleteQuality, lookups);
  const { show, dialog } = useQualityDoc();

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return ncrs.filter((n) => (sev === "all" || n.severity === sev)
      && (!q || [n.code, n.itemCode, n.itemDescription, n.defect, n.vendorName ?? "", n.projectCode ?? ""].some((x) => x.toLowerCase().includes(l))));
  }, [ncrs, q, sev]);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Non-Conformance (NCR)" newLabel="Raise NCR"
        description="Defects raised from incoming, in-process, final, customer complaints and audits with disposition, containment and cost impact."
        q={q} setQ={setQ}
        onExport={() => exportCsv("ncrs", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("ncrs", "Raise Non-Conformance", {
          source: "incoming", severity: "medium", status: "open", qty: 1, uom: "EA",
          costImpact: 0, raisedAt: new Date().toISOString(),
        })} />

      <FilterChips values={["all", "critical", "high", "medium", "low"]} active={sev} onChange={setSev}
        count={(v) => (v === "all" ? ncrs.length : ncrs.filter((n) => n.severity === v).length)} />

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
                <th className="p-3 text-left w-52">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((n) => (
                <tr key={n.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-mono text-xs">{n.code}</div>
                    <div className="text-[10px] text-muted-foreground">{shortDate(n.raisedAt)} · {n.raisedBy}</div>
                    {n.inspectionCode && <div className="text-[10px] text-muted-foreground">from {n.inspectionCode}</div>}
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
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {!n.disposition && n.status !== "closed" && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                          onClick={() => { setNcrDisposition(n.id, "rework"); toast.success(`${n.code} dispositioned for rework`); }}>Disposition</Button>
                      )}
                      {!n.linkedCapa && n.status !== "closed" && (
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs"
                          onClick={() => { const c = createCapaFromNcr(n.id); toast.success(`${c} opened from ${n.code}`); }}>
                          <ShieldAlert className="h-3 w-3" />CAPA
                        </Button>
                      )}
                      {n.status !== "closed" && n.status !== "resolved" && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                          onClick={() => { setNcrStatus(n.id, "resolved"); toast.success(`${n.code} resolved`); }}>Resolve</Button>
                      )}
                      {n.status === "resolved" && (
                        <Button size="sm" className="h-7 px-2 text-xs"
                          onClick={() => { setNcrStatus(n.id, "closed"); toast.success(`${n.code} closed`); }}>Close</Button>
                      )}
                      <RowActions
                        onEdit={() => openEdit("ncrs", n as unknown as Record<string, unknown>, "Edit NCR")}
                        onDelete={() => askDelete("ncrs", n.id, n.code)}
                        extra={
                          <DropdownMenuItem onClick={() => show(ncrDocument(n))}>
                            <FileText className="mr-2 h-4 w-4" /> Report
                          </DropdownMenuItem>
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={11} className="p-8 text-center text-sm text-muted-foreground">No non-conformances.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {dialogs}
      {dialog}
    </div>
  );
}

/* ============== CAPA / 8D ============== */
function CAPAView() {
  const capas = useQuality((s) => s.capas);
  const lookups = useQualityOptions();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<string>("");
  const { openNew, openEdit, askDelete, dialogs } = useCrud(QUALITY_SCHEMAS, upsertQuality, deleteQuality, lookups);
  const { show, dialog } = useQualityDoc();

  const filtered = useMemo(() => {
    const l = q.toLowerCase();
    return capas.filter((c) => (status === "all" || c.status === status)
      && (!q || [c.code, c.title, c.owner, c.ncrCode ?? ""].some((x) => x.toLowerCase().includes(l))));
  }, [capas, q, status]);

  const active = capas.find((c) => c.code === selected) ?? filtered[0] ?? capas[0];
  const stages = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] as const;

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="CAPA & 8D Workflows" newLabel="New CAPA"
        description="Corrective and preventive action tracked through the 8D methodology with root cause, containment, actions and effectiveness verification."
        q={q} setQ={setQ}
        onExport={() => exportCsv("capa", filtered.map((c) => ({ ...c, team: c.team.join(" | ") })) as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("capas", "Open CAPA", { stage: "D1", status: "open", effectivenessPct: 0, openedAt: new Date().toISOString() })} />

      <FilterChips values={["all", "open", "in-progress", "verification", "closed", "overdue"]} active={status} onChange={setStatus}
        count={(v) => (v === "all" ? capas.length : capas.filter((c) => c.status === v).length)} />

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
            {!filtered.length && <div className="p-8 text-center text-sm text-muted-foreground">No CAPAs.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-5">
            {active ? (
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
                      {active.ncrCode ? ` · from ${active.ncrCode}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Effectiveness</div>
                    <div className="font-display text-2xl font-semibold">{active.effectivenessPct}%</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => show(capaDocument(active))}>
                    <Printer className="h-4 w-4" />Print 8D
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit("capas", active as unknown as Record<string, unknown>, "Edit CAPA")}>Edit</Button>
                  {active.status !== "closed" ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { advanceCapa(active.id); toast.success(`${active.code} advanced`); }}>Advance Stage</Button>
                      <Button size="sm" className="gap-1.5" onClick={() => { closeCapa(active.id); toast.success(`${active.code} closed — linked NCR closed`); }}>
                        <CheckCircle2 className="h-4 w-4" />Verify & Close
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { reopenCapa(active.id); toast.success(`${active.code} reopened`); }}>Reopen</Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => askDelete("capas", active.id, active.code)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

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
                    <div className="mt-1 text-sm">{active.team.join(" · ") || "—"}</div>
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
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">Open a CAPA to begin an 8D investigation.</div>
            )}
          </CardContent>
        </Card>
      </div>
      {dialogs}
      {dialog}
    </div>
  );
}

/* ============== CALIBRATION ============== */
function CalibrationView() {
  const gauges = useQuality((s) => s.gauges);
  const lookups = useQualityOptions();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [calib, setCalib] = useState<{ id: string; code: string; initial: Record<string, unknown> } | null>(null);
  const { openNew, openEdit, askDelete, dialogs } = useCrud(QUALITY_SCHEMAS, upsertQuality, deleteQuality, lookups);
  const { show, dialog } = useQualityDoc();

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return gauges.filter((g) => (status === "all" || g.status === status)
      && (!q || [g.code, g.name, g.type, g.location, g.provider].some((x) => x.toLowerCase().includes(l))));
  }, [gauges, q, status]);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Gauge & Instrument Calibration" newLabel="New Gauge"
        description="Gauge master with least count, calibration frequency, last / next due dates and NABL / provider certificate tracking."
        q={q} setQ={setQ}
        extra={
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => { refreshCalibrationStatuses(); toast.success("Calibration due dates re-evaluated"); }}>
            <RefreshCw className="h-4 w-4" />Refresh Due
          </Button>
        }
        onExport={() => exportCsv("gauges", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("gauges", "New Gauge", { frequencyDays: 365, status: "in-cal", lastCalibrated: new Date().toISOString() })} />

      <FilterChips values={["all", "in-cal", "due-soon", "overdue", "out-of-service"]} active={status} onChange={setStatus}
        count={(v) => (v === "all" ? gauges.length : gauges.filter((g) => g.status === v).length)} />

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
                <th className="p-3 text-left w-44">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((g) => {
                const days = Math.round((new Date(g.nextDue).getTime() - Date.now()) / 86400000);
                const pct = Math.max(0, Math.min(100, Math.round(((g.frequencyDays - Math.max(0, days)) / g.frequencyDays) * 100)));
                return (
                  <tr key={g.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-mono text-xs text-muted-foreground">{g.code}</div>
                      <div className="font-medium">{g.name}</div>
                    </td>
                    <td className="p-3 text-xs">{g.type}</td>
                    <td className="p-3 text-xs">
                      <div>{g.location}</div>
                      <div className="text-[10px] text-muted-foreground">{g.owner}</div>
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      <div>{g.range}</div>
                      <div className="text-muted-foreground">{g.leastCount}</div>
                    </td>
                    <td className="p-3 text-xs">{shortDate(g.lastCalibrated)}</td>
                    <td className="p-3 text-xs">
                      <div className={days < 0 ? "font-medium text-rose-600 dark:text-rose-300" : days < 45 ? "font-medium text-amber-600 dark:text-amber-300" : ""}>
                        {shortDate(g.nextDue)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`}</div>
                    </td>
                    <td className="p-3"><Progress value={pct} /></td>
                    <td className="p-3 text-xs">
                      <div>{g.provider}</div>
                      {g.certificateNo && <div className="font-mono text-[10px] text-muted-foreground">{g.certificateNo}</div>}
                    </td>
                    <td className="p-3">
                      <StatusPill status={g.status === "in-cal" ? "approved" : g.status === "due-soon" ? "pending" : g.status === "overdue" ? "rejected" : "on-hold"} />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                          onClick={() => setCalib({
                            id: g.id, code: g.code,
                            initial: { lastCalibrated: new Date().toISOString(), provider: g.provider, certificateNo: g.certificateNo ?? "", frequencyDays: g.frequencyDays },
                          })}>Calibrate</Button>
                        <RowActions
                          onEdit={() => openEdit("gauges", g as unknown as Record<string, unknown>, "Edit Gauge")}
                          onDelete={() => askDelete("gauges", g.id, g.code)}
                          extra={
                            <>
                              <DropdownMenuItem onClick={() => show(calibrationDocument(g))}>
                                <FileText className="mr-2 h-4 w-4" /> Certificate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setGaugeStatus(g.id, g.status === "out-of-service" ? "in-cal" : "out-of-service");
                                  toast.success(g.status === "out-of-service" ? `${g.code} back in service` : `${g.code} marked out of service`);
                                }}>
                                <AlertOctagon className="mr-2 h-4 w-4" />
                                {g.status === "out-of-service" ? "Return to service" : "Out of service"}
                              </DropdownMenuItem>
                            </>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={10} className="p-8 text-center text-sm text-muted-foreground">No gauges.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <RecordDialog
        open={!!calib}
        onOpenChange={(v) => !v && setCalib(null)}
        title={calib ? `Record Calibration — ${calib.code}` : ""}
        description="Logs the calibration event and reschedules the next due date automatically."
        fields={QUALITY_SCHEMAS.calibration}
        initial={calib?.initial}
        submitLabel="Record"
        onSubmit={(values) => {
          if (!calib) return;
          recordCalibration(calib.id, values as Parameters<typeof recordCalibration>[1]);
          toast.success(`${calib.code} calibration recorded`);
          setCalib(null);
        }}
      />
      {dialogs}
      {dialog}
    </div>
  );
}

/* ============== SUPPLIER QUALITY ============== */
function SuppliersView() {
  const suppliers = useQuality((s) => s.suppliers);
  const lookups = useQualityOptions();
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState<string>("all");
  const { openNew, openEdit, askDelete, dialogs } = useCrud(QUALITY_SCHEMAS, upsertQuality, deleteQuality, lookups);

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return suppliers.filter((s) => (grade === "all" || s.grade === grade)
      && (!q || [s.vendorCode, s.vendorName, s.category].some((x) => x.toLowerCase().includes(l))));
  }, [suppliers, q, grade]);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Supplier Quality Scorecard" newLabel="New Scorecard"
        description="Vendor performance derived from inspection results and open NCRs — acceptance, PPM, on-time delivery and responsiveness."
        q={q} setQ={setQ}
        extra={
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => { recomputeSupplierScores(); toast.success("Scorecards recalculated from live quality data"); }}>
            <RefreshCw className="h-4 w-4" />Recalculate
          </Button>
        }
        onExport={() => exportCsv("supplier-quality", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("suppliers", "New Supplier Scorecard", { lotsReceived: 0, lotsAccepted: 0, ppm: 0, otdPct: 100, ncrCount: 0, responseHours: 24, score: 100, grade: "A", trend: "flat" })} />

      <FilterChips values={["all", "A", "B", "C", "D"]} active={grade} onChange={setGrade}
        count={(v) => (v === "all" ? suppliers.length : suppliers.filter((s) => s.grade === v).length)} />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-right">Lots (Acc / Rec)</th>
                <th className="p-3 text-right">PPM</th>
                <th className="p-3 text-right">OTD %</th>
                <th className="p-3 text-right">Open NCRs</th>
                <th className="p-3 text-right">Response</th>
                <th className="p-3 text-left w-40">Score</th>
                <th className="p-3 text-left">Grade</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-mono text-[11px] text-muted-foreground">{s.vendorCode}</div>
                    <div className="font-medium">{s.vendorName}</div>
                  </td>
                  <td className="p-3 text-xs">{s.category}</td>
                  <td className="p-3 text-right font-mono text-xs">{s.lotsAccepted} / {s.lotsReceived}</td>
                  <td className="p-3 text-right font-mono text-xs">{s.ppm.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right font-mono text-xs">{s.otdPct}%</td>
                  <td className="p-3 text-right font-mono text-xs">{s.ncrCount}</td>
                  <td className="p-3 text-right font-mono text-xs">{s.responseHours}h</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><Progress value={s.score} /></div>
                      <span className="w-8 text-right font-mono text-[10px]">{s.score}</span>
                      {s.trend === "up" ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                        : s.trend === "down" ? <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-300" />
                        : <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusPill status={s.grade === "A" ? "approved" : s.grade === "B" ? "in-progress" : s.grade === "C" ? "pending" : "rejected"} />
                  </td>
                  <td className="p-3 text-right">
                    <RowActions
                      onEdit={() => openEdit("suppliers", s as unknown as Record<string, unknown>, "Edit Supplier Scorecard")}
                      onDelete={() => askDelete("suppliers", s.id, s.vendorName)}
                    />
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={10} className="p-8 text-center text-sm text-muted-foreground">No supplier scorecards.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {dialogs}
    </div>
  );
}
