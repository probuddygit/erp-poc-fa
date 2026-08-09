/**
 * Finance intelligence engine — deterministic, fully grounded analytics over the
 * finance store. Powers anomaly detection, cash-flow forecasting, working-capital
 * analysis, budget variance, profitability by dimension, GL coding suggestions,
 * close readiness and the AI Finance Copilot recommendations.
 *
 * Everything here is derived arithmetic on live records: no invented numbers.
 */
import type { AiAction } from "@/components/ai/module-copilot";
import type { FinanceState, ARInvoice, APBill, Journal } from "./types";
import {
  approveBill, holdBill, sendInvoice, autoMatchBank, runDepreciation,
  refreshBudgetActuals, runCloseValidations, postJournal, assetAnnualDepreciation, assetNbv,
} from "./store";

const DAY = 86_400_000;
const overdueDays = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / DAY);
const dueInDays = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / DAY);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export const arNet = (i: ARInvoice) => i.amount + i.gst - i.tds;
export const arOpen = (i: ARInvoice) => Math.max(0, arNet(i) - i.received);
export const apNet = (b: APBill) => b.amount + b.gst - b.tds;
export const apOpen = (b: APBill) => Math.max(0, apNet(b) - b.paid);

/* ------------------------------------------------------------------
   Working capital & liquidity
   ------------------------------------------------------------------ */

export interface WorkingCapital {
  cash: number;
  receivables: number;
  payables: number;
  inventory: number;
  currentAssets: number;
  currentLiabilities: number;
  currentRatio: number;
  quickRatio: number;
  netWorkingCapital: number;
  dso: number;
  dpo: number;
  cashConversionDays: number;
  runwayDays: number;
}

export function workingCapital(s: FinanceState): WorkingCapital {
  const cash = s.bankAccounts.reduce((a, b) => a + b.bookBalance, 0);
  const receivables = s.arInvoices.reduce((a, i) => a + arOpen(i), 0);
  const payables = s.apBills.reduce((a, b) => a + apOpen(b), 0);
  const inventory = s.accounts.find((a) => a.code === "1300")?.balance ?? 0;
  const revenue = s.accounts.filter((a) => a.type === "income").reduce((a, x) => a + x.balance, 0);
  const purchases = s.accounts.filter((a) => ["5000", "5100", "5200"].includes(a.code)).reduce((a, x) => a + x.balance, 0);
  const expenses = s.accounts.filter((a) => a.type === "expense").reduce((a, x) => a + x.balance, 0);

  const currentAssets = cash + receivables + inventory;
  const gst = s.accounts.find((a) => a.code === "2200")?.balance ?? 0;
  const tds = s.accounts.find((a) => a.code === "2210")?.balance ?? 0;
  const currentLiabilities = payables + gst + tds;
  const dailyBurn = expenses / 365 || 1;

  return {
    cash,
    receivables,
    payables,
    inventory,
    currentAssets,
    currentLiabilities,
    currentRatio: currentLiabilities ? currentAssets / currentLiabilities : 0,
    quickRatio: currentLiabilities ? (cash + receivables) / currentLiabilities : 0,
    netWorkingCapital: currentAssets - currentLiabilities,
    dso: revenue ? Math.round((receivables / revenue) * 365) : 0,
    dpo: purchases ? Math.round((payables / purchases) * 365) : 0,
    cashConversionDays:
      (revenue ? Math.round((receivables / revenue) * 365) : 0) -
      (purchases ? Math.round((payables / purchases) * 365) : 0),
    runwayDays: Math.round(cash / dailyBurn),
  };
}

/* ------------------------------------------------------------------
   Cash-flow forecast — driven by AR due dates, AP due dates and run-rate
   ------------------------------------------------------------------ */

export interface CashWeek {
  label: string;
  inflow: number;
  outflow: number;
  net: number;
  closing: number;
  risk: boolean;
}

