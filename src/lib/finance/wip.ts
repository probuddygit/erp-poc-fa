/**
 * Project WIP engine.
 *
 * Builds a period-based WIP ledger from the live project cost sheet (which is
 * itself rolled up from AP, GL and AR in `./store`), recognises revenue using
 * the configured methodology and generates the WIP journals.
 *
 * WIP is modelled as the contract asset: revenue recognised but not yet billed.
 *   closing   = max(0, revenue recognised − billed)
 *   additions = max(0, closing − opening)
 *   released  = max(0, opening − closing)   (billing catches up with progress)
 */
import { finance, nextCode } from "./store";
import type { FinanceState, WipEntry, WipMethod, PercentCompleteAudit } from "./types";

export const WIP_ACCOUNT = "1310";
export const WIP_REVENUE_ACCOUNT = "4200";

export const WIP_METHODS: { k: WipMethod; l: string }[] = [
  { k: "poc-progress", l: "POC — approved progress" },
  { k: "poc-cost", l: "POC — cost to cost" },
  { k: "completed-contract", l: "Completed contract" },
];

export function currentPeriod(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function previousPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 2, 1);
  return currentPeriod(d);
}

/** Distinct periods present in the ledger, newest first, always incl. current. */
export function wipPeriods(s: FinanceState): string[] {
  const set = new Set<string>(s.wipEntries.map((e) => e.period));
  set.add(currentPeriod());
  return Array.from(set).sort().reverse();
}

function ensureAccounts(s: FinanceState) {
  if (!s.accounts.some((a) => a.code === WIP_ACCOUNT)) {
    s.accounts = [
      ...s.accounts,
      { id: crypto.randomUUID(), code: WIP_ACCOUNT, name: "Contract WIP — Unbilled Revenue", type: "asset", parentCode: "1000", balance: 0, currency: "INR" },
    ];
  }
  if (!s.accounts.some((a) => a.code === WIP_REVENUE_ACCOUNT)) {
    s.accounts = [
      ...s.accounts,
      { id: crypto.randomUUID(), code: WIP_REVENUE_ACCOUNT, name: "Contract Revenue — Recognised (POC)", type: "income", parentCode: "4000", balance: 0, currency: "INR" },
    ];
  }
}

export function revenueFor(
  method: WipMethod,
  input: { contractValue: number; percentComplete: number; costIncurred: number; forecastCost: number },
): number {
  const { contractValue, percentComplete, costIncurred, forecastCost } = input;
  if (method === "completed-contract") return percentComplete >= 100 ? contractValue : 0;
  if (method === "poc-cost") {
    const pct = forecastCost > 0 ? Math.min(100, (costIncurred / forecastCost) * 100) : 0;
    return Math.round((contractValue * pct) / 100);
  }
  return Math.round((contractValue * Math.min(100, percentComplete)) / 100);
}

export interface WipComputeResult {
  entries: number;
  additions: number;
  released: number;
  revenue: number;
}

/**
 * (Re)compute the WIP ledger for a period. Posted rows are left untouched so a
 * closed period cannot silently change.
 */
export function computeWip(period = currentPeriod(), method: WipMethod = "poc-progress"): WipComputeResult {
  const result: WipComputeResult = { entries: 0, additions: 0, released: 0, revenue: 0 };
  const prev = previousPeriod(period);
  const audits: PercentCompleteAudit[] = [];

  finance.update((s) => {
    for (const c of s.projectCosts) {
      const existing = s.wipEntries.find((e) => e.period === period && e.projectCode === c.projectCode);
      if (existing?.status === "posted") {
        result.entries++;
        continue;
      }

      const costIncurred = c.materialCost + c.labourCost + c.overheadCost + c.subContractCost;
      const useMethod = existing?.method ?? method;
      const pcSource = existing?.pcSource ?? "system";
      const percentComplete = existing?.pcSource === "manual" ? existing.percentComplete : c.percentComplete;
      const revenueRecognised = revenueFor(useMethod, {
        contractValue: c.contractValue,
        percentComplete,
        costIncurred,
        forecastCost: c.forecastCost,
      });

      const opening = s.wipEntries.find((e) => e.period === prev && e.projectCode === c.projectCode)?.closing ?? 0;
      const closing = Math.max(0, revenueRecognised - c.billed);
      const additions = Math.max(0, closing - opening);
      const released = Math.max(0, opening - closing);

      const entry: WipEntry = {
        id: existing?.id ?? crypto.randomUUID(),
        period,
        projectCode: c.projectCode,
        projectName: c.projectName,
        department: existing?.department,
        method: useMethod,
        contractValue: c.contractValue,
        costIncurred,
        revenueRecognised,
        percentComplete,
        pcSource,
        opening,
        additions,
        released,
        closing,
        status: "draft",
        computedAt: new Date().toISOString(),
      };

      if (existing && existing.percentComplete !== percentComplete) {
        audits.push({
          id: crypto.randomUUID(),
          projectCode: c.projectCode,
          fromPct: existing.percentComplete,
          toPct: percentComplete,
          source: "system",
          by: "Project Systems",
          at: new Date().toISOString(),
          reason: `Progress streamed from Project Systems for ${period}`,
        });
      }

      s.wipEntries = existing
        ? s.wipEntries.map((e) => (e.id === existing.id ? entry : e))
        : [entry, ...s.wipEntries];

      result.entries++;
      result.additions += additions;
      result.released += released;
      result.revenue += revenueRecognised;
    }

    if (audits.length) s.pcAudits = [...audits, ...s.pcAudits];
  });

  return result;
}

