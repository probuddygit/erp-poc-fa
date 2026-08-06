import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Download, FileCheck2, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusPill, fmtCompact, fmtINR } from "@/components/projects/shared";
import { useGst, fileReturn, generateIrn } from "@/lib/gst/store";

const SECTIONS: Record<string, { title: string; blurb: string }> = {
  returns: { title: "Returns & Filing", blurb: "Period-wise GSTR-1, GSTR-3B and GSTR-2B status with ARN tracking." },
  "e-invoicing": { title: "e-Invoicing (IRN)", blurb: "IRP registration status, acknowledgement numbers and failure reasons." },
  "e-way-bills": { title: "e-Way Bills", blurb: "Consignment movement, validity windows and transporter details." },
  itc: { title: "ITC Reconciliation", blurb: "Books vs GSTR-2B matching with claimable input tax credit." },
  hsn: { title: "HSN Summary", blurb: "HSN/SAC-wise outward supply summary for GSTR-1 Table 12." },
  registrations: { title: "Registrations", blurb: "All GSTINs held by the entity across states." },
};

export const Route = createFileRoute("/_authenticated/gst/$section")({
  head: ({ params }) => {
    const meta = SECTIONS[params.section];
    const title = `${meta?.title ?? "GST"} · Faith Automation ERP`;
    return {
      meta: [
        { title },
        { name: "description", content: meta?.blurb ?? "GST compliance workspace." },
        { property: "og:title", content: title },
        { property: "og:description", content: meta?.blurb ?? "GST compliance workspace." },
      ],
    };
  },
  loader: ({ params }) => {
    if (!SECTIONS[params.section]) throw notFound();
    return null;
  },
  notFoundComponent: () => <div className="p-6 text-sm text-muted-foreground">Section not found.</div>,
  component: GstSection,
});

function SectionShell({
  section, count, children, action,
}: { section: string; count: number; children: React.ReactNode; action?: React.ReactNode }) {
  const meta = SECTIONS[section];
  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">{meta.title}</h2>
          <p className="text-sm text-muted-foreground">{meta.blurb}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{count} records</Badge>
          {action}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.success("Export queued — you'll get the file shortly.")}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>
      <Card className="border-border/60">
        <CardContent className="overflow-x-auto p-0">{children}</CardContent>
      </Card>
    </div>
  );
}

