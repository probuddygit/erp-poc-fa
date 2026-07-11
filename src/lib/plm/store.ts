import { useSyncExternalStore } from "react";
import type { PlmState, BomNode } from "./types";
import { seed } from "./seed";

const KEY = "faith-erp:plm:v1";

function load(): PlmState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as PlmState;
  } catch {
    return seed();
  }
}

let state: PlmState = load();
const listeners = new Set<() => void>();
function save() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const plmStore = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  update(mut: (s: PlmState) => void) { mut(state); state = { ...state }; save(); },
  reset() { state = seed(); save(); },
};

export function usePlm<T>(sel: (s: PlmState) => T): T {
  return useSyncExternalStore(plmStore.subscribe, () => sel(state), () => sel(state));
}

/** Move a BOM node to a new parent (drag-drop reparent). Prevents cycles. */
export function moveBomNode(nodeId: string, newParentId: string | undefined) {
  plmStore.update((s) => {
    const node = s.bom.find((n) => n.id === nodeId);
    if (!node) return;
    if (newParentId === nodeId) return;
    // prevent moving into own descendant
    const descendants = new Set<string>();
    const walk = (id: string) => {
      s.bom.filter((c) => c.parentId === id).forEach((c) => {
        descendants.add(c.id);
        walk(c.id);
      });
    };
    walk(nodeId);
    if (newParentId && descendants.has(newParentId)) return;
    node.parentId = newParentId;
    if (newParentId) {
      const p = s.bom.find((n) => n.id === newParentId);
      if (p) node.rootId = p.rootId;
    }
  });
}

export function bomChildren(bom: BomNode[], parentId?: string) {
  return bom.filter((n) => n.parentId === parentId);
}
