import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Download, Award, CheckCircle2, FileText, XCircle, FilePlus2, Send, Bell, History, Scale } from "lucide-react";
import {
  useProcurement, upsertProcurement, deleteProcurement, setRequisitionStatus,
  addPoAmendment, upsertBid, removeBid, sendRfqToVendors, setRfqStatus,
  awardBidAndCreatePo, procurementAlerts,
} from "@/lib/procurement/store";
import { useProjectsStore } from "@/lib/projects/store";
import { SendRfqDialog } from "@/components/procurement/send-rfq-dialog";
import { PROCUREMENT_SCHEMAS } from "@/lib/procurement/schemas";
import { RowActions, useCrud } from "@/components/crud-kit";
import { exportCsv } from "@/lib/crud";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { StatusPill, Progress, fmtCompact, shortDate } from "@/components/projects/shared";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InvoicePreviewDialog } from "@/components/invoice-preview-dialog";
import { RecordDialog } from "@/components/record-dialog";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog";
import { poDocument, quotationDocument, invoiceDocument, requisitionDocument, rfqDocument, documentEmailBody, renderDocumentHtml, type BusinessDocument } from "@/lib/procurement/documents";
import type { ComboOption } from "@/components/combobox-field";

export const Route = createFileRoute("/_authenticated/procurement/$section")({
  head: () => ({ meta: [{ title: "Procurement · Faith Automation ERP" }] }),
  component: SectionView,
  notFoundComponent: () => (
    <div className="p-12 text-center text-sm text-muted-foreground">Section not found.</div>
  ),
});

const VALID = new Set(["vendors", "requisitions", "rfqs", "orders", "grn", "spend"]);

function SectionView() {
  const { section } = Route.useParams();
  if (!VALID.has(section)) throw notFound();
  if (section === "vendors") return <VendorsView />;
  if (section === "requisitions") return <RequisitionsView />;
  if (section === "rfqs") return <RfqView />;
  if (section === "orders") return <PoView />;
  if (section === "grn") return <GrnView />;
  return <SpendView />;
}

