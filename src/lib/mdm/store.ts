import { useEffect, useSyncExternalStore } from "react";
import type {
  ActivityEvent,
  ApprovalEvent,
  Attachment,
  MasterDef,
  MasterRecord,
} from "./types";

/**
 * Lightweight, metadata-driven store backed by localStorage.
 * All masters share the same architecture — one store per master key.
 * This is intentionally storage-agnostic so it can be swapped for a
 * Supabase-backed adapter later without touching UI components.
 */

const NS = "faith-erp:mdm";

type MasterState = {
  records: MasterRecord[];
  attachments: Record<string, Attachment[]>; // recordId -> attachments
  activity: Record<string, ActivityEvent[]>; // recordId -> events
  approvals: Record<string, ApprovalEvent[]>; // recordId -> events
  seq: number;
};

// Always hand out a fresh object — callers mutate the state they receive.
function defaultState(): MasterState {
  return { records: [], attachments: {}, activity: {}, approvals: {}, seq: 0 };
}

const listeners = new Map<string, Set<() => void>>();

function keyFor(masterKey: string) {
  return `${NS}:${masterKey}`;
}

function read(masterKey: string): MasterState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(keyFor(masterKey));
    if (!raw) return defaultState();
    return { ...defaultState(), ...(JSON.parse(raw) as MasterState) };
  } catch {
    return defaultState();
  }
}

function write(masterKey: string, next: MasterState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyFor(masterKey), JSON.stringify(next));
  listeners.get(masterKey)?.forEach((fn) => fn());
}

function subscribe(masterKey: string, fn: () => void) {
  if (!listeners.has(masterKey)) listeners.set(masterKey, new Set());
  listeners.get(masterKey)!.add(fn);
  return () => listeners.get(masterKey)?.delete(fn);
}

