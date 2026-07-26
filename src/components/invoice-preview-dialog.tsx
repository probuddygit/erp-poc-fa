import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Share2, Download, ExternalLink, Check, FileText, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function InvoicePreviewDialog({
  open,
  onOpenChange,
  href,
  invoiceNo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  href: string;
  invoiceNo: string;
}) {
  const objectRef = useRef<HTMLObjectElement>(null);
  const [copied, setCopied] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const filename = `${invoiceNo.replace(/[\/\\]/g, "-")}.pdf`;

  // Fetch the PDF as a blob so it renders inline even when the preview is
  // hosted inside a sandboxed cross-origin iframe (Chrome blocks direct
  // cross-origin PDF plugin embeds otherwise).
  useEffect(() => {
    if (!open || !href) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    setStatus("loading");
    fetch(href)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const pdfBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
        createdUrl = URL.createObjectURL(pdfBlob);
        setBlobUrl(createdUrl);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setBlobUrl(null);
      setStatus("idle");
    };
  }, [open, href]);

  const handlePrint = () => {
    const url = blobUrl ?? href;
    const w = window.open(url, "_blank");
    if (!w) {
      toast.error("Please allow pop-ups to print the invoice");
      return;
    }
    // Some browsers need a tick before print() is available.
    const tryPrint = () => {
      try {
        w.focus();
        w.print();
      } catch {
        /* user can print from the new tab */
      }
    };
    w.addEventListener("load", tryPrint);
    setTimeout(tryPrint, 800);
  };

  const handleShare = async () => {
    const url = new URL(href, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title: `Invoice ${invoiceNo}`, url });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invoice link copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Unable to share invoice");
    }
  };

  const handleSave = () => {
    const a = document.createElement("a");
    a.href = blobUrl ?? href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b px-5 py-3 space-y-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold truncate">Invoice {invoiceNo}</DialogTitle>
              <div className="text-[11px] text-muted-foreground truncate">Tax invoice · PDF preview</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />Print
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              Share
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSave}>
              <Download className="h-4 w-4" />Save
            </Button>
            <Button asChild size="sm" className="gap-2">
              <a href={blobUrl ?? href} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />Open
              </a>
            </Button>
          </div>
        </DialogHeader>
        <div className="bg-muted/40 h-[75vh] relative">
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading invoice…
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground p-6 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <div>Couldn't load the PDF inline in this browser.</div>
              <Button asChild size="sm" variant="outline" className="gap-2">
                <a href={href} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Open in new tab</a>
              </Button>
            </div>
          )}
          {status === "ready" && blobUrl && (
            <object
              ref={objectRef}
              data={`${blobUrl}#toolbar=1&navpanes=0&view=FitH`}
              type="application/pdf"
              className="h-full w-full"
              aria-label={`Invoice ${invoiceNo}`}
            >
              <div className="flex flex-col items-center justify-center h-full gap-3 text-sm text-muted-foreground p-6 text-center">
                <div>Your browser can't display PDFs inline.</div>
                <Button asChild size="sm" variant="outline" className="gap-2">
                  <a href={blobUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Open in new tab</a>
                </Button>
              </div>
            </object>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
