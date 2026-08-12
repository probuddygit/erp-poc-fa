import { useSyncExternalStore } from "react";
import type { PlmState, BomNode, DesignDoc } from "./types";
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
    const parsed = JSON.parse(raw) as PlmState;
    // forward-compatible migration for collections added later
    if (!Array.isArray(parsed.designDocs)) parsed.designDocs = seed().designDocs;
    if (!Array.isArray(parsed.workOrders)) parsed.workOrders = seed().workOrders;
    return parsed;
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
  replace(next: PlmState) { state = { ...state, ...next }; save(); },
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
  if (key === "designDocs") {
    const now = new Date().toISOString();
    if (!r.createdAt) r.createdAt = now;
    r.updatedAt = now;
    if (!r.version) r.version = "A";
    if (!r.status) r.status = "Draft";
    if (!Array.isArray(r.versions)) {
      r.versions = [
        {
          id: crypto.randomUUID(),
          version: r.version,
          at: now,
          by: (r.owner as string) ?? "You",
          notes: r.notes,
          fileUrl: r.fileUrl,
          fileUrlName: r.fileUrlName,
          fileUrlType: r.fileUrlType,
          size: r.size,
          status: r.status,
        },
      ];
    }
    if (!Array.isArray(r.audit)) {
      r.audit = [{ id: crypto.randomUUID(), at: now, by: (r.owner as string) ?? "You", action: `Created (Rev ${r.version})` }];
    }
    if (!r.code) r.code = `DOC-${String(Math.floor(1000 + Math.random() * 8999))}`;
  }
  if (key === "workOrders") {
    r.qty = Number(r.qty ?? 1);
    r.estCost = Number(r.estCost ?? 0);
    r.reservedValue = Number(r.reservedValue ?? 0);
    if (!r.status) r.status = "planned";
    if (!r.source) r.source = "manual";
    if (!r.code) r.code = `WO-${String(Math.floor(5000 + Math.random() * 4999))}`;
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

/** Append a new version to a design document and roll the current revision. */
export function addDocVersion(
  docId: string,
  v: { version: string; by: string; notes?: string; fileUrl?: string; fileUrlName?: string; fileUrlType?: string; size?: string },
) {
  plmStore.update((s) => {
    const d = s.designDocs.find((x) => x.id === docId);
    if (!d) return;
    const at = new Date().toISOString();
    d.versions = [
      ...(d.versions ?? []),
      { id: crypto.randomUUID(), at, status: "Draft", ...v },
    ];
    d.version = v.version;
    d.status = "Draft";
    d.updatedAt = at;
    if (v.fileUrl) {
      d.fileUrl = v.fileUrl;
      d.fileUrlName = v.fileUrlName;
      d.fileUrlType = v.fileUrlType;
      d.size = v.size;
    }
    d.audit = [...(d.audit ?? []), { id: crypto.randomUUID(), at, by: v.by, action: `Uploaded revision ${v.version}` }];
  });
}

/** Move a design document through its approval workflow with a full audit trail. */
export function setDocStatus(docId: string, status: DesignDoc["status"], by = "You") {
  plmStore.update((s) => {
    const d = s.designDocs.find((x) => x.id === docId);
    if (!d) return;
    const at = new Date().toISOString();
    d.status = status;
    d.updatedAt = at;
    const last = (d.versions ?? [])[(d.versions ?? []).length - 1];
    if (last) last.status = status;
    d.audit = [...(d.audit ?? []), { id: crypto.randomUUID(), at, by, action: `Status → ${status}` }];
  });
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
