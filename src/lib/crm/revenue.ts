import { useSyncExternalStore } from "react";
import { crm, logActivity, upsertRecord } from "./store";
import type { EntityKind } from "./types";

/* ------------------------------------------------------------------ types */

export type LineDocKind = "proposals" | "quotations" | "oas" | "salesOrders";

export interface ItemCodeConfig {
  prefix: string;
  separator: string;
  padding: number;
  /** include a 3-letter category segment in generated codes */
  categorySegment: boolean;
  nextSeq: number;
}

export interface ItemAllocation {
  id: string;
  from?: string;
  to: string;
  at: string;
  by: string;
  reason: string;
}

export interface ItemMaster {
  id: string;
  code: string;
  description: string;
  category: string;
  uom: string;
  rate: number;
  hsn?: string;
  status: "active" | "blocked";
  createdAt: string;
  /** Owning project. Blank = common catalogue, usable by every project. */
  projectCode?: string;
  /** Trail of project reallocations for this item. */
  allocations?: ItemAllocation[];
}

/** Items visible to a project: its own items plus the common catalogue. */
export function itemsForProject(items: ItemMaster[], projectCode?: string): ItemMaster[] {
  if (!projectCode) return items;
  return items.filter((i) => !i.projectCode || i.projectCode === projectCode);
}

export interface LineItem {
  id: string;
  docKind: LineDocKind;
  docId: string;
  itemCode: string;
  description: string;
  category: string;
  qty: number;
  uom: string;
  rate: number;
  discountPct: number;
  taxPct: number;
  /** HSN / SAC sourced from the item master — required before document generation. */
  hsn?: string;
  gstRate?: number;
  cessRate?: number;
  deliveryWeeks?: number;
  /** Execution tracking used by Sales Order closure validation. */
  deliveredQty?: number;
  invoicedQty?: number;
  returnedQty?: number;
  status?: "planned" | "in-execution" | "delivered";
}

export interface BudgetLine {
  category: string;
  planned: number;
}

export interface BudgetVersion {
  id: string;
  oaId?: string;
  salesOrderId?: string;
  projectCode?: string;
  customerName: string;
  version: number;
  status: "draft" | "approved" | "superseded";
  note?: string;
  createdBy: string;
  createdAt: string;
  lines: BudgetLine[];
}

export interface Consumption {
  id: string;
  budgetId: string;
  category: string;
  amount: number;
  source: "procurement" | "manual" | "labour" | "subcontract";
  ref?: string;
  at: string;
}

export interface FinanceCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export interface FinanceReview {
  id: string;
  oaId: string;
  status: "pending" | "cleared" | "held";
  checks: FinanceCheck[];
  reviewer: string;
  remarks?: string;
  at: string;
}

export interface RevenueState {
  config: ItemCodeConfig;
  items: ItemMaster[];
  lines: LineItem[];
  budgets: BudgetVersion[];
  consumption: Consumption[];
  financeReviews: FinanceReview[];
}

export const ITEM_CATEGORIES = [
  "Mechanical",
  "Robotics",
  "Controls",
  "Electrical",
  "Software",
  "Services",
  "Installation",
  "Spares",
] as const;

export const UOMS = ["Nos", "Set", "Lot", "Mtr", "Kg", "Hrs", "Day"];

/* ------------------------------------------------------------------ store */

const KEY = "faith-erp:crm-revenue:v1";

const SEED_ITEMS: Array<Omit<ItemMaster, "id" | "createdAt">> = [
  { code: "FA-MEC-0001", description: "BIW framing station structure", category: "Mechanical", uom: "Set", rate: 4200000, hsn: "8479", status: "active" },
  { code: "FA-ROB-0002", description: "6-axis welding robot with controller", category: "Robotics", uom: "Nos", rate: 3800000, hsn: "8479", status: "active" },
  { code: "FA-CTL-0003", description: "PLC control panel — Safety PLC, HMI", category: "Controls", uom: "Nos", rate: 950000, hsn: "8537", status: "active" },
  { code: "FA-ELE-0004", description: "Power & signal cabling harness", category: "Electrical", uom: "Lot", rate: 420000, hsn: "8544", status: "active" },
  { code: "FA-SFT-0005", description: "Line simulation & offline programming", category: "Software", uom: "Lot", rate: 650000, hsn: "9983", status: "active" },
  { code: "FA-SRV-0006", description: "Commissioning, FAT/SAT & training", category: "Services", uom: "Lot", rate: 780000, hsn: "9987", status: "active" },
  { code: "FA-INS-0007", description: "Site installation & alignment", category: "Installation", uom: "Lot", rate: 540000, hsn: "9954", status: "active" },
  { code: "FA-SPR-0008", description: "Recommended spares kit — 2 years", category: "Spares", uom: "Set", rate: 260000, hsn: "8431", status: "active" },
];

