import { useState } from "react";
import { ScanLine, Upload, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComboboxField } from "@/components/combobox-field";
import { fmtINR } from "@/components/crm/shared";
import { useProjectsStore } from "@/lib/projects/store";
import {
  extractDocument,
  validateExtraction,
  type Extraction,
  type ValidationSummary,
} from "@/lib/procurement/ocr";

/**
 * Upload a PO, vendor invoice or GRN copy and validate the printed part
 * numbers, quantities and rates against the item master.
 */
export function OcrValidateDialog({
  kind = "invoice",
  defaultProject,
  expectedTotal,
  label = "Validate document",
}: {
  kind?: "po" | "invoice" | "grn";
  defaultProject?: string;
  expectedTotal?: number;
  label?: string;
}) {
  const projects = useProjectsStore((s) => s.projects);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [project, setProject] = useState(defaultProject ?? "");
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);

  const run = async (file: File) => {
    setBusy(true);
    try {
      const data = await extractDocument(file, kind);
      setExtraction(data);
      setSummary(validateExtraction(data, project || undefined, expectedTotal));
      toast.success(`Read ${data.lines.length} line(s) from ${file.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Extraction failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ScanLine className="h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>AI part-number validation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Validate against project scope</Label>
              <ComboboxField
                value={project}
                options={[
                  { value: "", label: "All items (no project filter)" },
                  ...projects.map((p) => ({ value: p.code, label: p.code, hint: p.name })),
                ]}
                onChange={(v) => {
                  setProject(v);
                  if (extraction) setSummary(validateExtraction(extraction, v || undefined, expectedTotal));
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Document copy (PDF or image)</Label>
              <div className="flex items-center gap-2">
                <input
                  id="ocr-file"
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void run(f);
                    e.target.value = "";
                  }}
                />
                <Button asChild variant="outline" className="w-full gap-2" disabled={busy}>
                  <label htmlFor="ocr-file" className="cursor-pointer">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {busy ? "Reading document…" : "Upload & extract"}
                  </label>
                </Button>
              </div>
            </div>
          </div>

          {extraction && summary && (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="Document" value={extraction.docNumber || "—"} hint={extraction.vendor} />
                <Stat label="Exact matches" value={String(summary.exact)} tone="ok" />
                <Stat label="Near matches" value={String(summary.near)} tone="warn" />
                <Stat label="Unmatched" value={String(summary.unmatched)} tone="bad" />
              </div>

              {Boolean(summary.totalMismatch) && (
                <p className="flex gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Document total differs from the ERP document by {fmtINR(Math.abs(summary.totalMismatch))}.
                </p>
              )}

              <div className="max-h-[45vh] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Read part no.</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Findings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.matches.map((m, idx) => (
                      <TableRow key={`${m.line.partNumber}-${idx}`}>
                        <TableCell className="font-mono text-xs">{m.line.partNumber || "—"}</TableCell>
                        <TableCell className="text-xs">{m.line.description}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {m.line.qty} {m.line.uom}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{fmtINR(m.line.rate)}</TableCell>
                        <TableCell>
                          {m.level === "exact" ? (
                            <Badge className="gap-1 text-[10px]">
                              <CheckCircle2 className="h-3 w-3" /> {m.suggestion?.code}
                            </Badge>
                          ) : m.level === "near" ? (
                            <Badge variant="secondary" className="gap-1 text-[10px]">
                              <AlertTriangle className="h-3 w-3" /> {m.suggestion?.code}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 text-[10px]">
                              <XCircle className="h-3 w-3" /> none
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {m.issues.join(" ") || "Clean"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "bad";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "bad"
          ? "text-rose-600 dark:text-rose-400"
          : "";
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`truncate font-semibold ${color}`}>{value}</div>
      {hint && <div className="truncate text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
