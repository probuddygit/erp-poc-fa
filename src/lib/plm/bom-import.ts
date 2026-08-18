/**
 * Excel-based multi-level BOM import for the Engineering module.
 * Template generation, parsing, validation and commit helpers.
 */
import * as XLSX from "xlsx";
import { plmStore, upsertPlm } from "./store";
import type { BomImportRecord, BomKind, BomNode, Revision, UoM } from "./types";

export const UOMS: UoM[] = ["EA", "KG", "MTR", "SET", "LOT"];
export const REVS: Revision[] = ["A", "B", "C", "D", "E"];

export const TEMPLATE_HEADERS = [
  "Level",
  "Parent Item Code",
  "Item Code",
  "Item Name",
  "Quantity",
  "UoM",
  "Rev",
  "Sourcing",
  "Ref Des",
  "Project Code",
] as const;

export interface ParsedBomRow {
  row: number; // 1-based sheet row (incl. header)
  level: number;
  parentItemCode: string;
  itemCode: string;
  itemName: string;
  qty: number;
  uom: string;
  rev: string;
  procurement: string;
  refDes?: string;
  projectCode?: string;
  /** resolved parent row index within rows[] (undefined for top assembly) */
  parentIndex?: number;
}

export interface ImportIssue {
  row: number;
  column: string;
  message: string;
  severity: "error" | "warning";
}

export interface ParseResult {
  rows: ParsedBomRow[];
  issues: ImportIssue[];
  topAssembly?: ParsedBomRow;
  projectCode?: string;
  totalRows: number;
}

/* ------------------------ template ------------------------ */

