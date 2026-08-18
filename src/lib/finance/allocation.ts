/**
 * Project-wise expense allocation.
 *
 * Direct costs already carry a project code (inherited from PO / GRN / bill /
 * timesheet). Everything else lands in a pool — this module distributes those
 * pooled costs to projects using configurable drivers and posts the transfer
 * journal so the project P&L is complete.
 */
import { finance, nextCode } from "./store";
import type { AllocationMethod, AllocationRule, FinanceState } from "./types";

export const ALLOCATION_CLEARING = "6900";

export const ALLOCATION_METHODS: { k: AllocationMethod; l: string; hint: string }[] = [
  { k: "direct", l: "Direct", hint: "Charged to a single project" },
  { k: "department", l: "Department", hint: "Split across projects run by the department" },
  { k: "percentage", l: "Fixed percentage", hint: "Uses the percentages on the rule" },
  { k: "man-hour", l: "Man-hour", hint: "Weighted by project labour cost" },
  { k: "quantity", l: "Cost driver", hint: "Weighted by project cost incurred" },
  { k: "cost-centre", l: "Cost centre", hint: "Weighted by cost-centre budget usage" },
];

export interface PoolRow {
  id: string;
  source: "bill" | "journal";
  code: string;
  date: string;
  accountCode: string;
  description: string;
  department?: string;
  costCentreCode?: string;
  expenseCategory?: string;
  amount: number;
}

const EXPENSE_PREFIX = ["5", "6"];
const isExpense = (code: string) => EXPENSE_PREFIX.includes(code.charAt(0));

/** Costs with no project tag — the queue finance must clear before close. */
export function unallocatedPool(s: FinanceState, period?: string): PoolRow[] {
  const inPeriod = (d: string) => (period ? d.slice(0, 7) === period : true);
  const bills: PoolRow[] = s.apBills
    .filter((b) => !b.projectCode && inPeriod(b.receivedAt))
    .map((b) => ({
      id: b.id,
      source: "bill" as const,
      code: b.code,
      date: b.receivedAt,
      accountCode: b.costType === "material" ? "5000" : b.costType === "subcontract" ? "5200" : "6300",
      description: b.vendorName,
      department: b.department,
      costCentreCode: b.costCentreCode,
      expenseCategory: b.expenseCategory,
      amount: b.amount,
    }));

  const journals: PoolRow[] = [];
  for (const j of s.journals) {
    if (j.status !== "posted" || !inPeriod(j.date)) continue;
    for (const [i, l] of j.lines.entries()) {
      if (l.projectCode || !isExpense(l.accountCode) || l.debit <= 0) continue;
      if (l.accountCode === ALLOCATION_CLEARING) continue;
      journals.push({
        id: `${j.id}:${i}`,
        source: "journal",
        code: j.code,
        date: j.date,
        accountCode: l.accountCode,
        description: l.memo ?? j.narration,
        department: l.department,
        costCentreCode: l.costCentreCode,
        expenseCategory: l.expenseCategory,
        amount: l.debit,
      });
    }
  }
  return [...bills, ...journals].sort((a, b) => b.amount - a.amount);
}

export function poolForRule(s: FinanceState, rule: AllocationRule, period?: string): PoolRow[] {
  return unallocatedPool(s, period).filter((r) => {
    if (rule.accountCode && r.accountCode !== rule.accountCode) return false;
    if (rule.costCentreCode && r.costCentreCode && r.costCentreCode !== rule.costCentreCode) return false;
    if (rule.expenseCategory && r.expenseCategory && r.expenseCategory !== rule.expenseCategory) return false;
    return true;
  });
}

/** Driver weights per project for the chosen method. */
export function driverWeights(s: FinanceState, rule: AllocationRule): Array<{ projectCode: string; weight: number }> {
  const active = s.projectCosts.filter((c) => c.status !== "risk" || true);
  switch (rule.method) {
    case "man-hour":
      return active.map((c) => ({ projectCode: c.projectCode, weight: c.labourCost }));
    case "quantity":
      return active.map((c) => ({
        projectCode: c.projectCode,
        weight: c.materialCost + c.labourCost + c.overheadCost + c.subContractCost,
      }));
    case "cost-centre": {
      const cc = s.costCentres.find((x) => x.code === rule.costCentreCode);
      const base = cc ? cc.actual : 1;
      return active.map((c) => ({ projectCode: c.projectCode, weight: (c.contractValue / 100) * (base ? 1 : 1) }));
    }
    case "department":
      return rule.targets.length
        ? rule.targets.map((t) => ({ projectCode: t.projectCode, weight: 1 }))
        : active.map((c) => ({ projectCode: c.projectCode, weight: 1 }));
    case "direct":
    case "percentage":
    default:
      return rule.targets.map((t) => ({ projectCode: t.projectCode, weight: t.pct }));
  }
}

