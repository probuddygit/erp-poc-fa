import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Download, FileCheck2, Plus, Printer, Search, Ban, Link2, Truck, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { RowActions, useCrud } from "@/components/crud-kit";
import { RecordDialog } from "@/components/record-dialog";
import { useQualityDoc } from "@/components/quality-doc-dialog";
import { exportCsv } from "@/lib/crud";
import { StatusPill, fmtCompact, fmtINR } from "@/components/projects/shared";
import {
  useGst, fileReturn, generateIrn, upsertGst, deleteGst, prepareReturn,
  cancelIrn, cancelEwayBill, updateEwbVehicle, acceptItcAs2b, reconcileItc,
} from "@/lib/gst/store";
import { GST_SCHEMAS } from "@/lib/gst/schemas";
import { useGstOptions } from "@/lib/gst/options";
import {
  returnDocument, eInvoiceDocument, eWayBillDocument, itcDocument, hsnDocument, registrationDocument,
} from "@/lib/gst/documents";
import { syncGstFromFinance, postGstSettlement } from "@/lib/gst/sync";
import { GstCopilotSection } from "@/components/gst/copilot-section";

const SECTIONS: Record<string, { title: string; blurb: string }> = {
  returns: { title: "Returns & Filing", blurb: "Period-wise GSTR-1, GSTR-3B and GSTR-2B status with ARN tracking." },
  "e-invoicing": { title: "e-Invoicing (IRN)", blurb: "IRP registration status, acknowledgement numbers and failure reasons." },
  "e-way-bills": { title: "e-Way Bills", blurb: "Consignment movement, validity windows and transporter details." },
  itc: { title: "ITC Reconciliation", blurb: "Books vs GSTR-2B matching with claimable input tax credit." },
  hsn: { title: "HSN Summary", blurb: "HSN/SAC-wise outward supply summary for GSTR-1 Table 12." },
  registrations: { title: "Registrations", blurb: "All GSTINs held by the entity across states." },
  copilot: { title: "AI Copilot", blurb: "Compliance intelligence grounded in the live finance ledger." },
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{count} records</Badge>
          {action}
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
  if (section === "copilot") return <GstCopilotSection />;
  return <GstSectionBody />;
}

