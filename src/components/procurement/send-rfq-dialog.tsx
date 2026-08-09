import { useMemo, useState } from "react";
import { Search, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Vendor } from "@/lib/procurement/types";

export interface SendRfqPayload {
  vendorIds: string[];
  emails: string[];
  subject: string;
  body: string;
}

/** Searchable multi-select vendor picker used to float an RFQ to one or more vendors. */
export function SendRfqDialog({
  open,
  onOpenChange,
  rfqCode,
  rfqTitle,
  dueAt,
  vendors,
  initialVendorIds = [],
  onSend,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rfqCode: string;
  rfqTitle: string;
  dueAt: string;
  vendors: Vendor[];
  initialVendorIds?: string[];
  onSend: (payload: SendRfqPayload) => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>(initialVendorIds);
  const [note, setNote] = useState("");

  const filtered = useMemo(() => {
    const l = q.toLowerCase();
    return vendors.filter(
      (v) => v.active && (!q || [v.name, v.code, v.category, v.city, v.email].some((x) => String(x).toLowerCase().includes(l))),
    );
  }, [vendors, q]);

  const picked = vendors.filter((v) => selected.includes(v.id));

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleSend = () => {
    const due = dueAt ? new Date(dueAt).toLocaleDateString("en-IN") : "the stated due date";
    onSend({
      vendorIds: selected,
      emails: picked.map((v) => v.email).filter(Boolean),
      subject: `Request for Quotation ${rfqCode} — ${rfqTitle}`,
      body:
        `Dear Partner,\n\nWe invite your best commercial and technical offer against ${rfqCode} — ${rfqTitle}.\n` +
        `Kindly submit your quotation on or before ${due}.\n\n${note ? note + "\n\n" : ""}` +
        `Regards,\nProcurement\nFaith Automation Pvt. Ltd.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Send {rfqCode} to vendors</DialogTitle>
          <DialogDescription>
            Pick one or more qualified vendors from the Vendor Master. Their email addresses are taken from the master record.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendor name, code, category, city…" className="h-9 pl-8" />
        </div>

        {!!picked.length && (
          <div className="flex flex-wrap gap-1.5">
            {picked.map((v) => (
              <Badge key={v.id} variant="secondary" className="gap-1 text-[11px]">
                {v.name}
                <button type="button" onClick={() => toggle(v.id)} aria-label={`Remove ${v.name}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="max-h-64 divide-y overflow-auto rounded-lg border">
          {filtered.map((v) => (
            <label key={v.id} className="flex cursor-pointer items-center gap-3 p-2.5 text-sm hover:bg-muted/40">
              <Checkbox checked={selected.includes(v.id)} onCheckedChange={() => toggle(v.id)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{v.name}</span>
                  <Badge variant="outline" className="text-[10px]">{v.rating}</Badge>
                  <span className="font-mono text-[10px] text-muted-foreground">{v.code}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {v.email} · {v.category} · OTD {v.onTimePct}% · Quality {v.qualityPct}% · {v.leadTimeDays}d
                </div>
              </div>
            </label>
          ))}
          {!filtered.length && <div className="p-6 text-center text-xs text-muted-foreground">No vendors match this search.</div>}
        </div>

        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional message to vendors…" className="h-9" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="gap-1.5" disabled={!selected.length} onClick={handleSend}>
            <Send className="h-4 w-4" />Send to {selected.length || 0} vendor{selected.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
