import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Upload, XCircle } from "lucide-react";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { usePlm } from "@/lib/plm/store";
import { useProjectsStore } from "@/lib/projects/store";
import { useSession } from "@/hooks/use-session";
import {
  commitImport, downloadTemplate, parseWorkbook, suggestNextRev,
  type ConflictAction, type ParseResult,
} from "@/lib/plm/bom-import";
import type { BomKind } from "@/lib/plm/types";

interface Props {
  kind: BomKind;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: (rootId: string) => void;
}

export function BomImportDialog({ kind, open, onOpenChange, onImported }: Props) {
  const { user, profile } = useSession();
  const items = usePlm((s) => s.items);
  const parts = usePlm((s) => s.parts);
  const bom = usePlm((s) => s.bom);
  const projects = useProjectsStore((s) => s.projects);
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [parse, setParse] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<ConflictAction>("new");

  const knownItemCodes = useMemo(
    () => new Set([...items.map((i) => i.code), ...parts.map((p) => p.code)]),
    [items, parts],
  );
  const knownProjects = useMemo(() => new Set(projects.map((p) => p.code)), [projects]);

  const errors = parse?.issues.filter((i) => i.severity === "error") ?? [];
  const warnings = parse?.issues.filter((i) => i.severity === "warning") ?? [];
  const errorRows = new Set(errors.map((e) => e.row));
  const validCount = (parse?.rows ?? []).filter((r) => !errorRows.has(r.row)).length;

  const existingRoot = useMemo(() => {
    const code = parse?.topAssembly?.itemCode;
    if (!code) return undefined;
    return bom.find((n) => !n.parentId && n.kind === kind && n.itemCode === code);
  }, [bom, kind, parse]);

  const reset = () => {
    setFileName("");
    setParse(null);
    setAction("new");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      toast.error("Only Excel files (.xlsx, .xls) are supported");
      return;
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const result = parseWorkbook(buf, { knownItemCodes, knownProjects });
      setFileName(file.name);
      setParse(result);
      setAction("new");
    } catch {
      toast.error("Could not read the Excel file");
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!parse || errors.length) return;
    if (existingRoot && action === "new") {
      toast.error("This Top Assembly already exists — choose Replace or New revision");
      return;
    }
    const res = commitImport(parse, {
      kind,
      action: existingRoot ? action : "new",
      existingRootId: existingRoot?.id,
      newRev: suggestNextRev(existingRoot?.rev),
      fileName,
      user: profile?.full_name || user?.email || "system",
    });
    toast.success(`Imported ${res.imported} ${kind} lines`);
    onImported?.(res.rootId);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Import {kind} from Excel
          </DialogTitle>
          <DialogDescription>
            Upload a multi-level BOM workbook. Every line is validated against the same rules as a
            manually created {kind} before anything is created.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadTemplate(`${kind.toLowerCase()}-import-template.xlsx`)}>
            <Download className="h-4 w-4" /> Download Excel template
          </Button>
          {fileName && (
            <>
              <Badge variant="outline" className="max-w-[240px] truncate text-[10px]">{fileName}</Badge>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => inputRef.current?.click()}>
                <RefreshCw className="h-4 w-4" /> Re-upload
              </Button>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {!parse && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null); }}
            className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 bg-muted/30 py-10 text-sm text-muted-foreground hover:bg-muted/50"
          >
            <Upload className="h-6 w-6 text-muted-foreground/70" />
            {busy ? "Reading workbook…" : "Drop an .xlsx file here, or click to browse"}
            <span className="text-xs">Excel only — CSV is not accepted</span>
          </button>
        )}

        {parse && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                ["Rows", parse.totalRows],
                ["Valid", validCount],
                ["Errors", errors.length],
                ["Warnings", warnings.length],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-lg border p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                  <div className="font-display text-lg font-semibold">{v as number}</div>
                </div>
              ))}
            </div>

            {parse.topAssembly && (
              <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Top Assembly</span>{" "}
                <span className="font-mono">{parse.topAssembly.itemCode}</span> · {parse.topAssembly.itemName}
                {parse.projectCode ? <> · Project <span className="font-mono">{parse.projectCode}</span></> : null}
              </div>
            )}

            {/* Preview tree */}
            <div className="rounded-lg border">
              <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Structure preview
              </div>
              <ScrollArea className="max-h-56">
                <ul className="divide-y text-xs">
                  {parse.rows.map((r) => {
                    const bad = errorRows.has(r.row);
                    return (
                      <li key={r.row} className={`flex items-center gap-2 px-3 py-1.5 ${bad ? "bg-destructive/5" : ""}`}>
                        <span style={{ paddingLeft: `${Math.max(r.level, 0) * 16}px` }} className="font-mono text-muted-foreground">
                          L{Number.isFinite(r.level) ? r.level : "?"}
                        </span>
                        {bad ? <XCircle className="h-3 w-3 shrink-0 text-destructive" /> : <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />}
                        <span className="font-mono">{r.itemCode || "—"}</span>
                        <span className="truncate">{r.itemName}</span>
                        <span className="ml-auto shrink-0 text-muted-foreground">
                          {Number.isFinite(r.qty) ? r.qty : "?"} {r.uom} · Rev {r.rev} · {r.procurement}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            </div>

            {/* Issues */}
            {parse.issues.length > 0 && (
              <div className="rounded-lg border">
                <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Validation results
                </div>
                <ScrollArea className="max-h-40">
                  <ul className="divide-y text-xs">
                    {parse.issues.map((i, n) => (
                      <li key={n} className="flex items-start gap-2 px-3 py-1.5">
                        {i.severity === "error" ? (
                          <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                        )}
                        <span className="font-mono text-muted-foreground">Row {i.row}</span>
                        <span className="font-medium">{i.column}</span>
                        <span className={i.severity === "error" ? "text-destructive" : "text-muted-foreground"}>{i.message}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {existingRoot && (
              <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {existingRoot.itemCode} already exists as a {kind} top assembly (Rev {existingRoot.rev})
                </div>
                <RadioGroup value={action} onValueChange={(v) => setAction(v as ConflictAction)} className="gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="new" id="ba-cancel" />
                    <Label htmlFor="ba-cancel" className="font-normal">Do not import (default)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="replace" id="ba-replace" />
                    <Label htmlFor="ba-replace" className="font-normal">Replace the existing structure</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="revision" id="ba-rev" />
                    <Label htmlFor="ba-rev" className="font-normal">
                      Create as new revision {suggestNextRev(existingRoot.rev)} (keeps the current BOM)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={!parse || errors.length > 0 || (!!existingRoot && action === "new")}
          >
            Import {validCount || ""} lines
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Audit trail of every Excel BOM import. */
export function BomImportHistory({ kind }: { kind: BomKind }) {
  const imports = usePlm((s) => s.bomImports ?? []).filter((i) => i.kind === kind);
  const [openId, setOpenId] = useState<string | null>(null);
  if (!imports.length) return null;

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Import history</span>
        <span>{imports.length} imports</span>
      </div>
      <div className="divide-y text-xs">
        {imports.map((r) => (
          <div key={r.id} className="px-4 py-2">
            <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{r.fileName}</span>
              <span className="hidden shrink-0 font-mono text-muted-foreground sm:inline">{r.topAssembly}</span>
              {r.projectCode && <Badge variant="outline" className="text-[10px]">{r.projectCode}</Badge>}
              <Badge variant="outline" className="text-[10px] capitalize">{r.action}</Badge>
              <span className="shrink-0 text-success">{r.imported} imported</span>
              {r.rejected > 0 && <span className="shrink-0 text-destructive">{r.rejected} rejected</span>}
              <span className="shrink-0 text-muted-foreground">
                {new Date(r.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="shrink-0 text-muted-foreground">{r.by}</span>
            </button>
            {openId === r.id && (
              <div className="mt-1.5 space-y-0.5 pl-6 text-muted-foreground">
                <div>{r.totalRecords} records in file · {r.imported} successful · {r.rejected} rejected</div>
                {r.errors.length ? r.errors.map((e, i) => <div key={i} className="text-destructive">{e}</div>) : <div>No validation issues.</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
