/**
 * Canonical revenue-lifecycle statuses and the shared status colour system.
 *
 * Lead → Opportunity → RFQ → Proposal → Quotation → Order Acceptance → Project.
 * Every module renders statuses through `statusTone` so colours stay consistent:
 *   blue = draft/new · orange = in progress/under review · amber = pending approval
 *   purple = customer action · green = approved/completed/won · red = rejected/lost
 *   gray = on hold
 */
import type { EntityKind } from "./types";

export type StatusTone = "blue" | "orange" | "amber" | "purple" | "green" | "red" | "gray";

export const LEAD_STATUSES = ["new", "assigned", "contacted", "qualified", "converted"] as const;
export const OPPORTUNITY_STAGES = [
  "discovery",
  "qualification",
  "solution-discussion",
  "rfq-expected",
  "rfq-received",
  "won",
] as const;
export const RFQ_STATUSES = [
  "draft",
  "technical-review",
  "commercial-review",
  "ready-for-proposal",
] as const;
export const PROPOSAL_STATUSES = [
  "draft",
  "internal-approval",
  "submitted",
  "customer-review",
  "commercial-approved",
] as const;
export const QUOTATION_STATUSES = [
  "draft",
  "approval",
  "submitted",
  "negotiation",
  "accepted",
] as const;
export const OA_STATUSES = [
  "draft",
  "sales-approval",
  "finance-validation",
  "management-approval",
  "approved",
] as const;
export const SALES_ORDER_STATUSES = ["open", "in-execution", "delivered", "closed"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];
export type RfqStatus = (typeof RFQ_STATUSES)[number];
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];
export type OaStatus = (typeof OA_STATUSES)[number];
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

/** Ordered happy-path flow for each document type. */
export const LIFECYCLE: Partial<Record<EntityKind, readonly string[]>> = {
  leads: LEAD_STATUSES,
  opportunities: OPPORTUNITY_STAGES,
  rfqs: RFQ_STATUSES,
  proposals: PROPOSAL_STATUSES,
  quotations: QUOTATION_STATUSES,
  oas: OA_STATUSES,
  salesOrders: SALES_ORDER_STATUSES,
};

/** Negative / terminal states offered in forms alongside the happy path. */
export const EXIT_STATUSES: Partial<Record<EntityKind, readonly string[]>> = {
  leads: ["disqualified"],
  opportunities: ["lost", "on-hold"],
  rfqs: ["on-hold", "cancelled"],
  proposals: ["rejected", "cancelled"],
  quotations: ["rejected", "expired", "cancelled"],
  oas: ["rejected", "cancelled"],
  salesOrders: ["on-hold", "cancelled"],
};

/** All selectable statuses for a document type (happy path + exits). */
export function statusOptions(kind: EntityKind): string[] {
  return [...(LIFECYCLE[kind] ?? []), ...(EXIT_STATUSES[kind] ?? [])];
}

/** The status that follows `current`, or null at the end of the flow. */
export function nextStatus(kind: EntityKind, current: string): string | null {
  const flow = LIFECYCLE[kind];
  if (!flow) return null;
  const i = flow.indexOf(current);
  if (i < 0 || i === flow.length - 1) return null;
  return flow[i]! === current ? (flow[i + 1] as string) : null;
}

/** Human label for the button that moves a record forward. */
export function advanceLabel(kind: EntityKind, current: string): string | null {
  const next = nextStatus(kind, current);
  return next ? `Move to ${statusLabel(next)}` : null;
}

const TONES: Record<string, StatusTone> = {
  // draft / new
  new: "blue",
  draft: "blue",
  discovery: "blue",
  open: "blue",
  prospect: "blue",
  received: "blue",
  // in progress / under review
  assigned: "orange",
  contacted: "orange",
  qualification: "orange",
  "solution-discussion": "orange",
  "rfq-received": "orange",
  "technical-review": "orange",
  "commercial-review": "orange",
  submitted: "orange",
  sent: "orange",
  "in-review": "orange",
  "in-execution": "orange",
  // pending approval
  pending: "amber",
  approval: "amber",
  "internal-approval": "amber",
  "sales-approval": "amber",
  "finance-validation": "amber",
  "management-approval": "amber",
  // customer action required
  "rfq-expected": "purple",
  "customer-review": "purple",
  negotiation: "purple",
  // approved / completed / won
  qualified: "green",
  converted: "green",
  won: "green",
  "ready-for-proposal": "green",
  "commercial-approved": "green",
  accepted: "green",
  approved: "green",
  responded: "green",
  active: "green",
  delivered: "green",
  closed: "green",
  completed: "green",
  // rejected / lost / cancelled
  disqualified: "red",
  lost: "red",
  rejected: "red",
  cancelled: "red",
  expired: "red",
  held: "red",
  // on hold
  "on-hold": "gray",
  hold: "gray",
  inactive: "gray",
};

export function statusTone(status: string): StatusTone {
  return TONES[String(status ?? "").toLowerCase()] ?? "gray";
}

export const TONE_BADGE: Record<StatusTone, string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  red: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  gray: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export const TONE_BORDER: Record<StatusTone, string> = {
  blue: "border-blue-500",
  orange: "border-orange-500",
  amber: "border-amber-500",
  purple: "border-purple-500",
  green: "border-emerald-500",
  red: "border-rose-500",
  gray: "border-slate-400",
};

export const TONE_HEX: Record<StatusTone, string> = {
  blue: "hsl(217 91% 60%)",
  orange: "hsl(25 95% 53%)",
  amber: "hsl(38 92% 50%)",
  purple: "hsl(271 76% 53%)",
  green: "hsl(142 71% 45%)",
  red: "hsl(350 89% 60%)",
  gray: "hsl(215 16% 60%)",
};

export function statusLabel(status: string): string {
  return String(status ?? "")
    .split("-")
    .map((w) =>
      ["rfq", "oa", "po", "gst"].includes(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}

/** End-to-end traceability stages shown on dashboards and registers. */
export const LIFECYCLE_TRACE = [
  { key: "lead", label: "Lead Created", description: "Initial enquiry received" },
  { key: "opportunity", label: "Opportunity Qualified", description: "Sales opportunity established" },
  { key: "rfq", label: "RFQ Received", description: "Customer requirements captured" },
  { key: "proposal", label: "Proposal Submitted", description: "Technical/commercial proposal sent" },
  { key: "quotation", label: "Quotation Submitted", description: "Commercial quotation issued" },
  { key: "quotationAccepted", label: "Quotation Accepted", description: "Customer accepted the quote" },
  { key: "oa", label: "Order Accepted", description: "OA approved" },
  { key: "projectInitiated", label: "Project Initiated", description: "Project automatically created" },
  { key: "projectActive", label: "Project In Progress", description: "Delivery started" },
  { key: "projectCompleted", label: "Project Completed", description: "Delivery finished" },
  { key: "projectClosed", label: "Project Closed", description: "Commercial and project closure complete" },
] as const;
