import { useMemo } from "react";
import type { ComboOption } from "@/components/combobox-field";
import { useMfg } from "./store";
import { usePlm } from "@/lib/plm/store";
import { useProjectsStore } from "@/lib/projects/store";

/** Searchable dropdown sources shared by every Manufacturing form. */
export function useManufacturingOptions(): Record<string, ComboOption[]> {
  const routings = useMfg((s) => s.routings);
  const workCenters = useMfg((s) => s.workCenters);
  const orders = useMfg((s) => s.orders);
  const items = usePlm((s) => s.items);
  const bom = usePlm((s) => s.bom);
  const projects = useProjectsStore((s) => s.projects);

  return useMemo(
    () => ({
      routings: routings.map((r) => ({
        value: r.code,
        label: r.code,
        hint: `${r.itemName} · Rev ${r.rev}`,
        patch: { itemCode: r.itemCode, itemName: r.itemName },
      })),
      workCenters: workCenters.map((w) => ({ value: w.code, label: w.code, hint: `${w.name} · ₹${w.hourlyRate}/hr` })),
      orders: orders.map((o) => ({ value: o.code, label: o.code, hint: `${o.itemName} · ${o.qty} ${o.uom}` })),
      plmItems: items.map((i) => ({
        value: i.code,
        label: i.code,
        hint: `${i.name} · ${i.uom}`,
        patch: { itemName: i.name, uom: i.uom },
      })),
      bomRoots: bom
        .filter((n) => !n.parentId)
        .map((n) => ({ value: n.id, label: `${n.kind} · ${n.itemCode}`, hint: n.itemName })),
      projects: projects.map((p) => ({ value: p.code, label: p.code, hint: p.name })),
    }),
    [routings, workCenters, orders, items, bom, projects],
  );
}
