import { useSyncExternalStore } from "react";
import type { ProjectsState } from "./types";
import { seed } from "./seed";

const KEY = "faith-erp:projects:v1";

function load(): ProjectsState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as ProjectsState;
  } catch {
    return seed();
  }
}

let state: ProjectsState = load();
const listeners = new Set<() => void>();

function save() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const projectsStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  update(mut: (s: ProjectsState) => void) {
    mut(state);
    state = { ...state };
    save();
  },
  replace(next: ProjectsState) {
    state = { ...state, ...next };
    save();
  },
  reset() {
    state = seed();
    save();
  },
};

export function useProjectsStore<T>(sel: (s: ProjectsState) => T): T {
  return useSyncExternalStore(
    projectsStore.subscribe,
    () => sel(state),
    () => sel(state),
  );
}

type CollectionKey =
  | "projects"
  | "wbs"
  | "milestones"
  | "risks"
  | "issues"
  | "changes"
  | "docs"
  | "team"
  | "events"
  | "budget";

/** Insert or update any project-scoped record. Auto-attaches id + projectId. */
export function upsertProjectRecord(
  key: CollectionKey,
  record: Record<string, unknown>,
  projectId?: string,
): string {
  const id = (record.id as string | undefined) ?? crypto.randomUUID();
  const isNew = !record.id;
  projectsStore.update((s) => {
    const arr = s[key] as unknown as Array<Record<string, unknown>>;
    if (isNew) {
      const rec: Record<string, unknown> = {
        ...record,
        id,
        ...(projectId ? { projectId } : {}),
      };
      if (key === "projects" && !rec.createdAt) rec.createdAt = new Date().toISOString();
      (s as unknown as Record<string, unknown[]>)[key] = [rec, ...arr];
    } else {
      (s as unknown as Record<string, unknown[]>)[key] = arr.map((r) =>
        r.id === id ? { ...r, ...record, id } : r,
      );
    }
  });

  // Finance events: a new project opens its cost ledger, an achieved milestone
  // raises the milestone invoice from the billing plan.
  if (key === "projects" && isNew) {
    const created = state.projects.find((p) => p.id === id);
    if (created?.code) fireFinanceEvent({ type: "project.created", projectCode: created.code });
  }
  if (key === "milestones" && record.status === "achieved") {
    fireFinanceEvent({ type: "milestone.achieved", milestoneId: id });
  }
  return id;
}


/** Delete a project-scoped record. When deleting a project, cascade to child collections. */
export function deleteProjectRecord(key: CollectionKey, id: string) {
  projectsStore.update((s) => {
    (s as unknown as Record<string, unknown[]>)[key] = (
      s[key] as unknown as Array<{ id: string }>
    ).filter((r) => r.id !== id);
    if (key === "projects") {
      const childKeys: CollectionKey[] = [
        "wbs",
        "milestones",
        "risks",
        "issues",
        "changes",
        "docs",
        "team",
        "events",
        "budget",
      ];
      for (const k of childKeys) {
        (s as unknown as Record<string, unknown[]>)[k] = (
          s[k] as unknown as Array<{ projectId: string }>
        ).filter((r) => r.projectId !== id);
      }
    }
  });
}
