import { useMemo } from "react";
import type { ComboOption } from "@/components/combobox-field";
import { usePlm } from "./store";
import { useProjectsStore } from "@/lib/projects/store";

/** Searchable dropdown sources shared by every Engineering form. */
export function useEngineeringOptions(): Record<string, ComboOption[]> {
  const items = usePlm((s) => s.items);
  const parts = usePlm((s) => s.parts);
  const bom = usePlm((s) => s.bom);
  const ecns = usePlm((s) => s.ecns);
  const ecrs = usePlm((s) => s.ecrs);
  const projects = useProjectsStore((s) => s.projects);

  return useMemo(() => {
    const plmItems: ComboOption[] = [
      ...items.map((i) => ({
        value: i.code,
        label: i.code,
        hint: `${i.name} · ${i.uom} · ${i.make_buy}`,
        patch: { itemName: i.name, uom: i.uom, rev: i.rev, procurement: i.make_buy },
      })),
      ...parts.map((p) => ({
        value: p.code,
        label: p.code,
        hint: `${p.name} · ${p.category}`,
        patch: { itemName: p.name },
      })),
    ];

    return {
      plmItems,
      projects: projects.map((p) => ({ value: p.code, label: p.code, hint: p.name })),
      bomRoots: bom
        .filter((n) => !n.parentId)
        .map((n) => ({ value: n.id, label: `${n.kind} · ${n.itemCode}`, hint: `${n.itemName} · Rev ${n.rev}` })),
      ecns: ecns.map((e) => ({ value: e.code, label: e.code, hint: e.title })),
      ecrs: ecrs.map((e) => ({ value: e.code, label: e.code, hint: e.title })),
    };
  }, [items, parts, bom, ecns, ecrs, projects]);
}