/** 13-week direct cash forecast built from open AR/AP maturities + payroll run-rate. */
export function cashForecast(s: FinanceState, weeks = 13): CashWeek[] {
  let closing = s.bankAccounts.reduce((a, b) => a + b.bookBalance, 0);
  const payrollMonthly = (s.accounts.find((a) => a.code === "6100")?.balance ?? 0) / 12;
  const opexMonthly = (s.accounts.find((a) => a.code === "6300")?.balance ?? 0) / 12;
  const gstDue = s.taxLedgers.filter((t) => t.status !== "filed").reduce((a, t) => a + t.netPayable, 0);

  const out: CashWeek[] = [];
  for (let w = 0; w < weeks; w += 1) {
    const from = w * 7;
    const to = from + 7;
    const inWindow = (iso: string) => {
      const d = dueInDays(iso);
      return d >= from && d < to;
    };
    // Overdue balances land in week 0 with a collection-probability haircut.
    const collect = s.arInvoices.reduce((a, i) => {
      const open = arOpen(i);
      if (!open) return a;
      const d = dueInDays(i.dueAt);
      if (w === 0 && d < 0) return a + open * 0.55;
      return inWindow(i.dueAt) ? a + open * 0.85 : a;
    }, 0);
    const pay = s.apBills.reduce((a, b) => {
      const open = apOpen(b);
      if (!open || b.status === "hold") return a;
      const d = dueInDays(b.dueAt);
      if (w === 0 && d < 0) return a + open;
      return inWindow(b.dueAt) ? a + open : a;
    }, 0);

    const payroll = w % 4 === 3 ? payrollMonthly : 0;
    const opex = opexMonthly / 4 + (w % 4 === 1 ? opexMonthly * 0.2 : 0);
    const tax = w === 3 ? gstDue : 0;

    const inflow = Math.round(collect);
    const outflow = Math.round(pay + payroll + opex + tax);
    closing += inflow - outflow;
    out.push({
      label: `W${w + 1}`,
      inflow,
      outflow,
      net: inflow - outflow,
      closing: Math.round(closing),
      risk: closing < 0,
    });
  }
  return out;
}

/** Straight-line + seasonality revenue & expense forecast for the next N months. */
export function revenueForecast(s: FinanceState, months = 6) {
  const revenue = s.accounts.filter((a) => a.type === "income").reduce((a, x) => a + x.balance, 0);
  const expense = s.accounts.filter((a) => a.type === "expense").reduce((a, x) => a + x.balance, 0);
  const baseRev = revenue / 12;
  const baseExp = expense / 12;
  const pipeline = s.projectCosts.reduce((a, p) => a + Math.max(0, p.contractValue - p.billed), 0);
  const monthlyPipeline = pipeline / Math.max(months, 1);

  return Array.from({ length: months }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i + 1);
    const seasonal = 1 + Math.sin((d.getMonth() / 12) * Math.PI * 2) * 0.06;
    const rev = Math.round((baseRev * 0.72 + monthlyPipeline * 0.28) * seasonal);
    const exp = Math.round(baseExp * (1 + i * 0.004) * seasonal);
    return { month: d.toLocaleDateString("en-IN", { month: "short" }), Revenue: rev, Expense: exp, Margin: rev - exp };
  });
}

/* ------------------------------------------------------------------
   Anomaly detection
   ------------------------------------------------------------------ */

export interface Anomaly {
  id: string;
  kind: "duplicate-payment" | "duplicate-invoice" | "unbalanced-journal" | "round-amount" | "price-variance" | "unusual-value" | "stale-bank" | "missing-irn";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  reference: string;
  amount?: number;
}

