/**
 * Generic collection CRUD helpers for the local demo stores.
 * Each store exposes `update(mutator)`; this wraps it with insert/update/delete
 * semantics over any array-valued key of the state object.
 */
export interface MutableStore<S> {
  update(mut: (s: S) => void): void;
}

export function makeCrud<S extends Record<string, unknown>>(store: MutableStore<S>) {
  function upsert(key: keyof S & string, record: Record<string, unknown>): string {
    const id = (record.id as string | undefined) || crypto.randomUUID();
    const isNew = !record.id;
    store.update((s) => {
      const bag = s as unknown as Record<string, Array<Record<string, unknown>>>;
      const arr = bag[key] ?? [];
      if (isNew) bag[key] = [{ ...record, id }, ...arr];
      else bag[key] = arr.map((r) => (r.id === id ? { ...r, ...record, id } : r));
    });
    return id;
  }

  function remove(key: keyof S & string, id: string) {
    store.update((s) => {
      const bag = s as unknown as Record<string, Array<Record<string, unknown>>>;
      bag[key] = (bag[key] ?? []).filter((r) => r.id !== id);
    });
  }

  return { upsert, remove };
}

/** Export any list of records to a CSV download. */
export function exportCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter(
    (c) => !["id"].includes(c),
  );
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
