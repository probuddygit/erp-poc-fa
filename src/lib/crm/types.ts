export type Stage =
  | "new"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

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

export interface Lead {
  id: string;
  code: string;
  title: string;
  customerId?: string;
  customerName: string;
  source: "Website" | "Referral" | "Event" | "Outbound" | "Partner";
  owner: string;
  estValue: number;
  status: "new" | "contacted" | "qualified" | "disqualified";
  createdAt: string;
}

export interface Opportunity {
  id: string;
  code: string;
  name: string;
  customerId?: string;
  customerName: string;
  value: number;
  probability: number;
  stage: Stage;
  owner: string;
  expectedClose: string;
  createdAt: string;
}

export interface RFQ {
  id: string;
  code: string;
  opportunityId?: string;
  customerName: string;
  title: string;
  dueDate: string;
  owner: string;
  status: "received" | "in-review" | "responded" | "closed";
  createdAt: string;
}

export interface Proposal {
  id: string;
  code: string;
  rfqId?: string;
  customerName: string;
  title: string;
  version: string;
  owner: string;
  status: ApprovalStatus | "submitted";
  createdAt: string;
}

export interface Quotation {
  id: string;
  code: string;
  proposalId?: string;
  customerName: string;
  title: string;
  value: number;
  validity: string;
  owner: string;
  status: ApprovalStatus | "sent" | "accepted";
  createdAt: string;
}

export interface OA {
  id: string;
  code: string;
  quotationId?: string;
  customerName: string;
  title: string;
  value: number;
  poNumber: string;
  owner: string;
  status: ApprovalStatus;
  projectId?: string;
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
  activities: Activity[];
  notes: Note[];
  emails: EmailMsg[];
  documents: CrmDocument[];
  approvals: Approval[];
  projects: Project[];
};
