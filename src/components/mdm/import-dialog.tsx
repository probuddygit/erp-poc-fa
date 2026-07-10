import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Download, FileUp } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

import { mdmStore } from "@/lib/mdm/store";
import { useSession } from "@/hooks/use-session";
import type { MasterDef } from "@/lib/mdm/types";
import { fromCsv, toCsv, downloadFile } from "@/lib/mdm/csv";

interface ImportDialogProps {
  def: MasterDef;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface ParsedRow {
  data: Record<string, unknown>;
  errors: string[];
}

export function ImportDialog({ def, open, onOpenChange }: ImportDialogProps) {
  const { user } = useSession();
  const [rawCsv, setRawCsv] = useState("");
  const [pasted, setPasted] = useState("");

  const importableFields = useMemo(
    () => def.fields.filter((f) => f.importable !== false),
    [def],
  );

  const source = rawCsv || pasted;
  const parsed = useMemo<ParsedRow[] | null>(() => {
    if (!source.trim()) return null;
    try {
      const { headers, rows } = fromCsv(source);
      return rows.map((raw) => {
        const errors: string[] = [];
        const data: Record<string, unknown> = {};
        if (raw.code) data.code = raw.code;
        for (const f of importableFields) {
          if (!headers.includes(f.key)) continue;
          const v = raw[f.key];
          if (f.required && (!v || v.trim() === "")) {
            errors.push(`${f.label} is required`);
          }
          if (v === "" || v === undefined) continue;
          switch (f.type) {
            case "number":
            case "currency": {
              const n = Number(v);
              if (Number.isNaN(n)) errors.push(`${f.label} is not a number`);
              else data[f.key] = n;
              break;
            }
            case "boolean":
              data[f.key] = ["true", "1", "yes", "y"].includes(v.toLowerCase());
              break;
            case "select":
              if (f.options && !f.options.some((o) => o.value === v)) {
                errors.push(`${f.label} "${v}" is not a valid option`);
              }
              data[f.key] = v;
              break;
            default:
              data[f.key] = v;
          }
        }
        return { data, errors };
      });
    } catch (e) {
      return [{ data: {}, errors: ["Failed to parse CSV"] }];
    }
  }, [source, importableFields]);

  const validRows = parsed?.filter((r) => r.errors.length === 0) ?? [];
  const errorRows = parsed?.filter((r) => r.errors.length > 0) ?? [];

  const reset = () => {
    setRawCsv("");
    setPasted("");
  };

  const downloadTemplate = () => {
    const headers = ["code", ...importableFields.map((f) => f.key)];
    const sample: Record<string, unknown> = { code: "" };
    for (const f of importableFields) {
      sample[f.key] =
        f.type === "select" && f.options?.[0]
          ? f.options[0].value
          : f.type === "boolean"
            ? "true"
            : f.type === "number" || f.type === "currency"
              ? 0
              : `Sample ${f.label}`;
    }
    downloadFile(`${def.key}-template.csv`, toCsv(headers, [sample]));
    toast.success("Template downloaded");
  };

  const runImport = () => {
    if (!validRows.length) {
      toast.error("Nothing to import");
      return;
    }
    const n = mdmStore.bulkImport(def, validRows.map((r) => r.data), user?.email ?? "system");
    toast.success(`Imported ${n} ${def.pluralName.toLowerCase()}`);
    reset();
    onOpenChange(false);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setRawCsv(text);
    setPasted("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-4 w-4" /> Import {def.pluralName}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV rows. Use the template for the correct columns.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download template
          </Button>
          <Badge variant="outline" className="text-[10px]">
            {importableFields.length} importable fields
          </Badge>
        </div>

        <Tabs defaultValue="file">
          <TabsList>
            <TabsTrigger value="file">Bulk upload</TabsTrigger>
            <TabsTrigger value="paste">Paste CSV</TabsTrigger>
          </TabsList>
          <TabsContent value="file" className="pt-2">
            <label
              htmlFor="csv-file"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null); }}
              className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 bg-muted/30 py-8 text-sm text-muted-foreground hover:bg-muted/50"
            >
              <FileUp className="h-6 w-6 text-muted-foreground/70" />
              Drop a .csv file here, or click to browse
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </TabsContent>
          <TabsContent value="paste" className="pt-2">
            <Textarea
              rows={8}
              value={pasted}
              onChange={(e) => { setPasted(e.target.value); setRawCsv(""); }}
              placeholder={`code,${importableFields.slice(0, 3).map((f) => f.key).join(",")}\n...`}
              className="font-mono text-xs"
            />
          </TabsContent>
        </Tabs>

        {parsed && (
          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-success">
                  <CheckCircle2 className="h-4 w-4" /> {validRows.length} valid
                </span>
                {errorRows.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" /> {errorRows.length} with errors
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">Preview</span>
            </div>
            <ScrollArea className="max-h-56">
              <ul className="divide-y text-xs">
                {parsed.slice(0, 50).map((r, i) => (
                  <li key={i} className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      {r.errors.length ? (
                        <AlertCircle className="h-3 w-3 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-success" />
                      )}
                      <span className="font-mono">Row {i + 1}</span>
                      <span className="truncate text-muted-foreground">
                        {Object.values(r.data).filter(Boolean).slice(0, 3).join(" · ")}
                      </span>
                    </div>
                    {r.errors.length > 0 && (
                      <div className="mt-0.5 pl-5 text-destructive">{r.errors.join("; ")}</div>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={runImport} disabled={!validRows.length}>
            Import {validRows.length || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
