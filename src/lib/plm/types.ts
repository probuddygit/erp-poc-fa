export type ItemType = "Raw Material" | "Component" | "Assembly" | "Sub-assembly" | "Finished Good" | "Consumable";
export type PartCategory = "Mechanical" | "Electrical" | "Pneumatic" | "Hydraulic" | "Fastener" | "Standard";
export type UoM = "EA" | "KG" | "MTR" | "SET" | "LOT";
export type Revision = "A" | "B" | "C" | "D" | "E";

export interface Item {
  id: string;
  code: string;
  name: string;
  type: ItemType;
  uom: UoM;
  rev: Revision;
  stdCost: number;
  make_buy: "Make" | "Buy";
  lifecycle: "Prototype" | "Production" | "Obsolete";
  createdAt: string;
}

export interface Part {
  id: string;
  code: string;
  name: string;
  category: PartCategory;
  supplier?: string;
  material?: string;
  weight?: number;
  rev: Revision;
  createdAt: string;
}

export interface Drawing {
  id: string;
  number: string;
  title: string;
  itemCode?: string;
  rev: Revision;
  format: "2D-PDF" | "2D-DWG" | "3D-STEP" | "3D-CATIA";
  size: string;
  uploadedBy: string;
  releasedAt: string;
  status: "In Work" | "Under Review" | "Released" | "Obsolete";
  projectCode?: string;
}

export type BomKind = "EBOM" | "MBOM";

export interface BomNode {
  id: string;
  kind: BomKind;
  parentId?: string; // undefined = root item
  itemCode: string;
  itemName: string;
  qty: number;
  uom: UoM;
  rev: Revision;
  refDes?: string;
  procurement?: "Make" | "Buy";
  rootId: string; // topmost assembly id
  /** Project this structure is engineered for — enables end-to-end traceability. */
  projectCode?: string;
}

export interface ECN {
  id: string;
  code: string;
  title: string;
  itemCode: string;
  fromRev: Revision;
  toRev: Revision;
  reason: string;
  effectivity: string;
  status: "draft" | "pending" | "approved" | "released" | "rejected";
  raisedBy: string;
  createdAt: string;
}

export interface ECR {
  id: string;
  code: string;
  title: string;
  itemCode: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "draft" | "under-review" | "approved" | "rejected" | "converted";
  raisedBy: string;
  createdAt: string;
  linkedEcn?: string;
}

export interface DesignReview {
  id: string;
  code: string;
  title: string;
  itemCode: string;
  reviewers: string[];
  scheduled: string;
  outcome: "Pending" | "Passed" | "Passed with Actions" | "Failed";
  actions: number;
}

export type DocCategory =
  | "CAD Drawing"
  | "Specification"
  | "Calculation"
  | "Technical Document"
  | "Image"
  | "Test Report"
  | "Other";

export type DocStatus = "Draft" | "Under Review" | "Approved" | "Released" | "Obsolete";

export interface DesignDocVersion {
  id: string;
  version: string;
  at: string;
  by: string;
  notes?: string;
  fileUrl?: string;
  fileUrlName?: string;
  fileUrlType?: string;
  size?: string;
  status: DocStatus;
}

export interface DesignDoc {
  id: string;
  code: string;
  title: string;
  category: DocCategory;
  /** Traceability links */
  projectCode?: string;
  itemCode?: string;
  bomRootId?: string;
  ecrCode?: string;
  ecnCode?: string;
  owner: string;
  discipline?: "Mechanical" | "Electrical" | "Controls" | "Process" | "Quality";
  status: DocStatus;
  version: string;
  createdAt: string;
  updatedAt: string;
  fileUrl?: string;
  fileUrlName?: string;
  fileUrlType?: string;
  size?: string;
  notes?: string;
  versions: DesignDocVersion[];
  audit: { id: string; at: string; by: string; action: string }[];
}

export type WorkOrderStatus = "planned" | "released" | "in-progress" | "completed" | "cancelled";

export interface WorkOrder {
  id: string;
  code: string;
  itemCode: string;
  itemName: string;
  qty: number;
  uom: UoM;
  projectCode?: string;
  bomRootId?: string;
  bomNodeId?: string;
  workCenter: string;
  plannedStart: string;
  plannedEnd: string;
  status: WorkOrderStatus;
  estCost: number;
  reservedValue: number;
  createdAt: string;
  source: "manual" | "mbom-auto";
}

export interface PlmState {
  items: Item[];
  parts: Part[];
  drawings: Drawing[];
  bom: BomNode[];
  ecns: ECN[];
  ecrs: ECR[];
  reviews: DesignReview[];
  designDocs: DesignDoc[];
  workOrders: WorkOrder[];
}
