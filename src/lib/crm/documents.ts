import type { QualityDocument } from "@/lib/quality/documents";
import type { EntityKind } from "./types";
import { quotationTotals } from "./workflow";

const d = (v?: unknown) =>
  v
    ? new Date(v as string).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const money = (v: unknown, cur = "INR") =>
  v === undefined || v === null || v === ""
    ? "—"
    : `${cur === "INR" ? "₹" : cur + " "}${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const s = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));

const contact = (r: Record<string, unknown>) => [
  { label: "Customer", value: s(r.customerName) },
  { label: "Contact", value: s(r.contactPerson) },
  { label: "Email", value: s(r.contactEmail) },
  { label: "Phone", value: s(r.contactPhone) },
  { label: "Owner", value: s(r.owner) },
  { label: "Status", value: String(r.status ?? r.stage ?? "—").toUpperCase() },
];

const DOC_KIND: Record<EntityKind, string> = {
  customers: "Customer Profile",
  leads: "Lead Sheet",
  opportunities: "Opportunity Brief",
  rfqs: "RFQ Summary",
  proposals: "Technical & Commercial Proposal",
  quotations: "Quotation",
  oas: "Order Acceptance",
  salesOrders: "Sales Order",
};

/** Build a printable / downloadable document for any CRM record. */
export function crmDocument(kind: EntityKind, r: Record<string, unknown>): QualityDocument {
  const code = String(r.code ?? "DOC");
  const title = String(r.title ?? r.name ?? code);
  const base: QualityDocument = {
    kind: DOC_KIND[kind],
    docNo: code,
    title,
    meta: contact(r),
    filename: `${code}-${kind}.html`,
  };

  switch (kind) {
    case "quotations": {
      const t = quotationTotals(r);
      const cur = String(r.currency ?? "INR");
      return {
        ...base,
        meta: [
          ...contact(r),
          { label: "Revision", value: s(r.revision ?? 1) },
          { label: "Valid Until", value: d(r.validity) },
          { label: "Payment Terms", value: s(r.paymentTerms) },
          { label: "Delivery Terms", value: s(r.deliveryTerms) },
          { label: "Currency", value: cur },
        ],
        table: {
          columns: ["Description", "Amount"],
          rows: [
            ["Base value", money(t.base, cur)],
            [`Discount (${s(r.discountPct ?? 0)}%)`, `- ${money(t.discount, cur)}`],
            ["Net value", money(t.net, cur)],
            ["Freight", money(t.freight, cur)],
            [`GST (${s(r.taxPct ?? 18)}%)`, money(t.tax, cur)],
            ["Grand total", money(t.grand, cur)],
          ],
        },
        notes: [
          { label: "Scope", value: s(r.scope ?? title) },
          { label: "Terms", value: "Prices firm within validity. Taxes extra as applicable. Subject to Pune jurisdiction." },
        ],
      };
    }
    case "proposals":
      return {
        ...base,
        meta: [
          ...contact(r),
          { label: "Template", value: s(r.template) },
          { label: "Version", value: s(r.version) },
          { label: "Indicative Value", value: money(r.value) },
        ],
        notes: [
          { label: "Executive Summary", value: s(r.executiveSummary) },
          { label: "Scope of Supply", value: s(r.scope) },
          { label: "Deliverables", value: s(r.deliverables) },
          { label: "Methodology", value: s(r.methodology) },
          { label: "Timeline", value: s(r.timeline) },
          { label: "Assumptions", value: s(r.assumptions) },
          { label: "Terms & Conditions", value: s(r.terms) },
        ],
      };
    case "oas":
      return {
        ...base,
        meta: [
          ...contact(r),
          { label: "Order Value", value: money(r.value) },
          { label: "Customer PO #", value: s(r.poNumber) },
          { label: "PO Date", value: d(r.poDate) },
          { label: "Project", value: s(r.projectId ? "Provisioned" : "Pending approval") },
        ],
      };
    case "salesOrders":
      return {
        ...base,
        meta: [
          ...contact(r),
          { label: "Order Value", value: money(r.value) },
          { label: "Customer PO #", value: s(r.poNumber) },
          { label: "Delivery Date", value: d(r.deliveryDate) },
          { label: "Payment Terms", value: s(r.paymentTerms) },
          { label: "Project", value: s(r.projectCode) },
        ],
      };
    case "rfqs":
      return {
        ...base,
        meta: [...contact(r), { label: "Due Date", value: d(r.dueDate) }],
        notes: [
          { label: "Scope / Products", value: s(r.scope) },
          { label: "Delivery Schedule", value: s(r.deliverySchedule) },
          { label: "Commercial Terms", value: s(r.commercialTerms) },
        ],
      };
    case "opportunities":
      return {
        ...base,
        meta: [
          ...contact(r),
          { label: "Value", value: money(r.value) },
          { label: "Probability", value: `${s(r.probability)}%` },
          { label: "Stage", value: s(r.stage) },
          { label: "Expected Close", value: d(r.expectedClose) },
        ],
      };
    case "leads":
      return {
        ...base,
        meta: [
          ...contact(r),
          { label: "Source", value: s(r.source) },
          { label: "Campaign", value: s(r.campaign) },
          { label: "Est. Value", value: money(r.estValue) },
          { label: "Score", value: s(r.score) },
        ],
      };
    default:
      return {
        ...base,
        meta: [
          ...contact(r),
          { label: "Segment", value: s(r.segment) },
          { label: "Region", value: s(r.region) },
          { label: "GSTIN", value: s(r.gstin) },
          { label: "Annual Revenue", value: money(r.annualRevenue) },
        ],
      };
  }
}

/** Compose a mailto: link with the record summary prefilled. */
export function crmMailto(kind: EntityKind, r: Record<string, unknown>) {
  const doc = crmDocument(kind, r);
  const body = [
    `Dear ${String(r.contactPerson ?? r.customerName ?? "Sir/Madam")},`,
    "",
    `Please find below the details of ${doc.kind} ${doc.docNo} — ${doc.title}.`,
    "",
    ...doc.meta.map((m) => `${m.label}: ${m.value}`),
    ...(doc.table ? ["", ...doc.table.rows.map((row) => row.join(": "))] : []),
    "",
    "Regards,",
    String(r.owner ?? "Sales Team"),
    "Faith Automation Pvt. Ltd.",
  ].join("\n");
  return `mailto:${String(r.contactEmail ?? "")}?subject=${encodeURIComponent(
    `${doc.kind} ${doc.docNo} — ${doc.title}`,
  )}&body=${encodeURIComponent(body)}`;
}
