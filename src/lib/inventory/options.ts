import { useMemo } from "react";
import type { ComboOption } from "@/components/combobox-field";
import { useInventory } from "./store";
import { useMasterList } from "@/lib/mdm/store";
import { useProcurement } from "@/lib/procurement/store";
import { useProjectsStore } from "@/lib/projects/store";

/** Fallback HSN catalogue used when the HSN master has no approved records yet. */
const HSN_FALLBACK: Array<{ hsn: string; description: string; gst: number }> = [
  { hsn: "7208", description: "Flat-rolled iron / non-alloy steel products", gst: 18 },
  { hsn: "7318", description: "Screws, bolts, nuts and fasteners of iron or steel", gst: 18 },
  { hsn: "8311", description: "Welding wire, rods and coated electrodes", gst: 18 },
  { hsn: "2804", description: "Industrial gases — argon, hydrogen, rare gases", gst: 18 },
  { hsn: "3824", description: "Prepared chemical products for industry", gst: 18 },
  { hsn: "8504", description: "Electrical transformers, converters and drives", gst: 18 },
  { hsn: "8544", description: "Insulated wire, cable and connectors", gst: 18 },
  { hsn: "8479", description: "Machines with individual functions — automation cells", gst: 18 },
  { hsn: "8428", description: "Lifting, handling and conveying machinery", gst: 18 },
  { hsn: "9031", description: "Measuring / checking instruments and gauges", gst: 18 },
  { hsn: "9954", description: "Construction and erection services (SAC)", gst: 18 },
  { hsn: "9987", description: "Maintenance, repair and installation services (SAC)", gst: 18 },
];

export interface InventoryOptions extends Record<string, ComboOption[]> {
  items: ComboOption[];
  storeCodes: ComboOption[];
  storeNames: ComboOption[];
  fromStores: ComboOption[];
  toStores: ComboOption[];
  bins: ComboOption[];
  projects: ComboOption[];
  vendors: ComboOption[];
  hsn: ComboOption[];
}

/**
 * Every searchable lookup used across the inventory sub-modules, always derived
 * from the live master data so transactions stay referentially consistent.
 */
export function useInventoryOptions(): InventoryOptions {
  const items = useInventory((s) => s.items);
  const stores = useInventory((s) => s.stores);
  const bins = useInventory((s) => s.bins);
  const vendors = useProcurement((s) => s.vendors);
  const projects = useProjectsStore((s) => s.projects);
  const hsnRecords = useMasterList("hsn-codes");

  return useMemo(() => {
    const itemOpts: ComboOption[] = items
      .filter((i) => i.active !== false)
      .map((i) => ({
        value: i.code,
        label: i.code,
        hint: `${i.description} · ${i.uom}`,
        patch: {
          description: i.description,
          uom: i.uom,
          hsn: i.hsn,
          stdCost: i.stdCost,
        },
      }));

    const storeCodeOpts: ComboOption[] = stores
      .filter((s) => s.active !== false)
      .map((s) => ({
        value: s.code,
        label: s.code,
        hint: `${s.name} · ${s.type}`,
        patch: { storeName: s.name },
      }));

    const plainStoreOpts: ComboOption[] = stores
      .filter((s) => s.active !== false)
      .map((s) => ({ value: s.code, label: s.code, hint: `${s.name} · ${s.location}` }));

    const storeNameOpts: ComboOption[] = stores
      .filter((s) => s.active !== false)
      .map((s) => ({
        value: s.name,
        label: s.name,
        hint: `${s.code} · ${s.type}`,
        patch: { storeCode: s.code },
      }));

    const binOpts: ComboOption[] = bins.map((b) => ({
      value: b.code,
      label: b.code,
      hint: `${b.storeCode}${b.itemCode ? ` · ${b.itemCode}` : ""}`,
      patch: { storeCode: b.storeCode },
    }));

    const projectOpts: ComboOption[] = projects.map((p) => ({
      value: p.code,
      label: p.code,
      hint: `${p.name} · ${p.customerName}`,
    }));

    const vendorOpts: ComboOption[] = vendors
      .filter((v) => v.active !== false)
      .map((v) => ({ value: v.name, label: v.name, hint: `${v.code} · ${v.category}` }));

    const fromMaster: ComboOption[] = hsnRecords.map((r) => {
      const code = String(r.data.hsn ?? r.code);
      const desc = String(r.data.description ?? "");
      const rate = r.data.gst_rate;
      return {
        value: code,
        label: code,
        hint: [desc, rate !== undefined && rate !== null ? `GST ${rate}%` : ""].filter(Boolean).join(" · "),
      };
    });

    const seen = new Set(fromMaster.map((o) => o.value));
    const fallback = HSN_FALLBACK.filter((h) => !seen.has(h.hsn)).map((h) => ({
      value: h.hsn,
      label: h.hsn,
      hint: `${h.description} · GST ${h.gst}%`,
    }));

    return {
      items: itemOpts,
      storeCodes: storeCodeOpts,
      storeNames: storeNameOpts,
      fromStores: plainStoreOpts,
      toStores: plainStoreOpts,
      bins: binOpts,
      projects: projectOpts,
      vendors: vendorOpts,
      hsn: [...fromMaster, ...fallback],
    };
  }, [items, stores, bins, vendors, projects, hsnRecords]);
}
