export type CheckType = "dimensional" | "visual" | "functional" | "material" | "torque" | "weld";
export type QCStage = "incoming" | "in-process" | "final";

export interface Checklist {
  id: string;
  code: string;
  title: string;
  stage: QCStage;
  itemCode?: string;
  itemDescription?: string;
  revision: string;
  owner: string;
  updatedAt: string;
  status: "draft" | "approved" | "obsolete";
  checks: {
    id: string;
    parameter: string;
    type: CheckType;
    method: string;
    nominal?: string;
    lsl?: number;
    usl?: number;
    unit?: string;
    critical: boolean;
  }[];
}

export type InspStatus = "planned" | "in-progress" | "passed" | "failed" | "rework";
export interface Inspection {
  id: string;
  code: string;
  stage: QCStage;
  refType: "GRN" | "WO" | "FG" | "PROJ";
  refCode: string;
  itemCode: string;
  itemDescription: string;
  qty: number;
  uom: string;
  vendorName?: string;
  projectCode?: string;
  inspector: string;
  scheduledFor: string;
  completedAt?: string;
  status: InspStatus;
  passRate: number; // %
  criticalDefects: number;
  majorDefects: number;
  minorDefects: number;
  checklistCode: string;
}

export type NCRSeverity = "low" | "medium" | "high" | "critical";
export type NCRStatus = "open" | "investigation" | "containment" | "resolved" | "closed";
export interface NCR {
  id: string;
  code: string;
  raisedAt: string;
  raisedBy: string;
  source: "incoming" | "in-process" | "final" | "customer" | "audit";
  itemCode: string;
  itemDescription: string;
  qty: number;
  uom: string;
  vendorName?: string;
  projectCode?: string;
  defect: string;
  severity: NCRSeverity;
  disposition?: "rework" | "scrap" | "use-as-is" | "return-to-vendor";
  status: NCRStatus;
  costImpact: number;
  linkedCapa?: string;
}

export type CAPAStage = "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7" | "D8";
export interface CAPA {
  id: string;
  code: string;
  ncrCode?: string;
  title: string;
  owner: string;
  team: string[];
  openedAt: string;
  targetClose: string;
  actualClose?: string;
  stage: CAPAStage;
  status: "open" | "in-progress" | "verification" | "closed" | "overdue";
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  effectivenessPct: number;
}

export type CalStatus = "in-cal" | "due-soon" | "overdue" | "out-of-service";
export interface Gauge {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  owner: string;
  range: string;
  leastCount: string;
  lastCalibrated: string;
  nextDue: string;
  frequencyDays: number;
  provider: string;
  certificateNo?: string;
  status: CalStatus;
}

export interface SupplierScore {
  id: string;
  vendorCode: string;
  vendorName: string;
  category: string;
  lotsReceived: number;
  lotsAccepted: number;
  ppm: number;
  otdPct: number;
  ncrCount: number;
  responseHours: number;
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D";
  trend: "up" | "flat" | "down";
}

export interface QualityState {
  checklists: Checklist[];
  inspections: Inspection[];
  ncrs: NCR[];
  capas: CAPA[];
  gauges: Gauge[];
  suppliers: SupplierScore[];
}