function seed(): RevenueState {
  const now = new Date().toISOString();
  return {
    config: { prefix: "FA", separator: "-", padding: 4, categorySegment: true, nextSeq: 9 },
    items: SEED_ITEMS.map((i) => ({ ...i, id: crypto.randomUUID(), createdAt: now })),
    lines: [],
    budgets: [],
    consumption: [],
    financeReviews: [],
  };
}

function load(): RevenueState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return { ...seed(), ...(JSON.parse(raw) as Partial<RevenueState>) } as RevenueState;
  } catch {
    return seed();
  }
}

let state: RevenueState = load();
const listeners = new Set<() => void>();

export const revenue = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  update(mut: (s: RevenueState) => void) {
    mut(state);
    state = { ...state };
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
    listeners.forEach((l) => l());
  },
};

export function useRevenue<T>(sel: (s: RevenueState) => T): T {
  return useSyncExternalStore(
    revenue.subscribe,
    () => sel(state),
    () => sel(state),
  );
}

/* ------------------------------------------------------- item code engine */

export function previewItemCode(cfg: ItemCodeConfig, category: string) {
  const seg = cfg.categorySegment ? category.slice(0, 3).toUpperCase() + cfg.separator : "";
  return `${cfg.prefix}${cfg.separator}${seg}${String(cfg.nextSeq).padStart(cfg.padding, "0")}`;
}

export function nextItemCode(category: string) {
  const code = previewItemCode(state.config, category);
  revenue.update((s) => {
    s.config = { ...s.config, nextSeq: s.config.nextSeq + 1 };
  });
  return code;
}

export function saveItemCodeConfig(cfg: Partial<ItemCodeConfig>) {
  revenue.update((s) => {
    s.config = { ...s.config, ...cfg };
  });
}

/* ------------------------------------------- AI item validation & dedupe */

const STOP = new Set(["the", "and", "with", "for", "of", "a", "an", "to"]);

function tokens(v: string) {
  return new Set(
    String(v)
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

export function similarity(a: string, b: string) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter += 1;
  });
  return inter / (ta.size + tb.size - inter);
}

export interface ItemValidation {
  issues: string[];
  suggestions: string[];
  duplicates: Array<{ item: ItemMaster; score: number }>;
  confidence: number;
}

