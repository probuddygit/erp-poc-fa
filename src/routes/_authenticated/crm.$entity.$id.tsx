import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Ban,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Mail,
  MessageSquare,
  Paperclip,
  Pencil,
  Printer,
  Send,
  Sparkles,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  addDocument,
  addEmail,
  crm,
  deleteRecord,
  logActivity,
  rejectApproval,
  removeDocument,
  upsertRecord,
  useCrm,
} from "@/lib/crm/store";
import {
  cancelRecord,
  convertRecord,
  duplicateRecord,
  leadScore,
  nextBestActions,
  opportunityHealth,
  quotationTotals,
  advanceLifecycle,
  runLifecycleAutomation,

  CONVERSION_LABEL,
} from "@/lib/crm/workflow";
import { LIFECYCLE, advanceLabel, currentStatus, statusLabel } from "@/lib/crm/lifecycle";
import { crmDocument, crmMailto } from "@/lib/crm/documents";
import { useCrmOptions } from "@/lib/crm/options";
import { QualityDocDialog } from "@/components/quality-doc-dialog";
import type { EntityKind } from "@/lib/crm/types";
import {
  StatusBadge,
  fmtCompact,
  fmtDate,
  fmtINR,
  relDate,
} from "@/components/crm/shared";
import { RecordDialog, ConfirmDialog } from "@/components/record-dialog";
import { CRM_SCHEMAS } from "@/lib/crm/schemas";
import { LineItemsPanel } from "@/components/crm/line-items";
import { FinanceReviewPanel } from "@/components/crm/finance-review";
import type { LineDocKind } from "@/lib/crm/revenue";



const VALID: EntityKind[] = [
  "customers",
  "leads",
  "opportunities",
  "rfqs",
  "proposals",
  "quotations",
  "oas",
  "salesOrders",
];

const LABELS: Record<EntityKind, string> = {
  customers: "Customer",
  leads: "Lead",
  opportunities: "Opportunity",
  rfqs: "RFQ",
  proposals: "Proposal",
  quotations: "Quotation",
  oas: "Order Acceptance",
  salesOrders: "Sales Order",
};


export const Route = createFileRoute("/_authenticated/crm/$entity/$id")({
  beforeLoad: ({ params }) => {
    if (!VALID.includes(params.entity as EntityKind)) throw notFound();
  },
  head: () => ({ meta: [{ title: "Detail · CRM · Faith Automation" }] }),
  component: EntityDetail,
});

