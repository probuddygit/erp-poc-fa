import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Share2, Download, ExternalLink, Copy, Check, FileText } from "lucide-react";
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [copied, setCopied] = useState(false);

  const filename = `${invoiceNo.replace(/[\/\\]/g, "-")}.pdf`;

  const handlePrint = () => {
    try {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
    } catch {
      window.open(href, "_blank");
    }
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
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={href} download={filename}>
                <Download className="h-4 w-4" />Save
              </a>
            </Button>
            <Button asChild size="sm" className="gap-2">
              <a href={href} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />Open
              </a>
            </Button>
          </div>
        </DialogHeader>
        <div className="bg-muted/40 h-[75vh]">
          <iframe
            ref={iframeRef}
            src={`${href}#toolbar=1&navpanes=0&view=FitH`}
            title={`Invoice ${invoiceNo}`}
            className="h-full w-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
