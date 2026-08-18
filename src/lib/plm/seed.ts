import type { PlmState, Item, BomNode, DesignDoc, WorkOrder } from "./types";

const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

const ITEMS: Item[] = [
  { id: "i1", code: "FA-ASM-1001", name: "Body Side Weld Assembly", type: "Assembly", uom: "EA", rev: "B", stdCost: 145000, make_buy: "Make", lifecycle: "Production", createdAt: days(-200) },
  { id: "i2", code: "FA-SUB-2001", name: "A-Pillar Sub-assembly", type: "Sub-assembly", uom: "EA", rev: "A", stdCost: 42000, make_buy: "Make", lifecycle: "Production", createdAt: days(-180) },
  { id: "i3", code: "FA-SUB-2002", name: "B-Pillar Sub-assembly", type: "Sub-assembly", uom: "EA", rev: "A", stdCost: 38500, make_buy: "Make", lifecycle: "Production", createdAt: days(-180) },
  { id: "i4", code: "FA-CMP-3001", name: "Roof Rail Outer Panel", type: "Component", uom: "EA", rev: "B", stdCost: 8600, make_buy: "Buy", lifecycle: "Production", createdAt: days(-150) },
  { id: "i5", code: "FA-CMP-3002", name: "Rocker Reinforcement", type: "Component", uom: "EA", rev: "A", stdCost: 4200, make_buy: "Make", lifecycle: "Production", createdAt: days(-150) },
  { id: "i6", code: "FA-RAW-4001", name: "HSS Sheet 1.5mm", type: "Raw Material", uom: "KG", rev: "A", stdCost: 165, make_buy: "Buy", lifecycle: "Production", createdAt: days(-300) },
  { id: "i7", code: "FA-FST-5001", name: "M8 Weld Nut", type: "Component", uom: "EA", rev: "A", stdCost: 12, make_buy: "Buy", lifecycle: "Production", createdAt: days(-300) },
  { id: "i8", code: "FA-ASM-1002", name: "Underbody Assembly", type: "Assembly", uom: "EA", rev: "A", stdCost: 178000, make_buy: "Make", lifecycle: "Prototype", createdAt: days(-30) },
];

function buildBom(): BomNode[] {
  const nodes: BomNode[] = [];
  const rootA = uid();
  const rootB = uid();
  const rootA_m = uid();

  // EBOM for Body Side Weld
  nodes.push({ id: rootA, kind: "EBOM", itemCode: "FA-ASM-1001", itemName: "Body Side Weld Assembly", qty: 1, uom: "EA", rev: "B", rootId: rootA, projectCode: "PRJ-1021" });
  const aPillar = uid(); const bPillar = uid(); const roofRail = uid();
  nodes.push({ id: aPillar, kind: "EBOM", parentId: rootA, itemCode: "FA-SUB-2001", itemName: "A-Pillar Sub-assembly", qty: 1, uom: "EA", rev: "A", refDes: "LH+RH", rootId: rootA });
  nodes.push({ id: bPillar, kind: "EBOM", parentId: rootA, itemCode: "FA-SUB-2002", itemName: "B-Pillar Sub-assembly", qty: 1, uom: "EA", rev: "A", rootId: rootA });
  nodes.push({ id: roofRail, kind: "EBOM", parentId: rootA, itemCode: "FA-CMP-3001", itemName: "Roof Rail Outer Panel", qty: 2, uom: "EA", rev: "B", procurement: "Buy", rootId: rootA });
  nodes.push({ id: uid(), kind: "EBOM", parentId: aPillar, itemCode: "FA-CMP-3002", itemName: "Rocker Reinforcement", qty: 1, uom: "EA", rev: "A", rootId: rootA });
  nodes.push({ id: uid(), kind: "EBOM", parentId: aPillar, itemCode: "FA-RAW-4001", itemName: "HSS Sheet 1.5mm", qty: 2.4, uom: "KG", rev: "A", procurement: "Buy", rootId: rootA });
  nodes.push({ id: uid(), kind: "EBOM", parentId: bPillar, itemCode: "FA-RAW-4001", itemName: "HSS Sheet 1.5mm", qty: 3.1, uom: "KG", rev: "A", procurement: "Buy", rootId: rootA });
  nodes.push({ id: uid(), kind: "EBOM", parentId: bPillar, itemCode: "FA-FST-5001", itemName: "M8 Weld Nut", qty: 8, uom: "EA", rev: "A", procurement: "Buy", rootId: rootA });

  // EBOM for Underbody
  nodes.push({ id: rootB, kind: "EBOM", itemCode: "FA-ASM-1002", itemName: "Underbody Assembly", qty: 1, uom: "EA", rev: "A", rootId: rootB, projectCode: "PRJ-1024" });
  nodes.push({ id: uid(), kind: "EBOM", parentId: rootB, itemCode: "FA-CMP-3002", itemName: "Rocker Reinforcement", qty: 2, uom: "EA", rev: "A", rootId: rootB });
  nodes.push({ id: uid(), kind: "EBOM", parentId: rootB, itemCode: "FA-FST-5001", itemName: "M8 Weld Nut", qty: 24, uom: "EA", rev: "A", procurement: "Buy", rootId: rootB });

  // MBOM (mirrored with process items)
  nodes.push({ id: rootA_m, kind: "MBOM", itemCode: "FA-ASM-1001", itemName: "Body Side Weld Assembly", qty: 1, uom: "EA", rev: "B", rootId: rootA_m, projectCode: "PRJ-1021" });
  const mA = uid();
  nodes.push({ id: mA, kind: "MBOM", parentId: rootA_m, itemCode: "FA-SUB-2001", itemName: "A-Pillar Sub-assembly", qty: 1, uom: "EA", rev: "A", rootId: rootA_m });
  nodes.push({ id: uid(), kind: "MBOM", parentId: rootA_m, itemCode: "FA-SUB-2002", itemName: "B-Pillar Sub-assembly", qty: 1, uom: "EA", rev: "A", rootId: rootA_m });
  nodes.push({ id: uid(), kind: "MBOM", parentId: mA, itemCode: "FA-RAW-4001", itemName: "HSS Sheet 1.5mm", qty: 2.5, uom: "KG", rev: "A", procurement: "Buy", rootId: rootA_m });

  return nodes;
}