function EntityDetail() {
  const { entity, id } = Route.useParams();
  const kind = entity as EntityKind;
  const navigate = useNavigate();
  const record = useCrm((s) => (s[kind] as Array<{ id: string }>).find((r) => r.id === id)) as
    | Record<string, unknown>
    | undefined;
  const allActivities = useCrm((s) => s.activities);
  const allNotes = useCrm((s) => s.notes);
  const allEmails = useCrm((s) => s.emails);
  const allDocuments = useCrm((s) => s.documents);
  const allApprovals = useCrm((s) => s.approvals);
  const allCustomers = useCrm((s) => s.customers);
  const activities = useMemo(
    () => allActivities.filter((a) => a.entityKind === kind && a.entityId === id),
    [allActivities, kind, id],
  );
  const notes = useMemo(
    () => allNotes.filter((n) => n.entityKind === kind && n.entityId === id),
    [allNotes, kind, id],
  );
  const emails = useMemo(
    () => allEmails.filter((e) => e.entityKind === kind && e.entityId === id),
    [allEmails, kind, id],
  );
  const documents = useMemo(
    () => allDocuments.filter((d) => d.entityKind === kind && d.entityId === id),
    [allDocuments, kind, id],
  );
  const approvals = useMemo(
    () => allApprovals.filter((a) => a.entityKind === kind && a.entityId === id),
    [allApprovals, kind, id],
  );
  const [noteBody, setNoteBody] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const crmOptions = useCrmOptions();


  if (!record) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Record not found.{" "}
        <Link to="/crm" className="text-primary hover:underline">
          Return to CRM
        </Link>
      </div>
    );
  }

  const title = (record.name as string) ?? (record.title as string);
  const code = record.code as string;
  const status = currentStatus(kind, record) || "—";
  const value = (record.value as number | undefined) ?? (record.estValue as number | undefined);

  const addNote = () => {
    if (!noteBody.trim()) return;
    crm.update((s) => {
      s.notes = [
        {
          id: crypto.randomUUID(),
          entityKind: kind,
          entityId: id,
          body: noteBody.trim(),
          author: "You",
          at: new Date().toISOString(),
        },
        ...s.notes,
      ];
    });
    logActivity(kind, id, "note", "Added a note");
    setNoteBody("");
    toast.success("Note added");
  };

  const doAdvance = () => {
    const res = advanceLifecycle(kind, id);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    if (res.projectCode) {
      toast.success(`OA approved — Sales Order raised and Project ${res.projectCode} provisioned`);
      return;
    }
    if (res.created) {
      toast.success(
        `${statusLabel(res.status)} — ${res.created.code} created automatically with all details carried forward`,
      );
      navigate({ to: "/crm/$entity/$id", params: { entity: res.created.kind, id: res.created.id } });
      return;
    }
    toast.success(`Moved to ${statusLabel(res.status)}`);
  };

  const doReject = () => {
    rejectApproval(kind, id, "Reviewed and rejected");
    toast.error("Rejected");
  };

  const doConvert = () => {
    const res = convertRecord(kind, id);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success(`${res.code} created — customer, contacts and history carried forward`);
    navigate({ to: "/crm/$entity/$id", params: { entity: res.kind, id: res.id } });
  };

  const doDuplicate = () => {
    const newId = duplicateRecord(kind, id);
    if (!newId) return;
    toast.success("Duplicated as a new draft");
    navigate({ to: "/crm/$entity/$id", params: { entity: kind, id: newId } });
  };

  const doEmail = () => {
    window.location.href = crmMailto(kind, record);
    addEmail(kind, id, {
      direction: "out",
      subject: `${LABELS[kind]} ${code} — ${title}`,
      from: "sales@faithautomation.com",
      to: (record.contactEmail as string) ?? (record.customerName as string) ?? "customer",
      preview: `${LABELS[kind]} ${code} shared with the customer.`,
    });
    toast.success("Email drafted and logged");
  };

  const nextLabel = LIFECYCLE[kind] ? advanceLabel(kind, status) : null;
  const isApprovalStep = /approval|validation/.test(status);
  const convertLabel = CONVERSION_LABEL[kind];
  const cancellable = !["customers"].includes(kind) && status !== "cancelled";
  const hasLines = ["proposals", "quotations", "oas", "salesOrders"].includes(kind);


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/crm/$entity", params: { entity: kind } })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{code}</span>
              <span>·</span>
              <span>{LABELS[kind]}</span>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {Boolean(record.customerName) && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {record.customerName as string}
                </span>
              )}
              {Boolean(record.owner) && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {record.owner as string}
                </span>
              )}
              {Boolean(record.createdAt) && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {fmtDate(record.createdAt as string)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {nextLabel && status !== "cancelled" && (
            <Button size="sm" className="gap-1.5" onClick={doAdvance}>
              <CheckCircle2 className="h-3.5 w-3.5" /> {nextLabel}
            </Button>
          )}
          {isApprovalStep && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={doReject}>
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
          )}
          {convertLabel && status !== "cancelled" && (
            <Button size="sm" className="gap-1.5" onClick={doConvert}>
              <ArrowRightLeft className="h-3.5 w-3.5" /> {convertLabel}
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPrintOpen(true)}>
            <Printer className="h-3.5 w-3.5" /> View / Print
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={doEmail}>
            <Mail className="h-3.5 w-3.5" /> Email
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={doDuplicate}>
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          {cancellable && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                cancelRecord(kind, id, "Cancelled by user");
                toast.success("Record cancelled");
              }}
            >
              <Ban className="h-3.5 w-3.5" /> Cancel
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>


      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {hasLines && <TabsTrigger value="lines">Line Items</TabsTrigger>}
              {kind === "oas" && <TabsTrigger value="finance">Finance Review</TabsTrigger>}
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="emails">Email History</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
            </TabsList>

            {hasLines && (
              <TabsContent value="lines" className="mt-4">
                <LineItemsPanel
                  kind={kind as LineDocKind}
                  docId={id}
                  readOnly={status === "approved"}
                  customerRegion={
                    allCustomers.find(
                      (c) => c.name === (record.customerName as string) || c.id === (record.customerId as string),
                    )?.region
                  }
                />
              </TabsContent>
            )}

            {kind === "oas" && (
              <TabsContent value="finance" className="mt-4">
                <FinanceReviewPanel oaId={id} />
              </TabsContent>
            )}



            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-base">Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {Object.entries(record)
                      .filter(([k]) => !["id", "createdAt"].includes(k))
                      .map(([k, v]) => (
                        <div key={k}>
                          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            {k.replace(/([A-Z])/g, " $1")}
                          </div>
                          <div className="text-sm">
                            {k === "value" || k === "estValue" || k === "annualRevenue"
                              ? fmtINR(v as number)
                              : String(v ?? "—")}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="relative space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                    {activities.length === 0 && (
                      <div className="text-sm text-muted-foreground">No activity yet.</div>
                    )}
                    {activities.map((a) => (
                      <div key={a.id} className="relative pl-6">
                        <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background" />
                        <div className="text-sm font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.type} · {a.actor} · {relDate(a.at)}
                        </div>
                        {a.detail && (
                          <div className="mt-1 text-xs text-muted-foreground">{a.detail}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a note…"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      className="min-h-20 resize-none"
                    />
                    <Button size="sm" className="self-end gap-1.5" onClick={addNote}>
                      <Send className="h-3.5 w-3.5" /> Post
                    </Button>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    {notes.length === 0 && (
                      <div className="text-sm text-muted-foreground">No notes yet.</div>
                    )}
                    {notes.map((n) => (
                      <div key={n.id} className="flex gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {n.author.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium">{n.author}</span>
                            <span className="text-muted-foreground">{relDate(n.at)}</span>
                          </div>
                          <div className="mt-1 text-sm">{n.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emails" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b p-4">
                    <div className="text-sm font-medium">Email History</div>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEmailOpen(true)}>
                      <Mail className="h-3.5 w-3.5" /> Log email
                    </Button>
                  </div>
                  <div className="divide-y">
                    {emails.length === 0 && (
                      <div className="p-6 text-sm text-muted-foreground">No emails logged.</div>
                    )}
                    {emails.map((e) => (
                      <div key={e.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate text-sm font-medium">{e.subject}</span>
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {e.direction === "in" ? "From " : "To "}
                              {e.direction === "in" ? e.from : e.to}
                            </div>
                            <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {e.preview}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">{relDate(e.at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-medium">Customer Documents</div>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDocOpen(true)}>
                      <Paperclip className="h-3.5 w-3.5" /> Upload
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {documents.length === 0 && (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No documents attached.
                      </div>
                    )}
                    {documents.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{d.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.kind} · {d.size} · uploaded by {d.uploadedBy} · {relDate(d.at)}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            removeDocument(d.id);
                            toast.success("Document removed");
                          }}
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvals" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="relative space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                    {approvals.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No approval workflow triggered yet.
                      </div>
                    )}
                    {approvals.map((a) => (
                      <div key={a.id} className="relative pl-8">
                        <div
                          className={`absolute left-0 top-1 grid h-6 w-6 place-items-center rounded-full ${
                            a.status === "approved"
                              ? "bg-emerald-500/15 text-emerald-600"
                              : a.status === "rejected"
                              ? "bg-rose-500/15 text-rose-600"
                              : "bg-amber-500/15 text-amber-600"
                          }`}
                        >
                          {a.status === "approved" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : a.status === "rejected" ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <MessageSquare className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">{a.step}</div>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.approver} · {relDate(a.at)}
                        </div>
                        {a.comment && (
                          <div className="mt-1 text-xs text-muted-foreground">"{a.comment}"</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-sm">
                <Sparkles className="h-4 w-4 text-primary" /> AI Sales Copilot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="rounded-md border bg-background p-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Next best actions
                </div>
                <ul className="space-y-1">
                  {nextBestActions(kind, record).map((a) => (
                    <li key={a} className="flex gap-1.5 leading-snug">
                      <span className="text-primary">•</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {[
                `Summarise ${LABELS[kind].toLowerCase()} ${code} for ${String(record.customerName ?? "the customer")}`,
                `Draft a follow-up email for ${LABELS[kind].toLowerCase()} ${code}`,
                `What are the risks and win probability for ${code}?`,
              ].map((q) => (
                <Link
                  key={q}
                  to="/ai-assistant"
                  search={{ q }}
                  className="block w-full rounded-md border bg-background p-2 text-left transition-colors hover:bg-muted"
                >
                  {q}
                </Link>
              ))}
            </CardContent>
          </Card>

          {kind === "leads" && (
            <Card>
              <CardContent className="p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Lead Score
                </div>
                <div className="mt-1 font-display text-2xl font-semibold">
                  {leadScore(record)}
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${leadScore(record)}%` }} />
                </div>
              </CardContent>
            </Card>
          )}

          {kind === "opportunities" &&
            (() => {
              const h = opportunityHealth(record);
              return (
                <Card>
                  <CardContent className="space-y-2 p-4">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Deal Health
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-2xl font-semibold">{h.score}</span>
                      <StatusBadge status={h.rag === "green" ? "approved" : h.rag === "amber" ? "pending" : "rejected"} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Weighted revenue {fmtCompact(h.weighted)} · stage age {h.stageAgeDays}d
                      {h.stalled ? " · stalled" : ""}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

          {kind === "quotations" &&
            (() => {
              const t = quotationTotals(record);
              return (
                <Card>
                  <CardContent className="space-y-1 p-4 text-xs">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Pricing Summary
                    </div>
                    {[
                      ["Base", t.base],
                      ["Discount", -t.discount],
                      ["Net", t.net],
                      ["Freight", t.freight],
                      ["GST", t.tax],
                    ].map(([l, v]) => (
                      <div key={l as string} className="flex justify-between">
                        <span className="text-muted-foreground">{l as string}</span>
                        <span className="font-mono">{fmtINR(v as number)}</span>
                      </div>
                    ))}
                    <Separator className="my-1" />
                    <div className="flex justify-between font-semibold">
                      <span>Grand total</span>
                      <span className="font-mono">{fmtINR(t.grand)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

          {value !== undefined && (
            <Card>
              <CardContent className="p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Deal Value
                </div>
                <div className="mt-1 font-display text-2xl font-semibold">{fmtCompact(value)}</div>
                <div className="text-xs text-muted-foreground">{fmtINR(value)}</div>
              </CardContent>
            </Card>
          )}


          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm">Linked Records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs">
              {record.opportunityId ? (
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-muted-foreground">Opportunity</span>
                  <span className="font-mono">{record.opportunityId as string}</span>
                </div>
              ) : null}
              {record.rfqId ? (
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-muted-foreground">RFQ</span>
                  <span className="font-mono">{record.rfqId as string}</span>
                </div>
              ) : null}
              {record.proposalId ? (
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-muted-foreground">Proposal</span>
                  <span className="font-mono">{record.proposalId as string}</span>
                </div>
              ) : null}
              {record.quotationId ? (
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-muted-foreground">Quotation</span>
                  <span className="font-mono">{record.quotationId as string}</span>
                </div>
              ) : null}
              {record.projectId ? (
                <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">
                  <span className="text-emerald-700 dark:text-emerald-400">Project</span>
                  <span className="font-mono">{record.projectId as string}</span>
                </div>
              ) : null}
              {!record.opportunityId && !record.rfqId && !record.proposalId && !record.quotationId && !record.projectId && (
                <div className="text-muted-foreground">None</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={`Edit ${LABELS[kind]}`}
        fields={CRM_SCHEMAS[kind]}
        initial={record}
        dynamicOptions={crmOptions}
        onSubmit={(values) => {
          const payload = { ...record, ...values, id } as Record<string, unknown>;
          if (kind === "opportunities") delete payload.status;
          else delete payload.stage;
          upsertRecord(kind, payload);
          setEditOpen(false);
          toast.success("Updated");
          const auto = runLifecycleAutomation(kind, id);
          if (auto.created)
            toast.success(`${auto.created.code} created automatically from ${code}`);
          if (auto.projectCode)
            toast.success(`Project ${auto.projectCode} provisioned automatically`);
        }}

        submitLabel="Save changes"
      />

      <QualityDocDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        doc={printOpen ? crmDocument(kind, record) : null}
      />


      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${LABELS[kind].toLowerCase()}?`}
        message="This will also remove all activities, notes, emails, documents and approvals for this record."
        onConfirm={() => {
          deleteRecord(kind, id);
          toast.success("Deleted");
          navigate({ to: "/crm/$entity", params: { entity: kind } });
        }}
      />

      <RecordDialog
        open={docOpen}
        onOpenChange={setDocOpen}
        title="Attach Document"
        fields={[
          { name: "name", label: "File Name", type: "text", required: true, colSpan: 2, placeholder: "Spec_v1.pdf" },
          { name: "kind", label: "Kind", type: "select", options: ["NDA", "MSA", "SOW", "Drawing", "Spec", "PO", "Other"], required: true },
          { name: "size", label: "Size", type: "text", placeholder: "1.2 MB" },
          { name: "uploadedBy", label: "Uploaded By", type: "text" },
        ]}
        initial={{ uploadedBy: "You" }}
        onSubmit={(v) => {
          addDocument(kind, id, {
            name: v.name as string,
            kind: v.kind as string,
            size: (v.size as string) || undefined,
            uploadedBy: (v.uploadedBy as string) || undefined,
          });
          setDocOpen(false);
          toast.success("Document attached");
        }}
        submitLabel="Attach"
      />

      <RecordDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        title="Log Email"
        fields={[
          { name: "direction", label: "Direction", type: "select", options: ["in", "out"], required: true },
          { name: "subject", label: "Subject", type: "text", required: true, colSpan: 2 },
          { name: "from", label: "From", type: "text", required: true },
          { name: "to", label: "To", type: "text", required: true },
          { name: "preview", label: "Preview / Body", type: "textarea" },
        ]}
        initial={{ direction: "out", from: "you@faithautomation.com", to: (record.customerName as string) ?? "" }}
        onSubmit={(v) => {
          addEmail(kind, id, {
            direction: v.direction as "in" | "out",
            subject: v.subject as string,
            from: v.from as string,
            to: v.to as string,
            preview: ((v.preview as string) ?? "").slice(0, 240),
          });
          setEmailOpen(false);
          toast.success("Email logged");
        }}
        submitLabel="Log"
      />
    </div>
  );
}
