/**
 * Generic cloud sync engine.
 *
 * A module store registers its collections and their table mappings. On
 * hydration the engine loads every owned row from the cloud; afterwards each
 * store change is diffed against the last snapshot and only the changed rows
 * are written back. Reads stay instant because the in-memory store remains the
 * render source — the cloud is the durable source of truth.
 */

import { cloudApply, cloudFetch, cloudPurge } from "./data.functions";
import { ALLOWED_TABLES, fromRow, toRow, type TableMap } from "./schema";

type Rec = Record<string, unknown> & { id: string };
type State = Record<string, unknown>;

export interface CloudStore {
  module: string;
  tables: Record<string, TableMap>;
  get: () => State;
  replace: (next: State) => void;
  subscribe: (fn: () => void) => () => void;
}

const stores = new Map<string, CloudStore>();
const snapshots = new Map<string, Map<string, string>>(); // module:collection -> id -> json
const unsubscribers = new Map<string, () => void>();
let hydrated = false;

const statusListeners = new Set<() => void>();
let status: "idle" | "loading" | "ready" | "error" = "idle";

function setStatus(next: typeof status) {
  status = next;
  statusListeners.forEach((l) => l());
}

export function getCloudStatus() {
  return status;
}

export function subscribeCloudStatus(fn: () => void) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

export function registerCloudStore(store: CloudStore) {
  stores.set(store.module, store);
}

function rowsOf(state: State, collection: string): Rec[] {
  const rows = state[collection];
  return Array.isArray(rows) ? (rows as Rec[]) : [];
}

function snapshotKey(module: string, collection: string) {
  return `${module}:${collection}`;
}

function takeSnapshot(store: CloudStore) {
  const state = store.get();
  for (const collection of Object.keys(store.tables)) {
    const map = new Map<string, string>();
    for (const row of rowsOf(state, collection)) {
      if (row?.id) map.set(String(row.id), JSON.stringify(row));
    }
    snapshots.set(snapshotKey(store.module, collection), map);
  }
}

/** Diff current state against the snapshot and push the delta. */
async function flush(store: CloudStore) {
  const state = store.get();
  const ops: Array<{ table: string; upsert?: unknown[]; remove?: string[] }> = [];

  for (const [collection, map] of Object.entries(store.tables)) {
    const prev = snapshots.get(snapshotKey(store.module, collection)) ?? new Map<string, string>();
    const next = new Map<string, string>();
    const upsert: unknown[] = [];

    for (const row of rowsOf(state, collection)) {
      if (!row?.id) continue;
      const id = String(row.id);
      const json = JSON.stringify(row);
      next.set(id, json);
      if (prev.get(id) !== json) upsert.push(toRow(map, row));
    }
    const remove = [...prev.keys()].filter((id) => !next.has(id));
    snapshots.set(snapshotKey(store.module, collection), next);
    if (upsert.length || remove.length) ops.push({ table: map.table, upsert, remove });
  }

  if (!ops.length) return;
  try {
    await cloudApply({ data: { payload: JSON.stringify(ops) } });
  } catch (err) {
    console.error(`[cloud] failed to sync ${store.module}`, err);
    setStatus("error");
  }
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleFlush(store: CloudStore) {
  const existing = timers.get(store.module);
  if (existing) clearTimeout(existing);
  timers.set(
    store.module,
    setTimeout(() => {
      timers.delete(store.module);
      void flush(store);
    }, 400),
  );
}

function watch(store: CloudStore) {
  unsubscribers.get(store.module)?.();
  unsubscribers.set(
    store.module,
    store.subscribe(() => scheduleFlush(store)),
  );
}

/**
 * Hydrate every registered store from the cloud. When the cloud is empty for
 * this user, the current (browser/seeded) data is uploaded once so nothing is
 * lost and new users still start with the demo dataset.
 */
export async function hydrateCloudStores() {
  if (hydrated) return;
  hydrated = true;
  setStatus("loading");

  const registered = [...stores.values()];
  const tables = registered.flatMap((s) => Object.values(s.tables).map((t) => t.table));

  let payload: Record<string, Array<Record<string, unknown>>> = {};
  try {
    payload = JSON.parse(await cloudFetch({ data: { tables } })) as typeof payload;
  } catch (err) {
    console.error("[cloud] hydration failed — staying on local data", err);
    setStatus("error");
    registered.forEach((store) => takeSnapshot(store));
    return;
  }

  for (const store of registered) {
    const hasCloudRows = Object.values(store.tables).some(
      (t) => (payload[t.table] ?? []).length > 0,
    );

    if (hasCloudRows) {
      const next: State = { ...store.get() };
      for (const [collection, map] of Object.entries(store.tables)) {
        next[collection] = (payload[map.table] ?? []).map((row) => fromRow(map, row));
      }
      store.replace(next);
      takeSnapshot(store);
    } else {
      // First run for this user: push whatever the browser already holds.
      for (const collection of Object.keys(store.tables)) {
        snapshots.set(snapshotKey(store.module, collection), new Map());
      }
      await flush(store);
    }
    watch(store);
  }

  setStatus("ready");
}

/** Clear all cloud rows for this user (used by the demo reset). */
export async function purgeCloudData() {
  try {
    await cloudPurge({ data: { tables: ALLOWED_TABLES } });
  } catch (err) {
    console.error("[cloud] purge failed", err);
  }
}
