import * as XLSX from "xlsx";
import { crm, logActivity, nextCode, upsertRecord } from "./store";
import { guessCategory, replaceLines, revenue, similarity, type LineItem } from "./revenue";

export interface ParsedPoLine {
  itemCode: string;
  description: string;
  category: string;
  qty: number;
  uom: string;
  rate: number;
  taxPct: number;
  matchedItemCode?: string;
  matchConfidence: number;
}

export interface ParsedPo {
  poNumber: string;
  poDate: string;
  customerName: string;
  title: string;
  currency: string;
  lines: ParsedPoLine[];
  warnings: string[];
  source: "excel" | "csv" | "ocr";
}

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const pick = (row: Record<string, unknown>, keys: string[]) => {
  const entries = Object.entries(row);
  for (const k of keys) {
    const hit = entries.find(([key]) => key.toLowerCase().replace(/[^a-z]/g, "").includes(k));
    if (hit && String(hit[1] ?? "").trim() !== "") return hit[1];
  }
  return undefined;
};

function matchItem(description: string, code?: string) {
  const items = revenue.get().items;
  if (code) {
    const exact = items.find((i) => i.code.toLowerCase() === String(code).toLowerCase());
    if (exact) return { matchedItemCode: exact.code, matchConfidence: 100, rate: exact.rate, category: exact.category, uom: exact.uom };
  }
  const scored = items
    .map((i) => ({ i, s: similarity(description, i.description) }))
    .sort((a, b) => b.s - a.s)[0];
  if (scored && scored.s >= 0.35)
    return {
      matchedItemCode: scored.i.code,
      matchConfidence: Math.round(scored.s * 100),
      rate: scored.i.rate,
      category: scored.i.category,
      uom: scored.i.uom,
    };
  return { matchedItemCode: undefined, matchConfidence: 0, rate: 0, category: guessCategory(description) ?? "General", uom: "Nos" };
}

function toLine(raw: Record<string, unknown>): ParsedPoLine | null {
  const description = String(pick(raw, ["description", "item", "material", "particular", "scope"]) ?? "").trim();
  if (!description) return null;
  const code = pick(raw, ["itemcode", "code", "partno", "sku"]);
  const qty = num(pick(raw, ["qty", "quantity", "nos"])) || 1;
  const rate = num(pick(raw, ["rate", "unitprice", "price"]));
  const m = matchItem(description, code ? String(code) : undefined);
  return {
    itemCode: code ? String(code) : (m.matchedItemCode ?? ""),
    description,
    category: m.category,
    qty,
    uom: String(pick(raw, ["uom", "unit"]) ?? m.uom),
    rate: rate || m.rate,
    taxPct: num(pick(raw, ["tax", "gst"])) || 18,
    matchedItemCode: m.matchedItemCode,
    matchConfidence: m.matchConfidence,
  };
}

function finalise(base: Partial<ParsedPo>, lines: ParsedPoLine[], source: ParsedPo["source"]): ParsedPo {
  const warnings: string[] = [];
  if (!lines.length) warnings.push("No line items could be read from the file — check the header row.");
  lines.forEach((l) => {
    if (!l.matchedItemCode) warnings.push(`“${l.description.slice(0, 40)}” has no matching item code — AI will propose a new code.`);
    if (!l.rate) warnings.push(`“${l.description.slice(0, 40)}” has no rate.`);
  });
  const customers = crm.get().customers;
  let customerName = base.customerName ?? "";
  if (customerName) {
    const hit = customers
      .map((c) => ({ c, s: similarity(customerName, c.name) }))
      .sort((a, b) => b.s - a.s)[0];
    if (hit && hit.s >= 0.4) customerName = hit.c.name;
    else warnings.push(`Customer “${customerName}” is not on the master — it will be created as a prospect.`);
  } else {
    warnings.push("Customer name not detected — select it before importing.");
  }
  return {
    poNumber: base.poNumber ?? "",
    poDate: base.poDate ?? new Date().toISOString(),
    customerName,
    title: base.title ?? (lines[0]?.description ?? "Customer purchase order"),
    currency: base.currency ?? "INR",
    lines,
    warnings: Array.from(new Set(warnings)),
    source,
  };
}

