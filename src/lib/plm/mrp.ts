/**
 * Engineering → Supply automation engine.
 *
 * Explodes an EBOM/MBOM structure, nets demand against live inventory,
 * reserved stock and open purchase orders, then automatically raises
 * Purchase Requisitions for Buy shortages and Manufacturing Work Orders
 * (with material reservations) for Make items.
 *
 * Everything is deterministic and reads from the live demo stores, so the
 * numbers shown in the UI are always reproducible.
 */
import { plmStore, upsertPlm } from "./store";
import type { BomNode, PlmState } from "./types";
import { inventory } from "@/lib/inventory/store";
import { procurement, upsertProcurement } from "@/lib/procurement/store";
import { projectsStore } from "@/lib/projects/store";

export interface ExplodedLine {
  nodeId: string;
  level: number;
  itemCode: string;
  itemName: string;
  uom: string;
  qtyPer: number;
  /** qty multiplied through every parent level */
  extendedQty: number;
  sourcing: "Make" | "Buy";
  stdCost: number;
  extendedCost: number;
}

export interface AvailabilityLine extends ExplodedLine {
  onHand: number;
  reserved: number;
  openPo: number;
  available: number;
  shortage: number;
  inItemMaster: boolean;
  leadTimeDays: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Explosion                                                           */
/* ------------------------------------------------------------------ */

export function explodeBom(s: PlmState, rootId: string, topQty = 1): ExplodedLine[] {
  const nodes = s.bom.filter((n) => n.rootId === rootId);
  const root = nodes.find((n) => n.id === rootId) ?? nodes.find((n) => !n.parentId);
  if (!root) return [];
  const out: ExplodedLine[] = [];

  const itemOf = (code: string) => s.items.find((i) => i.code === code);

  const walk = (node: BomNode, level: number, multiplier: number) => {
    const item = itemOf(node.itemCode);
    const sourcing: "Make" | "Buy" = node.procurement ?? item?.make_buy ?? "Buy";
    const extendedQty = round(node.qty * multiplier);
    const stdCost = item?.stdCost ?? 0;
    if (level > 0) {
      out.push({
        nodeId: node.id,
        level,
        itemCode: node.itemCode,
        itemName: node.itemName,
        uom: node.uom,
        qtyPer: node.qty,
        extendedQty,
        sourcing,
        stdCost,
        extendedCost: Math.round(extendedQty * stdCost),
      });
    }
    nodes.filter((c) => c.parentId === node.id).forEach((c) => walk(c, level + 1, extendedQty));
  };

  walk(root, 0, topQty);
  return out;
}

/** Collapse an explosion to one row per item code. */
export function netDemand(lines: ExplodedLine[]): ExplodedLine[] {
  const bag = new Map<string, ExplodedLine>();
  for (const l of lines) {
    const prev = bag.get(l.itemCode);
    if (prev) {
      prev.extendedQty = round(prev.extendedQty + l.extendedQty);
      prev.extendedCost += l.extendedCost;
    } else bag.set(l.itemCode, { ...l });
  }
  return [...bag.values()];
}

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

function normalise(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Match a BOM item to the inventory item master by code, then by description. */
export function resolveInventoryItem(itemCode: string, itemName: string) {
  const inv = inventory.get();
  const byCode = inv.items.find((i) => i.code.toLowerCase() === itemCode.toLowerCase());
  if (byCode) return byCode;
  const target = normalise(itemName);
  return inv.items.find((i) => normalise(i.description) === target);
}

export function availability(lines: ExplodedLine[]): AvailabilityLine[] {
  const inv = inventory.get();
  const proc = procurement.get();

  return lines.map((l) => {
    const item = resolveInventoryItem(l.itemCode, l.itemName);
    const onHand = item?.onHand ?? 0;
    const reserved = item?.allocated ?? 0;
    const openPo = item
      ? proc.pos
          .filter((p) => !["closed", "cancelled", "received"].includes(p.status))
          .flatMap((p) => p.lines)
          .filter((pl) => pl.itemCode === item.code)
          .reduce((a, pl) => a + Math.max(0, pl.qty - pl.receivedQty), 0)
      : 0;
    const available = Math.max(0, onHand - reserved);
    const shortage = round(Math.max(0, l.extendedQty - available - openPo));
    const vendorLead = proc.vendors.length
      ? Math.round(proc.vendors.reduce((a, v) => a + v.leadTimeDays, 0) / proc.vendors.length)
      : 21;
    return {
      ...l,
      onHand,
      reserved,
      openPo,
      available,
      shortage,
      inItemMaster: !!item,
      leadTimeDays: l.sourcing === "Buy" ? vendorLead : 10,
    };
  });
}

/** Full availability picture for one BOM structure. */
export function bomAvailability(s: PlmState, rootId: string, topQty = 1): AvailabilityLine[] {
  return availability(netDemand(explodeBom(s, rootId, topQty)));
}

/* ------------------------------------------------------------------ */
/* Automation                                                          */
/* ------------------------------------------------------------------ */

export interface SourcingResult {
  prCode?: string;
  prLines: number;
  prValue: number;
  workOrders: string[];
  reservedValue: number;
  notifications: string[];
  skipped: string[];
}

function nextSeq(prefix: string, existing: string[]) {
  const nums = existing
    .map((c) => Number(String(c).replace(/\D+/g, "")))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 2400) + 1;
  return `${prefix}-${next}`;
}

/** Reserve stock for a Make work order — bumps allocation on the item master. */
function reserveMaterial(itemCode: string, itemName: string, qty: number, projectCode?: string) {
  const item = resolveInventoryItem(itemCode, itemName);
  if (!item) return 0;
  let value = 0;
  inventory.update((s) => {
    const it = s.items.find((i) => i.id === item.id);
    if (!it) return;
    const canReserve = Math.max(0, Math.min(qty, it.onHand - it.allocated));
    if (canReserve <= 0) return;
    it.allocated = round(it.allocated + canReserve);
    value = Math.round(canReserve * it.stdCost);
    const row = s.stock.find((r) => r.itemCode === it.code && r.status === "available");
    if (row) {
      row.status = "reserved";
      if (projectCode) row.projectCode = projectCode;
    }
  });
  return value;
}

/** Create the inventory item-master record for a BOM item that has none. */
function ensureItemMaster(line: AvailabilityLine) {
  if (line.inItemMaster) return false;
  const category =
    line.sourcing === "Make" ? "Component" : line.itemName.toLowerCase().includes("sheet") || line.itemName.toLowerCase().includes("plate") ? "Raw Material" : "Component";
  inventory.update((s) => {
    if (s.items.some((i) => i.code === line.itemCode)) return;
    s.items = [
      {
        id: crypto.randomUUID(),
        code: line.itemCode,
        description: line.itemName,
        category: category as (typeof s.items)[number]["category"],
        uom: line.uom,
        stdCost: line.stdCost,
        reorder: Math.ceil(line.extendedQty),
        maxLevel: Math.ceil(line.extendedQty * 4),
        tracking: "none" as (typeof s.items)[number]["tracking"],
        onHand: 0,
        allocated: 0,
        active: true,
      },
      ...s.items,
    ];
  });
  return true;
}

/**
 * Run sourcing for a BOM structure:
 *  • Buy shortages  → one Purchase Requisition routed for approval
 *  • Make lines     → Manufacturing Work Orders + material reservation
 */
export function runBomSourcing(
  rootId: string,
  opts: { projectCode?: string; topQty?: number; requestedBy?: string } = {},
): SourcingResult {
  const s = plmStore.get();
  const root = s.bom.find((n) => n.id === rootId);
  const projectCode = opts.projectCode ?? root?.projectCode;
  const requestedBy = opts.requestedBy ?? "Engineering";
  const rows = bomAvailability(s, rootId, opts.topQty ?? 1);

  const result: SourcingResult = {
    prLines: 0,
    prValue: 0,
    workOrders: [],
    reservedValue: 0,
    notifications: [],
    skipped: [],
  };

  /* ---- Buy: raise a PR for shortages ---- */
  const buyShort = rows.filter((r) => r.sourcing === "Buy" && r.shortage > 0);
  rows.filter((r) => !r.inItemMaster).forEach((r) => {
    if (ensureItemMaster(r)) result.skipped.push(r.itemCode);
  });
  if (result.skipped.length) {
    result.notifications.push(
      `${result.skipped.length} BOM item(s) were missing from the inventory item master and have been created automatically.`,
    );
  }

  if (buyShort.length) {
    const proc = procurement.get();
    const code = nextSeq("PR", proc.requisitions.map((r) => r.code));
    const needBy = new Date(Date.now() + 21 * 86400000).toISOString();
    const lines = buyShort.map((r) => ({
      id: crypto.randomUUID(),
      itemCode: r.itemCode,
      description: r.itemName,
      qty: r.shortage,
      uom: r.uom,
      estRate: r.stdCost,
      needBy,
    }));
    const totalEst = lines.reduce((a, l) => a + l.qty * l.estRate, 0);
    upsertProcurement("requisitions", {
      code,
      title: `${root?.itemCode ?? "BOM"} — engineering material shortage`,
      projectCode,
      requestedBy,
      department: "Engineering",
      needBy,
      priority: totalEst > 1000000 ? "critical" : "high",
      status: "pending",
      approver: "V. Rao (Head - Purchase)",
      totalEst: Math.round(totalEst),
      lines,
      notes: `Auto-generated from ${root?.kind ?? "BOM"} ${root?.itemCode ?? ""} (Rev ${root?.rev ?? "-"}).`,
    });
    result.prCode = code;
    result.prLines = lines.length;
    result.prValue = Math.round(totalEst);
    result.notifications.push(
      `Procurement notified — ${code} routed to V. Rao for approval (${lines.length} lines, ₹${Math.round(totalEst).toLocaleString("en-IN")}).`,
    );
  }

  /* ---- Make: create work orders + reserve material ---- */
  const makeLines = rows.filter((r) => r.sourcing === "Make");
  for (const m of makeLines) {
    const existing = plmStore
      .get()
      .workOrders.find((w) => w.itemCode === m.itemCode && w.bomRootId === rootId && w.status !== "cancelled");
    if (existing) continue;
    const wos = plmStore.get().workOrders.map((w) => w.code);
    const code = nextSeq("WO", wos.length ? wos : ["WO-5000"]);
    const reserved = reserveMaterial(m.itemCode, m.itemName, m.extendedQty, projectCode);
    result.reservedValue += reserved;
    upsertPlm("workOrders", {
      code,
      itemCode: m.itemCode,
      itemName: m.itemName,
      qty: m.extendedQty,
      uom: m.uom,
      projectCode,
      bomRootId: rootId,
      bomNodeId: m.nodeId,
      workCenter: m.itemName.toLowerCase().includes("weld") ? "Weld Cell 1" : "Assembly Line",
      plannedStart: new Date(Date.now() + 2 * 86400000).toISOString(),
      plannedEnd: new Date(Date.now() + 16 * 86400000).toISOString(),
      status: "planned",
      estCost: m.extendedCost,
      reservedValue: reserved,
      source: "mbom-auto",
    });
    result.workOrders.push(code);
  }
  if (result.workOrders.length) {
    result.notifications.push(
      `Manufacturing notified — ${result.workOrders.length} work order(s) planned, ₹${result.reservedValue.toLocaleString("en-IN")} material reserved.`,
    );
  }

  if (projectCode) {
    result.notifications.push(`Project ${projectCode} budget commitments updated in the Cost 360 view.`);
  }
  if (!result.prCode && !result.workOrders.length) {
    result.notifications.push("No action required — every BOM line is covered by stock or open orders.");
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* EBOM → MBOM generation                                              */
/* ------------------------------------------------------------------ */

/** Clone an approved EBOM structure into an MBOM, applying manufacturing rules. */
export function generateMbomFromEbom(rootId: string, scrapPct = 3): { rootId: string; nodes: number } | { error: string } {
  const s = plmStore.get();
  const src = s.bom.filter((n) => n.rootId === rootId && n.kind === "EBOM");
  if (!src.length) return { error: "Not an EBOM structure." };
  const root = src.find((n) => !n.parentId);
  if (!root) return { error: "EBOM root missing." };

  const already = s.bom.find(
    (n) => n.kind === "MBOM" && !n.parentId && n.itemCode === root.itemCode && n.rev === root.rev,
  );
  if (already) return { error: `MBOM for ${root.itemCode} Rev ${root.rev} already exists.` };

  const idMap = new Map<string, string>();
  const newRootId = crypto.randomUUID();
  idMap.set(root.id, newRootId);
  const created: BomNode[] = [];
  const order = [...src].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));

  const push = (n: BomNode) => {
    const id = idMap.get(n.id) ?? crypto.randomUUID();
    idMap.set(n.id, id);
    const isConsumed = !src.some((c) => c.parentId === n.id);
    created.push({
      ...n,
      id,
      kind: "MBOM",
      rootId: newRootId,
      parentId: n.parentId ? idMap.get(n.parentId) : undefined,
      // manufacturing rule: add scrap allowance to consumed material
      qty: n.parentId && isConsumed ? round(n.qty * (1 + scrapPct / 100)) : n.qty,
    });
  };

  // breadth-first so parents always get an id first
  const queue: BomNode[] = [root];
  const seen = new Set<string>();
  while (queue.length) {
    const n = queue.shift()!;
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    push(n);
    src.filter((c) => c.parentId === n.id).forEach((c) => queue.push(c));
  }
  void order;

  plmStore.update((st) => {
    st.bom = [...created, ...st.bom];
  });
  return { rootId: newRootId, nodes: created.length };
}

/* ------------------------------------------------------------------ */
/* Traceability                                                        */
/* ------------------------------------------------------------------ */

export interface TraceLink {
  stage: string;
  reference: string;
  detail: string;
  status?: string;
  value?: number;
}

/** End-to-end chain: Project → Design → BOM → PR → PO → GRN → Inventory → WO → Cost. */
export function traceBom(rootId: string): TraceLink[] {
  const s = plmStore.get();
  const root = s.bom.find((n) => n.id === rootId);
  if (!root) return [];
  const projectCode = root.projectCode;
  const proc = procurement.get();
  const inv = inventory.get();
  const project = projectsStore.get().projects.find((p) => p.code === projectCode);
  const links: TraceLink[] = [];

  if (project) {
    links.push({ stage: "Project", reference: project.code, detail: project.name, status: project.status, value: project.value });
  }
  s.designDocs
    .filter((d) => (projectCode && d.projectCode === projectCode) || d.itemCode === root.itemCode)
    .forEach((d) => links.push({ stage: "Design", reference: d.code, detail: `${d.title} (Rev ${d.version})`, status: d.status }));

  links.push({
    stage: root.kind,
    reference: root.itemCode,
    detail: `${root.itemName} · Rev ${root.rev}`,
    status: `${s.bom.filter((n) => n.rootId === rootId).length} lines`,
  });

  s.ecns
    .filter((e) => e.itemCode === root.itemCode)
    .forEach((e) => links.push({ stage: "Change", reference: e.code, detail: e.title, status: e.status }));

  proc.requisitions
    .filter((r) => r.projectCode === projectCode)
    .forEach((r) => links.push({ stage: "Requisition", reference: r.code, detail: r.title, status: r.status, value: r.totalEst }));

  proc.pos
    .filter((p) => p.projectCode === projectCode)
    .forEach((p) => links.push({ stage: "Purchase Order", reference: p.code, detail: p.vendorName, status: p.status, value: p.amount }));

  const poCodes = new Set(proc.pos.filter((p) => p.projectCode === projectCode).map((p) => p.code));
  proc.grns
    .filter((g) => poCodes.has(g.poCode))
    .forEach((g) => links.push({ stage: "Goods Receipt", reference: g.code, detail: `${g.vendorName} · ${g.poCode}`, status: g.status, value: g.amount }));

  inv.stock
    .filter((r) => r.projectCode === projectCode)
    .forEach((r) => links.push({ stage: "Inventory", reference: r.itemCode, detail: `${r.qty} ${r.uom} @ ${r.storeName}`, status: r.status, value: r.value }));

  s.workOrders
    .filter((w) => w.bomRootId === rootId || w.projectCode === projectCode)
    .forEach((w) => links.push({ stage: "Manufacturing", reference: w.code, detail: `${w.itemName} × ${w.qty}`, status: w.status, value: w.estCost }));

  inv.transfers
    .filter((t) => t.projectCode === projectCode && t.type === "issue")
    .forEach((t) => links.push({ stage: "Consumption", reference: t.code, detail: `${t.description} × ${t.qty}`, status: t.status }));

  return links;
}
