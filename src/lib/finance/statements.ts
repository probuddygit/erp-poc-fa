/**
 * Ledger-derived financial statements with dimensional filtering.
 *
 * All statements (Trial Balance, P&L, Balance Sheet, Cash Flow, General Ledger and
 * the supporting schedules) are computed from posted journal lines, so every figure
 * drills down to the ledger and from there to the source transaction.
 */
import type { Account, FinanceState, FinancialLine, Journal, JournalLine } from "./types";

export interface StatementFilters {
  company?: string;
  branch?: string;
  department?: string;
  projectCode?: string;
  costCentreCode?: string;
  /** e.g. 2025-26 */
  financialYear?: string;
  /** YYYY-MM accounting period; empty = full year to date. */
  period?: string;
}

export interface PostedLine extends JournalLine {
  journalId: string;
  journalCode: string;
  date: string;
  narration: string;
  reference: string;
  source: Journal["source"];
}

export function financialYearOfDate(dateIso: string): string {
  const d = new Date(dateIso);
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function periodOfDate(dateIso: string): string {
  return dateIso.slice(0, 7);
}

/** Flattens posted journals into dimension-tagged lines, applying filters. */
export function postedLines(s: FinanceState, f: StatementFilters = {}): PostedLine[] {
  const out: PostedLine[] = [];
  for (const j of s.journals) {
    if (j.status !== "posted") continue;
    if (f.financialYear && financialYearOfDate(j.date) !== f.financialYear) continue;
    if (f.period && periodOfDate(j.date) !== f.period) continue;
    for (const l of j.lines) {
      if (f.projectCode && l.projectCode !== f.projectCode) continue;
      if (f.department && l.department !== f.department) continue;
      if (f.costCentreCode && l.costCentreCode !== f.costCentreCode) continue;
      out.push({
        ...l,
        journalId: j.id,
        journalCode: j.code,
        date: j.date,
        narration: j.narration,
        reference: j.reference,
        source: j.source,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export interface StatementRow {
  code: string;
  name: string;
  type: Account["type"];
  debit: number;
  credit: number;
  /** Signed balance in the account's natural direction. */
  balance: number;
  lines: number;
}

const isDebitNature = (t: Account["type"]) => t === "asset" || t === "expense";

/** Trial balance built from posted lines; falls back to opening balances when unfiltered. */
export function ledgerTrialBalance(s: FinanceState, f: StatementFilters = {}): StatementRow[] {
  const lines = postedLines(s, f);
  const filtered = Boolean(f.projectCode || f.department || f.costCentreCode || f.period || f.financialYear);
  const byAccount = new Map<string, { debit: number; credit: number; lines: number }>();
  for (const l of lines) {
    const row = byAccount.get(l.accountCode) ?? { debit: 0, credit: 0, lines: 0 };
    row.debit += l.debit;
    row.credit += l.credit;
    row.lines += 1;
    byAccount.set(l.accountCode, row);
  }

  return s.accounts
    .map((a) => {
      const m = byAccount.get(a.code);
      const movement = (m?.debit ?? 0) - (m?.credit ?? 0);
      const natural = isDebitNature(a.type) ? 1 : -1;
      const balance = filtered ? movement * natural : a.balance;
      return {
        code: a.code,
        name: a.name,
        type: a.type,
        debit: isDebitNature(a.type) ? Math.max(0, balance) : Math.max(0, -balance),
        credit: isDebitNature(a.type) ? Math.max(0, -balance) : Math.max(0, balance),
        balance,
        lines: m?.lines ?? 0,
      };
    })
    .filter((r) => !filtered || r.lines > 0 || r.balance !== 0)
    .sort((a, b) => a.code.localeCompare(b.code));
}

const COGS_CODES = ["5000", "5100", "5200"];

export interface StatementBlock {
  title: string;
  lines: FinancialLine[];
}

function line(label: string, amount: number, opts: Partial<FinancialLine> = {}): FinancialLine {
  return { code: opts.code ?? label, label, amount, ...opts };
}

export function profitAndLoss(s: FinanceState, f: StatementFilters = {}): StatementBlock {
  const rows = ledgerTrialBalance(s, f);
  const income = rows.filter((r) => r.type === "income");
  const expense = rows.filter((r) => r.type === "expense");
  const cogs = expense.filter((e) => COGS_CODES.includes(e.code));
  const opex = expense.filter((e) => !COGS_CODES.includes(e.code));
  const totalIncome = income.reduce((a, x) => a + x.balance, 0);
  const totalCogs = cogs.reduce((a, x) => a + x.balance, 0);
  const totalOpex = opex.reduce((a, x) => a + x.balance, 0);

  return {
    title: "Profit & Loss",
    lines: [
      ...income.map((r) => line(r.name, r.balance, { code: r.code, group: "Revenue" })),
      line("Total revenue", totalIncome, { emphasis: true, group: "Revenue" }),
      ...cogs.map((r) => line(r.name, r.balance, { code: r.code, group: "Cost of sales" })),
      line("Gross profit", totalIncome - totalCogs, { emphasis: true, group: "Cost of sales" }),
      ...opex.map((r) => line(r.name, r.balance, { code: r.code, group: "Operating expenses" })),
      line("Total operating expenses", totalOpex, { group: "Operating expenses" }),
      line("Net profit", totalIncome - totalCogs - totalOpex, { emphasis: true, group: "Result" }),
    ],
  };
}

export function balanceSheet(s: FinanceState, f: StatementFilters = {}): StatementBlock {
  const rows = ledgerTrialBalance(s, f);
  const asset = rows.filter((r) => r.type === "asset");
  const liab = rows.filter((r) => r.type === "liability");
  const equity = rows.filter((r) => r.type === "equity");
  const pnl = profitAndLoss(s, f);
  const net = pnl.lines.find((l) => l.label === "Net profit")?.amount ?? 0;

  return {
    title: "Balance Sheet",
    lines: [
      ...asset.map((r) => line(r.name, r.balance, { code: r.code, group: "Assets" })),
      line("Total assets", asset.reduce((a, x) => a + x.balance, 0), { emphasis: true, group: "Assets" }),
      ...liab.map((r) => line(r.name, r.balance, { code: r.code, group: "Liabilities" })),
      line("Total liabilities", liab.reduce((a, x) => a + x.balance, 0), { emphasis: true, group: "Liabilities" }),
      ...equity.map((r) => line(r.name, r.balance, { code: r.code, group: "Equity" })),
      line("Retained earnings — current period", net, { group: "Equity" }),
      line("Total equity", equity.reduce((a, x) => a + x.balance, 0) + net, { emphasis: true, group: "Equity" }),
    ],
  };
}

export function cashFlow(s: FinanceState, f: StatementFilters = {}): StatementBlock {
  const rows = ledgerTrialBalance(s, f);
  const pnl = profitAndLoss(s, f);
  const net = pnl.lines.find((l) => l.label === "Net profit")?.amount ?? 0;
  const depreciation = rows.find((r) => r.code === "6500")?.balance ?? 0;
  const receivables = rows.filter((r) => r.type === "asset" && /receivable/i.test(r.name)).reduce((a, x) => a + x.balance, 0);
  const payables = rows.filter((r) => r.type === "liability" && /payable/i.test(r.name)).reduce((a, x) => a + x.balance, 0);
  const inventory = rows.filter((r) => /inventor|stock|wip/i.test(r.name) && r.type === "asset").reduce((a, x) => a + x.balance, 0);
  const capex = rows.filter((r) => r.type === "asset" && /plant|machinery|equipment|asset/i.test(r.name)).reduce((a, x) => a + x.balance, 0);
  const ops = net + depreciation - receivables + payables - inventory;

  return {
    title: "Cash Flow",
    lines: [
      line("Net profit before tax", net, { group: "Operating" }),
      line("Add: Depreciation & amortisation", depreciation, { group: "Operating" }),
      line("Change in receivables", -receivables, { group: "Operating" }),
      line("Change in payables", payables, { group: "Operating" }),
      line("Change in inventory / WIP", -inventory, { group: "Operating" }),
      line("Cash from operations", ops, { emphasis: true, group: "Operating" }),
      line("Capital expenditure", -capex, { group: "Investing" }),
      line("Cash used in investing", -capex, { emphasis: true, group: "Investing" }),
      line("Net change in cash", ops - capex, { emphasis: true, group: "Result" }),
    ],
  };
}

export interface ScheduleRow {
  schedule: string;
  code: string;
  label: string;
  amount: number;
}

/** Supporting schedules behind the statement captions. */
export function schedules(s: FinanceState, f: StatementFilters = {}): ScheduleRow[] {
  const rows = ledgerTrialBalance(s, f);
  const group = (schedule: string, test: (r: StatementRow) => boolean) =>
    rows.filter(test).map((r) => ({ schedule, code: r.code, label: r.name, amount: r.balance }));

  return [
    ...group("Schedule 1 — Revenue", (r) => r.type === "income"),
    ...group("Schedule 2 — Cost of sales", (r) => r.type === "expense" && COGS_CODES.includes(r.code)),
    ...group("Schedule 3 — Operating expenses", (r) => r.type === "expense" && !COGS_CODES.includes(r.code)),
    ...group("Schedule 4 — Current assets", (r) => r.type === "asset" && /receivable|bank|cash|inventor|wip|advance/i.test(r.name)),
    ...group("Schedule 5 — Fixed assets", (r) => r.type === "asset" && /plant|machinery|equipment|building|vehicle|furniture/i.test(r.name)),
    ...group("Schedule 6 — Liabilities & provisions", (r) => r.type === "liability"),
    ...group("Schedule 7 — Equity", (r) => r.type === "equity"),
  ].filter((r) => r.amount !== 0);
}

export interface GlRow {
  date: string;
  journalCode: string;
  accountCode: string;
  accountName: string;
  narration: string;
  reference: string;
  projectCode?: string;
  department?: string;
  costCentreCode?: string;
  debit: number;
  credit: number;
  running: number;
}

/** General ledger for one account (or all accounts when no code is given). */
export function generalLedger(s: FinanceState, accountCode: string | undefined, f: StatementFilters = {}): GlRow[] {
  const names = new Map(s.accounts.map((a) => [a.code, a.name]));
  let running = 0;
  return postedLines(s, f)
    .filter((l) => !accountCode || l.accountCode === accountCode)
    .map((l) => {
      running += l.debit - l.credit;
      return {
        date: l.date,
        journalCode: l.journalCode,
        accountCode: l.accountCode,
        accountName: names.get(l.accountCode) ?? l.accountCode,
        narration: l.narration,
        reference: l.reference,
        projectCode: l.projectCode,
        department: l.department,
        costCentreCode: l.costCentreCode,
        debit: l.debit,
        credit: l.credit,
        running,
      };
    })
    .reverse();
}

/** Distinct dimension values available for the filter bar. */
export function dimensionOptions(s: FinanceState) {
  const projects = new Set<string>();
  const departments = new Set<string>();
  const periods = new Set<string>();
  const years = new Set<string>();
  for (const j of s.journals) {
    if (j.status !== "posted") continue;
    periods.add(periodOfDate(j.date));
    years.add(financialYearOfDate(j.date));
    for (const l of j.lines) {
      if (l.projectCode) projects.add(l.projectCode);
      if (l.department) departments.add(l.department);
    }
  }
  for (const p of s.projectCosts) projects.add(p.projectCode);
  return {
    projects: [...projects].sort(),
    departments: [...departments].sort(),
    costCentres: s.costCentres.map((c) => c.code).sort(),
    periods: [...periods].sort().reverse(),
    financialYears: [...years].sort().reverse(),
  };
}
