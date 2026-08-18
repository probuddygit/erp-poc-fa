/**
 * Project-wise P&L and balance sheet.
 *
 * Consolidates the revenue side (AR invoices + POC revenue) and every cost
 * bucket (material, labour, sub-contract, travel, depreciation, allocated
 * overhead) into one statement, with the source documents kept for drill-down.
 */
import { assetAnnualDepreciation, assetNbv } from "./store";
import { currentPeriod } from "./wip";
import type { FinanceState } from "./types";

export interface PnlBucket {
  key: string;
  label: string;
  amount: number;
  docs: number;
}

export interface ProjectPnl {
  projectCode: string;
  projectName: string;
  customer: string;
  contractValue: number;
  billed: number;
  collected: number;
  revenueRecognised: number;
  costs: PnlBucket[];
  directCost: number;
  indirectCost: number;
  totalCost: number;
  grossMargin: number;
  grossMarginPct: number;
  netMargin: number;
  netMarginPct: number;
  forecastCost: number;
  forecastMargin: number;
  percentComplete: number;
  status: "on-track" | "watch" | "risk";
}

const TRAVEL_CATEGORIES = ["travel", "conveyance", "site expenses"];

function journalTotals(s: FinanceState, projectCode: string) {
  let travel = 0;
  let other = 0;
  let travelDocs = 0;
  let otherDocs = 0;
  for (const j of s.journals) {
    if (j.status !== "posted") continue;
    for (const l of j.lines) {
      if (l.projectCode !== projectCode || l.debit <= 0) continue;
      const cat = (l.expenseCategory ?? "").toLowerCase();
      if (TRAVEL_CATEGORIES.some((t) => cat.includes(t))) {
        travel += l.debit;
        travelDocs++;
      } else if (l.accountCode.startsWith("6") && l.accountCode !== "6100") {
        other += l.debit;
        otherDocs++;
      }
    }
  }
  return { travel, other, travelDocs, otherDocs };
}

export function projectPnl(s: FinanceState, projectCode: string, period = currentPeriod()): ProjectPnl | null {
  const c = s.projectCosts.find((x) => x.projectCode === projectCode);
  if (!c) return null;

  const bills = s.apBills.filter((b) => b.projectCode === projectCode);
  const wip = s.wipEntries.find((e) => e.period === period && e.projectCode === projectCode);
  const depreciation = s.fixedAssets
    .filter((a) => a.projectCode === projectCode && a.status !== "disposed")
    .reduce((t, a) => t + assetAnnualDepreciation(a) / 12, 0);
  const { travel, other, travelDocs, otherDocs } = journalTotals(s, projectCode);

  const costs: PnlBucket[] = [
    { key: "material", label: "Material & bought-out", amount: c.materialCost, docs: bills.filter((b) => b.costType === "material").length },
    { key: "labour", label: "Labour & engineering", amount: c.labourCost, docs: 0 },
    { key: "subcontract", label: "Sub-contract & fabrication", amount: c.subContractCost, docs: bills.filter((b) => b.costType === "subcontract").length },
    { key: "travel", label: "Travel & site expenses", amount: Math.round(travel), docs: travelDocs },
    { key: "depreciation", label: "Depreciation on project assets", amount: Math.round(depreciation), docs: s.fixedAssets.filter((a) => a.projectCode === projectCode).length },
    { key: "overhead", label: "Allocated overheads", amount: c.overheadCost, docs: s.allocationRuns.filter((r) => r.lines.some((l) => l.projectCode === projectCode)).length },
    { key: "other", label: "Other operating cost", amount: Math.round(other), docs: otherDocs },
  ];

  const directKeys = ["material", "labour", "subcontract", "travel"];
  const directCost = costs.filter((b) => directKeys.includes(b.key)).reduce((t, b) => t + b.amount, 0);
  const indirectCost = costs.filter((b) => !directKeys.includes(b.key)).reduce((t, b) => t + b.amount, 0);
  const totalCost = directCost + indirectCost;
  const revenueRecognised = wip?.revenueRecognised ?? c.earnedValue ?? c.billed;
  const grossMargin = revenueRecognised - directCost;
  const netMargin = revenueRecognised - totalCost;

  return {
    projectCode,
    projectName: c.projectName,
    customer: c.customer,
    contractValue: c.contractValue,
    billed: c.billed,
    collected: c.collected,
    revenueRecognised,
    costs,
    directCost,
    indirectCost,
    totalCost,
    grossMargin,
    grossMarginPct: revenueRecognised ? Math.round((grossMargin / revenueRecognised) * 1000) / 10 : 0,
    netMargin,
    netMarginPct: revenueRecognised ? Math.round((netMargin / revenueRecognised) * 1000) / 10 : 0,
    forecastCost: c.forecastCost,
    forecastMargin: c.contractValue - c.forecastCost,
    percentComplete: c.percentComplete,
    status: c.status,
  };
}

