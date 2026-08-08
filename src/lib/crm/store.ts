import { useSyncExternalStore } from "react";
import type { CrmState, EntityKind } from "./types";
import { seed } from "./seed";

const KEY = "faith-erp:crm:v1";

/** Legacy statuses/stages persisted before the canonical lifecycle landed. */
const LEGACY: Record<string, string> = {
  proposal: "solution-discussion",
  negotiation: "rfq-received",
  pending: "internal-approval",
  sent: "submitted",
  "in-review": "technical-review",
  received: "draft",
  responded: "ready-for-proposal",
};

function migrate(s: CrmState): CrmState {
  for (const rows of Object.values(s) as unknown as Array<Array<Record<string, unknown>>>) {
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      if (typeof r?.stage === "string" && LEGACY[r.stage]) r.stage = LEGACY[r.stage];
      if (typeof r?.status === "string" && LEGACY[r.status]) r.status = LEGACY[r.status];
    }
  }
  return s;
}

function load(): CrmState {
  if (typeof window === "undefined") return migrate(seed());
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = migrate(seed());
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    // merge so collections added in later releases (e.g. salesOrders) exist
    return migrate({ ...seed(), ...(JSON.parse(raw) as Partial<CrmState>) } as CrmState);
  } catch {
    return migrate(seed());
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

/** Insert or update a CRM record. Returns the record's id. */
export function upsertRecord(
  kind: EntityKind,
  record: Record<string, unknown>,
  actor = "You",
): string {
  const id = (record.id as string | undefined) ?? crypto.randomUUID();
  const isNew = !record.id;
  crm.update((s) => {
    const arr = s[kind] as unknown as Array<Record<string, unknown>>;
    if (isNew) {
      (s as unknown as Record<string, unknown[]>)[kind] = [
        { ...record, id, createdAt: record.createdAt ?? new Date().toISOString() },
        ...arr,
      ];
    } else {
      (s as unknown as Record<string, unknown[]>)[kind] = arr.map((r) =>
        r.id === id ? { ...r, ...record, id } : r,
      );
    }
  });
  const title =
    (record.name as string) ?? (record.title as string) ?? (record.code as string) ?? "record";
  logActivity(
    kind,
    id,
    "system",
    isNew ? `Created ${title}` : `Updated ${title}`,
    actor,
  );
  return id;
}

/** Delete a CRM record and any dependent activity/note/email/document/approval rows. */
export function deleteRecord(kind: EntityKind, id: string) {
  crm.update((s) => {
    (s as unknown as Record<string, unknown[]>)[kind] = (
      s[kind] as unknown as Array<{ id: string }>
    ).filter((r) => r.id !== id);
    s.activities = s.activities.filter(
      (a) => !(a.entityKind === kind && a.entityId === id),
    );
    s.notes = s.notes.filter((n) => !(n.entityKind === kind && n.entityId === id));
    s.emails = s.emails.filter((e) => !(e.entityKind === kind && e.entityId === id));
    s.documents = s.documents.filter(
      (d) => !(d.entityKind === kind && d.entityId === id),
    );
    s.approvals = s.approvals.filter(
      (a) => !(a.entityKind === kind && a.entityId === id),
    );
  });
}

export function addDocument(
  kind: EntityKind,
  entityId: string,
  doc: { name: string; kind: string; size?: string; uploadedBy?: string },
) {
  crm.update((s) => {
    s.documents = [
      {
        id: crypto.randomUUID(),
        entityKind: kind,
        entityId,
        name: doc.name,
        kind: doc.kind as "NDA" | "MSA" | "SOW" | "Drawing" | "Spec" | "PO" | "Other",
        size: doc.size ?? "—",
        uploadedBy: doc.uploadedBy ?? "You",
        at: new Date().toISOString(),
      },
      ...s.documents,
    ];
  });
  logActivity(kind, entityId, "system", `Uploaded ${doc.name}`);
}

export function removeDocument(id: string) {
  crm.update((s) => {
    s.documents = s.documents.filter((d) => d.id !== id);
  });
}

export function addEmail(
  kind: EntityKind,
  entityId: string,
  email: {
    direction: "in" | "out";
    subject: string;
    preview: string;
    from: string;
    to: string;
  },
) {
  crm.update((s) => {
    s.emails = [
      {
        id: crypto.randomUUID(),
        entityKind: kind,
        entityId,
        ...email,
        at: new Date().toISOString(),
      },
      ...s.emails,
    ];
  });
  logActivity(kind, entityId, "email", `${email.direction === "in" ? "Received" : "Sent"}: ${email.subject}`);
}
