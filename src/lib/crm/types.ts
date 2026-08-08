import type {
  LeadStatus,
  OaStatus,
  OpportunityStage,
  ProposalStatus,
  QuotationStatus,
  RfqStatus,
  SalesOrderStatus,
} from "./lifecycle";

export type Stage = OpportunityStage | "lost" | "on-hold";

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export type EntityKind =
  | "customers"
  | "leads"
  | "opportunities"
  | "rfqs"
  | "proposals"
  | "quotations"
  | "oas"
  | "salesOrders";


export interface Customer {
  id: string;
  code: string;
  name: string;
  segment: "OEM" | "Tier-1" | "Tier-2" | "EPC";
  region: string;
  owner: string;
  status: "active" | "prospect" | "inactive";
  annualRevenue?: number;
  createdAt: string;
}

/** Fields shared by every revenue-lifecycle document. */
export interface LifecycleCommon {
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  nextFollowUp?: string;
  cancelledAt?: string;
  cancelReason?: string;
  /** single-tenant guard — every record is stamped with the company it belongs to */
  companyId?: string;
}

export interface Customer extends LifecycleCommon {
  id: string;
  code: string;
  name: string;
  segment: "OEM" | "Tier-1" | "Tier-2" | "EPC";
  region: string;
  owner: string;
  status: "active" | "prospect" | "inactive";
  annualRevenue?: number;
  gstin?: string;
  paymentTerms?: string;
  currency?: string;
  createdAt: string;
}

export interface Lead extends LifecycleCommon {
  id: string;
  code: string;
  title: string;
  customerId?: string;
  customerName: string;
  source:
    | "Website"
    | "Referral"
    | "Event"
    | "Outbound"
    | "Partner"
    | "Email"
    | "WhatsApp"
    | "Chatbot"
    | "Campaign"
    | "CSV Import";
  campaign?: string;
  owner: string;
  estValue: number;
  score?: number;
  status: LeadStatus | "disqualified";
  opportunityId?: string;
  createdAt: string;
}

export interface Opportunity extends LifecycleCommon {
  id: string;
  code: string;
  name: string;
  customerId?: string;
  customerName: string;
  leadId?: string;
  value: number;
  probability: number;
  stage: Stage;
  owner: string;
  expectedClose: string;
  lastStageAt?: string;
  createdAt: string;
}

export interface RFQ extends LifecycleCommon {
  id: string;
  code: string;
  opportunityId?: string;
  customerName: string;
  title: string;
  dueDate: string;
  owner: string;
  scope?: string;
  deliverySchedule?: string;
  commercialTerms?: string;
  extractedFrom?: string;
  status: RfqStatus | "on-hold" | "cancelled";
  createdAt: string;
}

export interface Proposal extends LifecycleCommon {
  id: string;
  code: string;
  rfqId?: string;
  opportunityId?: string;
  customerName: string;
  title: string;
  version: string;
  template?: string;
  executiveSummary?: string;
  scope?: string;
  deliverables?: string;
  methodology?: string;
  timeline?: string;
  assumptions?: string;
  terms?: string;
  value?: number;
  owner: string;
  status: ProposalStatus | "rejected" | "cancelled";
  createdAt: string;
}

export interface Quotation extends LifecycleCommon {
  id: string;
  code: string;
  proposalId?: string;
  opportunityId?: string;
  customerName: string;
  title: string;
  value: number;
  discountPct?: number;
  taxPct?: number;
  freight?: number;
  marginPct?: number;
  currency?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  validity: string;
  revision?: number;
  views?: number;
  owner: string;
  status: QuotationStatus | "rejected" | "expired" | "cancelled";
  createdAt: string;
}

export interface OA extends LifecycleCommon {
  id: string;
  code: string;
  quotationId?: string;
  customerName: string;
  title: string;
  value: number;
  poNumber: string;
  poDate?: string;
  owner: string;
  status: OaStatus | "rejected" | "cancelled";
  salesOrderId?: string;
  projectId?: string;
  createdAt: string;
}

export interface SalesOrder extends LifecycleCommon {
  id: string;
  code: string;
  oaId?: string;
  customerName: string;
  title: string;
  value: number;
  poNumber?: string;
  deliveryDate?: string;
  paymentTerms?: string;
  owner: string;
  projectCode?: string;
  projectId?: string;
  status: SalesOrderStatus | "on-hold" | "cancelled";
  createdAt: string;
}


export interface Activity {
  id: string;
  entityKind: EntityKind;
  entityId: string;
  type: "call" | "meeting" | "task" | "note" | "email" | "system";
  title: string;
  detail?: string;
  actor: string;
  at: string;
}

export interface Note {
  id: string;
  entityKind: EntityKind;
  entityId: string;
  body: string;
  author: string;
  at: string;
}

export interface EmailMsg {
  id: string;
  entityKind: EntityKind;
  entityId: string;
  direction: "in" | "out";
  subject: string;
  preview: string;
  from: string;
  to: string;
  at: string;
}

export interface CrmDocument {
  id: string;
  entityKind: EntityKind;
  entityId: string;
  name: string;
  kind: "NDA" | "MSA" | "SOW" | "Drawing" | "Spec" | "PO" | "Other";
  size: string;
  uploadedBy: string;
  at: string;
}

export interface Approval {
  id: string;
  entityKind: EntityKind;
  entityId: string;
  step: string;
  approver: string;
  status: ApprovalStatus;
  comment?: string;
  at: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  customerName: string;
  value: number;
  oaId: string;
  status: "planning" | "active";
  createdAt: string;
}

export type CrmState = {
  customers: Customer[];
  leads: Lead[];
  opportunities: Opportunity[];
  rfqs: RFQ[];
  proposals: Proposal[];
  quotations: Quotation[];
  oas: OA[];
  salesOrders: SalesOrder[];

  activities: Activity[];
  notes: Note[];
  emails: EmailMsg[];
  documents: CrmDocument[];
  approvals: Approval[];
  projects: Project[];
};
