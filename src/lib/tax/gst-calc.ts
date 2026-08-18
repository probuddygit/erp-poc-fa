/**
 * GST computation helpers — HSN/SAC resolution, CGST/SGST/IGST/cess split and
 * HSN-wise summaries shared by CRM documents (Sales Order, Quotation, OA) and
 * Finance customer invoices.
 */

export const COMPANY_STATE = "Tamil Nadu";

export interface HsnInfo {
  hsn: string;
  description: string;
  gst: number;
  cess?: number;
}

/** Master catalogue of HSN / SAC codes used across the platform. */
export const HSN_CATALOGUE: HsnInfo[] = [
  { hsn: "7208", description: "Flat-rolled iron / non-alloy steel products", gst: 18 },
  { hsn: "7318", description: "Screws, bolts, nuts and fasteners of iron or steel", gst: 18 },
  { hsn: "8311", description: "Welding wire, rods and coated electrodes", gst: 18 },
  { hsn: "8428", description: "Lifting, handling and conveying machinery", gst: 18 },
  { hsn: "8431", description: "Parts for lifting / handling machinery — spares", gst: 18 },
  { hsn: "8479", description: "Machines with individual functions — automation cells", gst: 18 },
  { hsn: "8504", description: "Electrical transformers, converters and drives", gst: 18 },
  { hsn: "8537", description: "Boards, panels and consoles for electric control", gst: 18 },
  { hsn: "8544", description: "Insulated wire, cable and connectors", gst: 18 },
  { hsn: "8703", description: "Motor vehicles for transport of persons", gst: 28, cess: 15 },
  { hsn: "9031", description: "Measuring / checking instruments and gauges", gst: 18 },
  { hsn: "9954", description: "Construction and erection services (SAC)", gst: 18 },
  { hsn: "9983", description: "Other professional, technical and engineering services (SAC)", gst: 18 },
  { hsn: "9987", description: "Maintenance, repair and installation services (SAC)", gst: 18 },
];

export function hsnInfo(code?: string): HsnInfo | undefined {
  if (!code) return undefined;
  const c = String(code).trim();
  return HSN_CATALOGUE.find((h) => h.hsn === c);
}

export function isValidHsn(code?: string): boolean {
  const c = String(code ?? "").trim();
  return /^\d{4,8}$/.test(c);
}

/** Karnataka-style loose matching — anything that is not our own state is inter-state. */
export function isInterState(customerRegionOrState?: string): boolean {
  const v = String(customerRegionOrState ?? "").toLowerCase();
  if (!v) return false;
  return !v.includes(COMPANY_STATE.toLowerCase());
}

export interface TaxableLine {
  itemCode?: string;
  description?: string;
  uom?: string;
  qty?: number;
  hsn?: string;
  gstRate?: number;
  cessRate?: number;
  /** Fallback tax rate used by legacy line items. */
  taxPct?: number;
  /** Net taxable amount after discount. */
  taxable: number;
}

export interface LineTax {
  hsn: string;
  taxable: number;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeLineTax(line: TaxableLine, interState: boolean): LineTax {
  const info = hsnInfo(line.hsn);
  const rate = Number(line.gstRate ?? info?.gst ?? line.taxPct ?? 0);
  const cessRate = Number(line.cessRate ?? info?.cess ?? 0);
  const taxable = Number(line.taxable || 0);
  const tax = (taxable * rate) / 100;
  const cess = r2((taxable * cessRate) / 100);
  const igst = interState ? r2(tax) : 0;
  const cgst = interState ? 0 : r2(tax / 2);
  const sgst = interState ? 0 : r2(tax / 2);
  return {
    hsn: String(line.hsn ?? "").trim(),
    taxable: r2(taxable),
    rate,
    cgst,
    sgst,
    igst,
    cess,
    total: r2(taxable + cgst + sgst + igst + cess),
  };
}

export interface HsnSummaryRow {
  hsn: string;
  description: string;
  uom: string;
  qty: number;
  taxable: number;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
}

export interface TaxSummary {
  interState: boolean;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  grandTotal: number;
  rows: LineTax[];
  hsnRows: HsnSummaryRow[];
}

export function summariseTax(lines: TaxableLine[], interState: boolean): TaxSummary {
  const rows = lines.map((l) => computeLineTax(l, interState));
  const byHsn = new Map<string, HsnSummaryRow>();
  lines.forEach((l, i) => {
    const t = rows[i]!;
    const key = `${t.hsn || "—"}|${t.rate}`;
    const info = hsnInfo(t.hsn);
    const row = byHsn.get(key) ?? {
      hsn: t.hsn || "—",
      description: info?.description ?? l.description ?? "—",
      uom: l.uom ?? "Nos",
      qty: 0,
      taxable: 0,
      rate: t.rate,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
    };
    row.qty += Number(l.qty || 0);
    row.taxable += t.taxable;
    row.cgst += t.cgst;
    row.sgst += t.sgst;
    row.igst += t.igst;
    row.cess += t.cess;
    byHsn.set(key, row);
  });

  const sum = (k: keyof LineTax) => r2(rows.reduce((a, r) => a + Number(r[k] || 0), 0));
  const taxable = sum("taxable");
  const cgst = sum("cgst");
  const sgst = sum("sgst");
  const igst = sum("igst");
  const cess = sum("cess");
  const totalTax = r2(cgst + sgst + igst + cess);
  return {
    interState,
    taxable,
    cgst,
    sgst,
    igst,
    cess,
    totalTax,
    grandTotal: r2(taxable + totalTax),
    rows,
    hsnRows: [...byHsn.values()].sort((a, b) => a.hsn.localeCompare(b.hsn)),
  };
}

export interface TaxValidationIssue {
  index: number;
  label: string;
  problem: string;
}

/** Blocks document generation when HSN/SAC or GST rate is missing or malformed. */
export function validateTaxLines(
  lines: Array<TaxableLine & { itemCode?: string; description?: string }>,
): TaxValidationIssue[] {
  const issues: TaxValidationIssue[] = [];
  lines.forEach((l, index) => {
    const label = l.itemCode || l.description || `Line ${index + 1}`;
    if (!String(l.hsn ?? "").trim()) {
      issues.push({ index, label, problem: "HSN/SAC missing — set it on the Item Master." });
      return;
    }
    if (!isValidHsn(l.hsn)) {
      issues.push({ index, label, problem: `HSN/SAC “${l.hsn}” is not a valid 4–8 digit code.` });
    }
    const rate = Number(l.gstRate ?? hsnInfo(l.hsn)?.gst ?? l.taxPct ?? NaN);
    if (!Number.isFinite(rate) || rate <= 0) {
      issues.push({ index, label, problem: "GST rate missing or zero." });
    }
  });
  return issues;
}
