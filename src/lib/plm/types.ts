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

export interface PlmState {
  items: Item[];
  parts: Part[];
  drawings: Drawing[];
  bom: BomNode[];
  ecns: ECN[];
  ecrs: ECR[];
  reviews: DesignReview[];
}
