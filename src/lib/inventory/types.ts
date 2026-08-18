export type ItemCategory = "Raw Material" | "Component" | "Sub-Assembly" | "Finished Good" | "Consumable";
export type TrackingMode = "none" | "batch" | "serial" | "lot";

export interface InvItem {
  id: string;
  code: string;
  description: string;
  category: ItemCategory;
  uom: string;
  hsn?: string;
  stdCost: number;
  reorder: number;
  maxLevel: number;
  tracking: TrackingMode;
  shelfLifeDays?: number;
  onHand: number;
  allocated: number;
  active: boolean;
  /** Owning project — blank means the item belongs to the common catalogue. */
  projectCode?: string;
}

export interface Store {
  id: string;
  code: string;
  name: string;
  type: "Central" | "Shop-floor" | "Bonded" | "Scrap" | "Project";
  location: string;
  manager: string;
  bins: number;
  capacityUsedPct: number;
  active: boolean;
}

export interface Bin {
  id: string;
  storeCode: string;
  code: string;
  zone: string;
  aisle: string;
  rack: string;
  level: string;
  itemCode?: string;
  qty: number;
  uom: string;
}

export interface StockRow {
  id: string;
  itemCode: string;
  description: string;
  storeCode: string;
  storeName: string;
  binCode?: string;
  projectCode?: string;
  qty: number;
  uom: string;
  value: number;
  status: "available" | "reserved" | "quality-hold" | "in-transit";
}

export interface BatchLot {
  id: string;
  itemCode: string;
  description: string;
  batchNo: string;
  serialFrom?: string;
  serialTo?: string;
  mfgDate: string;
  expiryDate?: string;
  vendorName?: string;
  qty: number;
  uom: string;
  storeCode: string;
  status: "available" | "expiring" | "expired" | "quarantined";
}

export type TransferStatus = "draft" | "requested" | "in-transit" | "received" | "cancelled";
export interface Transfer {
  id: string;
  code: string;
  type: "transfer" | "adjustment" | "issue" | "return" | "reallocation";
  itemCode: string;
  description: string;
  qty: number;
  uom: string;
  fromStore: string;
  toStore?: string;
  projectCode?: string;
  /** Project reallocation: cost moves from `fromProject` to `toProject`. */
  fromProject?: string;
  toProject?: string;
  /** Valuation of the moved quantity, used for the cost transfer journal. */
  value?: number;
  journalCode?: string;
  requestedBy: string;
  createdAt: string;
  status: TransferStatus;
  reason: string;
}

export type CountStatus = "planned" | "in-progress" | "reconciled" | "posted";
export interface CycleCount {
  id: string;
  code: string;
  storeCode: string;
  storeName: string;
  scheduledFor: string;
  auditor: string;
  status: CountStatus;
  itemsPlanned: number;
  itemsCounted: number;
  variancesFound: number;
  variancePct: number;
  varianceValue: number;
}

export interface InventoryState {
  items: InvItem[];
  stores: Store[];
  bins: Bin[];
  stock: StockRow[];
  batches: BatchLot[];
  transfers: Transfer[];
  counts: CycleCount[];
}
