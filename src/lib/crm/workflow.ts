import { crm, logActivity, nextCode, upsertRecord } from "./store";
import { fireFinanceEvent } from "@/lib/finance/emit";
import type { CrmState, EntityKind } from "./types";
import { upsertProjectRecord } from "@/lib/projects/store";
import { autoPlanProject } from "@/lib/projects/templates";
import { copyLines, createBudgetFromLines, type LineDocKind } from "./revenue";
import { LIFECYCLE, nextStatus, statusLabel } from "./lifecycle";

const LINE_KINDS: EntityKind[] = ["proposals", "quotations", "oas", "salesOrders"];


const iso = (d: Date) => d.toISOString();
const addDays = (n: number) => iso(new Date(Date.now() + n * 86400000));
const daysSince = (v?: string) =>
  v ? Math.floor((Date.now() - new Date(v).getTime()) / 86400000) : 0;

/* ------------------------------------------------------------------ pricing */

export interface QuotationTotals {
  base: number;
  discount: number;
  net: number;
  tax: number;
  freight: number;
  grand: number;
  margin: number;
}

export function quotationTotals(q: Record<string, unknown>): QuotationTotals {
  const base = Number(q.value ?? 0);
  const discount = (base * Number(q.discountPct ?? 0)) / 100;
  const net = base - discount;
  const freight = Number(q.freight ?? 0);
  const tax = ((net + freight) * Number(q.taxPct ?? 18)) / 100;
  return {
    base,
    discount,
    net,
    tax,
    freight,
    grand: net + freight + tax,
    margin: (net * Number(q.marginPct ?? 0)) / 100,
  };
}

/* ------------------------------------------------------------- lead scoring */

const SOURCE_WEIGHT: Record<string, number> = {
  Referral: 25,
  Partner: 20,
  Event: 18,
  Website: 12,
  Campaign: 12,
  Chatbot: 10,
  WhatsApp: 10,
  Email: 8,
  Outbound: 8,
  "CSV Import": 5,
};

const STATUS_WEIGHT: Record<string, number> = {
  new: 5,
  assigned: 10,
  contacted: 15,
  qualified: 30,
  converted: 35,
  disqualified: 0,
};