function GstSection() {
  const { section } = Route.useParams();
  const s = useGst((x) => x);
  const [q, setQ] = useState("");
  const match = (...vals: (string | undefined)[]) =>
    !q || vals.some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase()));

  const searchBox = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-8 w-44 pl-8 text-xs" />
    </div>
  );

  if (section === "returns") {
    const rows = s.returns.filter((r) => match(r.type, r.period, r.gstin, r.arn)).slice().reverse();
    return (
      <SectionShell section={section} count={rows.length} action={searchBox}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Return</TableHead><TableHead>Period</TableHead><TableHead>GSTIN</TableHead>
              <TableHead>Due</TableHead><TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">Total Tax</TableHead><TableHead>ARN</TableHead>
              <TableHead>Status</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.type}</TableCell>
                <TableCell className="tabular-nums">{r.period}</TableCell>
                <TableCell className="font-mono text-xs">{r.gstin}</TableCell>
                <TableCell className="tabular-nums text-xs">{r.dueDate}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtCompact(r.taxableValue)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtCompact(r.igst + r.cgst + r.sgst)}</TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground">{r.arn ?? "—"}</TableCell>
                <TableCell><StatusPill status={r.status} /></TableCell>
                <TableCell className="text-right">
                  {r.status !== "filed" && r.type !== "GSTR-2B" && (
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                      onClick={() => { fileReturn(r.id); toast.success(`${r.type} ${r.period} filed.`); }}>
                      <FileCheck2 className="h-3.5 w-3.5" /> File
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionShell>
    );
  }

  if (section === "e-invoicing") {
    const rows = s.eInvoices.filter((e) => match(e.invoiceNo, e.customer, e.gstin, e.irn));
    return (
      <SectionShell section={section} count={rows.length} action={searchBox}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead>
              <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">Tax</TableHead>
              <TableHead>IRN / Ack</TableHead><TableHead>Status</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.invoiceNo}</TableCell>
                <TableCell className="tabular-nums text-xs">{e.date}</TableCell>
                <TableCell>
                  <div className="text-sm">{e.customer}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{e.gstin}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtCompact(e.taxableValue)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtCompact(e.totalTax)}</TableCell>
                <TableCell className="max-w-[220px]">
                  {e.irn ? (
                    <button
                      className="flex items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => { navigator.clipboard?.writeText(e.irn!); toast.success("IRN copied."); }}
                    >
                      <Copy className="h-3 w-3 shrink-0" />
                      <span className="truncate">{e.irn}</span>
                    </button>
                  ) : e.errorMsg ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-destructive">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {e.errorMsg}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell><StatusPill status={e.status} /></TableCell>
                <TableCell className="text-right">
                  {e.status !== "generated" && e.status !== "cancelled" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => { generateIrn(e.id); toast.success(`IRN generated for ${e.invoiceNo}.`); }}>
                      Generate IRN
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionShell>
    );
  }

  if (section === "e-way-bills") {
    const rows = s.eWayBills.filter((e) => match(e.ewbNo, e.invoiceNo, e.toPlace, e.vehicleNo, e.transporter));
    return (
      <SectionShell section={section} count={rows.length} action={searchBox}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>EWB No.</TableHead><TableHead>Invoice</TableHead><TableHead>Route</TableHead>
              <TableHead className="text-right">Distance</TableHead><TableHead>Vehicle</TableHead>
              <TableHead>Transporter</TableHead><TableHead className="text-right">Value</TableHead>
              <TableHead>Valid Upto</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs font-medium">{e.ewbNo}</TableCell>
                <TableCell className="text-xs">{e.invoiceNo}</TableCell>
                <TableCell className="text-xs">{e.fromPlace} → {e.toPlace}</TableCell>
                <TableCell className="text-right tabular-nums text-xs">{e.distanceKm} km</TableCell>
                <TableCell className="font-mono text-xs">{e.vehicleNo}</TableCell>
                <TableCell className="text-xs">{e.transporter}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtCompact(e.value)}</TableCell>
                <TableCell className="tabular-nums text-xs">{e.validUpto}</TableCell>
                <TableCell><StatusPill status={e.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionShell>
    );
  }

  if (section === "itc") {
    const rows = s.itc.filter((i) => match(i.supplier, i.gstin, i.invoiceNo));
    const claimable = rows.reduce((a, r) => a + r.itcClaimable, 0);
    return (
      <SectionShell
        section={section}
        count={rows.length}
        action={
          <>
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-[10px]">
              {fmtINR(claimable)} claimable
            </Badge>
            {searchBox}
          </>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead><TableHead>Invoice</TableHead><TableHead>Date</TableHead>
              <TableHead className="text-right">Books</TableHead><TableHead className="text-right">GSTR-2B</TableHead>
              <TableHead className="text-right">Variance</TableHead><TableHead className="text-right">ITC Claimable</TableHead>
              <TableHead>Match</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => {
              const variance = i.gstr2bValue - i.bookValue;
              return (
                <TableRow key={i.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{i.supplier}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{i.gstin}</div>
                  </TableCell>
                  <TableCell className="text-xs">{i.invoiceNo}</TableCell>
                  <TableCell className="tabular-nums text-xs">{i.date}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCompact(i.bookValue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCompact(i.gstr2bValue)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${variance ? "text-warning" : "text-muted-foreground"}`}>
                    {variance ? fmtCompact(variance) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{fmtCompact(i.itcClaimable)}</TableCell>
                  <TableCell>
                    {i.match === "matched" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Matched
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs capitalize text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" /> {i.match.replace(/-/g, " ")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionShell>
    );
  }

  if (section === "hsn") {
    const rows = s.hsn.filter((h) => match(h.hsn, h.description));
    return (
      <SectionShell section={section} count={rows.length} action={searchBox}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>HSN / SAC</TableHead><TableHead>Description</TableHead><TableHead>UoM</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">Rate</TableHead><TableHead className="text-right">IGST</TableHead>
              <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-mono text-xs font-medium">{h.hsn}</TableCell>
                <TableCell className="max-w-[280px] truncate text-sm">{h.description}</TableCell>
                <TableCell className="text-xs">{h.uom}</TableCell>
                <TableCell className="text-right tabular-nums">{h.qty.toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtCompact(h.taxableValue)}</TableCell>
                <TableCell className="text-right tabular-nums">{h.rate}%</TableCell>
                <TableCell className="text-right tabular-nums">{fmtCompact(h.igst)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtCompact(h.cgst)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtCompact(h.sgst)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionShell>
    );
  }

  const rows = s.registrations.filter((r) => match(r.gstin, r.tradeName, r.state));
  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">{SECTIONS.registrations.title}</h2>
        <p className="text-sm text-muted-foreground">{SECTIONS.registrations.blurb}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Card key={r.id} className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{r.tradeName}</CardTitle>
                {r.primary && <Badge variant="outline" className="text-[10px]">Primary</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-muted-foreground">
              <div className="font-mono text-sm text-foreground">{r.gstin}</div>
              <div>{r.legalName}</div>
              <div>{r.state} · {r.type}</div>
              <div>Registered {r.registeredOn}</div>
              <StatusPill status={r.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
