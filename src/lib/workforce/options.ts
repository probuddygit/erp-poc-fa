import { useMemo } from "react";
import type { ComboOption } from "@/components/combobox-field";
import { useHR } from "@/lib/hr/store";
import { useWorkforce } from "./store";

/** Live searchable lookups for every Workforce & Administration form. */
export function useWorkforceOptions(): Record<string, ComboOption[]> {
  const employees = useHR((s) => s.employees);
  const w = useWorkforce((s) => s);

  return useMemo(() => {
    const opt = (arr: { id: string }[], label: (r: Record<string, unknown>) => string, hint?: (r: Record<string, unknown>) => string) =>
      arr.map((r) => {
        const rec = r as unknown as Record<string, unknown>;
        return { value: String(rec.code ?? r.id), label: label(rec), hint: hint?.(rec) };
      });

    return {
      employees: employees.map((e) => ({ value: e.id, label: e.name, hint: `${e.code} · ${e.designation}` })),
      approvers: employees.map((e) => ({ value: e.name, label: e.name, hint: e.designation })),
      departments: Array.from(new Set(employees.map((e) => e.department))).map((d) => ({ value: d, label: d })),
      locations: Array.from(new Set(employees.map((e) => e.location))).map((l) => ({ value: l, label: l })),
      requisitions: opt(w.requisitions, (r) => `${r.code} — ${r.position}`, (r) => String(r.department ?? "")),
      candidates: w.candidates.map((c) => ({ value: String(c.name), label: String(c.name), hint: String(c.position ?? "") })),
      kpis: opt(w.kpiLibrary, (r) => `${r.code} — ${r.name}`, (r) => String(r.department ?? "")),
      tni: opt(w.tni, (r) => `${r.code} — ${r.area}`),
      trainers: w.trainers.map((t) => ({ value: String(t.name), label: String(t.name), hint: String(t.specialisation ?? "") })),
      travel: opt(w.travelRequests, (r) => `${r.code} — ${r.destination}`),
      contractors: w.contractors.map((c) => ({ value: String(c.contractor), label: String(c.contractor), hint: String(c.category ?? "") })),
      vendors: Array.from(
        new Set([...w.adminInvoices.map((r) => String(r.vendor)), ...w.adminQuotes.map((r) => String(r.vendor))]),
      ).map((v) => ({ value: v, label: v })),
    };
  }, [employees, w]);
}
