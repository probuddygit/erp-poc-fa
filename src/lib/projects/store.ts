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
