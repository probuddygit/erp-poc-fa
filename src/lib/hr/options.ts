import { useMemo } from "react";
import type { ComboOption } from "@/components/combobox-field";
import { useHR } from "./store";
import { useProjectsStore } from "@/lib/projects/store";

export interface HROptions extends Record<string, ComboOption[]> {
  employees: ComboOption[];
  approvers: ComboOption[];
  departments: ComboOption[];
  locations: ComboOption[];
  projects: ComboOption[];
  tasks: ComboOption[];
  skills: ComboOption[];
}

/** Live searchable lookups for every HR form, derived from HR + Projects data. */
export function useHROptions(): HROptions {
  const employees = useHR((s) => s.employees);
  const skills = useHR((s) => s.skills);
  const projects = useProjectsStore((s) => s.projects);
  const wbs = useProjectsStore((s) => s.wbs);

  return useMemo(() => {
    const projById = new Map(projects.map((p) => [p.id, p]));

    return {
      employees: employees.map((e) => ({
        value: e.id,
        label: e.name,
        hint: `${e.code} · ${e.designation}`,
      })),
      approvers: employees
        .filter((e) => ["B3", "B4", "B5"].includes(e.band))
        .map((e) => ({ value: e.name, label: e.name, hint: e.designation })),
      departments: Array.from(new Set(employees.map((e) => e.department))).map((d) => ({ value: d, label: d })),
      locations: Array.from(new Set(employees.map((e) => e.location))).map((l) => ({ value: l, label: l })),
      projects: projects.map((p) => ({
        value: p.code,
        label: `${p.code} — ${p.name}`,
        hint: p.customerName,
      })),
      tasks: wbs.map((w) => {
        const p = projById.get(w.projectId);
        return {
          value: w.code,
          label: `${w.code} — ${w.name}`,
          hint: p?.code ?? "",
          patch: p ? { projectCode: p.code } : undefined,
        };
      }),
      skills: skills.map((s) => ({ value: s.id, label: s.name, hint: s.category })),
    };
  }, [employees, skills, projects, wbs]);
}