/** Parse an Excel (.xlsx/.xls) or CSV purchase order into a structured draft. */
export async function parsePoFile(file: File): Promise<ParsedPo> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const flat = XLSX.utils.sheet_to_csv(sheet);
  const header = headerFacts(flat);
  const lines = rows.map(toLine).filter(Boolean) as ParsedPoLine[];
  return finalise(header, lines, file.name.toLowerCase().endsWith(".csv") ? "csv" : "excel");
}

function headerFacts(text: string): Partial<ParsedPo> {
  const po = text.match(/\b(?:p\.?o\.?\s*(?:no\.?|number)?|purchase\s*order)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/\-]{3,})/i);
  const date = text.match(/\b(?:po\s*)?date\s*[:#-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})/i);
  const cust = text.match(/\b(?:customer|buyer|bill\s*to|sold\s*to|m\/s)\s*[:,-]?\s*([A-Za-z0-9&.\s]{4,60})/i);
  const parsedDate = date?.[1] ? new Date(date[1].replace(/-/g, "/")) : null;
  return {
    poNumber: po?.[1]?.trim(),
    poDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString(),
    customerName: cust?.[1]?.trim().replace(/\s+/g, " "),
  };
}

/**
 * Parse OCR text extracted from a scanned/PDF purchase order. Handles
 * "1  Description  2 Nos  450000" style tabular rows.
 */
export function parsePoText(text: string): ParsedPo {
  const header = headerFacts(text);
  const lines: ParsedPoLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row || /^(sr|s\.?no|item|description|total|sub\s*total|gst|amount in words)/i.test(row)) continue;
    const m = row.match(
      /^(?:\d+[.)]?\s+)?(?:([A-Z]{2,}[A-Z0-9\-]{2,})\s+)?(.+?)\s+([\d,.]+)\s*(Nos|Set|Lot|Mtr|Kg|Hrs|Day|EA|PCS)?\s+([\d,]+(?:\.\d+)?)(?:\s+[\d,]+(?:\.\d+)?)?$/i,
    );
    if (!m) continue;
    const description = m[2]!.trim();
    if (description.length < 4) continue;
    const match = matchItem(description, m[1]);
    lines.push({
      itemCode: m[1] ?? match.matchedItemCode ?? "",
      description,
      category: match.category,
      qty: num(m[3]) || 1,
      uom: m[4] ? m[4].replace(/^EA$|^PCS$/i, "Nos") : match.uom,
      rate: num(m[5]) || match.rate,
      taxPct: 18,
      matchedItemCode: match.matchedItemCode,
      matchConfidence: match.matchConfidence,
    });
  }
  return finalise(header, lines, "ocr");
}

/** Create the Order Acceptance (plus customer + line items) from a parsed PO. */
export function commitParsedPo(po: ParsedPo, owner = "You") {
  const s = crm.get();
  let customer = s.customers.find((c) => c.name === po.customerName);
  if (!customer && po.customerName) {
    const id = upsertRecord("customers", {
      code: nextCode("CUS", s.customers.map((c) => c.code)),
      name: po.customerName,
      segment: "OEM",
      region: "India",
      owner,
      status: "prospect",
      currency: po.currency,
    });
    customer = crm.get().customers.find((c) => c.id === id);
  }

  const net = po.lines.reduce((a, l) => a + l.qty * l.rate, 0);
  const oaId = upsertRecord("oas", {
    code: nextCode("OA", crm.get().oas.map((o) => o.code)),
    title: po.title,
    customerId: customer?.id,
    customerName: po.customerName,
    poNumber: po.poNumber,
    poDate: po.poDate,
    value: Math.round(net),
    owner,
    status: "draft",
  });

  replaceLines(
    "oas",
    oaId,
    po.lines.map<Partial<LineItem>>((l) => ({
      itemCode: l.itemCode || l.matchedItemCode || "",
      description: l.description,
      category: l.category,
      qty: l.qty,
      uom: l.uom,
      rate: l.rate,
      discountPct: 0,
      taxPct: l.taxPct,
    })),
  );

  logActivity(
    "oas",
    oaId,
    "system",
    `Imported from customer PO ${po.poNumber || "(no number)"} via ${po.source.toUpperCase()} — ${po.lines.length} line item(s)`,
    "System",
  );
  return oaId;
}
