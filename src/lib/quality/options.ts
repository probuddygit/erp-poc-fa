import { useMemo } from "react";
import type { ComboOption } from "@/components/combobox-field";
import { useQuality } from "./store";
import { useInventory } from "@/lib/inventory/store";
import { useProcurement } from "@/lib/procurement/store";
import { useProjectsStore } from "@/lib/projects/store";

/** Searchable lookups shared by every quality sub-module form. */
export function useQualityOptions(): Record<string, ComboOption[]> {
  const checklists = useQuality((s) => s.checklists);
  const inspections = useQuality((s) => s.inspections);
  const ncrs = useQuality((s) => s.ncrs);
  const gauges = useQuality((s) => s.gauges);
  const capas = useQuality((s) => s.capas);
  const items = useInventory((s) => s.items);
  const vendors = useProcurement((s) => s.vendors);
  const projects = useProjectsStore((s) => s.projects);

  return useMemo(() => {
    const people = Array.from(
      new Set([
        ...checklists.map((c) => c.owner),
        ...inspections.map((i) => i.inspector),
        ...ncrs.map((n) => n.raisedBy),
        ...capas.map((c) => c.owner),
        ...gauges.map((g) => g.owner),
      ]),
    ).filter(Boolean);

    return {
      items: items.map((i) => ({
        value: i.code,
        label: i.code,
        hint: `${i.description} · ${i.uom}`,
        patch: { itemDescription: i.description, uom: i.uom },
      })),
      vendors: vendors
        .filter((v) => v.active !== false)
        .map((v) => ({ value: v.name, label: v.name, hint: `${v.code} · ${v.category}` })),
      projects: projects.map((p) => ({
        value: p.code,
        label: p.code,
        hint: `${p.name} · ${p.customerName}`,
      })),
      inspectors: people.map((p) => ({ value: p, label: p })),
      checklists: checklists
        .filter((c) => c.status !== "obsolete")
        .map((c) => ({
          value: c.code,
          label: c.code,
          hint: `${c.title} · ${c.revision}`,
          patch: {
            stage: c.stage,
            ...(c.itemCode ? { itemCode: c.itemCode } : {}),
            ...(c.itemDescription ? { itemDescription: c.itemDescription } : {}),
          },
        })),
      ncrs: ncrs.map((n) => ({
        value: n.code,
        label: n.code,
        hint: `${n.itemCode} · ${n.severity}`,
      })),
      gauges: gauges.map((g) => ({
        value: g.name,
        label: g.name,
        hint: `${g.code} · ${g.type}`,
      })),
    };
  }, [checklists, inspections, ncrs, capas, gauges, items, vendors, projects]);
}