function Toolbar({ title, description, q, setQ, extra, onNew, onExport, newLabel = "New" }: {
  title: string; description: string; q: string; setQ: (v: string) => void;
  extra?: React.ReactNode; onNew?: () => void; onExport?: () => void; newLabel?: string;
}) {
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


/** Vendor master as searchable dropdown options. */
function useVendorOptions(): ComboOption[] {
  const vendors = useProcurement((s) => s.vendors);
  return useMemo(
    () =>
      vendors
        .filter((v) => v.active)
        .map((v) => ({ value: v.name, label: v.name, hint: `${v.code} · ${v.category}` })),
    [vendors],
  );
}

/** Purchase orders as searchable dropdown options; selecting one fills the vendor. */
function usePoOptions(): ComboOption[] {
  const pos = useProcurement((s) => s.pos);
  return useMemo(
    () =>
      pos.map((p) => ({
        value: p.code,
        label: p.code,
        hint: `${p.vendorName} · ${p.currency} ${p.amount.toLocaleString("en-IN")}`,
        patch: { vendorName: p.vendorName },
      })),
    [pos],
  );
}

/** Active projects from the Project Master as searchable options. */
function useProjectOptions(): ComboOption[] {
  const projects = useProjectsStore((s) => s.projects);
  return useMemo(
    () =>
      projects
        .filter((p) => !["closed", "cancelled"].includes(String(p.status)))
        .map((p) => ({
          value: p.code,
          label: p.code,
          hint: `${p.name} · ${p.customerName}`,
          patch: { projectName: p.name, customerName: p.customerName },
        })),
    [projects],
  );
}

/** Approved purchase requisitions as searchable options. */
function usePrOptions(): ComboOption[] {
  const prs = useProcurement((s) => s.requisitions);
  return useMemo(
    () =>
      prs.map((p) => ({
        value: p.code,
        label: p.code,
        hint: `${p.title} · ${p.status}`,
        patch: { title: p.title, projectCode: p.projectCode, buyer: p.requestedBy },
      })),
    [prs],
  );
}

function useRfqOptions(): ComboOption[] {
  const rfqs = useProcurement((s) => s.rfqs);
  return useMemo(
    () => rfqs.map((r) => ({ value: r.code, label: r.code, hint: `${r.title} · ${r.status}`, patch: { projectCode: r.projectCode } })),
    [rfqs],
  );
}

function useBuyerOptions(): ComboOption[] {
  const pos = useProcurement((s) => s.pos);
  const rfqs = useProcurement((s) => s.rfqs);
  return useMemo(() => {
    const names = new Set<string>(["N. Verma", "S. Rao", "A. Menon"]);
    pos.forEach((p) => p.buyer && names.add(p.buyer));
    rfqs.forEach((r) => r.buyer && names.add(r.buyer));
    return [...names].map((n) => ({ value: n, label: n }));
  }, [pos, rfqs]);
}

/** Pending-action notifications for procurement users. */
function AlertsBanner({ scope }: { scope: "pr" | "rfq" }) {
  const state = useProcurement((s) => s);
  const alerts = useMemo(
    () => procurementAlerts(state).filter((a) => (scope === "pr" ? a.id.startsWith("pr") : a.id.startsWith("rfq"))),
    [state, scope],
  );
  if (!alerts.length) return null;
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="space-y-1.5 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          <Bell className="h-3.5 w-3.5" />Action centre · {alerts.length} pending notification{alerts.length === 1 ? "" : "s"}
        </div>
        {alerts.slice(0, 5).map((a) => (
          <div key={a.id} className="text-xs text-muted-foreground">• {a.text}</div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Audit trail / document history strip. */
function AuditTrail({ entries }: { entries?: Array<{ id: string; at: string; by: string; action: string; note?: string }> }) {
  if (!entries?.length) return null;
  return (
    <details className="rounded-lg border bg-muted/20 p-2 text-xs">
      <summary className="cursor-pointer select-none text-muted-foreground">
        <History className="mr-1 inline h-3 w-3" />Audit trail ({entries.length})
      </summary>
      <div className="mt-2 space-y-1">
        {[...entries].reverse().map((e) => (
          <div key={e.id} className="flex gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">{shortDate(e.at)}</span>
            <span className="font-medium">{e.action}</span>
            <span className="text-muted-foreground">{e.by}{e.note ? ` · ${e.note}` : ""}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

/** Reusable view / print / download / email action row for a business document. */
function DocActions({ doc, onView }: { doc: BusinessDocument; onView: () => void }) {
  const print = () => {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return toast.error("Please allow pop-ups to print this document");
    w.document.write(renderDocumentHtml(doc));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([renderDocumentHtml(doc)], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${doc.docNo} downloaded`);
  };
  const email = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(`${doc.kind} ${doc.docNo}`)}&body=${encodeURIComponent(documentEmailBody(doc))}`;
  };
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={onView}>
        <FileText className="h-3.5 w-3.5" />View
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={print}>Print</Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={download}>Download</Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={email}>Email</Button>
    </div>
  );
}

/* ============== VENDORS ============== */
function VendorsView() {
  const vendors = useProcurement((s) => s.vendors);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const { openNew, openEdit, askDelete, dialogs } = useCrud(PROCUREMENT_SCHEMAS, upsertProcurement, deleteProcurement);

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return vendors.filter((v) => (status === "all" || v.qualification === status)
      && (!q || [v.name, v.code, v.category, v.city].some((x) => x.toLowerCase().includes(l))));
  }, [vendors, q, status]);

  const filters = [
    { k: "all", label: "All", n: vendors.length },
    { k: "qualified", label: "Qualified", n: vendors.filter((v) => v.qualification === "qualified").length },
    { k: "in-review", label: "In Review", n: vendors.filter((v) => v.qualification === "in-review").length },
    { k: "conditional", label: "Conditional", n: vendors.filter((v) => v.qualification === "conditional").length },
    { k: "blacklisted", label: "Blacklisted", n: vendors.filter((v) => v.qualification === "blacklisted").length },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar
        title="Vendor Master & Qualification"
        description="Approved and prospective vendors with performance, ratings and audit trail."
        q={q} setQ={setQ} newLabel="New Vendor"
        onExport={() => exportCsv("vendors", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("vendors", "New Vendor", { rating: "Unrated", qualification: "draft", country: "IN", onTimePct: 0, qualityPct: 0, leadTimeDays: 14, spendYtd: 0 })}
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f.k} onClick={() => setStatus(f.k)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${status === f.k ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {f.label}<Badge variant="secondary" className="border-0 text-[10px]">{f.n}</Badge>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Rating</th>
                <th className="p-3 text-left">Qualification</th>
                <th className="p-3 text-left">OTD / Quality</th>
                <th className="p-3 text-right">Lead</th>
                <th className="p-3 text-right">Spend YTD</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{v.code}</td>
                  <td className="p-3">
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-muted-foreground">{v.contact} · {v.email}</div>
                  </td>
                  <td className="p-3"><Badge variant="outline">{v.category}</Badge></td>
                  <td className="p-3 text-xs">{v.city}, {v.country}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className={v.rating === "A" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0" : v.rating === "B" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-0"}>{v.rating}</Badge>
                  </td>
                  <td className="p-3"><StatusPill status={v.qualification === "qualified" ? "approved" : v.qualification === "in-review" ? "pending" : v.qualification === "blacklisted" ? "rejected" : v.qualification === "conditional" ? "on-hold" : "draft"} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono w-8">{v.onTimePct}%</span>
                      <div className="w-16"><Progress value={v.onTimePct} /></div>
                      <span className="font-mono w-8">{v.qualityPct}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono text-xs">{v.leadTimeDays}d</td>
                  <td className="p-3 text-right font-mono">{fmtCompact(v.spendYtd)}</td>
                  <td className="p-3 text-right">
                    <RowActions
                      onEdit={() => openEdit("vendors", { ...v, certificationsText: (v.certifications ?? []).join(", ") } as unknown as Record<string, unknown>, "Edit Vendor")}
                      onDelete={() => askDelete("vendors", v.id, v.name)}
                    />
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={10} className="p-8 text-center text-sm text-muted-foreground">No vendors match this filter.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {dialogs}
    </div>
  );
}

/* ============== REQUISITIONS ============== */
function RequisitionsView() {
  const prs = useProcurement((s) => s.requisitions);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const projectOptions = useProjectOptions();
  const [docFor, setDocFor] = useState<BusinessDocument | null>(null);
  const { openNew, openEdit, askDelete, dialogs } = useCrud(
    PROCUREMENT_SCHEMAS, upsertProcurement, deleteProcurement, { projects: projectOptions },
  );

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return prs.filter((p) => (status === "all" || p.status === status)
      && (!q || [p.code, p.title, p.department, p.requestedBy].some((x) => x.toLowerCase().includes(l))));
  }, [prs, q, status]);

  const filters = ["all", "draft", "pending", "approved", "converted", "rejected"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar
        title="Purchase Requisition Approvals"
        description="Requests from Engineering, Production and Quality routed through a multi-step approval workflow."
        q={q} setQ={setQ} newLabel="New Requisition"
        onExport={() => exportCsv("requisitions", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("requisitions", "New Purchase Requisition", { status: "draft", priority: "medium", department: "Engineering", totalEst: 0, needBy: new Date().toISOString() })}
      />

      <AlertsBanner scope="pr" />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setStatus(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${status === f ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {f} <span className="ml-1 text-[10px] opacity-60">{f === "all" ? prs.length : prs.filter((p) => p.status === f).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                    <StatusPill status={r.priority} />
                    {r.projectCode && <Badge variant="outline" className="text-[10px]">{r.projectCode}</Badge>}
                  </div>
                  <div className="mt-1 font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.department} · {r.requestedBy} · need by {shortDate(r.needBy)}</div>
                  {r.projectName && (
                    <div className="text-xs text-muted-foreground">Project: {r.projectName}{r.customerName ? ` · ${r.customerName}` : ""}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <StatusPill status={r.status} />
                  <RowActions
                    onEdit={() => openEdit("requisitions", r as unknown as Record<string, unknown>, "Edit Requisition")}
                    onDelete={() => askDelete("requisitions", r.id, r.code)}
                  />
                </div>
              </div>

              {!!r.lines.length && (
                <div className="rounded-lg border bg-muted/20 divide-y">
                  {r.lines.map((l) => (
                    <div key={l.id} className="flex items-center justify-between p-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-mono text-muted-foreground">{l.itemCode}</div>
                        <div className="truncate">{l.description}</div>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <div>{l.qty} {l.uom}</div>
                        <div className="text-muted-foreground">{fmtCompact(l.estRate * l.qty)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-3 text-xs">
                <div className="text-muted-foreground">Approver: <span className="text-foreground">{r.approver}</span></div>
                <div className="font-mono text-sm font-semibold">{fmtCompact(r.totalEst)}</div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <DocActions doc={requisitionDocument(r)} onView={() => setDocFor(requisitionDocument(r))} />
              </div>
              <AuditTrail entries={r.audit} />
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1"
                    onClick={() => { setRequisitionStatus(r.id, "rejected"); toast.success(`${r.code} rejected`); }}>
                    <XCircle className="h-4 w-4" />Reject
                  </Button>
                  <Button size="sm" className="flex-1 gap-1"
                    onClick={() => { setRequisitionStatus(r.id, "approved"); toast.success(`${r.code} approved`); }}>
                    <CheckCircle2 className="h-4 w-4" />Approve
                  </Button>
                </div>
              )}
              {r.status === "approved" && (
                <Button size="sm" variant="outline" className="w-full gap-1"
                  onClick={() => {
                    upsertProcurement("rfqs", {
                      code: `RFQ-${Math.floor(3400 + Math.random() * 500)}`,
                      title: r.title,
                      requisitionCode: r.code,
                      projectCode: r.projectCode,
                      buyer: r.requestedBy,
                      issuedAt: new Date().toISOString(),
                      dueAt: new Date(Date.now() + 7 * 864e5).toISOString(),
                      status: "issued",
                      vendorCount: 0,
                    });
                    setRequisitionStatus(r.id, "converted");
                    toast.success(`RFQ raised from ${r.code}`);
                  }}>
                  <FilePlus2 className="h-4 w-4" />Convert to RFQ
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {!rows.length && <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No requisitions.</div>}
      </div>
      {dialogs}
      <DocumentPreviewDialog open={!!docFor} onOpenChange={(v) => !v && setDocFor(null)} doc={docFor} />
    </div>
  );
}

/* ============== RFQ ============== */
function RfqView() {
  const rfqs = useProcurement((s) => s.rfqs);
  const [q, setQ] = useState("");
  const vendorOptions = useVendorOptions();
  const { openNew, openEdit, askDelete, dialogs } = useCrud(PROCUREMENT_SCHEMAS, upsertProcurement, deleteProcurement, { vendors: vendorOptions });
  const [bidFor, setBidFor] = useState<{ rfqId: string; bid?: Record<string, unknown> } | null>(null);
  const [docFor, setDocFor] = useState<BusinessDocument | null>(null);
  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return rfqs.filter((r) => !q || [r.code, r.title, r.buyer].some((x) => x.toLowerCase().includes(l)));
  }, [rfqs, q]);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar
        title="RFQ → PO Workflow"
        description="Issue enquiries, capture responses, evaluate on price/lead/quality and award a purchase order."
        q={q} setQ={setQ} newLabel="New RFQ"
        onExport={() => exportCsv("rfqs", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("rfqs", "New RFQ", { status: "draft", vendorCount: 0, issuedAt: new Date().toISOString(), dueAt: new Date(Date.now() + 7 * 864e5).toISOString() })}
      />

      <div className="space-y-3">
        {rows.map((r) => {
          const best = [...r.bids].sort((a, b) => b.score - a.score)[0];
          return (
            <Card key={r.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                    <StatusPill status={r.status === "responses" ? "in-progress" : r.status === "awarded" ? "approved" : r.status === "cancelled" ? "rejected" : r.status === "issued" ? "open" : r.status} />
                    {r.projectCode && <Badge variant="outline" className="text-[10px]">{r.projectCode}</Badge>}
                    {r.poCode && <Badge variant="secondary" className="text-[10px]"><Award className="h-3 w-3 mr-1" />{r.poCode}</Badge>}
                  </div>
                  <CardTitle className="mt-1 text-base">{r.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Buyer {r.buyer} · issued {shortDate(r.issuedAt)} · due {shortDate(r.dueAt)} · {r.vendorCount} vendors</p>
                </div>
                <div className="flex items-start gap-2">
                  {best && <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Best bid</div>
                    <div className="font-display text-lg font-semibold">{fmtCompact(best.amount)}</div>
                    <div className="text-xs text-muted-foreground">{best.vendorName}</div>
                  </div>}
                  <RowActions
                    onEdit={() => openEdit("rfqs", r as unknown as Record<string, unknown>, "Edit RFQ")}
                    onDelete={() => askDelete("rfqs", r.id, r.code)}
                    extra={
                      <DropdownMenuItem onClick={() => setBidFor({ rfqId: r.id })}>
                        <Plus className="mr-2 h-4 w-4" /> Add bid
                      </DropdownMenuItem>
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                {r.bids.length ? (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="p-2 text-left">Vendor</th>
                          <th className="p-2 text-right">Amount</th>
                          <th className="p-2 text-right">Lead</th>
                          <th className="p-2 text-left">Terms</th>
                          <th className="p-2 text-left">Score</th>
                          <th className="p-2"></th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {r.bids.map((b) => (
                          <tr key={b.vendorId} className={b.awarded ? "bg-emerald-500/5" : ""}>
                            <td className="p-2 font-medium">{b.vendorName}</td>
                            <td className="p-2 text-right font-mono">{fmtCompact(b.amount)}</td>
                            <td className="p-2 text-right font-mono text-xs">{b.leadTimeDays}d</td>
                            <td className="p-2 text-xs">{b.paymentTerms}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <div className="w-16"><Progress value={b.score} /></div>
                                <span className="font-mono text-xs">{b.score}</span>
                              </div>
                            </td>
                            <td className="p-2 text-right">
                              {b.awarded
                                ? <Badge className="bg-emerald-500/15 text-emerald-700 border-0"><Award className="h-3 w-3 mr-1" />Awarded</Badge>
                                : <Button size="sm" variant="outline" className="h-7"
                                    onClick={() => { awardBid(r.id, b.vendorId); toast.success(`${b.vendorName} awarded ${r.code}`); }}>
                                    Award
                                  </Button>}
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                                  onClick={() => setDocFor(quotationDocument(r, b))}>
                                  <FileText className="h-3.5 w-3.5" />Quotation
                                </Button>
                                <RowActions
                                  onEdit={() => setBidFor({ rfqId: r.id, bid: b as unknown as Record<string, unknown> })}
                                  onDelete={() => { removeBid(r.id, b.vendorId); toast.success("Bid removed"); }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    No vendor responses yet.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!rows.length && <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No RFQs.</div>}
      </div>
      {dialogs}
      <RecordDialog
        open={!!bidFor}
        onOpenChange={(v) => !v && setBidFor(null)}
        title={bidFor?.bid ? "Edit Bid" : "Add Vendor Bid"}
        fields={PROCUREMENT_SCHEMAS.bids}
        initial={bidFor?.bid}
        dynamicOptions={{ vendors: vendorOptions }}
        onSubmit={(values) => {
          if (!bidFor) return;
          upsertBid(bidFor.rfqId, { ...(bidFor.bid ?? {}), ...values });
          toast.success(bidFor.bid ? "Bid updated" : "Bid captured");
          setBidFor(null);
        }}
      />
      <DocumentPreviewDialog open={!!docFor} onOpenChange={(v) => !v && setDocFor(null)} doc={docFor} />
    </div>
  );
}

/* ============== PURCHASE ORDERS ============== */
function PoView() {
  const pos = useProcurement((s) => s.pos);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const vendorOptions = useVendorOptions();
  const { openNew, openEdit, askDelete, dialogs } = useCrud(PROCUREMENT_SCHEMAS, upsertProcurement, deleteProcurement, { vendors: vendorOptions });
  const [amendFor, setAmendFor] = useState<{ id: string; code: string; amount: number } | null>(null);
  const [docFor, setDocFor] = useState<BusinessDocument | null>(null);

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return pos.filter((p) => (status === "all" || p.status === status)
      && (!q || [p.code, p.vendorName, p.buyer].some((x) => x.toLowerCase().includes(l))));
  }, [pos, q, status]);

  const filters = ["all", "pending", "sent", "acknowledged", "partial", "received", "closed"];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar
        title="Purchase Orders & Amendments"
        description="Full PO lifecycle — from creation and approval to acknowledgement, receipt and closure with audit-tracked amendments."
        q={q} setQ={setQ} newLabel="New PO"
        onExport={() => exportCsv("purchase-orders", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("pos", "New Purchase Order", { status: "draft", currency: "INR", received: 0, invoiced: 0, amount: 0, incoterms: "DAP Plant", paymentTerms: "Net 30", promisedDate: new Date().toISOString() })}
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setStatus(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${status === f ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {f}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">PO</th>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Project</th>
                <th className="p-3 text-left">Buyer</th>
                <th className="p-3 text-left">Promised</th>
                <th className="p-3 text-right">Value</th>
                <th className="p-3 text-left w-40">Receipt</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-center">Amend</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p) => {
                const pct = p.amount ? Math.round((p.received / p.amount) * 100) : 0;
                const overdue = new Date(p.promisedDate) < new Date() && !["received", "closed", "cancelled"].includes(p.status);
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-mono text-xs">{p.code}</div>
                      <div className="text-[10px] text-muted-foreground">{p.currency} · {p.incoterms}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{p.vendorName}</div>
                      {p.rfqCode && <div className="text-xs text-muted-foreground">from {p.rfqCode}</div>}
                    </td>
                    <td className="p-3 text-xs">{p.projectCode ?? "—"}</td>
                    <td className="p-3 text-xs">{p.buyer}</td>
                    <td className="p-3 text-xs">
                      <span className={overdue ? "text-rose-600 dark:text-rose-400 font-medium" : ""}>{shortDate(p.promisedDate)}</span>
                    </td>
                    <td className="p-3 text-right font-mono">{fmtCompact(p.amount)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><Progress value={pct} /></div>
                        <span className="w-8 text-right font-mono text-xs">{pct}%</span>
                      </div>
                    </td>
                    <td className="p-3"><StatusPill status={p.status === "received" ? "achieved" : p.status === "partial" ? "in-progress" : p.status === "closed" ? "closed" : p.status === "sent" || p.status === "acknowledged" ? "open" : p.status} /></td>
                    <td className="p-3 text-center">
                      {p.amendments.length
                        ? <Badge variant="secondary" title={p.amendments.map((a) => a.reason).join(" · ")}>{p.amendments.length}</Badge>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" title="View / print / email PO"
                        onClick={() => setDocFor(poDocument(p))}>
                        <FileText className="h-3.5 w-3.5" />PO Doc
                      </Button>
                      <RowActions
                        onEdit={() => openEdit("pos", p as unknown as Record<string, unknown>, "Edit Purchase Order")}
                        onDelete={() => askDelete("pos", p.id, p.code)}
                        extra={
                          <DropdownMenuItem onClick={() => setAmendFor({ id: p.id, code: p.code, amount: p.amount })}>
                            <FilePlus2 className="mr-2 h-4 w-4" /> Amend
                          </DropdownMenuItem>
                        }
                      />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={10} className="p-8 text-center text-sm text-muted-foreground">No purchase orders.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {dialogs}
      <RecordDialog
        open={!!amendFor}
        onOpenChange={(v) => !v && setAmendFor(null)}
        title={`Amend ${amendFor?.code ?? ""}`}
        fields={PROCUREMENT_SCHEMAS.amendments}
        initial={amendFor ? { fromValue: amendFor.amount, toValue: amendFor.amount, by: "N. Verma" } : undefined}
        onSubmit={(values) => {
          if (!amendFor) return;
          addPoAmendment(amendFor.id, {
            by: String(values.by ?? ""),
            reason: String(values.reason ?? ""),
            fromValue: Number(values.fromValue ?? 0),
            toValue: Number(values.toValue ?? 0),
          });
          toast.success("Amendment recorded");
          setAmendFor(null);
        }}
      />
      <DocumentPreviewDialog open={!!docFor} onOpenChange={(v) => !v && setDocFor(null)} doc={docFor} />
    </div>
  );
}

/* ============== GRN & INVOICE MATCH ============== */
function GrnView() {
  const grns = useProcurement((s) => s.grns);
  const pos = useProcurement((s) => s.pos);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<{ href: string; invoiceNo: string } | null>(null);
  const [docFor, setDocFor] = useState<BusinessDocument | null>(null);
  const vendorOptions = useVendorOptions();
  const poOptions = usePoOptions();
  const { openNew, openEdit, askDelete, dialogs } = useCrud(PROCUREMENT_SCHEMAS, upsertProcurement, deleteProcurement, { vendors: vendorOptions, poCodes: poOptions });
  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return grns.filter((g) => !q || [g.code, g.poCode, g.vendorName, g.invoiceNo ?? ""].some((x) => x.toLowerCase().includes(l)));
  }, [grns, q]);


  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar
        title="Goods Receipt & Invoice Matching"
        description="Post receipts against POs, run quality check, and reconcile invoices with 3-way matching (PO ↔ GRN ↔ Invoice)."
        q={q} setQ={setQ} newLabel="New GRN"
        onExport={() => exportCsv("grns", rows as unknown as Array<Record<string, unknown>>)}
        onNew={() => openNew("grns", "New Goods Receipt", { status: "draft", invoiceMatch: "unmatched", qcResult: "pending", amount: 0, receivedBy: "Stores", receivedAt: new Date().toISOString() })}
      />

      <div className="space-y-3">
        {rows.map((g) => (
          <Card key={g.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{g.code}</span>
                    <Badge variant="secondary" className="text-[10px]">{g.poCode}</Badge>
                    <StatusPill status={g.status === "posted" ? "achieved" : g.status === "quality-hold" ? "on-hold" : g.status === "rejected" ? "rejected" : "draft"} />
                    {g.qcResult && <Badge variant="outline" className="text-[10px]">QC: {g.qcResult}</Badge>}
                    <RowActions
                      onEdit={() => openEdit("grns", g as unknown as Record<string, unknown>, "Edit Goods Receipt")}
                      onDelete={() => askDelete("grns", g.id, g.code)}
                    />
                  </div>
                  <div className="mt-1 font-medium">{g.vendorName}</div>
                  <div className="text-xs text-muted-foreground">Received {shortDate(g.receivedAt)} · {g.receivedBy}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount</div>
                  <div className="font-display text-lg font-semibold">{fmtCompact(g.amount)}</div>
                  <div className="mt-1"><MatchBadge match={g.invoiceMatch} /></div>
                  <button
                    type="button"
                    onClick={() => setDocFor(invoiceDocument(g, pos.find((p) => p.code === g.poCode)))}
                    className="text-[11px] mt-0.5 flex items-center justify-end gap-1 text-primary hover:underline ml-auto"
                  >
                    <FileText className="h-3 w-3" />{g.invoiceNo || `INV-${g.code}`}
                  </button>
                  {(() => {
                    const pdfMap: Record<string, string> = { "INV/TS/24-01144": "/invoices/INV-TS-24-01144.pdf" };
                    const href = (g as unknown as { invoiceFile?: string }).invoiceFile || (g.invoiceNo ? pdfMap[g.invoiceNo] : undefined);
                    return href ? (
                      <button
                        type="button"
                        onClick={() => setPreview({ href, invoiceNo: g.invoiceNo || g.code })}
                        className="text-[11px] mt-0.5 flex items-center justify-end gap-1 text-muted-foreground hover:text-primary hover:underline ml-auto"
                      >
                        <FileText className="h-3 w-3" />Scanned PDF copy
                      </button>
                    ) : null;
                  })()}
                </div>
              </div>

              {!!g.lines.length && (
                <div className="mt-3 rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left">Item</th>
                        <th className="p-2 text-right">Ordered</th>
                        <th className="p-2 text-right">Received</th>
                        <th className="p-2 text-right">Accepted</th>
                        <th className="p-2 text-right">Rejected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {g.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="p-2"><span className="font-mono text-muted-foreground mr-2">{l.itemCode}</span>{l.description}</td>
                          <td className="p-2 text-right font-mono">{l.orderedQty}</td>
                          <td className="p-2 text-right font-mono">{l.receivedQty}</td>
                          <td className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400">{l.acceptedQty}</td>
                          <td className="p-2 text-right font-mono text-rose-600 dark:text-rose-400">{l.rejectedQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs">
                <MatchStep label="PO" done />
                <div className="h-px flex-1 bg-border" />
                <MatchStep label="GRN" done={g.status === "posted"} />
                <div className="h-px flex-1 bg-border" />
                <MatchStep label="Invoice" done={g.invoiceMatch === "matched" || g.invoiceMatch === "3-way-matched" || g.invoiceMatch === "paid"} />
                <div className="h-px flex-1 bg-border" />
                <MatchStep label="Paid" done={g.invoiceMatch === "paid"} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!rows.length && <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No goods receipts.</div>}
      {dialogs}
      <InvoicePreviewDialog
        open={!!preview}
        onOpenChange={(v: boolean) => !v && setPreview(null)}
        href={preview?.href ?? ""}
        invoiceNo={preview?.invoiceNo ?? ""}
      />
      <DocumentPreviewDialog open={!!docFor} onOpenChange={(v) => !v && setDocFor(null)} doc={docFor} />
    </div>
  );
}


function MatchBadge({ match }: { match: string }) {
  const map: Record<string, string> = {
    "unmatched": "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
    "matched": "bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-500/30",
    "3-way-matched": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
    "hold": "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30",
    "paid": "bg-slate-500/15 text-slate-700 dark:text-slate-300 ring-slate-500/30",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${map[match]}`}>{match.replace("-", " ")}</span>;
}

function MatchStep({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${done ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
      {label}
    </div>
  );
}

/* ============== SPEND ANALYTICS ============== */
function SpendView() {
  const s = useProcurement((s) => s);
  const [q, setQ] = useState("");

  const byCategory = Object.entries(
    s.vendors.reduce<Record<string, number>>((a, v) => ((a[v.category] = (a[v.category] || 0) + v.spendYtd), a), {}),
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const byCountry = Object.entries(
    s.vendors.reduce<Record<string, number>>((a, v) => ((a[v.country] = (a[v.country] || 0) + v.spendYtd), a), {}),
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const total = s.vendors.reduce((a, v) => a + v.spendYtd, 0);
  const topN = [...s.vendors].sort((a, b) => b.spendYtd - a.spendYtd).slice(0, 8);

  const rows = topN.filter((v) => !q || v.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar title="Spend Analytics" description="Categorised spend, country mix, vendor concentration and savings vs. plan." q={q} setQ={setQ} />

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { l: "Total Spend YTD", v: fmtCompact(total) },
          { l: "Vendors Active", v: String(s.vendors.filter((v) => v.spendYtd > 0).length) },
          { l: "Top-5 Concentration", v: `${Math.round(topN.slice(0, 5).reduce((a, v) => a + v.spendYtd, 0) / total * 100)}%` },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.l}</div>
              <div className="mt-2 font-display text-3xl font-semibold">{k.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Spend by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(v as number)} />
                  <Tooltip formatter={(v: number) => fmtCompact(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(217 91% 60%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Spend by Country</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCountry}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(v as number)} />
                  <Tooltip formatter={(v: number) => fmtCompact(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(38 92% 50%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="font-display text-base">Vendor Pareto — Top 8 by Spend</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-right">Spend</th>
                <th className="p-3 text-left w-64">Share</th>
                <th className="p-3 text-right">OTD</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((v) => {
                const share = total ? Math.round((v.spendYtd / total) * 100) : 0;
                return (
                  <tr key={v.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{v.name}</td>
                    <td className="p-3"><Badge variant="outline">{v.category}</Badge></td>
                    <td className="p-3 text-right font-mono">{fmtCompact(v.spendYtd)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><Progress value={share} /></div>
                        <span className="w-10 text-right font-mono text-xs">{share}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-xs">{v.onTimePct}%</td>
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
