import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Download, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import {
  renderDocumentHtml,
  documentEmailBody,
  type BusinessDocument,
} from "@/lib/procurement/documents";

/** Preview + print / download / email for POs and Quotations. */
export function DocumentPreviewDialog({
  open,
  onOpenChange,
  doc,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: BusinessDocument | null;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [to, setTo] = useState("");
  const html = useMemo(() => (doc ? renderDocumentHtml(doc) : ""), [doc]);

  if (!doc) return null;

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      toast.error("Please allow pop-ups to print this document");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${doc.docNo} downloaded`);
  };

  const handleEmail = () => {
    const subject = `${doc.kind} ${doc.docNo} — ${doc.partyName}`;
    const body = documentEmailBody(doc);
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success(`Draft email prepared for ${to || doc.partyName}`);
    setEmailOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b px-5 py-3">
          <div>
            <DialogTitle className="font-display text-base">
              {doc.kind} · {doc.docNo}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{doc.partyName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-4 w-4" />Print
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownload}>
              <Download className="h-4 w-4" />Download
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEmailOpen((v) => !v)}>
              <Mail className="h-4 w-4" />Email
            </Button>
          </div>
        </DialogHeader>

        {emailOpen && (
          <div className="flex items-center gap-2 border-b bg-muted/40 px-5 py-2.5">
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@vendor.com"
              className="h-8 max-w-sm"
              type="email"
            />
            <Button size="sm" className="h-8 gap-1.5" onClick={handleEmail}>
              <Send className="h-3.5 w-3.5" />Send
            </Button>
          </div>
        )}

        <div className="max-h-[70vh] overflow-auto bg-muted/30 p-4">
          <iframe
            title={`${doc.kind} ${doc.docNo}`}
            srcDoc={html}
            className="h-[65vh] w-full rounded-md border bg-white"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