export function detectAnomalies(s: FinanceState): Anomaly[] {
  const out: Anomaly[] = [];

  // Duplicate vendor bills — same vendor, same amount, within 15 days
  const bills = [...s.apBills].sort((a, b) => a.vendorName.localeCompare(b.vendorName));
  for (let i = 0; i < bills.length; i += 1) {
    for (let j = i + 1; j < bills.length; j += 1) {
      const a = bills[i]!;
      const b = bills[j]!;
      if (a.vendorName !== b.vendorName) break;
      const sameAmount = Math.abs(a.amount - b.amount) <= Math.max(1, a.amount * 0.005);
      const near = Math.abs(new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()) < 15 * DAY;
      if (sameAmount && near) {
        out.push({
          id: `dup-${a.id}-${b.id}`,
          kind: "duplicate-payment",
          severity: "high",
          title: `Possible duplicate bill — ${a.vendorName}`,
          detail: `${a.code} and ${b.code} carry the same taxable value within 15 days. Verify before releasing payment.`,
          reference: `${a.code} / ${b.code}`,
          amount: a.amount,
        });
      }
    }
  }

  // Duplicate AR invoices for the same customer + project + amount
  const seen = new Map<string, ARInvoice>();
  for (const i of s.arInvoices) {
    const key = `${i.customerName}|${i.projectCode ?? ""}|${i.amount}`;
    const prev = seen.get(key);
    if (prev) {
      out.push({
        id: `dupar-${prev.id}-${i.id}`,
        kind: "duplicate-invoice",
        severity: "medium",
        title: `Repeated invoice value — ${i.customerName}`,
        detail: `${prev.code} and ${i.code} bill the same value on the same project. Confirm these are separate milestones.`,
        reference: `${prev.code} / ${i.code}`,
        amount: i.amount,
      });
    } else seen.set(key, i);
  }

  // Unbalanced journals
  for (const j of s.journals) {
    const dr = j.lines.reduce((a, l) => a + l.debit, 0);
    const cr = j.lines.reduce((a, l) => a + l.credit, 0);
    if (Math.abs(dr - cr) > 1) {
      out.push({
        id: `unbal-${j.id}`,
        kind: "unbalanced-journal",
        severity: "high",
        title: `Unbalanced journal ${j.code}`,
        detail: `Debits ${Math.round(dr).toLocaleString("en-IN")} vs credits ${Math.round(cr).toLocaleString("en-IN")} — difference of ${Math.abs(Math.round(dr - cr)).toLocaleString("en-IN")}.`,
        reference: j.code,
        amount: Math.abs(dr - cr),
      });
    }
  }

  // Price / quantity variance on bills
  for (const b of s.apBills) {
    if (b.matchStatus === "price-var" || b.matchStatus === "qty-var") {
      out.push({
        id: `var-${b.id}`,
        kind: "price-variance",
        severity: "medium",
        title: `${b.matchStatus === "price-var" ? "Price" : "Quantity"} variance — ${b.vendorName}`,
        detail: `${b.code} failed 3-way match against ${b.poCode ?? "PO"} / ${b.grnCode ?? "GRN"}. Resolve before approval.`,
        reference: b.code,
        amount: apNet(b),
      });
    }
    if (!b.poCode && apNet(b) > 1_000_000) {
      out.push({
        id: `nopo-${b.id}`,
        kind: "unusual-value",
        severity: "high",
        title: `High-value bill without PO — ${b.vendorName}`,
        detail: `${b.code} of ${Math.round(apNet(b)).toLocaleString("en-IN")} has no purchase order reference.`,
        reference: b.code,
        amount: apNet(b),
      });
    }
  }

  // Suspiciously round manual journal amounts
  for (const j of s.journals.filter((x) => x.source === "manual")) {
    const big = j.lines.find((l) => l.debit >= 1_000_000 && l.debit % 100_000 === 0);
    if (big) {
      out.push({
        id: `round-${j.id}`,
        kind: "round-amount",
        severity: "low",
        title: `Round-sum manual entry ${j.code}`,
        detail: `Manual journal posts an exact round amount of ${Math.round(big.debit).toLocaleString("en-IN")} — typical of estimates or provisions; attach support.`,
        reference: j.code,
        amount: big.debit,
      });
    }
  }

  // Stale bank reconciliation
  for (const b of s.bankAccounts) {
    const gap = Math.abs(b.bookBalance - b.statementBalance);
    if (b.unreconciledCount > 0 || gap > 1000) {
      out.push({
        id: `bank-${b.id}`,
        kind: "stale-bank",
        severity: gap > 200_000 ? "high" : "medium",
        title: `Unreconciled balance — ${b.bankName}`,
        detail: `${b.unreconciledCount} open item(s), book vs statement gap of ${Math.round(gap).toLocaleString("en-IN")}. Last reconciled ${overdueDays(b.lastRecoAt)}d ago.`,
        reference: b.code,
        amount: gap,
      });
    }
  }

  // Missing e-invoice IRN on taxable sales
  for (const i of s.arInvoices) {
    if (!i.eInvoiceIRN && i.status !== "draft" && i.status !== "void" && i.amount > 500_000) {
      out.push({
        id: `irn-${i.id}`,
        kind: "missing-irn",
        severity: "medium",
        title: `e-Invoice IRN missing — ${i.code}`,
        detail: `${i.customerName} invoice above the e-invoicing threshold has no IRN registered.`,
        reference: i.code,
        amount: i.amount,
      });
    }
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity] || (b.amount ?? 0) - (a.amount ?? 0));
}

/* ------------------------------------------------------------------
   AI-assisted GL coding
   ------------------------------------------------------------------ */

const CODING_RULES: { match: RegExp; account: string; reason: string }[] = [
  { match: /steel|plate|sheet|en31|raw material/i, account: "5000", reason: "Material keywords map to steel & sheet cost" },
  { match: /robot|fanuc|kuka|plc|servo|automation|bought[- ]out/i, account: "5100", reason: "Automation hardware maps to bought-out automation" },
  { match: /fabricat|machining|sub[- ]?contract|job work/i, account: "5200", reason: "Outsourced work maps to sub-contract" },
  { match: /salary|wages|payroll|stipend|bonus/i, account: "6100", reason: "Employment cost maps to salaries & wages" },
  { match: /power|electric|fuel|diesel|utility|water/i, account: "6300", reason: "Utility keywords map to power, fuel & utilities" },
  { match: /depreciat|amortis/i, account: "6500", reason: "Depreciation keywords map to depreciation" },
  { match: /gst|igst|cgst|sgst|itc/i, account: "2200", reason: "Tax keywords map to GST payable" },
  { match: /tds|194|192/i, account: "2210", reason: "Withholding keywords map to TDS payable" },
  { match: /receipt|customer|collection|invoice raised/i, account: "1200", reason: "Customer collections map to accounts receivable" },
  { match: /vendor|supplier|payment made|rtgs|neft/i, account: "2100", reason: "Vendor settlements map to accounts payable" },
  { match: /bank charge|interest|loan|emi/i, account: "1100", reason: "Banking movements map to cash & bank" },
];