function GstSectionBody() {
  const { section } = Route.useParams();
  const s = useGst((x) => x);
  const options = useGstOptions();
  const crud = useCrud(GST_SCHEMAS, upsertGst, deleteGst, options);
  const doc = useQualityDoc();
  const [q, setQ] = useState("");
  const [ewbEdit, setEwbEdit] = useState<string | null>(null);
  const match = (...vals: (string | undefined)[]) =>
    !q || vals.some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase()));

  const searchBox = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-8 w-44 pl-8 text-xs" />
    </div>
  );

  const exportBtn = (name: string, rows: unknown[]) => (
    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
      onClick={() => { exportCsv(name, rows as Array<Record<string, unknown>>); toast.success("Export downloaded"); }}>
      <Download className="h-3.5 w-3.5" /> Export
    </Button>
  );

  const syncBtn = (
    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
      onClick={() => {
        const r = syncGstFromFinance();
        toast.success(`Synced from Finance — ${r.eInvoices} invoice(s), ${r.itcLines} ITC line(s), ${r.periods} period(s)`);
      }}>
      <Link2 className="h-3.5 w-3.5" /> Sync from Finance
    </Button>
  );

  const newBtn = (key: string, label: string, defaults?: Record<string, unknown>) => (
    <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => crud.openNew(key, label, defaults)}>
      <Plus className="h-3.5 w-3.5" /> {label}
    </Button>
  );

  const tail = (
    <>
      {crud.dialogs}
      {doc.dialog}
    </>
  );

  if (section === "returns") {
    const rows = s.returns.filter((r) => match(r.type, r.period, r.gstin, r.arn)).slice().reverse();
    return (
      <>
        <SectionShell section={section} count={rows.length}
          action={<>{searchBox}{syncBtn}{exportBtn("gst-returns", rows)}{newBtn("returns", "New Return", { status: "not-started", cess: 0 })}</>}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return</TableHead><TableHead>Period</TableHead><TableHead>GSTIN</TableHead>
                <TableHead>Due</TableHead><TableHead className="text-right">Taxable</TableHead>
                <TableHead className="text-right">Total Tax</TableHead><TableHead>ARN</TableHead>
                <TableHead>Status</TableHead><TableHead className="w-44" />
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
                  <TableCell className="text-right tabular-nums">{fmtCompact(r.igst + r.cgst + r.sgst + r.cess)}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{r.arn ?? "—"}</TableCell>
                  <TableCell><StatusPill status={r.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {r.status !== "filed" && r.status !== "ready" && r.type !== "GSTR-2B" && (
                        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                          onClick={() => { prepareReturn(r.id); toast.success(`${r.type} ${r.period} prepared`); }}>
                          <Send className="h-3.5 w-3.5" /> Prepare
                        </Button>
                      )}
                      {r.status !== "filed" && r.type !== "GSTR-2B" && (
                        <Button size="sm" className="h-7 gap-1.5 text-xs"
                          onClick={() => {
                            fileReturn(r.id);
                            const j = r.type === "GSTR-3B" ? postGstSettlement(r.period) : null;
                            toast.success(j
                              ? `${r.type} ${r.period} filed — journal ${j.code} posted for ${fmtINR(j.amount)}`
                              : `${r.type} ${r.period} filed.`);
                          }}>
                          <FileCheck2 className="h-3.5 w-3.5" /> File
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Print return" onClick={() => doc.show(returnDocument(r))}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <RowActions
                        onEdit={() => crud.openEdit("returns", { ...r }, `Edit ${r.type} ${r.period}`)}
                        onDelete={() => crud.askDelete("returns", r.id, `${r.type} ${r.period}`)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionShell>
        {tail}
      </>
    );
  }

  if (section === "e-invoicing") {
    const rows = s.eInvoices.filter((e) => match(e.invoiceNo, e.customer, e.gstin, e.irn));
    return (
      <>
        <SectionShell section={section} count={rows.length}
          action={<>{searchBox}{syncBtn}{exportBtn("e-invoices", rows)}{newBtn("eInvoices", "New e-Invoice", { status: "pending", date: new Date().toISOString().slice(0, 10) })}</>}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead>
                <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">Tax</TableHead>
                <TableHead>IRN / Ack</TableHead><TableHead>Status</TableHead><TableHead className="w-40" />
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
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {e.status !== "generated" && e.status !== "cancelled" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => { generateIrn(e.id); toast.success(`IRN generated for ${e.invoiceNo}.`); }}>
                          Generate IRN
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Print acknowledgement" onClick={() => doc.show(eInvoiceDocument(e))}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <RowActions
                        onEdit={() => crud.openEdit("eInvoices", { ...e }, `Edit ${e.invoiceNo}`)}
                        onDelete={() => crud.askDelete("eInvoices", e.id, e.invoiceNo)}
                        extra={e.status === "generated" ? (
                          <>
                            <DropdownMenuItem onClick={() => { cancelIrn(e.id); toast.success("IRN cancelled on IRP"); }}>
                              <Ban className="mr-2 h-4 w-4" /> Cancel IRN
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        ) : undefined}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionShell>
        {tail}
      </>
    );
  }

  if (section === "e-way-bills") {
    const rows = s.eWayBills.filter((e) => match(e.ewbNo, e.invoiceNo, e.toPlace, e.vehicleNo, e.transporter));
    const target = s.eWayBills.find((e) => e.id === ewbEdit);
    return (
      <>
        <SectionShell section={section} count={rows.length}
          action={<>{searchBox}{exportBtn("e-way-bills", rows)}{newBtn("eWayBills", "New e-Way Bill", { status: "active", fromPlace: "Chakan, Pune", date: new Date().toISOString().slice(0, 10) })}</>}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>EWB No.</TableHead><TableHead>Invoice</TableHead><TableHead>Route</TableHead>
                <TableHead className="text-right">Distance</TableHead><TableHead>Vehicle</TableHead>
                <TableHead>Transporter</TableHead><TableHead className="text-right">Value</TableHead>
                <TableHead>Valid Upto</TableHead><TableHead>Status</TableHead><TableHead className="w-24" />
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
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Print e-way bill" onClick={() => doc.show(eWayBillDocument(e))}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <RowActions
                        onEdit={() => crud.openEdit("eWayBills", { ...e }, `Edit ${e.ewbNo}`)}
                        onDelete={() => crud.askDelete("eWayBills", e.id, e.ewbNo)}
                        extra={
                          <>
                            <DropdownMenuItem onClick={() => setEwbEdit(e.id)}>
                              <Truck className="mr-2 h-4 w-4" /> Update vehicle / extend
                            </DropdownMenuItem>
                            {e.status === "active" && (
                              <DropdownMenuItem onClick={() => { cancelEwayBill(e.id); toast.success("e-Way bill cancelled"); }}>
                                <Ban className="mr-2 h-4 w-4" /> Cancel EWB
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionShell>
        <RecordDialog
          open={!!target}
          onOpenChange={(v) => !v && setEwbEdit(null)}
          title={`Part-B update — ${target?.ewbNo ?? ""}`}
          fields={GST_SCHEMAS.vehicleUpdate}
          initial={target ? { vehicleNo: target.vehicleNo, validUpto: target.validUpto } : undefined}
          onSubmit={(v) => {
            if (target) {
              updateEwbVehicle(target.id, { vehicleNo: String(v.vehicleNo ?? ""), validUpto: String(v.validUpto ?? "") });
              toast.success("Vehicle updated and validity extended");
            }
            setEwbEdit(null);
          }}
        />
        {tail}
      </>
    );
  }

  if (section === "itc") {
    const rows = s.itc.filter((i) => match(i.supplier, i.gstin, i.invoiceNo));
    const claimable = rows.reduce((a, r) => a + r.itcClaimable, 0);
    return (
      <>
        <SectionShell
          section={section}
          count={rows.length}
          action={
            <>
              <Badge variant="outline" className="border-success/40 bg-success/10 text-[10px] text-success">
                {fmtINR(claimable)} claimable
              </Badge>
              {searchBox}
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => {
                const ex = reconcileItc();
                toast.success(ex ? `Reconciled — ${ex} exception(s)` : "Reconciled — all lines matched");
              }}>
                <Link2 className="h-3.5 w-3.5" /> Reconcile 2B
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => doc.show(itcDocument(rows))}>
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
              {exportBtn("itc-reconciliation", rows)}
              {newBtn("itc", "Add ITC Line", { date: new Date().toISOString().slice(0, 10) })}
            </>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead><TableHead>Invoice</TableHead><TableHead>Date</TableHead>
                <TableHead className="text-right">Books</TableHead><TableHead className="text-right">GSTR-2B</TableHead>
                <TableHead className="text-right">Variance</TableHead><TableHead className="text-right">ITC Claimable</TableHead>
                <TableHead>Match</TableHead><TableHead className="w-28" />
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
                    <TableCell className="text-right font-medium tabular-nums">{fmtCompact(i.itcClaimable)}</TableCell>
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
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {i.match !== "matched" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => { acceptItcAs2b(i.id); toast.success("Books aligned to GSTR-2B"); }}>
                            Accept 2B
                          </Button>
                        )}
                        <RowActions
                          onEdit={() => crud.openEdit("itc", { ...i }, `Edit ${i.invoiceNo}`)}
                          onDelete={() => crud.askDelete("itc", i.id, i.invoiceNo)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionShell>
        {tail}
      </>
    );
  }

  if (section === "hsn") {
    const rows = s.hsn.filter((h) => match(h.hsn, h.description));
    return (
      <>
        <SectionShell section={section} count={rows.length}
          action={
            <>
              {searchBox}
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => doc.show(hsnDocument(rows))}>
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
              {exportBtn("hsn-summary", rows)}
              {newBtn("hsn", "Add HSN Line", { uom: "EA", rate: "18" })}
            </>
          }>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HSN / SAC</TableHead><TableHead>Description</TableHead><TableHead>UoM</TableHead>
                <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Taxable</TableHead>
                <TableHead className="text-right">Rate</TableHead><TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono text-xs font-medium">{h.hsn}</TableCell>
                  <TableCell className="text-sm">{h.description}</TableCell>
                  <TableCell className="text-xs">{h.uom}</TableCell>
                  <TableCell className="text-right tabular-nums">{h.qty.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCompact(h.taxableValue)}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{h.rate}%</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCompact(h.igst)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCompact(h.cgst)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCompact(h.sgst)}</TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => crud.openEdit("hsn", { ...h, rate: String(h.rate) }, `Edit ${h.hsn}`)}
                      onDelete={() => crud.askDelete("hsn", h.id, h.hsn)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionShell>
        {tail}
      </>
    );
  }

  const rows = s.registrations.filter((r) => match(r.gstin, r.legalName, r.tradeName, r.state));
  return (
    <>
      <SectionShell section="registrations" count={rows.length}
        action={<>{searchBox}{exportBtn("gst-registrations", rows)}{newBtn("registrations", "New Registration", { status: "active", type: "Regular" })}</>}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GSTIN</TableHead><TableHead>Legal / Trade name</TableHead><TableHead>State</TableHead>
              <TableHead>Type</TableHead><TableHead>Registered</TableHead><TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-medium">
                  {r.gstin}
                  {r.primary && <Badge variant="outline" className="ml-2 text-[10px]">Primary</Badge>}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{r.legalName}</div>
                  <div className="text-[11px] text-muted-foreground">{r.tradeName}</div>
                </TableCell>
                <TableCell className="text-xs">{r.state}</TableCell>
                <TableCell className="text-xs">{r.type}</TableCell>
                <TableCell className="tabular-nums text-xs">{r.registeredOn}</TableCell>
                <TableCell><StatusPill status={r.status} /></TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-0.5">
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Print registration" onClick={() => doc.show(registrationDocument(r))}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <RowActions
                      onEdit={() => crud.openEdit("registrations", { ...r }, `Edit ${r.gstin}`)}
                      onDelete={() => crud.askDelete("registrations", r.id, r.gstin)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionShell>
      {tail}
    </>
  );
}
