/**
 * TDS rules engine.
 *
 * Determines whether TDS applies to a payable transaction from configurable rules
 * (vendor type, expense category, transaction type, section, threshold, financial
 * year), computes the deduction with the configured rounding, and produces ledger
 * rows plus certificate (Form 16A) reporting data.
 */

export type VendorType = "company" | "individual-huf" | "firm" | "contractor" | "professional" | "non-resident";
export type TdsTransactionType = "goods" | "services" | "contract" | "professional" | "rent" | "commission" | "interest";
export type RoundingRule = "nearest-1" | "nearest-10" | "round-up-10" | "none";

export interface TdsRule {
  id: string;
  code: string;
  section: string;
  name: string;
  vendorTypes: VendorType[];
  transactionTypes: TdsTransactionType[];
  expenseCategories?: string[];
  /** Per-transaction threshold below which no TDS is deducted. */
  singleThreshold: number;
  /** Aggregate FY threshold across the vendor. */
  annualThreshold: number;
  ratePct: number;
  /** Rate applied when the vendor has not furnished a PAN. */
  noPanRatePct: number;
  rounding: RoundingRule;
  financialYear: string;
  active: boolean;
}

export interface TdsInput {
  vendorName: string;
  vendorType: VendorType;
  vendorPan?: string;
  transactionType: TdsTransactionType;
  expenseCategory?: string;
  /** Taxable base — TDS is computed on value excluding GST. */
  baseAmount: number;
  /** Amount already paid to this vendor in the same FY, same section. */
  fyToDateAmount?: number;
  financialYear: string;
  date: string;
  reference?: string;
}

export interface TdsResult {
  applicable: boolean;
  section?: string;
  ruleCode?: string;
  ratePct: number;
  base: number;
  tds: number;
  reason: string;
  panMissing: boolean;
}

export interface TdsLedgerEntry {
  id: string;
  date: string;
  vendorName: string;
  vendorPan?: string;
  section: string;
  reference: string;
  base: number;
  ratePct: number;
  tds: number;
  financialYear: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  status: "deducted" | "deposited" | "certified";
  challanNo?: string;
  depositedAt?: string;
}

export const DEFAULT_TDS_RULES: TdsRule[] = [
  {
    id: "tds-194c",
    code: "TDS-194C",
    section: "194C",
    name: "Payments to contractors",
    vendorTypes: ["contractor", "firm", "company", "individual-huf"],
    transactionTypes: ["contract", "goods"],
    expenseCategories: ["Subcontract", "Fabrication", "Installation", "Material"],
    singleThreshold: 30000,
    annualThreshold: 100000,
    ratePct: 2,
    noPanRatePct: 20,
    rounding: "nearest-1",
    financialYear: "2025-26",
    active: true,
  },
  {
    id: "tds-194j",
    code: "TDS-194J",
    section: "194J",
    name: "Professional / technical services",
    vendorTypes: ["professional", "firm", "company", "individual-huf"],
    transactionTypes: ["professional", "services"],
    expenseCategories: ["Consulting", "Design", "Audit", "Legal", "Services"],
    singleThreshold: 30000,
    annualThreshold: 30000,
    ratePct: 10,
    noPanRatePct: 20,
    rounding: "nearest-1",
    financialYear: "2025-26",
    active: true,
  },
  {
    id: "tds-194i",
    code: "TDS-194I",
    section: "194I(b)",
    name: "Rent — land, building, furniture",
    vendorTypes: ["company", "firm", "individual-huf"],
    transactionTypes: ["rent"],
    expenseCategories: ["Rent", "Facility"],
    singleThreshold: 0,
    annualThreshold: 240000,
    ratePct: 10,
    noPanRatePct: 20,
    rounding: "nearest-10",
    financialYear: "2025-26",
    active: true,
  },
  {
    id: "tds-194h",
    code: "TDS-194H",
    section: "194H",
    name: "Commission or brokerage",
    vendorTypes: ["individual-huf", "firm", "company"],
    transactionTypes: ["commission"],
    expenseCategories: ["Commission", "Brokerage"],
    singleThreshold: 15000,
    annualThreshold: 15000,
    ratePct: 5,
    noPanRatePct: 20,
    rounding: "nearest-1",
    financialYear: "2025-26",
    active: true,
  },
  {
    id: "tds-194q",
    code: "TDS-194Q",
    section: "194Q",
    name: "Purchase of goods",
    vendorTypes: ["company", "firm", "contractor"],
    transactionTypes: ["goods"],
    expenseCategories: ["Material", "Components", "Raw Material"],
    singleThreshold: 0,
    annualThreshold: 5000000,
    ratePct: 0.1,
    noPanRatePct: 5,
    rounding: "nearest-1",
    financialYear: "2025-26",
    active: true,
  },
  {
    id: "tds-195",
    code: "TDS-195",
    section: "195",
    name: "Payments to non-residents",
    vendorTypes: ["non-resident"],
    transactionTypes: ["services", "professional", "goods", "contract"],
    singleThreshold: 0,
    annualThreshold: 0,
    ratePct: 20,
    noPanRatePct: 20,
    rounding: "nearest-1",
    financialYear: "2025-26",
    active: true,
  },
];

