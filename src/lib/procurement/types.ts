export type VendorCategory = "Raw Material" | "Components" | "Consumables" | "Services" | "Capital Goods";
export type VendorRating = "A" | "B" | "C" | "Unrated";
export type QualificationStatus = "qualified" | "in-review" | "conditional" | "blacklisted" | "draft";

export interface Vendor {
  id: string;
  code: string;
  name: string;
  category: VendorCategory;
  country: string;
  city: string;
  rating: VendorRating;
  qualification: QualificationStatus;
  onboardedAt: string;
  onTimePct: number;
  qualityPct: number;
  leadTimeDays: number;
  spendYtd: number;
  contact: string;
  email: string;
  phone: string;
  certifications: string[];
  active: boolean;
}

export type RequisitionStatus = "draft" | "pending" | "approved" | "rejected" | "converted";

/** Audit trail entry shared by PR and RFQ transactions. */
export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  action: string;
  note?: string;
}

export interface RequisitionLine {
  id: string;
  itemCode: string;
  description: string;
  qty: number;
  uom: string;
  estRate: number;
  needBy: string;
}

export interface Requisition {
  id: string;
  code: string;
  title: string;
  projectCode?: string;
  requestedBy: string;
  department: string;
  createdAt: string;
  needBy: string;
  priority: "low" | "medium" | "high" | "critical";
  status: RequisitionStatus;
  approver: string;
  totalEst: number;
  lines: RequisitionLine[];
  notes?: string;
}

export type RfqStatus = "draft" | "issued" | "responses" | "evaluating" | "awarded" | "cancelled";

export interface RfqBid {
  vendorId: string;
  vendorName: string;
  amount: number;
  leadTimeDays: number;
  paymentTerms: string;
  validity: string;
  score: number;
  awarded?: boolean;
}

export interface Rfq {
  id: string;
  code: string;
  title: string;
  requisitionCode?: string;
  projectCode?: string;
  issuedAt: string;
  dueAt: string;
  buyer: string;
  status: RfqStatus;
  vendorCount: number;
  bids: RfqBid[];
  poCode?: string;
}

export type PoStatus = "draft" | "pending" | "approved" | "sent" | "acknowledged" | "partial" | "received" | "closed" | "cancelled";

export interface PoLine {
  id: string;
  itemCode: string;
  description: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  receivedQty: number;
  dueDate: string;
}

export interface PoAmendment {
  id: string;
  at: string;
  by: string;
  reason: string;
  fromValue: number;
  toValue: number;
}

export interface PurchaseOrder {
  id: string;
  code: string;
  vendorId: string;
  vendorName: string;
  rfqCode?: string;
  projectCode?: string;
  buyer: string;
  createdAt: string;
  promisedDate: string;
  currency: string;
  status: PoStatus;
  amount: number;
  received: number;
  invoiced: number;
  amendments: PoAmendment[];
  lines: PoLine[];
  paymentTerms: string;
  incoterms: string;
}

export type GrnStatus = "draft" | "posted" | "quality-hold" | "rejected";
export type InvoiceMatchStatus = "unmatched" | "matched" | "3-way-matched" | "hold" | "paid";

export interface GrnLine {
  itemCode: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
}

export interface Grn {
  id: string;
  code: string;
  poCode: string;
  vendorName: string;
  receivedAt: string;
  receivedBy: string;
  status: GrnStatus;
  invoiceNo?: string;
  invoiceMatch: InvoiceMatchStatus;
  amount: number;
  lines: GrnLine[];
  qcResult?: "pending" | "passed" | "failed";
}

export interface ProcurementState {
  vendors: Vendor[];
  requisitions: Requisition[];
  rfqs: Rfq[];
  pos: PurchaseOrder[];
  grns: Grn[];
}
