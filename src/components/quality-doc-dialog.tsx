import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { toast } from "sonner";
import {
  renderQualityDocHtml,
  printQualityDoc,
  downloadQualityDoc,
  type QualityDocument,
} from "@/lib/quality/documents";

/** Preview + print / download for inspection reports, NCRs, CAPAs and gauge records. */
export function QualityDocDialog({
  open,
  onOpenChange,
  doc,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: QualityDocument | null;
}) {
  const html = useMemo(() => (doc ? renderQualityDocHtml(doc) : ""), [doc]);
  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b px-5 py-3">
          <div>
            <DialogTitle className="font-display text-base">
              {doc.kind} · {doc.docNo}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{doc.title}</p>
          </div>
          <div className="flex items-center gap-2 pr-8">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                if (!printQualityDoc(doc)) toast.error("Please allow pop-ups to print this document");
              }}
            >
              <Printer className="h-4 w-4" />Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                downloadQualityDoc(doc);
                toast.success(`${doc.docNo} downloaded`);
              }}
            >
              <Download className="h-4 w-4" />Download
            </Button>
          </div>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto bg-muted/30 p-4">
          <iframe title={doc.docNo} srcDoc={html} className="h-[65vh] w-full rounded-md border bg-white" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Small hook that owns the document dialog state. */
export function useQualityDoc() {
  const [doc, setDoc] = useState<QualityDocument | null>(null);
  return {
    show: (d: QualityDocument) => setDoc(d),
    dialog: <QualityDocDialog open={!!doc} onOpenChange={(v) => !v && setDoc(null)} doc={doc} />,
  };
}
