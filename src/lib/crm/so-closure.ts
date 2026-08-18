/**
 * Sales Order closure engine.
 *
 * Validates delivery, invoicing, returns, open commitments, customer balance and
 * pending billing before a Sales Order can be closed, short-closed or cancelled.
 * Every decision is written back with a mandatory reason plus an audit trail entry.
 */
import { crm, logActivity } from "./store";
import { revenue, lineAmount } from "./revenue";
import { finance } from "@/lib/finance/store";
import { procurement } from "@/lib/procurement/store";
import type { SalesOrder } from "./types";

export type ClosureAction = "close" | "short-close" | "cancel";

export interface SoCheck {
  key: string;
  label: string;
  status: "pass" | "warning" | "blocker";
  detail: string;
  value?: number;
}

export interface SoClosureSummary {
  soCode: string;
  orderedQty: number;
  deliveredQty: number;
  invoicedQty: number;
  pendingQty: number;
  returnedQty: number;
  orderValue: number;
  invoicedValue: number;
  collectedValue: number;
  customerBalance: number;
  pendingBilling: number;
  openCommitments: number;
  checks: SoCheck[];
  blockers: number;
}

export interface SoClosureRecord {
  id: string;
  soId: string;
  soCode: string;
  action: ClosureAction;
  reason: string;
  by: string;
  at: string;
  summary: SoClosureSummary;
}

const HISTORY_KEY = "faith-erp:so-closures";

function readHistory(): SoClosureRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as SoClosureRecord[];
  } catch {
    return [];
  }
}

function writeHistory(rows: SoClosureRecord[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(rows));
}

export function closureHistory(soId?: string): SoClosureRecord[] {
  const all = readHistory();
  return soId ? all.filter((r) => r.soId === soId) : all;
}

/** Builds the full validation summary for a Sales Order. */
export function evaluateSoClosure(so: SalesOrder): SoClosureSummary {
  const lines = revenue.get().lines.filter((l) => l.docKind === "salesOrders" && l.docId === so.id);
  const orderedQty = lines.reduce((s, l) => s + Number(l.qty || 0), 0);
  const deliveredQty = lines.reduce((s, l) => s + Number(l.deliveredQty ?? 0), 0);
  const invoicedQty = lines.reduce((s, l) => s + Number(l.invoicedQty ?? 0), 0);
  const returnedQty = lines.reduce((s, l) => s + Number(l.returnedQty ?? 0), 0);
  const pendingQty = Math.max(0, orderedQty - deliveredQty - returnedQty);
  const orderValue = lines.length ? lines.reduce((s, l) => s + lineAmount(l), 0) : Number(so.value || 0);

  const fin = finance.get();
  const projectCode = so.projectCode;
  const invoices = fin.arInvoices.filter(
    (i) => i.status !== "void" && (i.projectCode === projectCode || i.customerName === so.customerName),
  );
  const invoicedValue = invoices.reduce((s, i) => s + i.amount, 0);
  const collectedValue = invoices.reduce((s, i) => s + i.received, 0);
  const customerBalance = Math.max(0, invoicedValue - collectedValue);
  const pendingBilling = Math.max(0, orderValue - invoicedValue);

  const pos = procurement.get().pos ?? [];
  const openPos = pos.filter(
    (p) =>
      (p as { projectCode?: string }).projectCode === projectCode &&
      !["closed", "cancelled", "completed"].includes(String((p as { status?: string }).status ?? "")),
  );
  const openCommitments = openPos.reduce((s, p) => s + Number((p as { value?: number }).value ?? 0), 0);

  const checks: SoCheck[] = [
    {
      key: "delivery",
      label: "Delivered quantity",
      status: pendingQty === 0 ? "pass" : "blocker",
      detail:
        pendingQty === 0
          ? `All ${orderedQty} units delivered`
          : `${deliveredQty} of ${orderedQty} delivered · ${pendingQty} pending`,
      value: deliveredQty,
    },
    {
      key: "invoiced",
      label: "Invoiced quantity",
      status: invoicedQty >= deliveredQty ? "pass" : "blocker",
      detail:
        invoicedQty >= deliveredQty
          ? `${invoicedQty} units invoiced`
          : `${deliveredQty - invoicedQty} delivered units not invoiced`,
      value: invoicedQty,
    },
    {
      key: "pending",
      label: "Pending quantity",
      status: pendingQty === 0 ? "pass" : "warning",
      detail: pendingQty === 0 ? "Nothing pending" : `${pendingQty} units open — needs short close`,
      value: pendingQty,
    },
    {
      key: "returns",
      label: "Returns",
      status: returnedQty === 0 ? "pass" : "warning",
      detail: returnedQty === 0 ? "No returns recorded" : `${returnedQty} units returned — credit note required`,
      value: returnedQty,
    },
    {
      key: "commitments",
      label: "Open commitments",
      status: openCommitments === 0 ? "pass" : "blocker",
      detail: openCommitments === 0 ? "No open POs" : `${openPos.length} open PO(s) worth ₹${Math.round(openCommitments).toLocaleString("en-IN")}`,
      value: openCommitments,
    },
    {
      key: "balance",
      label: "Customer balance",
      status: customerBalance === 0 ? "pass" : "blocker",
      detail:
        customerBalance === 0
          ? "Fully collected"
          : `₹${Math.round(customerBalance).toLocaleString("en-IN")} outstanding`,
      value: customerBalance,
    },
    {
      key: "billing",
      label: "Pending billing",
      status: pendingBilling <= 0 ? "pass" : "warning",
      detail:
        pendingBilling <= 0
          ? "Order fully billed"
          : `₹${Math.round(pendingBilling).toLocaleString("en-IN")} yet to be billed`,
      value: pendingBilling,
    },
  ];

  return {
    soCode: so.code,
    orderedQty,
    deliveredQty,
    invoicedQty,
    pendingQty,
    returnedQty,
    orderValue,
    invoicedValue,
    collectedValue,
    customerBalance,
    pendingBilling,
    openCommitments,
    checks,
    blockers: checks.filter((c) => c.status === "blocker").length,
  };
}

