export type ReturnType = "GSTR-1" | "GSTR-3B" | "GSTR-2B" | "GSTR-9";
export type FilingStatus = "not-started" | "in-progress" | "ready" | "filed" | "late";

export interface Registration {
  id: string;
  gstin: string;
  legalName: string;
  tradeName: string;
  state: string;
  type: "Regular" | "SEZ" | "ISD" | "Casual";
  registeredOn: string;
  status: "active" | "suspended";
  primary: boolean;
}

export interface ReturnPeriod {
  id: string;
  gstin: string;
  period: string; // 2024-07
  type: ReturnType;
  dueDate: string;
  filedOn?: string;
  status: FilingStatus;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  arn?: string;
}

export interface EInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  customer: string;
  gstin: string;
  taxableValue: number;
  totalTax: number;
  irn?: string;
  ackNo?: string;
  status: "pending" | "generated" | "cancelled" | "failed";
  errorMsg?: string;
}

export interface EWayBill {
  id: string;
  ewbNo: string;
  invoiceNo: string;
  date: string;
  fromPlace: string;
  toPlace: string;
  distanceKm: number;
  vehicleNo: string;
  transporter: string;
  validUpto: string;
  value: number;
  status: "active" | "expired" | "cancelled";
}

export interface ItcLine {
  id: string;
  supplier: string;
  gstin: string;
  invoiceNo: string;
  date: string;
  bookValue: number;
  gstr2bValue: number;
  itcClaimable: number;
  match: "matched" | "mismatch" | "missing-in-2b" | "missing-in-books";
}

export interface HsnSummaryLine {
  id: string;
  hsn: string;
  description: string;
  uom: string;
  qty: number;
  taxableValue: number;
  rate: number;
  igst: number;
  cgst: number;
  sgst: number;
}

export interface GstState {
  registrations: Registration[];
  returns: ReturnPeriod[];
  eInvoices: EInvoice[];
  eWayBills: EWayBill[];
  itc: ItcLine[];
  hsn: HsnSummaryLine[];
}