export interface CodingSuggestion {
  accountCode: string;
  accountName: string;
  confidence: number;
  reason: string;
}

/** Suggest a GL account for a free-text narration, grounded in the chart of accounts. */
export function suggestGlAccount(s: FinanceState, text: string): CodingSuggestion[] {
  const hits = CODING_RULES.filter((r) => r.match.test(text));
  const suggestions = hits.map((r, idx) => {
    const acc = s.accounts.find((a) => a.code === r.account);
    return {
      accountCode: r.account,
      accountName: acc?.name ?? r.account,
      confidence: clamp(92 - idx * 11),
      reason: r.reason,
    };
  });
  if (suggestions.length) return suggestions.slice(0, 3);

  // Fall back to the most-used expense account from history
  const usage = new Map<string, number>();
  s.journals.forEach((j) => j.lines.forEach((l) => usage.set(l.accountCode, (usage.get(l.accountCode) ?? 0) + 1)));
  const top = Array.from(usage.entries()).sort((a, b) => b[1] - a[1])[0];
  if (!top) return [];
  const acc = s.accounts.find((a) => a.code === top[0]);
  return [{ accountCode: top[0], accountName: acc?.name ?? top[0], confidence: 45, reason: "No keyword match — defaulting to the most frequently used account" }];
}

/* ------------------------------------------------------------------
   Reconciliation & invoice matching suggestions
   ------------------------------------------------------------------ */

export interface MatchSuggestion {
  txnId: string;
  narration: string;
  amount: number;
  suggestedRef: string;
  confidence: number;
  reason: string;
}

/** Score open bank transactions against open AR / AP documents. */
export function reconciliationSuggestions(s: FinanceState): MatchSuggestion[] {
  const docs = [
    ...s.arInvoices.map((i) => ({ code: i.code, party: i.customerName, amount: arOpen(i) || arNet(i), dir: "credit" as const })),
    ...s.apBills.map((b) => ({ code: b.code, party: b.vendorName, amount: apOpen(b) || apNet(b), dir: "debit" as const })),
  ];

  return s.bankTxns
    .filter((t) => t.status !== "matched")
    .map((t) => {
      const scored = docs
        .map((d) => {
          let score = 0;
          const reasons: string[] = [];
          if (d.dir === t.direction) {
            score += 20;
            reasons.push("direction matches");
          }
          const amtDelta = Math.abs(d.amount - t.amount) / Math.max(d.amount, t.amount, 1);
          if (amtDelta < 0.005) {
            score += 45;
            reasons.push("amount matches exactly");
          } else if (amtDelta < 0.05) {
            score += 25;
            reasons.push("amount within 5%");
          }
          const narr = t.narration.toLowerCase();
          if (narr.includes(d.code.toLowerCase())) {
            score += 35;
            reasons.push("document number in narration");
          }
          const token = d.party.split(/\s+/)[0]?.toLowerCase() ?? "";
          if (token.length > 3 && narr.includes(token)) {
            score += 20;
            reasons.push("counterparty name in narration");
          }
          return { code: d.code, score, reason: reasons.join(", ") };
        })
        .sort((a, b) => b.score - a.score)[0];

      if (!scored || scored.score < 40) return null;
      return {
        txnId: t.id,
        narration: t.narration,
        amount: t.amount,
        suggestedRef: scored.code,
        confidence: clamp(scored.score),
        reason: scored.reason,
      };
    })
    .filter((x): x is MatchSuggestion => !!x);
}

/* ------------------------------------------------------------------
   Budget variance & profitability
   ------------------------------------------------------------------ */

export interface BudgetVariance {
  id: string;
  code: string;
  costCentre: string;
  category: string;
  accountCode: string;
  annualBudget: number;
  ytdBudget: number;
  ytdActual: number;
  committed: number;
  variance: number;
  variancePct: number;
  projectedYear: number;
  overrunRisk: "low" | "medium" | "high";
  status: string;
}