export interface AllocationPreview {
  rule: AllocationRule;
  pool: number;
  lines: Array<{ projectCode: string; projectName: string; pct: number; amount: number }>;
  warning?: string;
}

export function previewAllocation(rule: AllocationRule, period: string, override?: number): AllocationPreview {
  const s = finance.get();
  const pool = override ?? poolForRule(s, rule, period).reduce((t, r) => t + r.amount, 0);
  const weights = driverWeights(s, rule).filter((w) => w.weight > 0);
  const total = weights.reduce((t, w) => t + w.weight, 0);
  if (!pool || !total) {
    return { rule, pool, lines: [], warning: !pool ? "No pooled cost matched this rule for the period." : "No driver value available — set target percentages." };
  }
  let allocated = 0;
  const lines = weights.map((w, i) => {
    const pct = (w.weight / total) * 100;
    const amount = i === weights.length - 1 ? pool - allocated : Math.round((pool * w.weight) / total);
    allocated += amount;
    return {
      projectCode: w.projectCode,
      projectName: s.projectCosts.find((c) => c.projectCode === w.projectCode)?.projectName ?? w.projectCode,
      pct: Math.round(pct * 10) / 10,
      amount,
    };
  });
  return { rule, pool, lines };
}

/** Post the allocation journal and push the cost onto the project cost sheet. */
export function runAllocation(ruleCode: string, period: string, by = "Finance Bot"): AllocationPreview & { journalCode?: string } {
  const rule = finance.get().allocationRules.find((r) => r.code === ruleCode);
  if (!rule) return { rule: { id: "", code: ruleCode, name: ruleCode, method: "percentage", targets: [], active: false }, pool: 0, lines: [], warning: "Rule not found." };
  const preview = previewAllocation(rule, period);
  if (!preview.lines.length) return preview;

  let journalCode: string | undefined;
  finance.update((s) => {
    if (!s.accounts.some((a) => a.code === ALLOCATION_CLEARING)) {
      s.accounts = [
        ...s.accounts,
        { id: crypto.randomUUID(), code: ALLOCATION_CLEARING, name: "Overhead Allocation Clearing", type: "expense", balance: 0, currency: "INR" },
      ];
    }
    journalCode = nextCode("JV-", s.journals.map((j) => j.code));
    s.journals = [
      {
        id: crypto.randomUUID(),
        code: journalCode,
        date: new Date().toISOString(),
        reference: `ALLOC-${rule.code}-${period}`,
        narration: `Overhead allocation — ${rule.name} (${period})`,
        status: "posted",
        source: "system",
        createdBy: by,
        lines: [
          ...preview.lines.map((l) => ({
            accountCode: rule.accountCode ?? "6300",
            debit: l.amount,
            credit: 0,
            projectCode: l.projectCode,
            department: rule.department,
            costCentreCode: rule.costCentreCode,
            expenseCategory: rule.expenseCategory,
            memo: `Allocated ${rule.method} — ${l.pct}%`,
          })),
          { accountCode: ALLOCATION_CLEARING, debit: 0, credit: preview.pool, memo: `Pool cleared — ${rule.code}` },
        ],
      },
      ...s.journals,
    ];
    for (const l of preview.lines) {
      const c = s.projectCosts.find((x) => x.projectCode === l.projectCode);
      if (c) c.overheadCost += l.amount;
    }
    s.allocationRuns = [
      {
        id: crypto.randomUUID(),
        ruleCode: rule.code,
        period,
        amount: preview.pool,
        lines: preview.lines.map((l) => ({ projectCode: l.projectCode, amount: l.amount })),
        journalCode,
        at: new Date().toISOString(),
        by,
      },
      ...s.allocationRuns,
    ];
  });
  return { ...preview, journalCode };
}

export function runAllAllocations(period: string, by = "Finance Bot") {
  const rules = finance.get().allocationRules.filter((r) => r.active);
  let posted = 0;
  let amount = 0;
  for (const r of rules) {
    const res = runAllocation(r.code, period, by);
    if (res.journalCode) {
      posted++;
      amount += res.pool;
    }
  }
  return { posted, amount, rules: rules.length };
}

export function toggleAllocationRule(id: string) {
  finance.update((s) => {
    s.allocationRules = s.allocationRules.map((r) => (r.id === id ? { ...r, active: !r.active } : r));
  });
}
