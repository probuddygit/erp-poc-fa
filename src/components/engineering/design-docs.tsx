import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search, Plus, Download, FileText, History, ShieldCheck, Eye, Upload, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { RowActions, useCrud } from "@/components/crud-kit";
import { RecordDialog } from "@/components/record-dialog";
import { PLM_SCHEMAS } from "@/lib/plm/schemas";
import { useEngineeringOptions } from "@/lib/plm/options";
import { usePlm, upsertPlm, deletePlm, addDocVersion, setDocStatus } from "@/lib/plm/store";
import type { DesignDoc } from "@/lib/plm/types";
import { exportCsv } from "@/lib/crud";

const STATUS_TONE: Record<string, string> = {
  Draft: "bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/25",
  "Under Review": "bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-500/25",
  Approved: "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/25",
  Released: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
  Obsolete: "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/25",
};

function DocStatus({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_TONE[status] ?? STATUS_TONE.Draft}`}>
      {status}
    </span>
  );
}

const NEXT: Record<string, DesignDoc["status"] | undefined> = {
  Draft: "Under Review",
  "Under Review": "Approved",
  Approved: "Released",
  Released: undefined,
  Obsolete: undefined,
};

export function DesignDocuments() {
  const docs = usePlm((s) => s.designDocs ?? []);
  const options = useEngineeringOptions();
  const [q, setQ] = useState("");
  const [view, setView] = useState<DesignDoc | null>(null);
  const [revFor, setRevFor] = useState<DesignDoc | null>(null);
  const { openNew, openEdit, askDelete, dialogs } = useCrud(PLM_SCHEMAS, upsertPlm, deletePlm, options);

  const rows = useMemo(() => {
    const l = q.toLowerCase();
    return docs.filter(
      (d) =>
        !q ||
        [d.code, d.title, d.category, d.projectCode, d.itemCode, d.owner, d.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(l)),
    );
  }, [docs, q]);

  const advance = (d: DesignDoc) => {
    const next = NEXT[d.status];
    if (!next) return;
    setDocStatus(d.id, next);
    toast.success(`${d.code} → ${next}`, {
      description:
        next === "Released"
          ? "Released for manufacturing — Projects, Procurement and Manufacturing notified."
          : "Approval workflow advanced with a full audit entry.",
    });
  };

  const current = view ? docs.find((d) => d.id === view.id) ?? view : null;

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Design Management</h2>
          <p className="text-sm text-muted-foreground">
            CAD, specifications, calculations and technical documents with version control, approval workflow and audit trail — linked to Project, Item, BOM, ECR and ECN.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="h-9 w-64 pl-8" />
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportCsv("design-documents", rows as unknown as Array<Record<string, unknown>>)}>
            <Download className="h-4 w-4" />Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => openNew("designDocs", "Upload Design Document", { status: "Draft", version: "A", category: "CAD Drawing", owner: "You" })}>
            <Plus className="h-4 w-4" />Upload Document
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Documents", docs.length],
          ["Released", docs.filter((d) => d.status === "Released").length],
          ["In review", docs.filter((d) => d.status === "Under Review").length],
          ["Revisions", docs.reduce((a, d) => a + (d.versions?.length ?? 0), 0)],
          ["Project linked", docs.filter((d) => d.projectCode).length],
        ].map(([l, v]) => (
          <Card key={l as string}>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
              <div className="mt-0.5 font-display text-xl font-semibold">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Document</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Links</th>
                <th className="p-3 text-left">Owner</th>
                <th className="p-3 text-left">Rev</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Actions</th>
                <th className="w-12 p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-mono text-xs text-muted-foreground">{d.code}</div>
                    <button className="text-left font-medium hover:underline" onClick={() => setView(d)}>{d.title}</button>
                  </td>
                  <td className="p-3"><Badge variant="outline">{d.category}</Badge></td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {[d.projectCode, d.itemCode, d.ecrCode, d.ecnCode].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="p-3">{d.owner}</td>
                  <td className="p-3"><Badge variant="secondary" className="font-mono text-[10px]">Rev {d.version}</Badge></td>
                  <td className="p-3"><DocStatus status={d.status} /></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setView(d)}>
                        <Eye className="h-3.5 w-3.5" />View
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setRevFor(d)}>
                        <Upload className="h-3.5 w-3.5" />Revise
                      </Button>
                      {NEXT[d.status] && (
                        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => advance(d)}>
                          <CheckCircle2 className="h-3.5 w-3.5" />{NEXT[d.status]}
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <RowActions
                      onEdit={() => openEdit("designDocs", d as unknown as Record<string, unknown>, `Edit ${d.code}`)}
                      onDelete={() => askDelete("designDocs", d.id, d.code)}
                    />
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={8} className="p-10 text-center text-sm text-muted-foreground">No design documents yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Detail + revision history */}
      <Dialog open={!!current} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-3xl">
          {current && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {current.code} — {current.title}
                </DialogTitle>
                <DialogDescription>
                  {current.category} · Rev {current.version} · Owner {current.owner}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ["Project", current.projectCode ?? "—"],
                  ["Item / Part", current.itemCode ?? "—"],
                  ["ECR", current.ecrCode ?? "—"],
                  ["ECN", current.ecnCode ?? "—"],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg border p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                    <div className="font-mono text-xs">{v}</div>
                  </div>
                ))}
              </div>

              {current.fileUrl && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{current.fileUrlName ?? "Attachment"} {current.size ? `· ${current.size}` : ""}</span>
                  <Button asChild size="sm" variant="outline"><a href={current.fileUrl} target="_blank" rel="noreferrer">Open</a></Button>
                  <Button asChild size="sm" variant="outline"><a href={current.fileUrl} download={current.fileUrlName ?? current.title}>Download</a></Button>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><History className="h-4 w-4" />Revision history</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {[...(current.versions ?? [])].reverse().map((v) => (
                      <div key={v.id} className="rounded-md border p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-medium">Rev {v.version}</span>
                          <DocStatus status={v.status} />
                        </div>
                        <div className="text-muted-foreground">{new Date(v.at).toLocaleString("en-IN")} · {v.by}</div>
                        {v.notes && <div className="mt-1">{v.notes}</div>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" />Audit trail</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {[...(current.audit ?? [])].reverse().map((a) => (
                      <div key={a.id} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <div>
                          <div>{a.action}</div>
                          <div className="text-muted-foreground">{new Date(a.at).toLocaleString("en-IN")} · {a.by}</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New revision upload */}
      <RecordDialog
        open={!!revFor}
        onOpenChange={(v) => !v && setRevFor(null)}
        title={revFor ? `New revision — ${revFor.code}` : ""}
        description="Uploads a new version, resets the document to Draft and records the audit entry."
        submitLabel="Upload revision"
        fields={[
          { name: "version", label: "New Revision", type: "select", required: true, options: ["A", "B", "C", "D", "E"] },
          { name: "by", label: "Uploaded By", type: "text", required: true },
          { name: "fileUrl", label: "File", type: "file", colSpan: 2, accept: ".pdf,.dwg,.dxf,.step,.stp,.png,.jpg,.jpeg,.xlsx,.docx" },
          { name: "notes", label: "Change Notes", type: "textarea", colSpan: 2 },
        ]}
        initial={{ version: revFor?.version ?? "A", by: "You" }}
        onSubmit={(v) => {
          if (!revFor) return;
          addDocVersion(revFor.id, {
            version: String(v.version),
            by: String(v.by ?? "You"),
            notes: v.notes as string | undefined,
            fileUrl: v.fileUrl as string | undefined,
            fileUrlName: v.fileUrlName as string | undefined,
            fileUrlType: v.fileUrlType as string | undefined,
            size: v.size as string | undefined,
          });
          toast.success(`${revFor.code} revised to Rev ${v.version}`, { description: "Impacted departments notified." });
          setRevFor(null);
        }}
      />

      {dialogs}
    </div>
  );
}