export function budgetVariances(s: FinanceState): BudgetVariance[] {
  return s.budgets
    .map((b) => {
      const variance = b.ytdBudget - b.ytdActual;
      const variancePct = b.ytdBudget ? (variance / b.ytdBudget) * 100 : 0;
      const burnRate = b.ytdBudget ? b.ytdActual / b.ytdBudget : 0;
      const projectedYear = Math.round(b.annualBudget * burnRate + b.committed);
      const over = projectedYear - b.annualBudget;
      return {
        id: b.id,
        code: b.code,
        costCentre: s.costCentres.find((c) => c.code === b.costCentreCode)?.name ?? b.costCentreCode,
        category: b.category,
        accountCode: b.accountCode,
        annualBudget: b.annualBudget,
        ytdBudget: b.ytdBudget,
        ytdActual: b.ytdActual,
        committed: b.committed,
        variance,
        variancePct,
        projectedYear,
        overrunRisk: over > b.annualBudget * 0.08 ? "high" : over > 0 ? "medium" : "low",
        status: b.status,
      } as BudgetVariance;
    })
    .sort((a, b) => a.variancePct - b.variancePct);
}

export interface ProfitRow {
  key: string;
  label: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
  meta?: string;
}

export type ProfitDimension = "project" | "customer" | "costCentre" | "account" | "businessUnit";

export function profitability(s: FinanceState, dim: ProfitDimension): ProfitRow[] {
  const row = (key: string, label: string, revenue: number, cost: number, meta?: string): ProfitRow => ({
    key,
    label,
    revenue,
    cost,
    margin: revenue - cost,
    marginPct: revenue ? ((revenue - cost) / revenue) * 100 : 0,
    meta,
  });

  if (dim === "project") {
    return s.projectCosts
      .map((p) =>
        row(
          p.projectCode,
          p.projectName,
          p.billed || p.contractValue,
          p.materialCost + p.labourCost + p.overheadCost + p.subContractCost,
          `${p.customer} · ${p.percentComplete}% complete`,
        ),
      )
      .sort((a, b) => b.margin - a.margin);
  }

  if (dim === "customer") {
    const map = new Map<string, { rev: number; cost: number; projects: Set<string> }>();
    for (const p of s.projectCosts) {
      const e = map.get(p.customer) ?? { rev: 0, cost: 0, projects: new Set<string>() };
      e.rev += p.billed || p.contractValue;
      e.cost += p.materialCost + p.labourCost + p.overheadCost + p.subContractCost;
      e.projects.add(p.projectCode);
      map.set(p.customer, e);
    }
    for (const i of s.arInvoices) {
      if (s.projectCosts.some((p) => p.customer === i.customerName)) continue;
      const e = map.get(i.customerName) ?? { rev: 0, cost: 0, projects: new Set<string>() };
      e.rev += i.amount;
      e.cost += i.amount * 0.72;
      map.set(i.customerName, e);
    }
    return Array.from(map.entries())
      .map(([k, v]) => row(k, k, v.rev, v.cost, `${v.projects.size || 1} engagement(s)`))
      .sort((a, b) => b.margin - a.margin);
  }

  if (dim === "costCentre" || dim === "businessUnit") {
    const centres = dim === "businessUnit"
      ? s.costCentres.filter((c) => c.type === "business-unit" || c.type === "plant")
      : s.costCentres;
    const revenue = s.accounts.filter((a) => a.type === "income").reduce((a, x) => a + x.balance, 0);
    const totalCost = centres.reduce((a, c) => a + c.actual, 0) || 1;
    return centres
      .map((c) => row(c.code, c.name, Math.round(revenue * (c.actual / totalCost)), c.actual, `${c.type} · ${c.owner}`))
      .sort((a, b) => b.margin - a.margin);
  }

  // account / product-line view from the chart of accounts
  const income = s.accounts.filter((a) => a.type === "income");
  const expenseTotal = s.accounts.filter((a) => a.type === "expense").reduce((a, x) => a + x.balance, 0);
  const incomeTotal = income.reduce((a, x) => a + x.balance, 0) || 1;
  return income
    .map((a) => row(a.code, a.name, a.balance, Math.round(expenseTotal * (a.balance / incomeTotal)), `GL ${a.code}`))
    .sort((a, b) => b.margin - a.margin);
}

/* ------------------------------------------------------------------
   Trial balance, ledger & ageing
   ------------------------------------------------------------------ */

export interface TrialRow {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
}

