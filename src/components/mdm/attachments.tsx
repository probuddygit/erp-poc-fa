import { useRef } from "react";
import { toast } from "sonner";
import { Download, FileText, Paperclip, Trash2, UploadCloud } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mdmStore, useMasterAttachments } from "@/lib/mdm/store";
import type { Attachment } from "@/lib/mdm/types";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB per file

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function humanSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function Attachments({
  masterKey,
  recordId,
  actor,
}: {
  masterKey: string;
  recordId: string;
  actor?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const files = useMasterAttachments(masterKey, recordId);

  const handleFiles = async (list: FileList | null) => {
    if (!list) return;
    for (const file of Array.from(list)) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }
      const dataUrl = await readAsDataUrl(file);
      const att: Attachment = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
        uploadedBy: actor,
        dataUrl,
      };
      mdmStore.addAttachment(masterKey, recordId, att, actor);
    }
    if (inputRef.current) inputRef.current.value = "";
    toast.success("Files uploaded");
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Paperclip className="h-4 w-4" /> Attachments
          <span className="text-xs font-normal text-muted-foreground">({files.length})</span>
        </CardTitle>
        <Button size="sm" onClick={() => inputRef.current?.click()} className="gap-2">
          <UploadCloud className="h-4 w-4" /> Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </CardHeader>
      <CardContent>
        <label
          htmlFor="dz"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 bg-muted/30 py-6 text-sm text-muted-foreground hover:bg-muted/50"
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud className="h-6 w-6 text-muted-foreground/70" />
          Drag & drop files here, or click to browse
          <span className="text-[11px]">Max 5MB per file</span>
        </label>

        {files.length > 0 && (
          <ul className="mt-4 divide-y rounded-lg border">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{f.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {humanSize(f.size)} · {new Date(f.uploadedAt).toLocaleString()}
                      {f.uploadedBy && ` · ${f.uploadedBy}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={f.dataUrl}
                    download={f.name}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                    aria-label={`Download ${f.name}`}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      mdmStore.removeAttachment(masterKey, recordId, f.id, actor);
                      toast.success("Removed");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