export function applyRounding(value: number, rule: RoundingRule): number {
  switch (rule) {
    case "nearest-10":
      return Math.round(value / 10) * 10;
    case "round-up-10":
      return Math.ceil(value / 10) * 10;
    case "none":
      return value;
    default:
      return Math.round(value);
  }
}

export function financialYearOf(dateIso: string): string {
  const d = new Date(dateIso);
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function quarterOf(dateIso: string): TdsLedgerEntry["quarter"] {
  const m = new Date(dateIso).getMonth();
  if (m >= 3 && m <= 5) return "Q1";
  if (m >= 6 && m <= 8) return "Q2";
  if (m >= 9 && m <= 11) return "Q3";
  return "Q4";
}

/** Picks the highest-rate matching rule and computes the deduction. */
export function evaluateTds(input: TdsInput, rules: TdsRule[] = DEFAULT_TDS_RULES): TdsResult {
  const base = Math.max(0, Number(input.baseAmount || 0));
  const panMissing = !input.vendorPan?.trim();
  const candidates = rules.filter(
    (r) =>
      r.active &&
      r.financialYear === input.financialYear &&
      r.vendorTypes.includes(input.vendorType) &&
      r.transactionTypes.includes(input.transactionType) &&
      (!r.expenseCategories?.length ||
        !input.expenseCategory ||
        r.expenseCategories.some((c) => c.toLowerCase() === input.expenseCategory!.toLowerCase())),
  );

  if (!candidates.length)
    return { applicable: false, ratePct: 0, base, tds: 0, panMissing, reason: "No TDS rule matches this vendor and transaction type." };

  const rule = candidates.sort((a, b) => b.ratePct - a.ratePct)[0]!;
  const fyTotal = Number(input.fyToDateAmount ?? 0) + base;

  if (base < rule.singleThreshold && fyTotal < rule.annualThreshold)
    return {
      applicable: false,
      section: rule.section,
      ruleCode: rule.code,
      ratePct: 0,
      base,
      tds: 0,
      panMissing,
      reason: `Below ${rule.section} thresholds (single ₹${rule.singleThreshold.toLocaleString("en-IN")} / annual ₹${rule.annualThreshold.toLocaleString("en-IN")}).`,
    };

  const ratePct = panMissing ? rule.noPanRatePct : rule.ratePct;
  const tds = applyRounding((base * ratePct) / 100, rule.rounding);

  return {
    applicable: tds > 0,
    section: rule.section,
    ruleCode: rule.code,
    ratePct,
    base,
    tds,
    panMissing,
    reason: panMissing
      ? `${rule.section} at higher no-PAN rate ${ratePct}% (PAN not on file).`
      : `${rule.section} — ${rule.name} at ${ratePct}%.`,
  };
}

export function ledgerEntryFrom(input: TdsInput, result: TdsResult): TdsLedgerEntry | null {
  if (!result.applicable || !result.section) return null;
  return {
    id: crypto.randomUUID(),
    date: input.date,
    vendorName: input.vendorName,
    vendorPan: input.vendorPan,
    section: result.section,
    reference: input.reference ?? "—",
    base: result.base,
    ratePct: result.ratePct,
    tds: result.tds,
    financialYear: input.financialYear,
    quarter: quarterOf(input.date),
    status: "deducted",
  };
}

/** Journal lines for the TDS payable leg of a supplier bill. */
export function tdsJournalLines(result: TdsResult, vendorName: string) {
  if (!result.applicable) return [];
  return [
    {
      accountCode: "2130",
      debit: 0,
      credit: result.tds,
      memo: `TDS ${result.section} deducted — ${vendorName}`,
    },
  ];
}

export interface TdsCertificateRow {
  vendorName: string;
  vendorPan?: string;
  section: string;
  quarter: TdsLedgerEntry["quarter"];
  financialYear: string;
  base: number;
  tds: number;
  deposited: number;
  entries: number;
  certificateNo: string;
}

/** Aggregates ledger rows into Form 16A / 26Q reporting data. */
export function certificateData(entries: TdsLedgerEntry[]): TdsCertificateRow[] {
  const map = new Map<string, TdsCertificateRow>();
  for (const e of entries) {
    const key = `${e.vendorName}|${e.section}|${e.quarter}|${e.financialYear}`;
    const row =
      map.get(key) ??
      {
        vendorName: e.vendorName,
        vendorPan: e.vendorPan,
        section: e.section,
        quarter: e.quarter,
        financialYear: e.financialYear,
        base: 0,
        tds: 0,
        deposited: 0,
        entries: 0,
        certificateNo: `16A/${e.financialYear}/${e.quarter}/${e.section}/${e.vendorName.slice(0, 3).toUpperCase()}`,
      };
    row.base += e.base;
    row.tds += e.tds;
    if (e.status !== "deducted") row.deposited += e.tds;
    row.entries += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.tds - a.tds);
}