const DESIGN_DOCS: DesignDoc[] = [
  {
    id: "dd1", code: "DOC-0001", title: "Body Side Weld Assembly — General Arrangement",
    category: "CAD Drawing", projectCode: "PRJ-1021", itemCode: "FA-ASM-1001", owner: "K. Sharma",
    discipline: "Mechanical", status: "Released", version: "B", createdAt: days(-70), updatedAt: days(-40),
    size: "1.8 MB", notes: "Released for manufacturing after DR-401 sign-off.",
    versions: [
      { id: "v1", version: "A", at: days(-70), by: "K. Sharma", notes: "Initial issue", status: "Released", size: "1.6 MB" },
      { id: "v2", version: "B", at: days(-40), by: "K. Sharma", notes: "Roof rail thickness per ECN-2601", status: "Released", size: "1.8 MB" },
    ],
    audit: [
      { id: "a1", at: days(-70), by: "K. Sharma", action: "Created (Rev A)" },
      { id: "a2", at: days(-41), by: "N. Rao", action: "Approved Rev B" },
      { id: "a3", at: days(-40), by: "K. Sharma", action: "Released Rev B" },
    ],
  },
  {
    id: "dd2", code: "DOC-0002", title: "A-Pillar Structural Calculation Sheet",
    category: "Calculation", projectCode: "PRJ-1021", itemCode: "FA-SUB-2001", owner: "A. Menon",
    discipline: "Mechanical", status: "Approved", version: "A", createdAt: days(-55), updatedAt: days(-50),
    size: "640 KB",
    versions: [{ id: "v1", version: "A", at: days(-55), by: "A. Menon", notes: "CAE correlation attached", status: "Approved", size: "640 KB" }],
    audit: [{ id: "a1", at: days(-55), by: "A. Menon", action: "Created (Rev A)" }, { id: "a2", at: days(-50), by: "K. Sharma", action: "Approved Rev A" }],
  },
  {
    id: "dd3", code: "DOC-0003", title: "Underbody Fixture — Technical Specification",
    category: "Specification", projectCode: "PRJ-1024", itemCode: "FA-ASM-1002", ecrCode: "ECR-1803",
    owner: "R. Iyer", discipline: "Process", status: "Under Review", version: "A", createdAt: days(-8), updatedAt: days(-2),
    size: "1.1 MB", notes: "Awaiting Quality review on datum scheme.",
    versions: [{ id: "v1", version: "A", at: days(-8), by: "R. Iyer", notes: "First submission", status: "Under Review", size: "1.1 MB" }],
    audit: [{ id: "a1", at: days(-8), by: "R. Iyer", action: "Created (Rev A)" }, { id: "a2", at: days(-2), by: "P. Deshmukh", action: "Submitted for review" }],
  },
];

const WORK_ORDERS: WorkOrder[] = [
  {
    id: "wo1", code: "WO-5001", itemCode: "FA-SUB-2001", itemName: "A-Pillar Sub-assembly", qty: 4, uom: "EA",
    projectCode: "PRJ-1021", workCenter: "Weld Cell 1", plannedStart: days(-6), plannedEnd: days(8),
    status: "in-progress", estCost: 168000, reservedValue: 96000, createdAt: days(-7), source: "mbom-auto",
  },
  {
    id: "wo2", code: "WO-5002", itemCode: "FA-CMP-3002", itemName: "Rocker Reinforcement", qty: 8, uom: "EA",
    projectCode: "PRJ-1024", workCenter: "Press Shop", plannedStart: days(2), plannedEnd: days(14),
    status: "planned", estCost: 33600, reservedValue: 0, createdAt: days(-1), source: "mbom-auto",
  },
];