/** Deterministic AI-style validation for an item draft. */
export function validateItem(draft: Partial<ItemMaster>, items = state.items): ItemValidation {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const desc = String(draft.description ?? "");

  if (desc.trim().length < 8) issues.push("Description is too short to be searchable — add make, size or capacity.");
  if (!draft.category) issues.push("Category is required for budget roll-up and procurement routing.");
  if (!draft.uom) issues.push("Unit of measure is required.");
  if (!draft.rate || Number(draft.rate) <= 0) issues.push("Standard rate must be greater than zero.");
  if (draft.code && items.some((i) => i.code === draft.code && i.id !== draft.id))
    issues.push(`Item code ${draft.code} already exists.`);
  if (!draft.hsn) suggestions.push("Add an HSN/SAC code so GST postings and e-invoicing stay compliant.");

  const guessed = guessCategory(desc);
  if (guessed && draft.category && guessed !== draft.category)
    suggestions.push(`Description reads like a “${guessed}” item — confirm the category.`);
  if (guessed && !draft.category) suggestions.push(`Suggested category: ${guessed}.`);

  // Duplicate detection is project-scoped: only the item's own project and the
  // common catalogue can clash with it.
  const duplicates = itemsForProject(items, draft.projectCode)
    .filter((i) => i.id !== draft.id)
    .map((item) => ({ item, score: similarity(desc, item.description) }))
    .filter((d) => d.score >= 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (duplicates.length)
    suggestions.push(`${duplicates.length} similar item(s) found in this project scope — reuse an existing code instead of creating a variant.`);
  if (!draft.projectCode)
    suggestions.push("No project tagged — this item joins the common catalogue and is visible to every project.");

  const rateBand = items.filter((i) => i.category === draft.category).map((i) => i.rate);
  if (rateBand.length && draft.rate) {
    const avg = rateBand.reduce((a, b) => a + b, 0) / rateBand.length;
    if (Number(draft.rate) > avg * 3) suggestions.push("Rate is >3× the category average — verify before publishing.");
    if (Number(draft.rate) < avg / 5) suggestions.push("Rate is well below the category average — check the UOM.");
  }

  const confidence = Math.max(0, Math.min(100, 100 - issues.length * 22 - duplicates.length * 10));
  return { issues, suggestions, duplicates, confidence };
}

const CATEGORY_HINTS: Array<[string, RegExp]> = [
  ["Robotics", /robot|axis|gripper|servo weld/i],
  ["Controls", /plc|hmi|panel|scada|control/i],
  ["Electrical", /cable|harness|wiring|transformer|electric/i],
  ["Software", /software|simulation|program|license|offline/i],
  ["Services", /commission|training|fat|sat|service|amc/i],
  ["Installation", /install|erection|alignment|site work/i],
  ["Spares", /spare|consumable|kit/i],
  ["Mechanical", /fixture|structure|frame|conveyor|jig|station/i],
];

export function guessCategory(text: string): string | null {
  for (const [cat, re] of CATEGORY_HINTS) if (re.test(text)) return cat;
  return null;
}

export function upsertItem(draft: Partial<ItemMaster>): string {
  const id = draft.id ?? crypto.randomUUID();
  revenue.update((s) => {
    const rec: ItemMaster = {
      id,
      code: draft.code || nextItemCodeInternal(s, draft.category ?? "General"),
      description: draft.description ?? "",
      category: draft.category ?? "General",
      uom: draft.uom ?? "Nos",
      rate: Number(draft.rate ?? 0),
      hsn: draft.hsn,
      status: draft.status ?? "active",
      createdAt: draft.createdAt ?? new Date().toISOString(),
      projectCode: draft.projectCode || undefined,
      allocations: draft.allocations ?? [],
    };
    s.items = s.items.some((i) => i.id === id)
      ? s.items.map((i) => (i.id === id ? { ...i, ...rec } : i))
      : [rec, ...s.items];
  });
  return id;
}

/** Move an item from one project to another (or to the common catalogue). */
export function reallocateItem(id: string, to: string, reason: string, by = "Item Master") {
  revenue.update((s) => {
    const item = s.items.find((i) => i.id === id);
    if (!item) return;
    const from = item.projectCode;
    item.projectCode = to || undefined;
    item.allocations = [
      { id: crypto.randomUUID(), from, to: to || "Common", at: new Date().toISOString(), by, reason },
      ...(item.allocations ?? []),
    ];
  });
}

function nextItemCodeInternal(s: RevenueState, category: string) {
  const code = previewItemCode(s.config, category);
  s.config = { ...s.config, nextSeq: s.config.nextSeq + 1 };
  return code;
}

export function deleteItem(id: string) {
  revenue.update((s) => {
    s.items = s.items.filter((i) => i.id !== id);
  });
}

/* ------------------------------------------------------------ line items */

export function lineAmount(l: Pick<LineItem, "qty" | "rate" | "discountPct">) {
  const gross = Number(l.qty || 0) * Number(l.rate || 0);
  return gross - (gross * Number(l.discountPct || 0)) / 100;
}

export interface DocTotals {
  net: number;
  tax: number;
  gross: number;
  count: number;
  byCategory: Record<string, number>;
}

export function docTotals(lines: LineItem[]): DocTotals {
  const byCategory: Record<string, number> = {};
  let net = 0;
  let tax = 0;
  for (const l of lines) {
    const amt = lineAmount(l);
    net += amt;
    tax += (amt * Number(l.taxPct || 0)) / 100;
    byCategory[l.category] = (byCategory[l.category] ?? 0) + amt;
  }
  return { net, tax, gross: net + tax, count: lines.length, byCategory };
}

export function docLines(kind: LineDocKind, docId: string, s = state) {
  return s.lines.filter((l) => l.docKind === kind && l.docId === docId);
}

export function upsertLine(line: Partial<LineItem> & { docKind: LineDocKind; docId: string }) {
  const id = line.id ?? crypto.randomUUID();
  revenue.update((s) => {
    const rec: LineItem = {
      id,
      docKind: line.docKind,
      docId: line.docId,
      itemCode: line.itemCode ?? "",
      description: line.description ?? "",
      category: line.category ?? "General",
      qty: Number(line.qty ?? 1),
      uom: line.uom ?? "Nos",
      rate: Number(line.rate ?? 0),
      discountPct: Number(line.discountPct ?? 0),
      taxPct: Number(line.taxPct ?? 18),
      hsn: line.hsn ?? (line.itemCode ? s.items.find((i) => i.code === line.itemCode)?.hsn : undefined),
      gstRate: line.gstRate,
      cessRate: line.cessRate,
      deliveryWeeks: line.deliveryWeeks,
      deliveredQty: line.deliveredQty,
      invoicedQty: line.invoicedQty,
      returnedQty: line.returnedQty,
      status: line.status ?? "planned",
    };
    s.lines = s.lines.some((l) => l.id === id)
      ? s.lines.map((l) => (l.id === id ? { ...l, ...rec } : l))
      : [...s.lines, rec];
  });
  return id;
}

export function removeLine(id: string) {
  revenue.update((s) => {
    s.lines = s.lines.filter((l) => l.id !== id);
  });
}

export function replaceLines(kind: LineDocKind, docId: string, lines: Array<Partial<LineItem>>) {
  revenue.update((s) => {
    s.lines = [
      ...s.lines.filter((l) => !(l.docKind === kind && l.docId === docId)),
      ...lines.map((l) => ({
        id: l.id ?? crypto.randomUUID(),
        docKind: kind,
        docId,
        itemCode: l.itemCode ?? "",
        description: l.description ?? "",
        category: l.category ?? "General",
        qty: Number(l.qty ?? 1),
        uom: l.uom ?? "Nos",
        rate: Number(l.rate ?? 0),
        discountPct: Number(l.discountPct ?? 0),
        taxPct: Number(l.taxPct ?? 18),
        status: l.status ?? ("planned" as const),
      })),
    ];
  });
}

/** Push the line-item net value back on to the parent CRM document. */
export function syncDocValue(kind: LineDocKind, docId: string) {
  const totals = docTotals(docLines(kind, docId));
  if (!totals.count) return totals;
  upsertRecord(kind as EntityKind, { id: docId, value: Math.round(totals.net) }, "System");
  return totals;
}

/** Carry line items forward when a document is converted to the next stage. */
export function copyLines(from: LineDocKind, fromId: string, to: LineDocKind, toId: string) {
  const src = docLines(from, fromId);
  if (!src.length) return;
  replaceLines(to, toId, src.map(({ id: _id, ...rest }) => rest));
}

/* --------------------------------------------------------------- budgets */

export function budgetsFor(ref: { oaId?: string; salesOrderId?: string }, s = state) {
  return s.budgets
    .filter((b) => (ref.oaId && b.oaId === ref.oaId) || (ref.salesOrderId && b.salesOrderId === ref.salesOrderId))
    .sort((a, b) => b.version - a.version);
}

const COST_RATIO = 0.78;

/** Category-wise budget generated from the order's line items. */
export function createBudgetFromLines(opts: {
  oaId?: string;
  salesOrderId?: string;
  projectCode?: string;
  customerName: string;
  kind: LineDocKind;
  docId: string;
  note?: string;
  createdBy?: string;
}) {
  const totals = docTotals(docLines(opts.kind, opts.docId));
  const lines: BudgetLine[] = Object.entries(totals.byCategory).map(([category, amount]) => ({
    category,
    planned: Math.round(amount * COST_RATIO),
  }));
  if (!lines.length) return null;
  return newBudgetVersion({ ...opts, lines });
}

export function newBudgetVersion(opts: {
  oaId?: string;
  salesOrderId?: string;
  projectCode?: string;
  customerName: string;
  lines: BudgetLine[];
  note?: string;
  createdBy?: string;
}): string {
  const id = crypto.randomUUID();
  revenue.update((s) => {
    const prior = s.budgets.filter(
      (b) => (opts.oaId && b.oaId === opts.oaId) || (opts.salesOrderId && b.salesOrderId === opts.salesOrderId),
    );
    prior.forEach((b) => {
      b.status = "superseded";
    });
    s.budgets = [
      {
        id,
        oaId: opts.oaId,
        salesOrderId: opts.salesOrderId,
        projectCode: opts.projectCode,
        customerName: opts.customerName,
        version: prior.length + 1,
        status: "draft",
        note: opts.note,
        createdBy: opts.createdBy ?? "You",
        createdAt: new Date().toISOString(),
        lines: opts.lines,
      },
      ...s.budgets,
    ];
  });
  return id;
}

export function approveBudget(id: string, by = "You") {
  revenue.update((s) => {
    const b = s.budgets.find((x) => x.id === id);
    if (b) {
      b.status = "approved";
      b.createdBy = b.createdBy || by;
    }
  });
}

export function recordConsumption(entry: Omit<Consumption, "id" | "at"> & { at?: string }) {
  revenue.update((s) => {
    s.consumption = [
      { ...entry, id: crypto.randomUUID(), at: entry.at ?? new Date().toISOString() },
      ...s.consumption,
    ];
  });
}

export interface BudgetSummaryRow {
  category: string;
  planned: number;
  consumed: number;
  variance: number;
  utilisation: number;
}

export function budgetSummary(budgetId: string, s = state) {
  const b = s.budgets.find((x) => x.id === budgetId);
  if (!b) return { rows: [] as BudgetSummaryRow[], planned: 0, consumed: 0, utilisation: 0 };
  const rows = b.lines.map((l) => {
    const consumed = s.consumption
      .filter((c) => c.budgetId === budgetId && c.category === l.category)
      .reduce((a, c) => a + c.amount, 0);
    return {
      category: l.category,
      planned: l.planned,
      consumed,
      variance: l.planned - consumed,
      utilisation: l.planned ? Math.round((consumed / l.planned) * 100) : 0,
    };
  });
  const planned = rows.reduce((a, r) => a + r.planned, 0);
  const consumed = rows.reduce((a, r) => a + r.consumed, 0);
  return { rows, planned, consumed, utilisation: planned ? Math.round((consumed / planned) * 100) : 0 };
}

/* -------------------------------------------------- finance validation OA */

/** Deterministic finance gate run before an OA can be approved. */
export function runFinanceChecks(oaId: string): FinanceCheck[] {
  const s = crm.get();
  const oa = s.oas.find((o) => o.id === oaId);
  const checks: FinanceCheck[] = [];
  if (!oa) return checks;

  const customer = s.customers.find((c) => c.name === oa.customerName);
  const quote = s.quotations.find((q) => q.id === oa.quotationId);
  const lines = docLines("oas", oaId);
  const totals = docTotals(lines);

  checks.push({
    label: "Customer PO reference",
    ok: Boolean(oa.poNumber),
    detail: oa.poNumber ? `PO ${oa.poNumber} captured` : "No customer PO number on the order",
  });
  checks.push({
    label: "GSTIN on customer master",
    ok: Boolean(customer?.gstin),
    detail: customer?.gstin ? `GSTIN ${customer.gstin}` : "Customer GSTIN missing — e-invoicing will fail",
  });
  checks.push({
    label: "Payment terms agreed",
    ok: Boolean(customer?.paymentTerms || quote?.paymentTerms),
    detail: customer?.paymentTerms || quote?.paymentTerms || "No payment terms recorded",
  });
  checks.push({
    label: "Line items priced",
    ok: totals.count > 0,
    detail: totals.count ? `${totals.count} line(s), net ₹${Math.round(totals.net).toLocaleString("en-IN")}` : "No line items — value cannot be validated",
  });
  const drift = totals.count ? Math.abs(totals.net - oa.value) / Math.max(oa.value, 1) : 0;
  checks.push({
    label: "Order value reconciles with lines",
    ok: !totals.count || drift <= 0.02,
    detail: totals.count
      ? `Line net vs order value variance ${(drift * 100).toFixed(1)}%`
      : "Skipped — no line items",
  });
  const margin = Number(quote?.marginPct ?? 0);
  checks.push({
    label: "Margin above floor (15%)",
    ok: !quote || margin >= 15,
    detail: quote ? `Quoted margin ${margin}%` : "No source quotation linked",
  });
  const exposure = s.oas
    .filter((o) => o.customerName === oa.customerName && o.status !== "cancelled")
    .reduce((a, o) => a + o.value, 0);
  checks.push({
    label: "Credit exposure within limit",
    ok: exposure <= 250000000,
    detail: `Open exposure ₹${Math.round(exposure).toLocaleString("en-IN")} for ${oa.customerName}`,
  });
  return checks;
}

export function saveFinanceReview(oaId: string, status: "cleared" | "held", remarks: string, reviewer = "Finance") {
  const checks = runFinanceChecks(oaId);
  revenue.update((s) => {
    s.financeReviews = [
      { id: crypto.randomUUID(), oaId, status, checks, reviewer, remarks, at: new Date().toISOString() },
      ...s.financeReviews.filter((r) => r.oaId !== oaId),
    ];
  });
  logActivity("oas", oaId, "system", `Finance validation ${status === "cleared" ? "cleared" : "held"} — ${remarks || "no remarks"}`, reviewer);
  return checks;
}

export function financeReviewFor(oaId: string, s = state) {
  return s.financeReviews.find((r) => r.oaId === oaId) ?? null;
}

/* --------------------------------------------------------- analytics */

export interface CustomerAnalytics {
  customerName: string;
  leads: number;
  opportunities: number;
  quotations: number;
  won: number;
  orderValue: number;
  pipeline: number;
  winRate: number;
  avgOrder: number;
  lastActivity?: string;
}

export function customerAnalytics(): CustomerAnalytics[] {
  const s = crm.get();
  const names = Array.from(
    new Set([...s.customers.map((c) => c.name), ...s.oas.map((o) => o.customerName)]),
  );
  return names
    .map((name) => {
      const leads = s.leads.filter((l) => l.customerName === name);
      const opps = s.opportunities.filter((o) => o.customerName === name);
      const quotes = s.quotations.filter((q) => q.customerName === name);
      const oas = s.oas.filter((o) => o.customerName === name && o.status !== "cancelled");
      const orderValue = oas.reduce((a, o) => a + o.value, 0);
      const won = opps.filter((o) => o.stage === "won").length;
      const decided = opps.filter((o) => ["won", "lost"].includes(o.stage)).length;
      return {
        customerName: name,
        leads: leads.length,
        opportunities: opps.length,
        quotations: quotes.length,
        won,
        orderValue,
        pipeline: opps
          .filter((o) => !["won", "lost"].includes(o.stage))
          .reduce((a, o) => a + (o.value * o.probability) / 100, 0),
        winRate: decided ? Math.round((won / decided) * 100) : 0,
        avgOrder: oas.length ? Math.round(orderValue / oas.length) : 0,
        lastActivity: s.activities.find((a) =>
          [...leads, ...opps, ...quotes, ...oas].some((r) => r.id === a.entityId),
        )?.at,
      };
    })
    .sort((a, b) => b.orderValue - a.orderValue);
}

export interface ProjectProfitability {
  key: string;
  code: string;
  name: string;
  customerName: string;
  orderValue: number;
  budget: number;
  consumed: number;
  committed: number;
  forecastCost: number;
  margin: number;
  marginPct: number;
  status: string;
}

export function projectProfitability(
  procurementCommitted: Record<string, number> = {},
): ProjectProfitability[] {
  const s = crm.get();
  const r = state;
  return s.oas
    .filter((o) => o.status !== "cancelled")
    .map((oa) => {
      const project = s.projects.find((p) => p.oaId === oa.id);
      const budget = budgetsFor({ oaId: oa.id }, r).find((b) => b.status !== "superseded");
      const planned = budget?.lines.reduce((a, l) => a + l.planned, 0) ?? Math.round(oa.value * COST_RATIO);
      const consumed = budget ? budgetSummary(budget.id, r).consumed : 0;
      const committed = project?.code ? (procurementCommitted[project.code] ?? 0) : 0;
      const forecastCost = Math.max(planned, consumed + committed);
      const margin = oa.value - forecastCost;
      return {
        key: oa.id,
        code: project?.code ?? oa.code,
        name: oa.title,
        customerName: oa.customerName,
        orderValue: oa.value,
        budget: planned,
        consumed,
        committed,
        forecastCost,
        margin,
        marginPct: oa.value ? Math.round((margin / oa.value) * 100) : 0,
        status: project?.status ?? oa.status,
      };
    })
    .sort((a, b) => a.marginPct - b.marginPct);
}

export interface CapacityBucket {
  month: string;
  orders: number;
  value: number;
  loadPct: number;
}

/** Monthly delivery load from confirmed orders vs a configurable capacity. */
export function capacityPlan(monthlyCapacity = 60000000): CapacityBucket[] {
  const s = crm.get();
  const buckets = new Map<string, { orders: number; value: number }>();
  const push = (iso: string | undefined, value: number) => {
    const d = iso ? new Date(iso) : new Date();
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(k) ?? { orders: 0, value: 0 };
    b.orders += 1;
    b.value += value;
    buckets.set(k, b);
  };
  s.salesOrders.filter((o) => o.status !== "cancelled").forEach((o) => push(o.deliveryDate, o.value));
  s.oas
    .filter((o) => o.status === "approved" && !o.salesOrderId)
    .forEach((o) => push(o.createdAt, o.value));
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      orders: b.orders,
      value: b.value,
      loadPct: Math.round((b.value / monthlyCapacity) * 100),
    }));
}

