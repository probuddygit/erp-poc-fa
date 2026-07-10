import { useSyncExternalStore } from "react";
import type { CrmState, EntityKind } from "./types";
import { seed } from "./seed";

const KEY = "faith-erp:crm:v1";

function load(): CrmState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as CrmState;
  } catch {
    return seed();
  }
}

let state: CrmState = load();
const listeners = new Set<() => void>();

function save() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

export const crm = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  update(mut: (s: CrmState) => void) {
    mut(state);
    state = { ...state };
    save();
  },
  reset() {
    state = seed();
    save();
  },
};

export function useCrm<T>(selector: (s: CrmState) => T): T {
  return useSyncExternalStore(
    crm.subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export function useEntity(kind: EntityKind, id: string) {
  return useCrm((s) => (s[kind] as Array<{ id: string }>).find((r) => r.id === id));
}

export function nextCode(prefix: string, existing: string[]) {
  const nums = existing
    .map((c) => Number(c.split("-").pop()))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `${prefix}-${next}`;
}

export function logActivity(
  kind: EntityKind,
  id: string,
  type: "call" | "meeting" | "task" | "note" | "email" | "system",
  title: string,
  actor = "You",
  detail?: string,
) {
  crm.update((s) => {
    s.activities = [
      {
        id: crypto.randomUUID(),
        entityKind: kind,
        entityId: id,
        type,
        title,
        detail,
        actor,
        at: new Date().toISOString(),
      },
      ...s.activities,
    ];
  });
}

/** Approve an OA and auto-provision a Project. */
export function approveOA(oaId: string, approver = "You") {
  crm.update((s) => {
    const oa = s.oas.find((o) => o.id === oaId);
    if (!oa) return;
    oa.status = "approved";
    s.approvals = [
      {
        id: crypto.randomUUID(),
        entityKind: "oas",
        entityId: oaId,
        step: "Final Approval",
        approver,
        status: "approved",
        at: new Date().toISOString(),
      },
      ...s.approvals,
    ];
    if (!oa.projectId) {
      const code = nextCode("PRJ", s.projects.map((p) => p.code));
      const proj = {
        id: crypto.randomUUID(),
        code,
        name: oa.title,
        customerName: oa.customerName,
        value: oa.value,
        oaId,
        status: "planning" as const,
        createdAt: new Date().toISOString(),
      };
      s.projects = [proj, ...s.projects];
      oa.projectId = proj.id;
      s.activities = [
        {
          id: crypto.randomUUID(),
          entityKind: "oas",
          entityId: oaId,
          type: "system",
          title: `Project ${code} auto-provisioned from OA ${oa.code}`,
          actor: "System",
          at: new Date().toISOString(),
        },
        ...s.activities,
      ];
    }
  });
}

export function rejectApproval(kind: EntityKind, id: string, comment?: string) {
  crm.update((s) => {
    const rec = (s[kind] as Array<{ id: string; status: string }>).find((r) => r.id === id);
    if (rec) rec.status = "rejected";
    s.approvals = [
      {
        id: crypto.randomUUID(),
        entityKind: kind,
        entityId: id,
        step: "Review",
        approver: "You",
        status: "rejected",
        comment,
        at: new Date().toISOString(),
      },
      ...s.approvals,
    ];
  });
}

export function submitForApproval(kind: EntityKind, id: string) {
  crm.update((s) => {
    const rec = (s[kind] as Array<{ id: string; status: string }>).find((r) => r.id === id);
    if (rec) rec.status = "pending";
    s.approvals = [
      {
        id: crypto.randomUUID(),
        entityKind: kind,
        entityId: id,
        step: "Submitted",
        approver: "You",
        status: "pending",
        at: new Date().toISOString(),
      },
      ...s.approvals,
    ];
  });
}
