/**
 * Project-to-project inventory reallocation.
 *
 * Unconsumed stock tagged to one project can be moved to another. The physical
 * quantity is retagged, the value is transferred between the two projects and
 * finance posts the matching cost-transfer journal + budget adjustment.
 */

import { inventory } from "./store";
import type { InventoryState, StockRow } from "./types";
import { fireFinanceEvent } from "@/lib/finance/emit";

export interface ReallocationInput {
  stockId: string;
  toProject: string;
  qty: number;
  reason: string;
  requestedBy?: string;
}

export interface ReallocationCheck {
  issues: string[];
  warnings: string[];
  /** Value of the quantity being moved, at the item's standard cost. */
  value: number;
  rate: number;
  available: number;
  row?: StockRow;
}

const NON_MOVABLE: Record<string, string> = {
  "quality-hold": "Stock is on quality hold — release it before reallocating.",
  "in-transit": "Stock is already in transit on another document.",
};

export function rateFor(s: InventoryState, itemCode: string, row?: StockRow) {
  const item = s.items.find((i) => i.code === itemCode);
  if (item?.stdCost) return item.stdCost;
  if (row && row.qty > 0) return Math.round(row.value / row.qty);
  return 0;
}

/** Stock lines that can take part in a project reallocation. */
export function reallocatableStock(s: InventoryState = inventory.get()): StockRow[] {
  return s.stock.filter((r) => Boolean(r.projectCode) && r.qty > 0 && !NON_MOVABLE[r.status]);
}

export function validateReallocation(
  input: Partial<ReallocationInput>,
  s: InventoryState = inventory.get(),
): ReallocationCheck {
  const issues: string[] = [];
  const warnings: string[] = [];
  const row = s.stock.find((r) => r.id === input.stockId);

  if (!row) {
    return { issues: ["Select a project-tagged stock line to reallocate."], warnings, value: 0, rate: 0, available: 0 };
  }

  const rate = rateFor(s, row.itemCode, row);
  const available = row.qty;
  const qty = Number(input.qty ?? 0);

  if (!row.projectCode) issues.push("This stock line is not tagged to a project.");
  if (NON_MOVABLE[row.status]) issues.push(NON_MOVABLE[row.status] as string);
  if (!input.toProject) issues.push("Choose the destination project.");
  if (input.toProject && input.toProject === row.projectCode)
    issues.push("Destination project must differ from the source project.");
  if (!qty || qty <= 0) issues.push("Enter the quantity to reallocate.");
  if (qty > available) issues.push(`Only ${available} ${row.uom} available on ${row.projectCode}.`);
  if (!String(input.reason ?? "").trim()) issues.push("A reason is mandatory for reallocation.");
  if (!rate) warnings.push("No standard cost on the item — the cost transfer will post as zero.");
  if (row.status === "reserved")
    warnings.push("Stock is reserved — confirm it is not committed to an open work order.");

  return { issues, warnings, value: Math.round(qty * rate), rate, available, row };
}

export interface ReallocationResult {
  ok: boolean;
  message: string;
  transferCode?: string;
}

/**
 * Execute the reallocation: split/retag the stock, record a `reallocation`
 * transfer and fire the finance cost-transfer event.
 */
export function executeReallocation(input: ReallocationInput): ReallocationResult {
  const check = validateReallocation(input);
  if (check.issues.length || !check.row) return { ok: false, message: check.issues[0] ?? "Invalid reallocation" };

  const source = check.row;
  const fromProject = source.projectCode as string;
  const qty = Number(input.qty);
  const value = check.value;
  let transferCode = "";

  inventory.update((s) => {
    const row = s.stock.find((r) => r.id === source.id);
    if (!row) return;

    // Move the quantity to a destination-project line in the same store/bin.
    const target = s.stock.find(
      (r) =>
        r.id !== row.id &&
        r.itemCode === row.itemCode &&
        r.storeCode === row.storeCode &&
        r.projectCode === input.toProject &&
        r.status === row.status,
    );

    row.qty -= qty;
    row.value = Math.max(0, Math.round(row.qty * check.rate));

    if (target) {
      target.qty += qty;
      target.value = Math.round(target.qty * check.rate);
    } else {
      s.stock = [
        {
          id: crypto.randomUUID(),
          itemCode: row.itemCode,
          description: row.description,
          storeCode: row.storeCode,
          storeName: row.storeName,
          binCode: row.binCode,
          projectCode: input.toProject,
          qty,
          uom: row.uom,
          value,
          status: row.status,
        },
        ...s.stock,
      ];
    }

    if (row.qty <= 0) s.stock = s.stock.filter((r) => r.id !== row.id);

    const nums = s.transfers
      .map((t) => Number(t.code.replace(/\D+/g, "")))
      .filter((n) => Number.isFinite(n) && n > 0);
    transferCode = `RAL-${(nums.length ? Math.max(...nums) : 9000) + 1}`;

    s.transfers = [
      {
        id: crypto.randomUUID(),
        code: transferCode,
        type: "reallocation",
        itemCode: source.itemCode,
        description: source.description,
        qty,
        uom: source.uom,
        fromStore: source.storeCode,
        toStore: source.storeCode,
        projectCode: input.toProject,
        fromProject,
        toProject: input.toProject,
        value,
        requestedBy: input.requestedBy || "Stores",
        createdAt: new Date().toISOString(),
        status: "received",
        reason: input.reason,
      },
      ...s.transfers,
    ];
  });

  fireFinanceEvent({
    type: "inventory.reallocated",
    transferCode,
    fromProject,
    toProject: input.toProject,
    itemCode: source.itemCode,
    qty,
    value,
  });

  return {
    ok: true,
    transferCode,
    message: `${qty} ${source.uom} of ${source.itemCode} moved from ${fromProject} to ${input.toProject}`,
  };
}