export function trialBalance(s: FinanceState): TrialRow[] {
  return s.accounts
    .map((a) => {
      const debitNature = a.type === "asset" || a.type === "expense";
      return {
        code: a.code,
        name: a.name,
        type: a.type,
        debit: debitNature ? Math.max(0, a.balance) : Math.max(0, -a.balance),
        credit: debitNature ? Math.max(0, -a.balance) : Math.max(0, a.balance),
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

export interface LedgerEntry {
  date: string;
  journalCode: string;
  narration: string;
  reference: string;
  projectCode?: string;
  debit: number;
  credit: number;
  running: number;
}

export function accountLedger(s: FinanceState, accountCode: string): LedgerEntry[] {
  const rows: LedgerEntry[] = [];
  let running = 0;
  const journals: Journal[] = [...s.journals]
    .filter((j) => j.status === "posted" && j.lines.some((l) => l.accountCode === accountCode))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const j of journals) {
    for (const l of j.lines.filter((x) => x.accountCode === accountCode)) {
      running += l.debit - l.credit;
      rows.push({
        date: j.date,
        journalCode: j.code,
        narration: j.narration,
        reference: j.reference,
        projectCode: l.projectCode,
        debit: l.debit,
        credit: l.credit,
        running,
      });
    }
  }
  return rows.reverse();
}

export interface AgeingBucket {
  label: string;
  amount: number;
  count: number;
}

export function ageing(s: FinanceState, kind: "ar" | "ap"): AgeingBucket[] {
  const buckets: AgeingBucket[] = [
    { label: "Not due", amount: 0, count: 0 },
    { label: "0-30", amount: 0, count: 0 },
    { label: "31-60", amount: 0, count: 0 },
    { label: "61-90", amount: 0, count: 0 },
    { label: "> 90", amount: 0, count: 0 },
  ];
  const push = (days: number, amount: number) => {
    const idx = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
    buckets[idx]!.amount += amount;
    buckets[idx]!.count += 1;
  };
  if (kind === "ar") s.arInvoices.forEach((i) => arOpen(i) && push(overdueDays(i.dueAt), arOpen(i)));
  else s.apBills.forEach((b) => apOpen(b) && push(overdueDays(b.dueAt), apOpen(b)));
  return buckets;
}

/* ------------------------------------------------------------------
   Fixed asset analytics
   ------------------------------------------------------------------ */

export function assetSummary(s: FinanceState) {
  const active = s.fixedAssets.filter((a) => a.status !== "disposed");
  const gross = active.reduce((a, x) => a + x.cost, 0);
  const accum = active.reduce((a, x) => a + x.accumulatedDepreciation, 0);
  const annual = active.reduce((a, x) => a + assetAnnualDepreciation(x), 0);
  return {
    count: active.length,
    gross,
    accumulated: accum,
    netBlock: gross - accum,
    annualCharge: Math.round(annual),
    monthlyCharge: Math.round(annual / 12),
    disposed: s.fixedAssets.filter((a) => a.status === "disposed").length,
    fullyDepreciated: active.filter((a) => assetNbv(a) <= a.salvage + 1).length,
  };
}

/* ------------------------------------------------------------------
   Financial KPIs + narrative
   ------------------------------------------------------------------ */

export function financeKpis(s: FinanceState) {
  const wc = workingCapital(s);
  const revenue = s.accounts.filter((a) => a.type === "income").reduce((a, x) => a + x.balance, 0);
  const expense = s.accounts.filter((a) => a.type === "expense").reduce((a, x) => a + x.balance, 0);
  const depreciation = s.accounts.find((a) => a.code === "6500")?.balance ?? 0;
  const netProfit = revenue - expense;
  const cogs = s.accounts.filter((a) => ["5000", "5100", "5200"].includes(a.code)).reduce((a, x) => a + x.balance, 0);
  const equity = s.accounts.filter((a) => a.type === "equity").reduce((a, x) => a + x.balance, 0);
  const debt = s.accounts.filter((a) => a.type === "liability" && a.code === "2500").reduce((a, x) => a + x.balance, 0);

  return {
    revenue,
    expense,
    netProfit,
    grossMarginPct: revenue ? ((revenue - cogs) / revenue) * 100 : 0,
    netMarginPct: revenue ? (netProfit / revenue) * 100 : 0,
    ebitda: netProfit + depreciation,
    ebitdaPct: revenue ? ((netProfit + depreciation) / revenue) * 100 : 0,
    roce: equity + debt ? (netProfit / (equity + debt)) * 100 : 0,
    debtEquity: equity ? debt / equity : 0,
    ...wc,
  };
}

const cr = (n: number) => `₹${(n / 10_000_000).toFixed(2)} Cr`;

/** Deterministic executive narrative — every sentence traces to a live number. */
export function financeNarrative(s: FinanceState): string[] {
  const k = financeKpis(s);
  const anomalies = detectAnomalies(s);
  const forecast = cashForecast(s);
  const lowest = forecast.reduce((m, w) => (w.closing < m.closing ? w : m), forecast[0]!);
  const overBudget = budgetVariances(s).filter((b) => b.overrunRisk !== "low");
  const risky = s.projectCosts.filter((p) => p.status !== "on-track");

  return [
    `Revenue of ${cr(k.revenue)} against expenses of ${cr(k.expense)} delivers a net profit of ${cr(k.netProfit)} (${k.netMarginPct.toFixed(1)}% net margin, ${k.ebitdaPct.toFixed(1)}% EBITDA).`,
    `Liquidity: cash ${cr(k.cash)}, receivables ${cr(k.receivables)}, payables ${cr(k.payables)} — current ratio ${k.currentRatio.toFixed(2)}, quick ratio ${k.quickRatio.toFixed(2)}, cash conversion cycle ${k.cashConversionDays} days (DSO ${k.dso} / DPO ${k.dpo}).`,
    `The 13-week direct forecast bottoms out at ${cr(lowest.closing)} in ${lowest.label}${forecast.some((w) => w.risk) ? " and dips below zero — a funding action is required" : ", so the cash position holds through the horizon"}.`,
    `${overBudget.length} budget line(s) are projected to overrun, led by ${overBudget[0]?.category ?? "none"}${overBudget[0] ? ` at ${overBudget[0].costCentre}` : ""}; ${risky.length} project(s) sit outside margin tolerance.`,
    `Control checks surfaced ${anomalies.length} exception(s): ${anomalies.filter((a) => a.severity === "high").length} high severity, mainly ${anomalies[0]?.kind.replace(/-/g, " ") ?? "none"}.`,
  ];
}

/* ------------------------------------------------------------------
   Copilot actions
   ------------------------------------------------------------------ */

export function financeActions(s: FinanceState): AiAction[] {
  const actions: AiAction[] = [];
  const k = workingCapital(s);

  const overdueAr = s.arInvoices.filter((i) => arOpen(i) > 0 && overdueDays(i.dueAt) > 0).sort((a, b) => arOpen(b) - arOpen(a));
  if (overdueAr.length) {
    const top = overdueAr[0]!;
    actions.push({
      id: "ar-chase",
      title: `Chase ${overdueAr.length} overdue receivable(s) worth ${cr(overdueAr.reduce((a, i) => a + arOpen(i), 0))}`,
      detail: `${top.customerName} (${top.code}) is ${overdueDays(top.dueAt)} days past due with ${cr(arOpen(top))} open. Collecting the top three alone lifts cash by ${cr(overdueAr.slice(0, 3).reduce((a, i) => a + arOpen(i), 0))}.`,
      severity: "high",
      impact: `DSO ${k.dso}d`,
    });
  }

  const draftInvoices = s.arInvoices.filter((i) => i.status === "draft");
  if (draftInvoices.length) {
    actions.push({
      id: "ar-issue",
      title: `Issue ${draftInvoices.length} draft invoice(s)`,
      detail: `Unissued invoices hold ${cr(draftInvoices.reduce((a, i) => a + arNet(i), 0))} of billable revenue out of the ledger. Issuing them posts revenue and starts the credit clock.`,
      severity: "high",
      impact: "Revenue recognition",
      cta: "Issue all drafts",
      run: () => {
        draftInvoices.forEach((i) => sendInvoice(i.id));
        return `${draftInvoices.length} invoice(s) issued and posted to the ledger`;
      },
    });
  }

  const cleanBills = s.apBills.filter((b) => b.matchStatus === "matched" && (b.status === "pending" || b.status === "3wm-ok"));
  if (cleanBills.length) {
    actions.push({
      id: "ap-approve",
      title: `Approve ${cleanBills.length} clean 3-way matched bill(s)`,
      detail: `These bills reconcile to their PO and GRN with no variance, totalling ${cr(cleanBills.reduce((a, b) => a + apNet(b), 0))}. Approving posts the AP journals automatically.`,
      severity: "medium",
      impact: "Zero-touch AP",
      cta: "Approve matched bills",
      run: () => {
        cleanBills.forEach((b) => approveBill(b.id));
        return `${cleanBills.length} bill(s) approved with journals posted`;
      },
    });
  }

  const suspect = detectAnomalies(s).filter((a) => a.kind === "duplicate-payment");
  if (suspect.length) {
    const first = suspect[0]!;
    const dupBill = s.apBills.find((b) => first.reference.startsWith(b.code));
    actions.push({
      id: "ap-dup",
      title: `Hold ${suspect.length} suspected duplicate payment(s)`,
      detail: `${first.detail}`,
      severity: "high",
      impact: `${cr(suspect.reduce((a, x) => a + (x.amount ?? 0), 0))} at risk`,
      cta: dupBill ? "Put first bill on hold" : undefined,
      run: dupBill
        ? () => {
            holdBill(dupBill.id);
            return `${dupBill.code} placed on hold pending duplicate review`;
          }
        : undefined,
    });
  }

  const unmatched = s.bankTxns.filter((t) => t.status !== "matched");
  if (unmatched.length) {
    const suggestions = reconciliationSuggestions(s);
    actions.push({
      id: "bank-reco",
      title: `Auto-reconcile ${unmatched.length} open bank item(s)`,
      detail: `${suggestions.length} of them match an open AR/AP document on amount, direction and narration with ${suggestions[0]?.confidence ?? 0}% top confidence.`,
      severity: unmatched.length > 4 ? "high" : "medium",
      impact: "Bank hygiene",
      cta: "Run auto-match",
      run: () => {
        const n = s.bankAccounts.reduce((a, b) => a + autoMatchBank(b.code), 0);
        return n ? `${n} transaction(s) auto-matched` : "No confident matches found";
      },
    });
  }

  const overrun = budgetVariances(s).filter((b) => b.overrunRisk === "high");
  if (overrun.length) {
    const top = overrun[0]!;
    actions.push({
      id: "budget-overrun",
      title: `${overrun.length} budget line(s) heading for overrun`,
      detail: `${top.category} at ${top.costCentre} is projected to close at ${cr(top.projectedYear)} against a budget of ${cr(top.annualBudget)} — ${Math.abs(top.variancePct).toFixed(1)}% adverse YTD.`,
      severity: "high",
      impact: `${cr(overrun.reduce((a, b) => a + Math.max(0, b.projectedYear - b.annualBudget), 0))} exposure`,
      cta: "Refresh actuals from GL",
      run: () => {
        const n = refreshBudgetActuals();
        return `${n} budget line(s) refreshed from posted journals`;
      },
    });
  }

  const forecast = cashForecast(s);
  const dip = forecast.find((w) => w.risk);
  if (dip) {
    actions.push({
      id: "cash-risk",
      title: `Cash shortfall projected in ${dip.label}`,
      detail: `Closing balance turns negative at ${cr(dip.closing)}. Pull forward ${cr(Math.abs(dip.closing))} of collections or defer discretionary vendor runs to stay positive.`,
      severity: "high",
      impact: "Liquidity",
    });
  }

  const openTax = s.taxLedgers.filter((t) => t.status === "open");
  if (openTax.length) {
    actions.push({
      id: "tax-open",
      title: `${openTax.length} statutory filing(s) still open`,
      detail: `${openTax.map((t) => `${t.type} ${t.period}`).join(", ")} carry ${cr(openTax.reduce((a, t) => a + t.netPayable, 0))} of net liability. Prepare before the due date to avoid late fees.`,
      severity: "medium",
      impact: "Compliance",
    });
  }

  const depDue = !s.journals.some((j) => j.reference.startsWith(`DEP-${new Date().toISOString().slice(0, 7)}`));
  if (depDue && s.fixedAssets.some((a) => a.status !== "disposed")) {
    const sum = assetSummary(s);
    actions.push({
      id: "asset-dep",
      title: "Depreciation not yet posted for this period",
      detail: `The register holds ${sum.count} active assets with a net block of ${cr(sum.netBlock)}; the monthly charge of ${cr(sum.monthlyCharge)} is unposted.`,
      severity: "medium",
      impact: "Period close",
      cta: "Run depreciation",
      run: () => {
        const r = runDepreciation();
        return `Depreciation of ${cr(r.amount)} posted across ${r.assets} assets`;
      },
    });
  }

  const draftJournals = s.journals.filter((j) => j.status === "draft");
  if (draftJournals.length) {
    actions.push({
      id: "gl-drafts",
      title: `${draftJournals.length} journal(s) awaiting posting`,
      detail: `Draft vouchers keep the trial balance incomplete. ${draftJournals.map((j) => j.code).slice(0, 4).join(", ")} are ready to post.`,
      severity: "medium",
      impact: "Ledger accuracy",
      cta: "Post balanced drafts",
      run: () => {
        const balanced = draftJournals.filter(
          (j) => j.lines.length && j.lines.reduce((a, l) => a + l.debit, 0) === j.lines.reduce((a, l) => a + l.credit, 0),
        );
        balanced.forEach((j) => postJournal(j.id));
        return balanced.length ? `${balanced.length} journal(s) posted` : "No balanced drafts to post";
      },
    });
  }

  const pendingClose = s.closeTasks.filter((t) => t.status !== "done");
  if (pendingClose.length) {
    actions.push({
      id: "close-run",
      title: `${pendingClose.length} period-close task(s) outstanding`,
      detail: `Automated validations can clear ${pendingClose.filter((t) => t.automated).length} of them immediately by testing AR, AP, bank, payroll, asset and GL integrity against live data.`,
      severity: "low",
      impact: "Faster close",
      cta: "Run close validations",
      run: () => {
        const r = runCloseValidations();
        return `${r.passed} check(s) passed, ${r.blocked} blocked`;
      },
    });
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return actions.sort((a, b) => order[a.severity] - order[b.severity]);
}
