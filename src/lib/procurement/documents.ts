import type { Grn, PurchaseOrder, Requisition, Rfq, RfqBid } from "./types";

export interface DocLine {
  description: string;
  qty?: number;
  uom?: string;
  rate?: number;
  amount: number;
}

export interface BusinessDocument {
  kind: "Purchase Order" | "Quotation" | "Tax Invoice" | "Purchase Requisition" | "Request for Quotation";
  docNo: string;
  title: string;
  partyName: string;
  partyEmail?: string;
  meta: Array<{ label: string; value: string }>;
  lines: DocLine[];
  currency: string;
  total: number;
  notes?: string;
  filename: string;
}

const COMPANY = {
  name: "Faith Automation Pvt. Ltd.",
  line1: "BIW Systems & Industrial Automation",
  line2: "Plot 42, MIDC Chakan, Pune 410501, India",
  gstin: "GSTIN 27AABCF1234H1ZQ",
};

function money(currency: string, n: number) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString("en-IN")}`;
  }
}

const d = (v?: string) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export function requisitionDocument(pr: Requisition): BusinessDocument {
  const lines: DocLine[] = pr.lines.length
    ? pr.lines.map((l) => ({
        description: `${l.itemCode} — ${l.description}`,
        qty: l.qty,
        uom: l.uom,
        rate: l.estRate,
        amount: l.estRate * l.qty,
      }))
    : [{ description: pr.title, amount: pr.totalEst }];
  return {
    kind: "Purchase Requisition",
    docNo: pr.code,
    title: `Purchase Requisition ${pr.code} — ${pr.title}`,
    partyName: pr.department,
    meta: [
      { label: "Raised On", value: d(pr.createdAt) },
      { label: "Need By", value: d(pr.needBy) },
      { label: "Requested By", value: pr.requestedBy },
      { label: "Approver", value: pr.approver || "—" },
      { label: "Project", value: pr.projectCode ?? "—" },
      { label: "Project Name", value: pr.projectName ?? "—" },
      { label: "Priority", value: pr.priority },
      { label: "Status", value: pr.status },
    ],
    lines,
    currency: "INR",
    total: pr.totalEst || lines.reduce((s, l) => s + l.amount, 0),
    notes: pr.notes,
    filename: `${pr.code}.html`,
  };
}

export function rfqDocument(rfq: Rfq): BusinessDocument {
  const invited = rfq.vendorNames?.length ? rfq.vendorNames.join(", ") : `${rfq.vendorCount} vendors`;
  return {
    kind: "Request for Quotation",
    docNo: rfq.code,
    title: `Request for Quotation ${rfq.code} — ${rfq.title}`,
    partyName: invited,
    meta: [
      { label: "Issued", value: d(rfq.issuedAt) },
      { label: "Response Due", value: d(rfq.dueAt) },
      { label: "Buyer", value: rfq.buyer },
      { label: "Source PR", value: rfq.requisitionCode ?? "—" },
      { label: "Project", value: rfq.projectCode ?? "—" },
      { label: "Project Name", value: rfq.projectName ?? "—" },
      { label: "Vendors Invited", value: String(rfq.vendorCount || rfq.vendorNames?.length || 0) },
      { label: "Status", value: rfq.status.replace(/-/g, " ") },
    ],
    lines: [{ description: rfq.title, amount: rfq.bids.length ? Math.min(...rfq.bids.map((b) => b.amount)) : 0 }],
    currency: "INR",
    total: rfq.bids.length ? Math.min(...rfq.bids.map((b) => b.amount)) : 0,
    notes:
      "Please submit your commercial and technical offer before the response due date, quoting the RFQ number in all correspondence. Prices to be quoted in INR, inclusive of applicable taxes shown separately.",
    filename: `${rfq.code}.html`,
  };
}

export function poDocument(po: PurchaseOrder): BusinessDocument {
  const lines: DocLine[] = po.lines.length
    ? po.lines.map((l) => ({ description: `${l.itemCode} — ${l.description}`, qty: l.qty, uom: l.uom, rate: l.rate, amount: l.amount }))
    : [{ description: po.projectCode ? `Supply as per PO scope (${po.projectCode})` : "Supply as per agreed PO scope", amount: po.amount }];
  return {
    kind: "Purchase Order",
    docNo: po.code,
    title: `Purchase Order ${po.code}`,
    partyName: po.vendorName,
    meta: [
      { label: "PO Date", value: d(po.createdAt) },
      { label: "Promised Delivery", value: d(po.promisedDate) },
      { label: "Buyer", value: po.buyer },
      { label: "Project", value: po.projectCode ?? "—" },
      { label: "Payment Terms", value: po.paymentTerms || "—" },
      { label: "Incoterms", value: po.incoterms || "—" },
      { label: "Source RFQ", value: po.rfqCode ?? "—" },
      { label: "Status", value: po.status },
    ],
    lines,
    currency: po.currency || "INR",
    total: po.amount,
    notes: po.amendments.length ? `Amendments on record: ${po.amendments.map((a) => a.reason).join("; ")}` : undefined,
    filename: `${po.code}.html`,
  };
}

export function quotationDocument(rfq: Rfq, bid: RfqBid): BusinessDocument {
  return {
    kind: "Quotation",
    docNo: `QT-${rfq.code.replace(/^RFQ-/, "")}-${bid.vendorId.toUpperCase()}`,
    title: `Quotation against ${rfq.code} — ${rfq.title}`,
    partyName: bid.vendorName,
    meta: [
      { label: "RFQ", value: rfq.code },
      { label: "Buyer", value: rfq.buyer },
      { label: "Issued", value: d(rfq.issuedAt) },
      { label: "Quote Valid Until", value: d(bid.validity) },
      { label: "Lead Time", value: `${bid.leadTimeDays} days` },
      { label: "Payment Terms", value: bid.paymentTerms || "—" },
      { label: "Project", value: rfq.projectCode ?? "—" },
      { label: "Evaluation Score", value: `${bid.score}/100` },
    ],
    lines: [{ description: rfq.title, amount: bid.amount }],
    currency: "INR",
    total: bid.amount,
    notes: bid.awarded ? "This quotation has been awarded." : undefined,
    filename: `${rfq.code}-${bid.vendorName.replace(/[^a-z0-9]+/gi, "-")}.html`,
  };
}

/** Vendor tax invoice copy attached to a goods receipt. */
export function invoiceDocument(grn: Grn, po?: PurchaseOrder): BusinessDocument {
  const invoiceNo = grn.invoiceNo || `INV-${grn.code}`;
  const taxable = Math.round(grn.amount / 1.18);
  const gst = grn.amount - taxable;
  const lines: DocLine[] = grn.lines.length
    ? grn.lines.map((l) => {
        const rate = l.receivedQty ? Math.round((taxable / (grn.lines.reduce((s, x) => s + x.receivedQty, 0) || 1))) : 0;
        return {
          description: `${l.itemCode} — ${l.description}`,
          qty: l.receivedQty,
          uom: "nos",
          rate,
          amount: rate * l.receivedQty,
        };
      })
    : [{ description: `Supply against ${grn.poCode}`, qty: 1, uom: "lot", rate: taxable, amount: taxable }];
  const linesTotal = lines.reduce((s, l) => s + l.amount, 0);
  lines.push({ description: "GST @ 18% (CGST 9% + SGST 9%)", amount: grn.amount - linesTotal });

  return {
    kind: "Tax Invoice",
    docNo: invoiceNo,
    title: `Tax invoice against ${grn.poCode} · receipt ${grn.code}`,
    partyName: grn.vendorName,
    meta: [
      { label: "Invoice No", value: invoiceNo },
      { label: "Invoice Date", value: d(grn.receivedAt) },
      { label: "GRN", value: grn.code },
      { label: "PO Reference", value: grn.poCode },
      { label: "Received By", value: grn.receivedBy },
      { label: "Match Status", value: grn.invoiceMatch.replace(/-/g, " ") },
      { label: "QC Result", value: grn.qcResult ?? "—" },
      { label: "Payment Terms", value: po?.paymentTerms || "—" },
    ],
    lines,
    currency: po?.currency || "INR",
    total: grn.amount,
    notes: `Taxable value ${money(po?.currency || "INR", taxable)} · GST ${money(po?.currency || "INR", gst)}. Verified through 3-way match (PO ↔ GRN ↔ Invoice).`,
    filename: `${invoiceNo.replace(/[^a-z0-9-]+/gi, "-")}.html`,
  };
}

/** Self-contained, print-ready HTML for a business document. */
export function renderDocumentHtml(doc: BusinessDocument): string {
  const rows = doc.lines
    .map(
      (l, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td>${escapeHtml(l.description)}</td>
        <td class="num">${l.qty ?? "—"}${l.uom ? ` ${escapeHtml(l.uom)}` : ""}</td>
        <td class="num">${l.rate != null ? money(doc.currency, l.rate) : "—"}</td>
        <td class="num">${money(doc.currency, l.amount)}</td>
      </tr>`,
    )
    .join("");

  const meta = doc.meta
    .map((m) => `<div class="meta"><span>${escapeHtml(m.label)}</span><strong>${escapeHtml(m.value)}</strong></div>`)
    .join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${escapeHtml(doc.docNo)}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:32px;font-family:ui-sans-serif,system-ui,"Segoe UI",Arial,sans-serif;color:#0f1a2b;background:#fff;font-size:13px}
  .sheet{max-width:820px;margin:0 auto}
  header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #1e3a5f;padding-bottom:16px}
  h1{margin:0;font-size:18px;letter-spacing:.02em}
  .muted{color:#5b6b80;font-size:11px;line-height:1.5}
  .doctype{text-align:right}
  .doctype h2{margin:0;font-size:15px;text-transform:uppercase;letter-spacing:.12em;color:#1e3a5f}
  .doctype .no{font-family:ui-monospace,monospace;font-size:13px;margin-top:4px}
  .party{margin:20px 0 8px;padding:12px 14px;background:#f4f6f9;border-radius:8px}
  .party .label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#5b6b80}
  .party .name{font-size:15px;font-weight:600;margin-top:2px}
  .metas{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
  .meta{border:1px solid #e3e8ef;border-radius:6px;padding:8px 10px}
  .meta span{display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:#5b6b80}
  .meta strong{font-size:12px;font-weight:600;text-transform:capitalize}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#1e3a5f;color:#fff;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;padding:8px}
  td{padding:8px;border-bottom:1px solid #e3e8ef;vertical-align:top}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  th.num{text-align:right}
  tfoot td{font-weight:700;font-size:14px;border-top:2px solid #1e3a5f;border-bottom:none}
  .notes{margin-top:18px;font-size:11px;color:#5b6b80}
  footer{margin-top:34px;display:flex;justify-content:space-between;font-size:11px;color:#5b6b80;border-top:1px solid #e3e8ef;padding-top:12px}
  @media print{body{padding:0}}
</style></head><body><div class="sheet">
<header>
  <div>
    <h1>${COMPANY.name}</h1>
    <div class="muted">${COMPANY.line1}<br/>${COMPANY.line2}<br/>${COMPANY.gstin}</div>
  </div>
  <div class="doctype">
    <h2>${doc.kind}</h2>
    <div class="no">${escapeHtml(doc.docNo)}</div>
  </div>
</header>
<div class="party">
  <div class="label">${doc.kind === "Quotation" ? "Quotation from" : doc.kind === "Tax Invoice" ? "Invoice from" : "Vendor"}</div>
  <div class="name">${escapeHtml(doc.partyName)}</div>
  <div class="muted">${escapeHtml(doc.title)}</div>
</div>
<div class="metas">${meta}</div>
<table>
  <thead><tr><th>#</th><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td colspan="4" class="num">Total</td><td class="num">${money(doc.currency, doc.total)}</td></tr></tfoot>
</table>
${doc.notes ? `<div class="notes">${escapeHtml(doc.notes)}</div>` : ""}
<footer><span>Generated from Faith Automation ERP</span><span>${new Date().toLocaleString("en-IN")}</span></footer>
</div></body></html>`;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** Plain-text body used for the email action. */
export function documentEmailBody(doc: BusinessDocument): string {
  const lines = doc.meta.map((m) => `${m.label}: ${m.value}`).join("\n");
  return `Dear ${doc.partyName},\n\nPlease find below the details of ${doc.kind.toLowerCase()} ${doc.docNo}.\n\n${lines}\nTotal: ${money(doc.currency, doc.total)}\n\nRegards,\nProcurement\n${COMPANY.name}`;
}
