import { useMemo } from "react";
import type { ComboOption } from "@/components/combobox-field";
import { useCrm } from "./store";
import type { CrmState } from "./types";

export const SALES_OWNERS = [
  "R. Iyer",
  "S. Kapoor",
  "N. Rao",
  "V. Menon",
  "K. Sharma",
  "You",
];

export const PAYMENT_TERMS = [
  "100% advance",
  "30% advance, 60% on despatch, 10% on commissioning",
  "50% advance, 50% against delivery",
  "Net 30 days",
  "Net 45 days",
  "Net 60 days",
  "LC at sight",
];

export const DELIVERY_TERMS = ["Ex-Works", "FOR Destination", "CIF", "DAP", "DDP"];
export const CURRENCIES = ["INR", "USD", "EUR"];
export const PROPOSAL_TEMPLATES = [
  "BIW Line — Turnkey",
  "Weld Cell Retrofit",
  "Automation Upgrade",
  "AMC / Service",
  "Standard Solution",
];

const plain = (values: readonly string[]): ComboOption[] =>
  values.map((v) => ({ value: v, label: v }));

/**
 * Live, searchable lookups for every CRM form. Options carry `patch` payloads so
 * picking a parent record auto-fills customer, owner and value downstream.
 */
export function useCrmOptions() {
  const s = useCrm((st) => st);
  return useMemo(() => buildCrmOptions(s), [s]);
}

export function buildCrmOptions(s: CrmState): Record<string, ComboOption[]> {
  return {
    customers: s.customers.map((c) => ({
      value: c.name,
      label: c.name,
      hint: `${c.code} · ${c.segment}`,
      patch: {
        customerId: c.id,
        owner: c.owner,
        ...(c.paymentTerms ? { paymentTerms: c.paymentTerms } : {}),
        ...(c.currency ? { currency: c.currency } : {}),
      },
    })),
    owners: plain(SALES_OWNERS),
    paymentTerms: plain(PAYMENT_TERMS),
    deliveryTerms: plain(DELIVERY_TERMS),
    currencies: plain(CURRENCIES),
    proposalTemplates: plain(PROPOSAL_TEMPLATES),
    leads: s.leads.map((l) => ({
      value: l.code,
      label: l.title,
      hint: `${l.code} · ${l.customerName}`,
      patch: { leadId: l.id, customerName: l.customerName, owner: l.owner, value: l.estValue },
    })),
    opportunities: s.opportunities.map((o) => ({
      value: o.id,
      label: `${o.code} — ${o.name}`,
      hint: o.customerName,
      patch: { customerName: o.customerName, owner: o.owner, value: o.value },
    })),
    rfqs: s.rfqs.map((r) => ({
      value: r.id,
      label: `${r.code} — ${r.title}`,
      hint: r.customerName,
      patch: { customerName: r.customerName, owner: r.owner },
    })),
    proposals: s.proposals.map((p) => ({
      value: p.id,
      label: `${p.code} — ${p.title}`,
      hint: p.customerName,
      patch: { customerName: p.customerName, owner: p.owner },
    })),
    quotations: s.quotations.map((q) => ({
      value: q.id,
      label: `${q.code} — ${q.title}`,
      hint: q.customerName,
      patch: { customerName: q.customerName, owner: q.owner, value: q.value },
    })),
    oas: s.oas.map((o) => ({
      value: o.id,
      label: `${o.code} — ${o.title}`,
      hint: o.customerName,
      patch: {
        customerName: o.customerName,
        owner: o.owner,
        value: o.value,
        poNumber: o.poNumber,
      },
    })),
  };
}
