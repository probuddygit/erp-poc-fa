/**
 * TDS configuration store + ledger derivation.
 *
 * Rules are user-editable and persisted per browser; the ledger is derived live
 * from AP bills so supplier invoices, the TDS ledger and the reports always agree.
 */
import { useSyncExternalStore } from "react";
import { finance } from "./store";
import { procurement } from "@/lib/procurement/store";
import {
  DEFAULT_TDS_RULES,
  evaluateTds,
  financialYearOf,
  ledgerEntryFrom,
  type TdsInput,
  type TdsLedgerEntry,
  type TdsResult,
  type TdsRule,
  type TdsTransactionType,
  type VendorType,
} from "./tds";

const KEY = "faith-erp:tds-rules";

function load(): TdsRule[] {
  if (typeof localStorage === "undefined") return DEFAULT_TDS_RULES;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TdsRule[]) : DEFAULT_TDS_RULES;
  } catch {
    return DEFAULT_TDS_RULES;
  }
}

let rules: TdsRule[] = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist() {
  rules = [...rules];
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(rules));
  emit();
}

export const tdsRules = {
  get: () => rules,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  upsert(rule: TdsRule) {
    rules = rules.some((r) => r.id === rule.id) ? rules.map((r) => (r.id === rule.id ? rule : r)) : [rule, ...rules];
    persist();
  },
  remove(id: string) {
    rules = rules.filter((r) => r.id !== id);
    persist();
  },
  reset() {
    rules = DEFAULT_TDS_RULES;
    persist();
  },
};

export function useTdsRules(): TdsRule[] {
  return useSyncExternalStore(tdsRules.subscribe, tdsRules.get, tdsRules.get);
}

/** Best-effort classification of a vendor for rule matching. */
export function vendorTypeOf(vendorName: string): VendorType {
  const v = procurement.get().vendors?.find((x) => x.name === vendorName);
  const name = vendorName.toLowerCase();
  if (/gmbh|inc|ltd\.?\s*\(uk|singapore|japan|korea|china/.test(name)) return "non-resident";
  if (/consult|design|engineer(ing)? services|advisor|audit|legal/.test(name)) return "professional";
  if (/fabrica|erect|install|contract|works/.test(name)) return "contractor";
  if (/llp|& co|and co|associates/.test(name)) return "firm";
  if (v?.category && /service|subcontract/i.test(String(v.category))) return "professional";
  return "company";
}

function txnTypeOf(costType?: string, category?: string): TdsTransactionType {
  const c = `${costType ?? ""} ${category ?? ""}`.toLowerCase();
  if (c.includes("subcontract")) return "contract";
  if (c.includes("rent")) return "rent";
  if (c.includes("commission")) return "commission";
  if (c.includes("overhead") || c.includes("service")) return "services";
  return "goods";
}

export interface TdsBillEvaluation {
  billId: string;
  billCode: string;
  vendorName: string;
  projectCode?: string;
  date: string;
  base: number;
  result: TdsResult;
}

/** Evaluates every AP bill against the active rule set. */
export function evaluateAllBills(activeRules: TdsRule[] = rules): TdsBillEvaluation[] {
  const bills = finance.get().apBills;
  const fyTotals = new Map<string, number>();
  const ordered = [...bills].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));

  return ordered.map((b) => {
    const fy = financialYearOf(b.receivedAt);
    const vendorType = vendorTypeOf(b.vendorName);
    const key = `${b.vendorName}|${fy}`;
    const fyToDate = fyTotals.get(key) ?? 0;
    const input: TdsInput = {
      vendorName: b.vendorName,
      vendorType,
      vendorPan: undefined,
      transactionType: txnTypeOf(b.costType, b.expenseCategory),
      expenseCategory: b.expenseCategory ?? (b.costType ? b.costType[0]!.toUpperCase() + b.costType.slice(1) : undefined),
      baseAmount: b.amount,
      fyToDateAmount: fyToDate,
      financialYear: activeRules[0]?.financialYear ?? fy,
      date: b.receivedAt,
      reference: b.code,
    };
    fyTotals.set(key, fyToDate + b.amount);
    return {
      billId: b.id,
      billCode: b.code,
      vendorName: b.vendorName,
      projectCode: b.projectCode,
      date: b.receivedAt,
      base: b.amount,
      result: evaluateTds(input, activeRules),
    };
  });
}

export function deriveLedger(activeRules: TdsRule[] = rules): TdsLedgerEntry[] {
  return evaluateAllBills(activeRules)
    .map((e) =>
      ledgerEntryFrom(
        {
          vendorName: e.vendorName,
          vendorType: vendorTypeOf(e.vendorName),
          transactionType: "goods",
          baseAmount: e.base,
          financialYear: activeRules[0]?.financialYear ?? financialYearOf(e.date),
          date: e.date,
          reference: e.billCode,
        },
        e.result,
      ),
    )
    .filter((x): x is TdsLedgerEntry => Boolean(x))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Writes the computed TDS back onto the AP bills so supplier invoices show it. */
export function syncTdsToBills(activeRules: TdsRule[] = rules): number {
  const evals = evaluateAllBills(activeRules);
  let changed = 0;
  finance.update((s) => {
    s.apBills = s.apBills.map((b) => {
      const hit = evals.find((e) => e.billId === b.id);
      const tds = hit?.result.applicable ? hit.result.tds : 0;
      if (b.tds === tds) return b;
      changed += 1;
      return { ...b, tds };
    });
  });
  return changed;
}