export function seed(): PlmState {
  return {
    items: ITEMS,
    parts: [
      { id: "pt1", code: "PT-BRK-101", name: "L-Bracket 60x40", category: "Mechanical", supplier: "Precision Fab", material: "MS", weight: 0.42, rev: "A", createdAt: days(-80) },
      { id: "pt2", code: "PT-SEN-201", name: "Proximity Sensor M18", category: "Electrical", supplier: "IFM Electronics", rev: "B", createdAt: days(-60) },
      { id: "pt3", code: "PT-CYL-301", name: "Pneumatic Cylinder 32/100", category: "Pneumatic", supplier: "SMC", rev: "A", createdAt: days(-90) },
      { id: "pt4", code: "PT-FST-401", name: "Hex Bolt M10x40", category: "Fastener", supplier: "TVS Fasteners", rev: "A", createdAt: days(-120) },
      { id: "pt5", code: "PT-VLV-501", name: "5/2 Solenoid Valve", category: "Pneumatic", supplier: "Festo", rev: "A", createdAt: days(-45) },
    ],
    drawings: [
      { id: "d1", number: "DWG-1001-B", title: "Body Side Weld Assembly — GA", itemCode: "FA-ASM-1001", rev: "B", format: "2D-PDF", size: "1.8 MB", uploadedBy: "K. Sharma", releasedAt: days(-40), status: "Released" },
      { id: "d2", number: "DWG-2001-A", title: "A-Pillar Sub-assembly", itemCode: "FA-SUB-2001", rev: "A", format: "3D-STEP", size: "12.4 MB", uploadedBy: "A. Menon", releasedAt: days(-70), status: "Released" },
      { id: "d3", number: "DWG-3002-A", title: "Rocker Reinforcement — Detail", itemCode: "FA-CMP-3002", rev: "A", format: "2D-DWG", size: "820 KB", uploadedBy: "A. Menon", releasedAt: days(-60), status: "Released" },
      { id: "d4", number: "DWG-1002-A", title: "Underbody Assembly — GA", itemCode: "FA-ASM-1002", rev: "A", format: "2D-PDF", size: "2.1 MB", uploadedBy: "K. Sharma", releasedAt: days(-6), status: "Under Review" },
      { id: "d5", number: "DWG-3001-B", title: "Roof Rail Panel — Formed", itemCode: "FA-CMP-3001", rev: "B", format: "3D-CATIA", size: "18.2 MB", uploadedBy: "K. Sharma", releasedAt: days(-2), status: "In Work" },
    ],
    bom: buildBom(),
    ecns: [
      { id: "e1", code: "ECN-2601", title: "Roof Rail thickness increase 1.5→1.8mm", itemCode: "FA-CMP-3001", fromRev: "A", toRev: "B", reason: "NVH improvement per customer test", effectivity: days(10), status: "approved", raisedBy: "K. Sharma", createdAt: days(-14) },
      { id: "e2", code: "ECN-2602", title: "B-Pillar weld pitch change", itemCode: "FA-SUB-2002", fromRev: "A", toRev: "B", reason: "Improved fatigue life", effectivity: days(20), status: "pending", raisedBy: "A. Menon", createdAt: days(-4) },
      { id: "e3", code: "ECN-2603", title: "M8 Weld Nut supplier change", itemCode: "FA-FST-5001", fromRev: "A", toRev: "B", reason: "Cost reduction 12%", effectivity: days(30), status: "draft", raisedBy: "P. Gupta", createdAt: days(-1) },
    ],
    ecrs: [
      { id: "r1", code: "ECR-1801", title: "Simplify Rocker Reinforcement geometry", itemCode: "FA-CMP-3002", description: "Reduce weld count from 12 to 8 through geometry simplification.", priority: "High", status: "under-review", raisedBy: "Production", createdAt: days(-8) },
      { id: "r2", code: "ECR-1802", title: "Add lightening holes to A-Pillar", itemCode: "FA-SUB-2001", description: "Weight reduction target 400g. Requires CAE re-validation.", priority: "Medium", status: "approved", raisedBy: "Engineering", createdAt: days(-20), linkedEcn: "ECN-2601" },
      { id: "r3", code: "ECR-1803", title: "Improve tolerance on Underbody GA", itemCode: "FA-ASM-1002", description: "Downstream assembly reports fitment issues.", priority: "Critical", status: "draft", raisedBy: "Quality", createdAt: days(-2) },
    ],
    reviews: [
      { id: "dr1", code: "DR-401", title: "Body Side Weld — Rev B Design Review", itemCode: "FA-ASM-1001", reviewers: ["K. Sharma", "N. Rao", "V. Nair"], scheduled: days(-10), outcome: "Passed with Actions", actions: 3 },
      { id: "dr2", code: "DR-402", title: "Underbody Assembly — Concept Review", itemCode: "FA-ASM-1002", reviewers: ["K. Sharma", "A. Menon"], scheduled: days(4), outcome: "Pending", actions: 0 },
      { id: "dr3", code: "DR-403", title: "Roof Rail — Rev B Sign-off", itemCode: "FA-CMP-3001", reviewers: ["K. Sharma", "V. Menon"], scheduled: days(-3), outcome: "Passed", actions: 0 },
    ],
    designDocs: DESIGN_DOCS,
    workOrders: WORK_ORDERS,
    bomImports: [],

  };
}
