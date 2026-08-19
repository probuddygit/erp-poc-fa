/**
 * OCR / vision part-number validation.
 *
 * The server route returns raw extracted lines; this module matches them
 * against the item master (project-scoped) and against the source document
 * lines so buyers see exactly what differs before posting.
 */

import { revenue, itemsForProject, type ItemMaster } from "@/lib/crm/revenue";
import { inventory } from "@/lib/inventory/store";

export interface ExtractedLine {
  partNumber: string;
  description: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  hsn?: string;
}

export interface Extraction {
  docType: string;
  docNumber: string;
  docDate: string;
  vendor: string;
  currency: string;
  lines: ExtractedLine[];
  subTotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export type MatchLevel = "exact" | "near" | "none";

export interface LineMatch {
  line: ExtractedLine;
  level: MatchLevel;
  /** Best catalogue candidate, when any. */
  suggestion?: { code: string; description: string; rate: number; hsn?: string };
  issues: string[];
}

export interface ValidationSummary {
  matches: LineMatch[];
  exact: number;
  near: number;
  unmatched: number;
  totalMismatch: number;
}

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

function distance(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0] as number;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j] as number;
      dp[j] = Math.min(
        (dp[j] as number) + 1,
        (dp[j - 1] as number) + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return dp[b.length] as number;
}

interface Candidate {
  code: string;
  description: string;
  rate: number;
  hsn?: string;
}

/** Item master + inventory item catalogue, scoped to a project when given. */
export function catalogue(projectCode?: string): Candidate[] {
  const items: ItemMaster[] = itemsForProject(revenue.get().items, projectCode);
  const inv = inventory.get().items.filter((i) => !projectCode || !i.projectCode || i.projectCode === projectCode);
  const out: Candidate[] = items.map((i) => ({
    code: i.code,
    description: i.description,
    rate: i.rate,
    hsn: i.hsn,
  }));
  for (const i of inv) {
    if (out.some((c) => norm(c.code) === norm(i.code))) continue;
    out.push({ code: i.code, description: i.description, rate: i.stdCost, hsn: i.hsn });
  }
  return out;
}

/** Match one extracted line against the catalogue. */
export function matchLine(line: ExtractedLine, cands: Candidate[]): LineMatch {
  const issues: string[] = [];
  const key = norm(line.partNumber);

  if (!key) {
    return { line, level: "none", issues: ["No part number could be read from this line."] };
  }

  const exact = cands.find((c) => norm(c.code) === key);
  if (exact) {
    if (line.rate && exact.rate && Math.abs(line.rate - exact.rate) / exact.rate > 0.1)
      issues.push(`Rate ₹${line.rate.toLocaleString("en-IN")} deviates >10% from the master rate ₹${exact.rate.toLocaleString("en-IN")}.`);
    if (line.hsn && exact.hsn && norm(line.hsn) !== norm(exact.hsn))
      issues.push(`HSN ${line.hsn} differs from the master HSN ${exact.hsn}.`);
    if (!line.qty) issues.push("Quantity could not be read.");
    return { line, level: "exact", suggestion: exact, issues };
  }

  let best: Candidate | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const c of cands) {
    const d = distance(key, norm(c.code));
    if (d < bestScore) {
      bestScore = d;
      best = c;
    }
  }

  if (best && bestScore <= Math.max(2, Math.round(key.length * 0.25))) {
    issues.push(`Part number not found — closest master code is ${best.code}.`);
    return { line, level: "near", suggestion: best, issues };
  }

  issues.push("Part number is not in the item master for this project scope.");
  return { line, level: "none", suggestion: best, issues };
}

/** Validate the whole extraction, optionally against an expected document total. */
export function validateExtraction(
  extraction: Extraction,
  projectCode?: string,
  expectedTotal?: number,
): ValidationSummary {
  const cands = catalogue(projectCode);
  const matches = extraction.lines.map((l) => matchLine(l, cands));
  const totalMismatch =
    expectedTotal && extraction.total ? Math.round(extraction.total - expectedTotal) : 0;
  return {
    matches,
    exact: matches.filter((m) => m.level === "exact").length,
    near: matches.filter((m) => m.level === "near").length,
    unmatched: matches.filter((m) => m.level === "none").length,
    totalMismatch,
  };
}

/** Read a browser File into a data URL for the extraction endpoint. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

/** Call the vision extraction endpoint. */
export async function extractDocument(file: File, kind: string): Promise<Extraction> {
  const fileData = await fileToDataUrl(file);
  const res = await fetch("/api/ocr-extract", {
    method: "POST",
    headers: await apiHeaders(),
    body: JSON.stringify({ fileData, fileName: file.name, kind }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as Partial<Extraction>;
  return {
    docType: data.docType ?? "unknown",
    docNumber: data.docNumber ?? "",
    docDate: data.docDate ?? "",
    vendor: data.vendor ?? "",
    currency: data.currency ?? "INR",
    lines: Array.isArray(data.lines) ? data.lines : [],
    subTotal: Number(data.subTotal ?? 0),
    tax: Number(data.tax ?? 0),
    total: Number(data.total ?? 0),
    notes: data.notes,
  };
}
