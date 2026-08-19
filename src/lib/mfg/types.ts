/** Manufacturing & Shop Floor domain model. */

export type WorkCenterType = "Weld" | "Machining" | "Assembly" | "Paint" | "Sub-contract";

export interface WorkCenter {
  id: string;
  code: string;
  name: string;
  type: WorkCenterType;
  location: string;
  shifts: number;
  capacityHrsPerShift: number;
  hourlyRate: number;
  oeeTarget: number;
  active: boolean;
}

export interface Routing {
  id: string;
  code: string;
  itemCode: string;
  itemName: string;
  rev: string;
  active: boolean;
  createdAt: string;
}

export interface RoutingOp {
  id: string;
  routingCode: string;
  seq: number;
  name: string;
  workCenterCode: string;
  setupMins: number;
  runMinsPerUnit: number;
  inspection: boolean;
  subcontract: boolean;
}

export type MoStatus = "planned" | "released" | "in-progress" | "completed" | "closed" | "cancelled";
export type MoPriority = "Low" | "Normal" | "High" | "Critical";

export interface MfgOrder {
  id: string;
  code: string;
  itemCode: string;
  itemName: string;
  qty: number;
  uom: string;
  projectCode?: string;
  routingCode?: string;
  bomRootId?: string;
  /** Work order id in the Engineering (PLM) store this was imported from. */
  sourceWoCode?: string;
  priority: MoPriority;
  status: MoStatus;
  plannedStart: string;
  plannedEnd: string;
  dueDate: string;
  goodQty: number;
  scrapQty: number;
  reworkQty: number;
  materialCost: number;
  labourCost: number;
  reservedValue: number;
  source: "manual" | "engineering" | "plan";
  createdAt: string;
}

export type OpStatus = "pending" | "running" | "paused" | "done";

export interface MoOperation {
  id: string;
  orderId: string;
  seq: number;
  name: string;
  workCenterCode: string;
  plannedMins: number;
  actualMins: number;
  goodQty: number;
  scrapQty: number;
  status: OpStatus;
  inspection: boolean;
  subcontract: boolean;
  operator?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TimeLog {
  id: string;
  orderId: string;
  operationId: string;
  workCenterCode: string;
  operator: string;
  at: string;
  mins: number;
  goodQty: number;
  scrapQty: number;
  reworkQty: number;
  note?: string;
}

export const DOWNTIME_REASONS = [
  "Material shortage",
  "Tool change",
  "Breakdown",
  "Setup / changeover",
  "Quality hold",
  "Power failure",
  "Operator unavailable",
  "Programme / drawing awaited",
] as const;
export type DowntimeReason = (typeof DOWNTIME_REASONS)[number];

export interface DowntimeLog {
  id: string;
  workCenterCode: string;
  orderId?: string;
  reason: DowntimeReason | string;
  mins: number;
  at: string;
  note?: string;
  capaCode?: string;
}

export type JobWorkStatus = "issued" | "partial" | "received" | "closed";

export interface JobWork {
  id: string;
  code: string;
  vendor: string;
  orderCode?: string;
  itemCode: string;
  itemName: string;
  qty: number;
  returnedQty: number;
  issuedValue: number;
  jobRate: number;
  projectCode?: string;
  issuedAt: string;
  dueAt: string;
  status: JobWorkStatus;
}

export interface PlanRun {
  id: string;
  at: string;
  by: string;
  horizonDays: number;
  demandLines: number;
  ordersCreated: number;
  scheduled: number;
  note: string;
}

export interface MfgState {
  workCenters: WorkCenter[];
  routings: Routing[];
  routingOps: RoutingOp[];
  orders: MfgOrder[];
  operations: MoOperation[];
  timeLogs: TimeLog[];
  downtime: DowntimeLog[];
  jobWork: JobWork[];
  planRuns: PlanRun[];
}