/** Configurable 0-100 lead score: source + value + engagement + recency + status. */
export function leadScore(lead: Record<string, unknown>, s?: CrmState): number {
  const st = s ?? crm.get();
  let score = SOURCE_WEIGHT[String(lead.source)] ?? 8;
  score += STATUS_WEIGHT[String(lead.status)] ?? 0;
  const v = Number(lead.estValue ?? 0);
  score += v >= 10_000_000 ? 25 : v >= 5_000_000 ? 18 : v >= 1_000_000 ? 10 : 4;
  const known = st.customers.some((c) => c.name === lead.customerName && c.status === "active");
  if (known) score += 10;
  const touches = st.activities.filter(
    (a) => a.entityKind === "leads" && a.entityId === lead.id,
  ).length;
  score += Math.min(touches * 3, 12);
  const age = daysSince(lead.createdAt as string);
  if (age > 30) score -= 10;
  else if (age > 14) score -= 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Leads that look like an existing lead (same customer + similar title). */
export function findDuplicateLeads(
  lead: Record<string, unknown>,
  s?: CrmState,
): Array<{ id: string; code: string; title: string }> {
  const st = s ?? crm.get();
  const norm = (v: unknown) =>
    String(v ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const t = norm(lead.title);
  return st.leads
    .filter(
      (l) =>
        l.id !== lead.id &&
        l.customerName === lead.customerName &&
        (norm(l.title) === t || norm(l.title).includes(t) || t.includes(norm(l.title))),
    )
    .map((l) => ({ id: l.id, code: l.code, title: l.title }));
}

/* ------------------------------------------------------- opportunity health */

export interface DealHealth {
  score: number;
  rag: "green" | "amber" | "red";
  weighted: number;
  stageAgeDays: number;
  stalled: boolean;
  reasons: string[];
}

export function opportunityHealth(o: Record<string, unknown>, s?: CrmState): DealHealth {
  const st = s ?? crm.get();
  const reasons: string[] = [];
  const prob = Number(o.probability ?? 0);
  const value = Number(o.value ?? 0);
  const stageAgeDays = daysSince((o.lastStageAt as string) ?? (o.createdAt as string));
  const lastTouch = st.activities
    .filter((a) => a.entityKind === "opportunities" && a.entityId === o.id)
    .map((a) => daysSince(a.at))
    .sort((a, b) => a - b)[0];
  const silence = lastTouch ?? stageAgeDays;

  let score = 40 + prob * 0.4;
  if (stageAgeDays > 45) {
    score -= 20;
    reasons.push(`Stuck in “${String(o.stage)}” for ${stageAgeDays} days`);
  } else if (stageAgeDays > 21) {
    score -= 10;
    reasons.push(`Stage ageing — ${stageAgeDays} days without progression`);
  }
  if (silence > 14) {
    score -= 15;
    reasons.push(`No logged activity for ${silence} days`);
  }
  const close = o.expectedClose ? new Date(o.expectedClose as string).getTime() : 0;
  if (close && close < Date.now() && !["won", "lost"].includes(String(o.stage))) {
    score -= 15;
    reasons.push("Expected close date has passed");
  }
  const hasQuote = st.quotations.some((q) => q.customerName === o.customerName);
  if (hasQuote) score += 8;
  else if (["solution-discussion", "rfq-expected", "rfq-received"].includes(String(o.stage))) {
    score -= 8;
    reasons.push("No quotation issued at this stage");
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    rag: score >= 70 ? "green" : score >= 45 ? "amber" : "red",
    weighted: Math.round((value * prob) / 100),
    stageAgeDays,
    stalled: stageAgeDays > 30 || silence > 21,
    reasons: reasons.length ? reasons : ["Deal is progressing normally"],
  };
}

/** Deterministic next-best-action suggestions used by the in-context AI panel. */
export function nextBestActions(kind: EntityKind, r: Record<string, unknown>): string[] {
  const st = crm.get();
  const out: string[] = [];
  switch (kind) {
    case "leads": {
      const sc = leadScore(r, st);
      if (String(r.status) === "new")
        out.push("Call the contact within 24h — first-response time drives conversion.");
      if (sc >= 60 && String(r.status) !== "converted")
        out.push(`Score ${sc}/100 — qualify and convert to an Opportunity now.`);
      if (sc < 40)
        out.push("Low score — nurture through a campaign instead of direct sales effort.");
      if (!r.contactEmail) out.push("Enrich the record with a contact email and phone.");
      break;
    }
    case "opportunities": {
      const h = opportunityHealth(r, st);
      out.push(...h.reasons.map((x) => `Risk: ${x}`));
      if (h.stalled) out.push("Schedule an executive touchpoint to unblock the deal.");
      if (Number(r.probability ?? 0) >= 60) out.push("Raise the RFQ and start technical costing.");
      break;
    }
    case "rfqs":
      out.push("Generate the proposal from a template to keep the SLA.");
      if (!r.scope)
        out.push("Extract scope, quantities and delivery schedule from the RFQ document.");
      break;
    case "proposals":
      out.push("Submit for engineering + commercial approval, then generate the quotation.");
      break;
    case "quotations": {
      const t = quotationTotals(r);
      if (Number(r.discountPct ?? 0) > 10)
        out.push("Discount above 10% — needs Sales Head approval.");
      if (Number(r.marginPct ?? 0) < 15)
        out.push("Margin below 15% — review pricing before issuing.");
      out.push(
        `Grand total ₹${Math.round(t.grand).toLocaleString("en-IN")} — email to the customer and set a follow-up.`,
      );
      break;
    }
    case "oas":
      out.push("Approve to raise the Sales Order and auto-provision the project.");
      break;
    case "salesOrders":
      out.push("Confirm delivery date with production planning and release material requisitions.");
      break;
    default:
      out.push("Review open activities and log the next customer touchpoint.");
  }
  return out;
}

/* ------------------------------------------------------------- conversions */

function copyRelated(from: EntityKind, fromId: string, to: EntityKind, toId: string) {
  crm.update((s) => {
    const clone = <T extends { id: string; entityKind: EntityKind; entityId: string }>(rows: T[]) =>
      rows
        .filter((r) => r.entityKind === from && r.entityId === fromId)
        .map((r) => ({ ...r, id: crypto.randomUUID(), entityKind: to, entityId: toId }));
    s.notes = [...clone(s.notes), ...s.notes];
    s.emails = [...clone(s.emails), ...s.emails];
    s.documents = [...clone(s.documents), ...s.documents];
    s.activities = [...clone(s.activities), ...s.activities];
  });
}

export const CONVERSION_TARGET: Partial<Record<EntityKind, EntityKind>> = {
  leads: "opportunities",
  opportunities: "rfqs",
  rfqs: "proposals",
  proposals: "quotations",
  quotations: "oas",
  oas: "salesOrders",
};

export const CONVERSION_LABEL: Partial<Record<EntityKind, string>> = {
  leads: "Convert to Opportunity",
  opportunities: "Raise RFQ",
  rfqs: "Generate Proposal",
  proposals: "Generate Quotation",
  quotations: "Create Order Acceptance",
  oas: "Create Sales Order",
};

const PREFIX: Record<EntityKind, string> = {
  customers: "CUS",
  leads: "LEAD",
  opportunities: "OPP",
  rfqs: "RFQ",
  proposals: "PRP",
  quotations: "QUO",
  oas: "OA",
  salesOrders: "SO",
};

function code(kind: EntityKind) {
  const s = crm.get();
  return nextCode(
    PREFIX[kind],
    (s[kind] as unknown as Array<{ code: string }>).map((r) => r.code),
  );
}

export interface ConversionResult {
  kind: EntityKind;
  id: string;
  code: string;
}

/**
 * Carries a record forward to the next lifecycle stage, inheriting customer,
 * commercials, contacts, notes, emails, documents and activity history.
 */
export function convertRecord(kind: EntityKind, id: string): ConversionResult | { error: string } {
  const s = crm.get();
  const rec = (s[kind] as unknown as Array<Record<string, unknown>>).find((r) => r.id === id);
  const target = CONVERSION_TARGET[kind];
  if (!rec || !target) return { error: "This record cannot be converted." };

  const carry = {
    customerId: rec.customerId,
    customerName: rec.customerName,
    contactPerson: rec.contactPerson,
    contactEmail: rec.contactEmail,
    contactPhone: rec.contactPhone,
    owner: rec.owner ?? "You",
    companyId: rec.companyId ?? "FAITH-AUTOMATION",
  };
  const newCode = code(target);
  let payload: Record<string, unknown> = {};

  switch (kind) {
    case "leads": {
      if (rec.opportunityId) return { error: "Lead has already been converted." };
      payload = {
        ...carry,
        code: newCode,
        name: rec.title,
        leadId: id,
        value: rec.estValue ?? 0,
        probability: Math.max(20, Math.min(90, leadScore(rec, s))),
        stage: "qualification",
        expectedClose: addDays(45),
        lastStageAt: iso(new Date()),
      };
      break;
    }
    case "opportunities":
      payload = {
        ...carry,
        code: newCode,
        title: `${rec.name as string} — RFQ`,
        opportunityId: id,
        dueDate: addDays(10),
        status: "draft",
      };
      break;
    case "rfqs":
      payload = {
        ...carry,
        code: newCode,
        title:
          String(rec.title)
            .replace(/—\s*RFQ.*$/i, "")
            .trim() + " — Proposal",
        rfqId: id,
        opportunityId: rec.opportunityId,
        template: "BIW Line — Turnkey",
        version: "v1.0",
        status: "draft",
        executiveSummary: `Faith Automation proposes a turnkey solution for ${rec.customerName as string} covering the scope defined in ${rec.code as string}.`,
        scope:
          (rec.scope as string) ??
          "Design, manufacture, supply, installation and commissioning of the BIW line as per customer specification.",
        deliverables: "GA drawings, simulation study, FAT/SAT protocols, O&M manuals, training.",
        methodology:
          "Concept → Detail engineering → Manufacturing → FAT → Site installation → SAT → Handover.",
        timeline: (rec.deliverySchedule as string) ?? "26 weeks from PO / advance receipt.",
        assumptions: "Utilities, civil foundation and safety fencing in customer scope.",
        terms: (rec.commercialTerms as string) ?? "Prices exclusive of GST. Validity 30 days.",
      };
      break;
    case "proposals":
      payload = {
        ...carry,
        code: newCode,
        title:
          String(rec.title)
            .replace(/—\s*Proposal.*$/i, "")
            .trim() + " — Quotation",
        proposalId: id,
        opportunityId: rec.opportunityId,
        value: Number(rec.value ?? 0),
        discountPct: 0,
        taxPct: 18,
        freight: 0,
        marginPct: 22,
        currency: "INR",
        paymentTerms: "30% advance, 60% on despatch, 10% on commissioning",
        deliveryTerms: "FOR Destination",
        validity: addDays(30),
        revision: 1,
        views: 0,
        status: "draft",
      };
      break;
    case "quotations":
      payload = {
        ...carry,
        code: newCode,
        title: String(rec.title)
          .replace(/—\s*Quotation.*$/i, "")
          .trim(),
        quotationId: id,
        value: Math.round(quotationTotals(rec).net),
        poNumber: "",
        poDate: iso(new Date()),
        status: "draft",
      };
      break;
    case "oas":
      if (rec.salesOrderId) return { error: "Sales Order already exists for this OA." };
      payload = {
        ...carry,
        code: newCode,
        title: rec.title,
        oaId: id,
        value: rec.value,
        poNumber: rec.poNumber,
        deliveryDate: addDays(120),
        paymentTerms: "30% advance, 60% on despatch, 10% on commissioning",
        status: "open",
      };
      break;
    default:
      return { error: "Unsupported conversion." };
  }

  const newId = upsertRecord(target, payload);
  copyRelated(kind, id, target, newId);
  if (LINE_KINDS.includes(kind) && LINE_KINDS.includes(target))
    copyLines(kind as LineDocKind, id, target as LineDocKind, newId);


  crm.update((s2) => {
    const src = (s2[kind] as unknown as Array<Record<string, unknown>>).find((r) => r.id === id);
    if (!src) return;
    if (kind === "leads") {
      src.status = "converted";
      src.opportunityId = newId;
    }
    if (kind === "oas") src.salesOrderId = newId;
    if (kind === "rfqs") src.status = "ready-for-proposal";
    if (kind === "quotations") src.status = "accepted";
    if (kind === "opportunities") src.stage = "rfq-received";
    if (kind === "proposals") src.status = "commercial-approved";
  });

  logActivity(kind, id, "system", `Converted to ${target.replace(/s$/, "")} ${newCode}`, "System");
  logActivity(
    target,
    newId,
    "system",
    `Created from ${kind.replace(/s$/, "")} ${rec.code as string} — data inherited`,
    "System",
  );
  return { kind: target, id: newId, code: newCode };
}

/** Clone a record as a new draft, keeping all commercial fields. */
export function duplicateRecord(kind: EntityKind, id: string): string | null {
  const s = crm.get();
  const rec = (s[kind] as unknown as Array<Record<string, unknown>>).find((r) => r.id === id);
  if (!rec) return null;
  const clone: Record<string, unknown> = { ...rec };
  delete clone.id;
  delete clone.createdAt;
  delete clone.projectId;
  delete clone.salesOrderId;
  delete clone.opportunityId;
  clone.code = code(kind);
  clone.status = kind === "salesOrders" ? "open" : "draft";
  if (kind === "opportunities") clone.stage = "discovery";
  if (kind === "quotations") clone.revision = Number(rec.revision ?? 1) + 1;
  if (kind === "proposals") {
    const v = String(rec.version ?? "v1.0").replace(/^v/, "");
    clone.version = `v${(Number(v) + 0.1).toFixed(1)}`;
  }
  return upsertRecord(kind, clone);
}

/* ------------------------------------------- lifecycle status automation */

/** Statuses at which the next document in the chain is created automatically. */
const AUTO_CREATE_AT: Partial<Record<EntityKind, string>> = {
  leads: "converted",
  opportunities: "rfq-received",
  rfqs: "ready-for-proposal",
  proposals: "commercial-approved",
  quotations: "accepted",
};

/** True when a downstream document already exists for this record. */
function hasDownstream(kind: EntityKind, id: string): boolean {
  const s = crm.get();
  switch (kind) {
    case "leads":
      return s.opportunities.some((o) => o.leadId === id);
    case "opportunities":
      return s.rfqs.some((r) => r.opportunityId === id);
    case "rfqs":
      return s.proposals.some((p) => p.rfqId === id);
    case "proposals":
      return s.quotations.some((q) => q.proposalId === id);
    case "quotations":
      return s.oas.some((o) => o.quotationId === id);
    case "oas":
      return s.salesOrders.some((so) => so.oaId === id);
    default:
      return false;
  }
}

export interface AdvanceResult {
  status: string;
  created?: ConversionResult;
  projectCode?: string;
}

/**
 * Moves a record to the next status in its lifecycle and runs the automation
 * attached to that status — downstream document creation, and Sales Order +
 * Project provisioning once an Order Acceptance reaches "Approved".
 */
export function advanceLifecycle(
  kind: EntityKind,
  id: string,
  actor = "You",
): AdvanceResult | { error: string } {
  const s = crm.get();
  const rec = (s[kind] as unknown as Array<Record<string, unknown>>).find((r) => r.id === id);
  if (!rec) return { error: "Record not found." };
  const field = kind === "opportunities" ? "stage" : "status";
  const current = String(rec[field] ?? "");
  const next = nextStatus(kind, current);
  if (!next) {
    const flow = LIFECYCLE[kind];
    return {
      error: flow?.includes(current)
        ? `${statusLabel(current)} is the final stage.`
        : `“${statusLabel(current)}” is outside the standard flow — set the status manually.`,
    };
  }

  // OA approval owns its own transaction (SO + project provisioning).
  if (kind === "oas" && next === "approved") {
    const res = approveOAAndProvision(id, actor);
    return { status: next, projectCode: res?.projectCode };
  }

  crm.update((st) => {
    const r = (st[kind] as unknown as Array<Record<string, unknown>>).find((x) => x.id === id);
    if (r) r[field] = next;
    const isApprovalStep = /approval|validation/.test(next);
    if (isApprovalStep) {
      st.approvals = [
        {
          id: crypto.randomUUID(),
          entityKind: kind,
          entityId: id,
          step: statusLabel(next),
          approver: actor,
          status: "pending",
          at: iso(new Date()),
        },
        ...st.approvals,
      ];
    }
  });
  logActivity(kind, id, "system", `Moved to ${statusLabel(next)}`, actor);

  if (AUTO_CREATE_AT[kind] === next && !hasDownstream(kind, id)) {
    const res = convertRecord(kind, id);
    if (!("error" in res)) return { status: next, created: res };
  }
  return { status: next };
}

/**
 * Runs the automation attached to a record's *current* status. Called after any
 * manual status change (edit dialog, kanban move, import) so the chain fires
 * regardless of how the record reached the trigger status.
 */
export function runLifecycleAutomation(
  kind: EntityKind,
  id: string,
  actor = "You",
): { created?: ConversionResult; projectCode?: string } {
  const s = crm.get();
  const rec = (s[kind] as unknown as Array<Record<string, unknown>>).find((r) => r.id === id);
  if (!rec) return {};
  const field = kind === "opportunities" ? "stage" : "status";
  const current = String(rec[field] ?? "");

  if (kind === "oas" && current === "approved") {
    if (hasDownstream("oas", id) && rec.projectId) return {};
    const res = approveOAAndProvision(id, actor);
    return { projectCode: res?.projectCode };
  }
  if (AUTO_CREATE_AT[kind] === current && !hasDownstream(kind, id)) {
    const res = convertRecord(kind, id);
    if (!("error" in res)) return { created: res };
  }
  return {};
}

/** Sets a lifecycle status directly (kanban / edit form) and runs automation. */
export function setLifecycleStatus(
  kind: EntityKind,
  id: string,
  status: string,
  actor = "You",
): { created?: ConversionResult; projectCode?: string } {
  const field = kind === "opportunities" ? "stage" : "status";
  crm.update((st) => {
    const r = (st[kind] as unknown as Array<Record<string, unknown>>).find((x) => x.id === id);
    if (r) r[field] = status;
  });
  logActivity(kind, id, "system", `Moved to ${statusLabel(status)}`, actor);
  return runLifecycleAutomation(kind, id, actor);
}

/**
 * Sweeps the whole pipeline and creates any missing downstream document for
 * records that already sit at a trigger status (seeded or imported data).
 * Returns the codes of everything it created.
 */
export function syncLifecycleChain(): string[] {
  const created: string[] = [];
  const order: EntityKind[] = ["leads", "opportunities", "rfqs", "proposals", "quotations"];
  for (const kind of order) {
    const rows = [...(crm.get()[kind] as unknown as Array<Record<string, unknown>>)];
    for (const r of rows) {
      const res = runLifecycleAutomation(kind, r.id as string, "System");
      if (res.created) created.push(res.created.code);
    }
  }
  return created;
}


export function cancelRecord(kind: EntityKind, id: string, reason: string) {


  crm.update((s) => {
    const rec = (s[kind] as unknown as Array<Record<string, unknown>>).find((r) => r.id === id);
    if (!rec) return;
    rec.status = "cancelled";
    rec.cancelledAt = iso(new Date());
    rec.cancelReason = reason;
  });
  logActivity(kind, id, "system", `Cancelled — ${reason}`, "You");
}

/* --------------------------------------------- OA approval → SO → project */

const MILESTONE_TEMPLATE = [
  { name: "Design freeze", offset: 21, pct: 10 },
  { name: "Manufacturing complete", offset: 70, pct: 30 },
  { name: "Factory acceptance test", offset: 95, pct: 30 },
  { name: "Site installation complete", offset: 120, pct: 20 },
  { name: "Final handover / SAT", offset: 140, pct: 10 },
];

const WBS_TEMPLATE = [
  { name: "Project management", weight: 10 },
  { name: "Concept & detail engineering", weight: 20 },
  { name: "Procurement & fabrication", weight: 30 },
  { name: "Assembly & FAT", weight: 20 },
  { name: "Installation, SAT & handover", weight: 20 },
];

/**
 * Approves an OA, raises the Sales Order and provisions a fully-populated
 * project (WBS, milestones, billing schedule, budget, team and charter doc).
 */
export function approveOAAndProvision(oaId: string, approver = "You") {
  const s = crm.get();
  const oa = s.oas.find((o) => o.id === oaId);
  if (!oa) return null;

  crm.update((st) => {
    const rec = st.oas.find((o) => o.id === oaId);
    if (rec) rec.status = "approved";
    st.approvals = [
      {
        id: crypto.randomUUID(),
        entityKind: "oas",
        entityId: oaId,
        step: "Final Approval",
        approver,
        status: "approved",
        at: iso(new Date()),
      },
      ...st.approvals,
    ];
  });

  let soId = oa.salesOrderId;
  if (!soId) {
    const res = convertRecord("oas", oaId);
    if ("id" in res) soId = res.id;
  }

  const projectCode = nextCode(
    "PRJ",
    crm.get().projects.map((p) => p.code),
  );
  const start = new Date();
  const end = new Date(Date.now() + 140 * 86400000);
  const budget = Math.round(oa.value * 0.78);

  const projectId = upsertProjectRecord("projects", {
    code: projectCode,
    name: oa.title,
    customerName: oa.customerName,
    oaId,
    value: oa.value,
    budget,
    spent: 0,
    startDate: iso(start),
    endDate: iso(end),
    status: "planning",
    progress: 0,
    rag: "green",
    manager: oa.owner || "R. Iyer",
  });

  // AI planning: recommend a delivery template and generate the full execution
  // structure (3-level WBS, milestones + billing, budget, risk register,
  // document folders, role plan and project calendar) with zero re-entry.
  const planned = autoPlanProject(projectId);

  // Category-wise cost budget (v1) derived from the order's line items.
  createBudgetFromLines({
    oaId,
    salesOrderId: soId,
    projectCode,
    customerName: oa.customerName,
    kind: "oas",
    docId: oaId,
    note: `Baseline budget from ${oa.code}`,
    createdBy: approver,
  });

  if (!planned) {
    WBS_TEMPLATE.forEach((t, i) => {
      upsertProjectRecord(
        "wbs",
        {
          code: `${i + 1}.0`,
          name: t.name,
          owner: oa.owner || "R. Iyer",
          start: iso(new Date(Date.now() + i * 25 * 86400000)),
          end: iso(new Date(Date.now() + (i + 1) * 25 * 86400000)),
          progress: 0,
          status: "not-started",
          weight: t.weight,
        },
        projectId,
      );
    });

    MILESTONE_TEMPLATE.forEach((m) => {
      upsertProjectRecord(
        "milestones",
        {
          name: m.name,
          due: addDays(m.offset),
          status: "upcoming",
          billing: Math.round((oa.value * m.pct) / 100),
        },
        projectId,
      );
    });

    (
      [
        ["Labour", 0.28],
        ["Material", 0.42],
        ["Equipment", 0.15],
        ["Subcontract", 0.1],
        ["Overhead", 0.05],
      ] as const
    ).forEach(([category, share]) => {
      upsertProjectRecord(
        "budget",
        { category, planned: Math.round(budget * share), committed: 0, actual: 0 },
        projectId,
      );
    });
  }

  upsertProjectRecord(
    "team",
    {
      name: oa.owner || "R. Iyer",
      role: "Project Manager",
      allocationPct: 50,
      email: "pmo@faithautomation.com",
    },
    projectId,
  );

  upsertProjectRecord(
    "docs",
    {
      name: `${projectCode}-Project-Charter.pdf`,
      kind: "Charter",
      size: "—",
      uploadedBy: "System",
      at: iso(new Date()),
      version: "v1.0",
      notes: `Auto-generated from ${oa.code} (PO ${oa.poNumber}).`,
    },
    projectId,
  );

  crm.update((st) => {
    const rec = st.oas.find((o) => o.id === oaId);
    if (rec) rec.projectId = projectId;
    if (soId) {
      const so = st.salesOrders.find((x) => x.id === soId);
      if (so) {
        so.projectId = projectId;
        so.projectCode = projectCode;
        so.status = "in-execution";
      }
    }
    st.projects = [
      {
        id: projectId,
        code: projectCode,
        name: oa.title,
        customerName: oa.customerName,
        value: oa.value,
        oaId,
        status: "planning",
        createdAt: iso(new Date()),
      },
      ...st.projects,
    ];
  });

  logActivity(
    "oas",
    oaId,
    "system",
    `Approved — Sales Order raised and Project ${projectCode} provisioned with WBS, milestones, billing schedule and budget`,
    "System",
  );

  // Sales-to-cash: open the project cost ledger and raise the advance /
  // mobilisation invoice implied by the order's payment terms.
  fireFinanceEvent({ type: "project.created", projectCode });
  fireFinanceEvent({ type: "so.approved", oaId });

  return { projectId, projectCode, salesOrderId: soId };
}