export function buildTemplateWorkbook(): XLSX.WorkBook {
  const sample: (string | number)[][] = [
    [...TEMPLATE_HEADERS],
    [0, "", "FA-ASM-9001", "Demo Top Assembly", 1, "EA", "A", "Make", "", "PRJ-001"],
    [1, "FA-ASM-9001", "FA-SUB-9101", "Sub-assembly Level 1", 2, "EA", "A", "Make", "SUB-1", ""],
    [2, "FA-SUB-9101", "FA-CMP-9201", "Component Level 2", 4, "EA", "A", "Buy", "C-1", ""],
    [2, "FA-SUB-9101", "FA-RAW-9301", "Raw Material Level 2", 3.5, "KG", "A", "Buy", "", ""],
    [1, "FA-ASM-9001", "FA-FST-9401", "Fastener Level 1", 12, "EA", "A", "Buy", "", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(sample);
  ws["!cols"] = [
    { wch: 7 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 10 },
    { wch: 8 }, { wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
  ];

  const notes = XLSX.utils.aoa_to_sheet([
    ["Import BOM — Instructions"],
    [],
    ["Column", "Rule"],
    ["Level", "Integer. 0 = Top Assembly (exactly one per sheet). A row may go at most one level deeper than the row above."],
    ["Parent Item Code", "Blank for Level 0. Must match an item code of a preceding row exactly one level higher."],
    ["Item Code", "Mandatory. Warning if not found in the Item / Part master."],
    ["Item Name", "Mandatory."],
    ["Quantity", "Mandatory numeric value greater than 0."],
    ["UoM", UOMS.join(" / ")],
    ["Rev", REVS.join(" / ")],
    ["Sourcing", "Make or Buy."],
    ["Ref Des", "Optional reference designator."],
    ["Project Code", "Optional. Taken from the Top Assembly row and inherited by all children."],
    [],
    ["Notes", "Duplicate item codes under the same parent are rejected. Rows are imported only when there are no errors."],
  ]);
  notes["!cols"] = [{ wch: 20 }, { wch: 100 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BOM");
  XLSX.utils.book_append_sheet(wb, notes, "Instructions");
  return wb;
}

export function downloadTemplate(filename = "ebom-import-template.xlsx") {
  XLSX.writeFile(buildTemplateWorkbook(), filename);
}

/* ------------------------ parsing ------------------------ */

const norm = (v: unknown) => String(v ?? "").trim();

const HEADER_ALIASES: Record<string, keyof ParsedBomRow | "ignore"> = {
  level: "level",
  bomlevel: "level",
  hierarchy: "level",
  parentitemcode: "parentItemCode",
  parentcode: "parentItemCode",
  parent: "parentItemCode",
  itemcode: "itemCode",
  item: "itemCode",
  code: "itemCode",
  itemname: "itemName",
  name: "itemName",
  description: "itemName",
  quantity: "qty",
  qty: "qty",
  uom: "uom",
  unit: "uom",
  rev: "rev",
  revision: "rev",
  sourcing: "procurement",
  sourcingtype: "procurement",
  makebuy: "procurement",
  procurement: "procurement",
  refdes: "refDes",
  referencedesignator: "refDes",
  projectcode: "projectCode",
  project: "projectCode",
};

const key = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");

export function parseWorkbook(
  data: ArrayBuffer,
  opts: { knownItemCodes: Set<string>; knownProjects: Set<string> },
): ParseResult {
  const wb = XLSX.read(data, { type: "array" });
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase().includes("bom")) ?? wb.SheetNames[0];
  const issues: ImportIssue[] = [];
  if (!sheetName) {
    return { rows: [], issues: [{ row: 0, column: "File", message: "The workbook has no sheets.", severity: "error" }], totalRows: 0 };
  }
  const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName]!, { header: 1, blankrows: false });
  if (!grid.length) {
    return { rows: [], issues: [{ row: 0, column: "File", message: "The sheet is empty.", severity: "error" }], totalRows: 0 };
  }

  const header = (grid[0] ?? []).map((h) => key(norm(h)));
  const colOf = (field: string) => header.findIndex((h) => HEADER_ALIASES[h] === field);
  const idx = {
    level: colOf("level"),
    parentItemCode: colOf("parentItemCode"),
    itemCode: colOf("itemCode"),
    itemName: colOf("itemName"),
    qty: colOf("qty"),
    uom: colOf("uom"),
    rev: colOf("rev"),
    procurement: colOf("procurement"),
    refDes: colOf("refDes"),
    projectCode: colOf("projectCode"),
  };

  for (const req of ["level", "itemCode", "itemName", "qty", "uom", "rev"] as const) {
    if (idx[req] < 0) {
      issues.push({
        row: 1,
        column: "Header",
        message: `Required column "${TEMPLATE_HEADERS[["level", "parentItemCode", "itemCode", "itemName", "qty", "uom", "rev"].indexOf(req)] ?? req}" is missing. Use the downloadable template.`,
        severity: "error",
      });
    }
  }
  if (issues.length) return { rows: [], issues, totalRows: Math.max(grid.length - 1, 0) };

  const body = grid.slice(1).filter((r) => r.some((c) => norm(c) !== ""));
  const rows: ParsedBomRow[] = [];

  body.forEach((cells, i) => {
    const rowNo = i + 2;
    const get = (c: number) => (c >= 0 ? norm(cells[c]) : "");
    const levelRaw = get(idx.level);
    const level = Number(levelRaw);
    const r: ParsedBomRow = {
      row: rowNo,
      level: Number.isFinite(level) ? level : NaN,
      parentItemCode: get(idx.parentItemCode),
      itemCode: get(idx.itemCode),
      itemName: get(idx.itemName),
      qty: Number(get(idx.qty)),
      uom: get(idx.uom).toUpperCase(),
      rev: get(idx.rev).toUpperCase(),
      procurement: get(idx.procurement),
      refDes: get(idx.refDes) || undefined,
      projectCode: get(idx.projectCode) || undefined,
    };

    if (!Number.isInteger(r.level) || r.level < 0) {
      issues.push({ row: rowNo, column: "Level", message: `"${levelRaw}" is not a valid level (use 0, 1, 2 …).`, severity: "error" });
    }
    if (!r.itemCode) issues.push({ row: rowNo, column: "Item Code", message: "Item Code is required.", severity: "error" });
    if (!r.itemName) issues.push({ row: rowNo, column: "Item Name", message: "Item Name is required.", severity: "error" });
    if (!Number.isFinite(r.qty) || r.qty <= 0) {
      issues.push({ row: rowNo, column: "Quantity", message: "Quantity must be a number greater than 0.", severity: "error" });
    }
    if (!UOMS.includes(r.uom as UoM)) {
      issues.push({ row: rowNo, column: "UoM", message: `"${r.uom || "(blank)"}" is not a valid UoM (${UOMS.join(", ")}).`, severity: "error" });
    }
    if (!REVS.includes(r.rev as Revision)) {
      issues.push({ row: rowNo, column: "Rev", message: `"${r.rev || "(blank)"}" is not a valid revision (${REVS.join(", ")}).`, severity: "error" });
    }
    if (r.procurement) {
      const p = r.procurement.toLowerCase();
      if (p !== "make" && p !== "buy") {
        issues.push({ row: rowNo, column: "Sourcing", message: `"${r.procurement}" must be Make or Buy.`, severity: "error" });
      } else {
        r.procurement = p === "make" ? "Make" : "Buy";
      }
    } else {
      r.procurement = r.level === 0 ? "Make" : "Buy";
    }
    if (r.itemCode && !opts.knownItemCodes.has(r.itemCode)) {
      issues.push({ row: rowNo, column: "Item Code", message: `${r.itemCode} is not in the Item/Part master — it will still be imported.`, severity: "warning" });
    }
    if (r.projectCode && !opts.knownProjects.has(r.projectCode)) {
      issues.push({ row: rowNo, column: "Project Code", message: `Project ${r.projectCode} was not found.`, severity: "warning" });
    }
    rows.push(r);
  });

  /* hierarchy */
  const tops = rows.filter((r) => r.level === 0);
  if (tops.length === 0) {
    issues.push({ row: 0, column: "Level", message: "No Top Assembly found — exactly one row must have Level 0.", severity: "error" });
  } else if (tops.length > 1) {
    tops.slice(1).forEach((t) =>
      issues.push({ row: t.row, column: "Level", message: "Only one Top Assembly (Level 0) is allowed per file.", severity: "error" }),
    );
  }

  const stack: ParsedBomRow[] = [];
  rows.forEach((r, i) => {
    if (!Number.isInteger(r.level) || r.level < 0) return;
    if (r.level === 0) {
      stack.length = 0;
      stack[0] = r;
      if (r.parentItemCode) {
        issues.push({ row: r.row, column: "Parent Item Code", message: "Top Assembly must not have a parent.", severity: "error" });
      }
      return;
    }
    const parent = stack[r.level - 1];
    if (!parent) {
      issues.push({ row: r.row, column: "Level", message: `Level ${r.level} row has no Level ${r.level - 1} parent above it.`, severity: "error" });
      return;
    }
    if (r.parentItemCode && r.parentItemCode !== parent.itemCode) {
      issues.push({
        row: r.row,
        column: "Parent Item Code",
        message: `Parent "${r.parentItemCode}" does not match the hierarchy (expected "${parent.itemCode}").`,
        severity: "error",
      });
      return;
    }
    if (r.itemCode && r.itemCode === parent.itemCode) {
      issues.push({ row: r.row, column: "Item Code", message: "An item cannot be its own parent.", severity: "error" });
      return;
    }
    r.parentIndex = rows.indexOf(parent);
    r.parentItemCode = parent.itemCode;
    stack[r.level] = r;
    stack.length = r.level + 1;
    void i;
  });

  // duplicates under the same parent
  const seen = new Map<string, number>();
  rows.forEach((r) => {
    if (!r.itemCode) return;
    const k = `${r.parentIndex ?? "root"}::${r.itemCode}`;
    const prev = seen.get(k);
    if (prev !== undefined) {
      issues.push({ row: r.row, column: "Item Code", message: `Duplicate line — ${r.itemCode} already appears under the same parent (row ${prev}).`, severity: "error" });
    } else seen.set(k, r.row);
  });

  const top = tops[0];
  // Buy parents warning
  rows.forEach((r, i) => {
    const hasChildren = rows.some((c) => c.parentIndex === i);
    if (hasChildren && r.procurement === "Buy") {
      issues.push({ row: r.row, column: "Sourcing", message: `${r.itemCode} has sub-components but is marked Buy.`, severity: "warning" });
    }
  });

  return {
    rows,
    issues,
    topAssembly: top,
    projectCode: top?.projectCode,
    totalRows: rows.length,
  };
}

/* ------------------------ commit ------------------------ */

export type ConflictAction = "new" | "replace" | "revision";

export interface CommitOptions {
  kind: BomKind;
  action: ConflictAction;
  existingRootId?: string;
  /** Revision applied to the new structure when action === "revision". */
  newRev?: Revision;
  fileName: string;
  user: string;
}

export interface CommitResult {
  rootId: string;
  imported: number;
  rejected: number;
}

function nextRev(rev: string): Revision {
  const i = REVS.indexOf(rev as Revision);
  return REVS[Math.min(i < 0 ? 0 : i + 1, REVS.length - 1)]!;
}

export function suggestNextRev(rev?: string): Revision {
  return nextRev(rev ?? "A");
}

/** Remove a root and every descendant (used by the Replace action). */
function purgeTree(rootId: string) {
  plmStore.update((s) => {
    s.bom = s.bom.filter((n) => n.rootId !== rootId && n.id !== rootId);
  });
}

export function commitImport(parse: ParseResult, opts: CommitOptions): CommitResult {
  const rows = parse.rows;
  const errorRows = new Set(parse.issues.filter((i) => i.severity === "error").map((i) => i.row));
  const rejected = rows.filter((r) => errorRows.has(r.row)).length;

  if (opts.action === "replace" && opts.existingRootId) purgeTree(opts.existingRootId);

  const project = parse.projectCode;
  const idByIndex: Record<number, string> = {};
  let rootId = "";
  let imported = 0;

  rows.forEach((r, i) => {
    const isRoot = r.level === 0;
    const rev = (opts.action === "revision" && opts.newRev ? opts.newRev : r.rev) as Revision;
    const rec: Partial<BomNode> & Record<string, unknown> = {
      kind: opts.kind,
      itemCode: r.itemCode,
      itemName: r.itemName,
      qty: r.qty,
      uom: r.uom as UoM,
      rev,
      refDes: r.refDes,
      procurement: r.procurement as "Make" | "Buy",
      projectCode: r.projectCode ?? project,
    };
    if (!isRoot) {
      const parentId = r.parentIndex !== undefined ? idByIndex[r.parentIndex] : undefined;
      if (!parentId) return;
      rec.parentId = parentId;
      rec.rootId = rootId;
    }
    const id = upsertPlm("bom", rec as Record<string, unknown>);
    idByIndex[i] = id;
    if (isRoot) rootId = id;
    imported++;
  });

  const record: BomImportRecord = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    by: opts.user,
    fileName: opts.fileName,
    kind: opts.kind,
    projectCode: project,
    topAssembly: parse.topAssembly ? `${parse.topAssembly.itemCode} — ${parse.topAssembly.itemName}` : "—",
    rootId,
    action: opts.action,
    totalRecords: parse.totalRows,
    imported,
    rejected,
    errors: parse.issues.map((i) => `Row ${i.row} · ${i.column}: ${i.message}`),
  };
  plmStore.update((s) => {
    s.bomImports = [record, ...(s.bomImports ?? [])].slice(0, 100);
  });

  return { rootId, imported, rejected };
}