function uuid() {
  return (crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function now() {
  return new Date().toISOString();
}

function nextCode(def: MasterDef, seq: number) {
  return `${def.codePrefix}-${String(seq).padStart(4, "0")}`;
}

function logActivity(
  state: MasterState,
  recordId: string,
  event: Omit<ActivityEvent, "id" | "ts">,
) {
  const list = state.activity[recordId] ?? [];
  state.activity[recordId] = [
    { id: uuid(), ts: now(), ...event },
    ...list,
  ].slice(0, 200);
}

// --- Public API -------------------------------------------------------------

export const mdmStore = {
  list(masterKey: string) {
    return read(masterKey).records;
  },
  get(masterKey: string, id: string) {
    return read(masterKey).records.find((r) => r.id === id) ?? null;
  },
  create(def: MasterDef, data: Record<string, unknown>, actor?: string) {
    const state = read(def.key);
    state.seq += 1;
    const code = (data.code as string)?.trim() || nextCode(def, state.seq);
    const record: MasterRecord = {
      id: uuid(),
      code,
      data,
      status: def.requiresApproval ? "draft" : "approved",
      createdAt: now(),
      updatedAt: now(),
      createdBy: actor,
    };
    state.records = [record, ...state.records];
    logActivity(state, record.id, {
      type: "created",
      actor,
      message: `Created ${def.name} ${code}`,
    });
    write(def.key, state);
    return record;
  },
  update(
    def: MasterDef,
    id: string,
    data: Record<string, unknown>,
    actor?: string,
  ) {
    const state = read(def.key);
    const idx = state.records.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const prev = state.records[idx];
    const next: MasterRecord = {
      ...prev,
      data: { ...prev.data, ...data },
      updatedAt: now(),
    };
    state.records[idx] = next;
    logActivity(state, id, {
      type: "updated",
      actor,
      message: `Updated ${def.name} ${next.code}`,
    });
    write(def.key, state);
    return next;
  },
  remove(masterKey: string, ids: string[]) {
    const state = read(masterKey);
    state.records = state.records.filter((r) => !ids.includes(r.id));
    for (const id of ids) {
      delete state.activity[id];
      delete state.attachments[id];
      delete state.approvals[id];
    }
    write(masterKey, state);
  },
  submitForApproval(def: MasterDef, id: string, actor?: string) {
    const state = read(def.key);
    const rec = state.records.find((r) => r.id === id);
    if (!rec) return;
    rec.status = "pending";
    rec.updatedAt = now();
    const steps = def.approvalSteps ?? ["Review"];
    state.approvals[id] = steps.map((s) => ({
      id: uuid(),
      ts: now(),
      step: s,
      status: "pending",
    }));
    logActivity(state, id, {
      type: "submitted",
      actor,
      message: `Submitted ${rec.code} for approval`,
    });
    write(def.key, state);
  },
  decideApproval(
    def: MasterDef,
    id: string,
    stepIndex: number,
    decision: "approved" | "rejected",
    actor?: string,
    comment?: string,
  ) {
    const state = read(def.key);
    const rec = state.records.find((r) => r.id === id);
    const steps = state.approvals[id];
    if (!rec || !steps || !steps[stepIndex]) return;
    steps[stepIndex] = {
      ...steps[stepIndex],
      status: decision,
      actor,
      comment,
      ts: now(),
    };
    if (decision === "rejected") {
      rec.status = "rejected";
    } else if (steps.every((s) => s.status === "approved")) {
      rec.status = "approved";
    }
    rec.updatedAt = now();
    logActivity(state, id, {
      type: decision === "approved" ? "approved" : "rejected",
      actor,
      message: `${steps[stepIndex].step} ${decision}${comment ? `: ${comment}` : ""}`,
    });
    write(def.key, state);
  },
  addAttachment(
    masterKey: string,
    recordId: string,
    file: Attachment,
    actor?: string,
  ) {
    const state = read(masterKey);
    state.attachments[recordId] = [file, ...(state.attachments[recordId] ?? [])];
    logActivity(state, recordId, {
      type: "attachment_added",
      actor,
      message: `Uploaded ${file.name}`,
    });
    write(masterKey, state);
  },
  removeAttachment(
    masterKey: string,
    recordId: string,
    attachmentId: string,
    actor?: string,
  ) {
    const state = read(masterKey);
    const list = state.attachments[recordId] ?? [];
    const removed = list.find((a) => a.id === attachmentId);
    state.attachments[recordId] = list.filter((a) => a.id !== attachmentId);
    if (removed) {
      logActivity(state, recordId, {
        type: "attachment_removed",
        actor,
        message: `Removed ${removed.name}`,
      });
    }
    write(masterKey, state);
  },
  attachments(masterKey: string, recordId: string) {
    return read(masterKey).attachments[recordId] ?? [];
  },
  activity(masterKey: string, recordId: string) {
    return read(masterKey).activity[recordId] ?? [];
  },
  approvals(masterKey: string, recordId: string) {
    return read(masterKey).approvals[recordId] ?? [];
  },
  addComment(
    masterKey: string,
    recordId: string,
    message: string,
    actor?: string,
  ) {
    const state = read(masterKey);
    logActivity(state, recordId, { type: "commented", actor, message });
    write(masterKey, state);
  },
  bulkImport(
    def: MasterDef,
    rows: Record<string, unknown>[],
    actor?: string,
  ) {
    const state = read(def.key);
    let created = 0;
    for (const row of rows) {
      state.seq += 1;
      const code = (row.code as string)?.trim() || nextCode(def, state.seq);
      const record: MasterRecord = {
        id: uuid(),
        code,
        data: row,
        status: def.requiresApproval ? "draft" : "approved",
        createdAt: now(),
        updatedAt: now(),
        createdBy: actor,
      };
      state.records.unshift(record);
      logActivity(state, record.id, {
        type: "imported",
        actor,
        message: `Imported ${def.name} ${code}`,
      });
      created += 1;
    }
    write(def.key, state);
    return created;
  },
};

// --- React hooks ------------------------------------------------------------

export function useMasterList(masterKey: string) {
  const snap = useSyncExternalStore(
    (fn) => subscribe(masterKey, fn),
    () => read(masterKey).records,
    () => [] as MasterRecord[],
  );
  return snap;
}

export function useMasterRecord(masterKey: string, id: string | undefined) {
  const snap = useSyncExternalStore(
    (fn) => subscribe(masterKey, fn),
    () => (id ? read(masterKey).records.find((r) => r.id === id) ?? null : null),
    () => null,
  );
  return snap;
}

export function useMasterAttachments(masterKey: string, id: string) {
  return useSyncExternalStore(
    (fn) => subscribe(masterKey, fn),
    () => read(masterKey).attachments[id] ?? [],
    () => [] as Attachment[],
  );
}

export function useMasterActivity(masterKey: string, id: string) {
  return useSyncExternalStore(
    (fn) => subscribe(masterKey, fn),
    () => read(masterKey).activity[id] ?? [],
    () => [] as ActivityEvent[],
  );
}

export function useMasterApprovals(masterKey: string, id: string) {
  return useSyncExternalStore(
    (fn) => subscribe(masterKey, fn),
    () => read(masterKey).approvals[id] ?? [],
    () => [] as ApprovalEvent[],
  );
}

/** Rehydrate on mount (works around SSR mismatch when we later toggle SSR). */
export function useHydrated() {
  const snap = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return snap;
}