/* ------------------------------------------------------ traceability */

export interface TraceNode {
  kind: EntityKind | "projects";
  label: string;
  code: string;
  id: string;
  value?: number;
  status?: string;
  at?: string;
}

/** Full chain: Lead → Opportunity → RFQ → Proposal → Quotation → OA → SO → Project. */
export function traceChain(oaId: string): TraceNode[] {
  const s = crm.get();
  const oa = s.oas.find((o) => o.id === oaId);
  if (!oa) return [];
  const quote = s.quotations.find((q) => q.id === oa.quotationId);
  const proposal = quote ? s.proposals.find((p) => p.id === quote.proposalId) : undefined;
  const rfq = proposal ? s.rfqs.find((r) => r.id === proposal.rfqId) : undefined;
  const oppId = quote?.opportunityId ?? proposal?.opportunityId ?? rfq?.opportunityId;
  const opp = oppId ? s.opportunities.find((o) => o.id === oppId) : undefined;
  const lead = opp?.leadId ? s.leads.find((l) => l.id === opp.leadId) : undefined;
  const so = s.salesOrders.find((x) => x.id === oa.salesOrderId);
  const project = s.projects.find((p) => p.oaId === oa.id);

  const nodes: TraceNode[] = [];
  const add = (kind: TraceNode["kind"], label: string, rec?: Record<string, unknown>) => {
    if (!rec) return;
    nodes.push({
      kind,
      label,
      code: String(rec.code ?? ""),
      id: String(rec.id ?? ""),
      value: typeof rec.value === "number" ? rec.value : typeof rec.estValue === "number" ? rec.estValue : undefined,
      status: rec.status as string | undefined,
      at: rec.createdAt as string | undefined,
    });
  };
  add("leads", "Lead", lead as unknown as Record<string, unknown>);
  add("opportunities", "Opportunity", opp as unknown as Record<string, unknown>);
  add("rfqs", "RFQ", rfq as unknown as Record<string, unknown>);
  add("proposals", "Proposal", proposal as unknown as Record<string, unknown>);
  add("quotations", "Quotation", quote as unknown as Record<string, unknown>);
  add("oas", "Order Acceptance", oa as unknown as Record<string, unknown>);
  add("salesOrders", "Sales Order", so as unknown as Record<string, unknown>);
  add("projects", "Project", project as unknown as Record<string, unknown>);
  return nodes;
}
