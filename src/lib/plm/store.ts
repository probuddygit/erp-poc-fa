import { useSyncExternalStore } from "react";
import type { PlmState, BomNode } from "./types";
import { seed } from "./seed";
import { makeCrud, type MutableStore } from "@/lib/crud";

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

/* ---------------- CRUD ---------------- */
const plmCrud = makeCrud<PlmState & Record<string, unknown>>(
  plmStore as unknown as MutableStore<PlmState & Record<string, unknown>>,
);

export function upsertPlm(key: string, record: Record<string, unknown>): string {
  const r: Record<string, unknown> = { ...record };
  if (!r.createdAt) r.createdAt = new Date().toISOString();
  if (key === "reviews") {
    if (typeof r.reviewersText === "string") {
      r.reviewers = (r.reviewersText as string).split(",").map((x) => x.trim()).filter(Boolean);
    }
    r.actions = Number(r.actions ?? 0);
  }
  if (key === "bom") {
    r.qty = Number(r.qty ?? 1);
    if (!r.kind) r.kind = "EBOM";
    if (!r.rootId) r.rootId = (r.id as string) ?? "";
  }
  const id = plmCrud.upsert(key, r);
  if (key === "bom" && !r.rootId) {
    plmStore.update((s) => {
      const n = s.bom.find((b) => b.id === id);
      if (n && !n.rootId) n.rootId = id;
    });
  }
  return id;
}

export function deletePlm(key: string, id: string) {
  if (key === "bom") {
    // cascade: remove the node and all its descendants
    plmStore.update((s) => {
      const doomed = new Set<string>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const n of s.bom) {
          if (n.parentId && doomed.has(n.parentId) && !doomed.has(n.id)) {
            doomed.add(n.id);
            grew = true;
          }
        }
      }
      s.bom = s.bom.filter((n) => !doomed.has(n.id));
    });
    return;
  }
  plmCrud.remove(key, id);
}
