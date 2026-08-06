import type { QualityDocument } from "@/lib/quality/documents";
import type { Registration, ReturnPeriod, EInvoice, EWayBill, ItcLine, HsnSummaryLine } from "./types";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const d = (v?: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function returnDocument(r: ReturnPeriod): QualityDocument {
  const total = r.igst + r.cgst + r.sgst + r.cess;
  return {
    kind: `${r.type} Return`,
    docNo: `${r.type}/${r.period}`,
    title: `${r.type} for period ${r.period}`,
    meta: [
      { label: "GSTIN", value: r.gstin },
      { label: "Period", value: r.period },
      { label: "Due date", value: d(r.dueDate) },
      { label: "Filed on", value: d(r.filedOn) },
      { label: "Status", value: r.status.toUpperCase() },
      { label: "ARN", value: r.arn ?? "—" },
    ],
    table: {
      columns: ["Particulars", "Amount"],
      rows: [
        ["Taxable value", inr(r.taxableValue)],
        ["IGST", inr(r.igst)],
        ["CGST", inr(r.cgst)],
        ["SGST", inr(r.sgst)],
        ["Cess", inr(r.cess)],
        ["Total tax", inr(total)],
      ],
    },
    filename: `${r.type}-${r.period}.html`,
  };
}

export function eInvoiceDocument(e: EInvoice): QualityDocument {
  return {
    kind: "e-Invoice (IRN) Acknowledgement",
    docNo: e.invoiceNo,
    title: `${e.customer} — ${e.gstin}`,
    meta: [
      { label: "Invoice date", value: d(e.date) },
      { label: "Customer", value: e.customer },
      { label: "Customer GSTIN", value: e.gstin },
      { label: "IRN", value: e.irn ?? "—" },
      { label: "Ack no.", value: e.ackNo ?? "—" },
      { label: "Status", value: e.status.toUpperCase() },
    ],
    table: {
      columns: ["Particulars", "Amount"],
      rows: [
        ["Taxable value", inr(e.taxableValue)],
        ["Total tax", inr(e.totalTax)],
        ["Invoice total", inr(e.taxableValue + e.totalTax)],
      ],
    },
    notes: e.errorMsg ? [{ label: "IRP response", value: e.errorMsg }] : undefined,
    filename: `${e.invoiceNo.replace(/\//g, "-")}-irn.html`,
  };
}

export function eWayBillDocument(e: EWayBill): QualityDocument {
  return {
    kind: "e-Way Bill",
    docNo: e.ewbNo,
    title: `${e.fromPlace} → ${e.toPlace}`,
    meta: [
      { label: "Invoice", value: e.invoiceNo },
      { label: "Date", value: d(e.date) },
      { label: "Valid upto", value: d(e.validUpto) },
      { label: "Distance", value: `${e.distanceKm} km` },
      { label: "Vehicle", value: e.vehicleNo },
      { label: "Transporter", value: e.transporter },
      { label: "Status", value: e.status.toUpperCase() },
    ],
    table: {
      columns: ["Particulars", "Value"],
      rows: [["Consignment value", inr(e.value)]],
    },
    filename: `${e.ewbNo.replace(/\s/g, "")}-ewb.html`,
  };
}

export function itcDocument(rows: ItcLine[]): QualityDocument {
  const claimable = rows.reduce((a, r) => a + r.itcClaimable, 0);
  return {
    kind: "ITC Reconciliation",
    docNo: `ITC/${new Date().toISOString().slice(0, 7)}`,
    title: "Books vs GSTR-2B input tax credit reconciliation",
    meta: [
      { label: "Lines", value: String(rows.length) },
      { label: "Total claimable ITC", value: inr(claimable) },
      { label: "Exceptions", value: String(rows.filter((r) => r.match !== "matched").length) },
    ],
    table: {
      columns: ["Supplier", "Invoice", "Books", "GSTR-2B", "Claimable", "Match"],
      rows: rows.map((r) => [r.supplier, r.invoiceNo, inr(r.bookValue), inr(r.gstr2bValue), inr(r.itcClaimable), r.match]),
    },
    filename: "itc-reconciliation.html",
  };
}

export function hsnDocument(rows: HsnSummaryLine[]): QualityDocument {
  const taxable = rows.reduce((a, r) => a + r.taxableValue, 0);
  return {
    kind: "HSN Summary (GSTR-1 Table 12)",
    docNo: `HSN/${new Date().toISOString().slice(0, 7)}`,
    title: "HSN / SAC-wise outward supply summary",
    meta: [
      { label: "Lines", value: String(rows.length) },
      { label: "Total taxable value", value: inr(taxable) },
    ],
    table: {
      columns: ["HSN", "Description", "UoM", "Qty", "Taxable", "Rate", "IGST", "CGST", "SGST"],
      rows: rows.map((r) => [
        r.hsn, r.description, r.uom, String(r.qty), inr(r.taxableValue), `${r.rate}%`,
        inr(r.igst), inr(r.cgst), inr(r.sgst),
      ]),
    },
    filename: "hsn-summary.html",
  };
}

export function registrationDocument(r: Registration): QualityDocument {
  return {
    kind: "GST Registration",
    docNo: r.gstin,
    title: r.legalName,
    meta: [
      { label: "Trade name", value: r.tradeName },
      { label: "State", value: r.state },
      { label: "Type", value: r.type },
      { label: "Registered on", value: d(r.registeredOn) },
      { label: "Status", value: r.status.toUpperCase() },
      { label: "Primary", value: r.primary ? "Yes" : "No" },
    ],
    filename: `${r.gstin}.html`,
  };
}