/** Blockers only stop a full "close" — short close and cancel need a reason instead. */
export function canPerform(action: ClosureAction, summary: SoClosureSummary): { ok: boolean; error?: string } {
  if (action === "close" && summary.blockers > 0)
    return { ok: false, error: `${summary.blockers} validation blocker(s) — short close or resolve them first.` };
  return { ok: true };
}

export function performSoClosure(
  soId: string,
  action: ClosureAction,
  reason: string,
  by = "You",
): { ok: true; record: SoClosureRecord } | { ok: false; error: string } {
  const so = crm.get().salesOrders.find((s) => s.id === soId);
  if (!so) return { ok: false, error: "Sales Order not found" };
  if (!reason.trim()) return { ok: false, error: "A reason is mandatory" };

  const summary = evaluateSoClosure(so);
  const gate = canPerform(action, summary);
  if (!gate.ok) return { ok: false, error: gate.error! };

  const record: SoClosureRecord = {
    id: crypto.randomUUID(),
    soId,
    soCode: so.code,
    action,
    reason: reason.trim(),
    by,
    at: new Date().toISOString(),
    summary,
  };
  writeHistory([record, ...readHistory()]);

  crm.update((s) => {
    s.salesOrders = s.salesOrders.map((row) =>
      row.id === soId ? { ...row, status: action === "cancel" ? "cancelled" : "closed" } : row,
    );
  });

  logActivity("salesOrders", soId, {
    type: "system",
    title:
      action === "close"
        ? `Sales Order closed`
        : action === "short-close"
          ? `Sales Order short closed`
          : `Sales Order cancelled`,
    detail: `${reason.trim()} · pending qty ${summary.pendingQty}, pending billing ₹${Math.round(summary.pendingBilling).toLocaleString("en-IN")}`,
    actor: by,
  });

  return { ok: true, record };
}