/** Post the WIP journal for one ledger row. Idempotent — posted rows are skipped. */
export function postWipEntry(id: string): string | null {
  let code: string | null = null;
  finance.update((s) => {
    const e = s.wipEntries.find((x) => x.id === id);
    if (!e || e.status === "posted") return;
    const movement = e.additions - e.released;
    ensureAccounts(s);
    if (movement !== 0) {
      code = nextCode("JV-", s.journals.map((j) => j.code));
      const debit = movement > 0;
      const amt = Math.abs(movement);
      s.journals = [
        {
          id: crypto.randomUUID(),
          code,
          date: new Date().toISOString(),
          reference: `WIP-${e.period}-${e.projectCode}`,
          narration: `${debit ? "WIP addition" : "WIP release"} — ${e.projectName} (${periodLabel(e.period)})`,
          status: "posted",
          source: "system",
          createdBy: "WIP Engine",
          lines: [
            { accountCode: WIP_ACCOUNT, debit: debit ? amt : 0, credit: debit ? 0 : amt, projectCode: e.projectCode, memo: "Contract WIP" },
            { accountCode: WIP_REVENUE_ACCOUNT, debit: debit ? 0 : amt, credit: debit ? amt : 0, projectCode: e.projectCode, memo: "Revenue recognised (POC)" },
          ],
        },
        ...s.journals,
      ];
      const wipAcc = s.accounts.find((a) => a.code === WIP_ACCOUNT);
      const revAcc = s.accounts.find((a) => a.code === WIP_REVENUE_ACCOUNT);
      if (wipAcc) wipAcc.balance += movement;
      if (revAcc) revAcc.balance += movement;
    }
    s.wipEntries = s.wipEntries.map((x) =>
      x.id === id ? { ...x, status: "posted", journalCode: code ?? x.journalCode } : x,
    );
  });
  return code;
}

export function postWipPeriod(period: string): { posted: number; codes: string[] } {
  const ids = finance
    .get()
    .wipEntries.filter((e) => e.period === period && e.status === "draft")
    .map((e) => e.id);
  const codes: string[] = [];
  ids.forEach((id) => {
    const c = postWipEntry(id);
    if (c) codes.push(c);
  });
  return { posted: ids.length, codes };
}

export function setWipMethod(id: string, method: WipMethod) {
  finance.update((s) => {
    s.wipEntries = s.wipEntries.map((e) => (e.id === id && e.status === "draft" ? { ...e, method } : e));
  });
  const e = finance.get().wipEntries.find((x) => x.id === id);
  if (e) computeWip(e.period);
}

/**
 * Finance override of the project completion percentage. Writes an audit trail
 * entry and feeds straight back into the cost sheet and the WIP ledger.
 */
export function setPercentComplete(
  projectCode: string,
  pct: number,
  by: string,
  reason?: string,
  period = currentPeriod(),
) {
  const clean = Math.max(0, Math.min(100, Math.round(pct)));
  finance.update((s) => {
    const cost = s.projectCosts.find((c) => c.projectCode === projectCode);
    const fromPct = cost?.percentComplete ?? 0;
    if (cost) {
      cost.percentComplete = clean;
      cost.earnedValue = Math.round((cost.contractValue * clean) / 100);
      cost.unbilledRevenue = Math.max(0, (cost.earnedValue ?? 0) - cost.billed);
      cost.overBilling = Math.max(0, cost.billed - (cost.earnedValue ?? 0));
    }
    s.wipEntries = s.wipEntries.map((e) =>
      e.period === period && e.projectCode === projectCode && e.status === "draft"
        ? { ...e, percentComplete: clean, pcSource: "manual" }
        : e,
    );
    s.pcAudits = [
      {
        id: crypto.randomUUID(),
        projectCode,
        fromPct,
        toPct: clean,
        source: "manual",
        by,
        at: new Date().toISOString(),
        reason,
      },
      ...s.pcAudits,
    ];
  });
  computeWip(period);
}

/** Reconciliation between Project Systems and the Finance WIP ledger. */
export interface WipReconRow {
  projectCode: string;
  projectName: string;
  financePct: number;
  projectsPct: number;
  pctVariance: number;
  financeCost: number;
  projectSpend: number;
  costVariance: number;
  revenueRecognised: number;
  billed: number;
  wipClosing: number;
  flag: "ok" | "review";
}

export function wipReconciliation(
  s: FinanceState,
  projects: Array<{ code: string; name: string; progress: number; spent: number; budget: number }>,
  period = currentPeriod(),
): WipReconRow[] {
  return s.projectCosts.map((c) => {
    const p = projects.find((x) => x.code === c.projectCode);
    const entry = s.wipEntries.find((e) => e.period === period && e.projectCode === c.projectCode);
    const financeCost = c.materialCost + c.labourCost + c.overheadCost + c.subContractCost;
    const projectSpend = p?.spent ?? 0;
    const pctVariance = (c.percentComplete || 0) - (p?.progress ?? c.percentComplete ?? 0);
    const costVariance = financeCost - projectSpend;
    const material = projectSpend > 0 ? Math.abs(costVariance) / projectSpend > 0.1 : false;
    return {
      projectCode: c.projectCode,
      projectName: c.projectName,
      financePct: c.percentComplete,
      projectsPct: p?.progress ?? 0,
      pctVariance,
      financeCost,
      projectSpend,
      costVariance,
      revenueRecognised: entry?.revenueRecognised ?? 0,
      billed: c.billed,
      wipClosing: entry?.closing ?? c.wip,
      flag: Math.abs(pctVariance) > 5 || material ? "review" : "ok",
    };
  });
}