export function allProjectPnl(s: FinanceState, period = currentPeriod()): ProjectPnl[] {
  return s.projectCosts
    .map((c) => projectPnl(s, c.projectCode, period))
    .filter((p): p is ProjectPnl => Boolean(p));
}

/* ---------------- Project balance sheet ---------------- */

export interface ProjectBalanceSheet {
  projectCode: string;
  projectName: string;
  receivables: number;
  receivablesDocs: number;
  retention: number;
  unbilledWip: number;
  assetsNbv: number;
  assetsCount: number;
  totalAssets: number;
  payables: number;
  payablesDocs: number;
  customerAdvances: number;
  accruals: number;
  totalLiabilities: number;
  netPosition: number;
}

export function projectBalanceSheet(s: FinanceState, projectCode: string, period = currentPeriod()): ProjectBalanceSheet | null {
  const c = s.projectCosts.find((x) => x.projectCode === projectCode);
  if (!c) return null;

  const invoices = s.arInvoices.filter((i) => i.projectCode === projectCode && i.status !== "void");
  const receivables = invoices.reduce((t, i) => t + Math.max(0, i.amount + i.gst - i.tds - i.received), 0);
  const bills = s.apBills.filter((b) => b.projectCode === projectCode && b.status !== "paid");
  const payables = bills.reduce((t, b) => t + Math.max(0, b.amount + b.gst - b.tds - b.paid), 0);
  const wip = s.wipEntries.find((e) => e.period === period && e.projectCode === projectCode);
  const unbilledWip = wip?.closing ?? c.unbilledRevenue ?? 0;
  const advances = invoices.filter((i) => i.billingKind === "advance").reduce((t, i) => t + i.received, 0);
  const customerAdvances = Math.max(advances, c.overBilling ?? 0);
  const assets = s.fixedAssets.filter((a) => a.projectCode === projectCode && a.status !== "disposed");
  const assetsNbv = assets.reduce((t, a) => t + assetNbv(a), 0);
  const accruals = Math.max(0, c.committed - payables);

  const totalAssets = receivables + unbilledWip + assetsNbv;
  const totalLiabilities = payables + customerAdvances + accruals;

  return {
    projectCode,
    projectName: c.projectName,
    receivables,
    receivablesDocs: invoices.filter((i) => i.amount + i.gst - i.tds - i.received > 0).length,
    retention: Math.round(c.contractValue * 0.05),
    unbilledWip,
    assetsNbv,
    assetsCount: assets.length,
    totalAssets,
    payables,
    payablesDocs: bills.length,
    customerAdvances,
    accruals,
    totalLiabilities,
    netPosition: totalAssets - totalLiabilities,
  };
}

export function allProjectBalanceSheets(s: FinanceState, period = currentPeriod()): ProjectBalanceSheet[] {
  return s.projectCosts
    .map((c) => projectBalanceSheet(s, c.projectCode, period))
    .filter((b): b is ProjectBalanceSheet => Boolean(b));
}
