import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAllowedTable } from "./schema";

type LooseClient = { from: (table: string) => any };

export interface TableOp {
  table: string;
  upsert?: Array<Record<string, unknown>>;
  remove?: string[];
}

/** Load every row the signed-in user owns across the requested tables (JSON encoded). */
export const cloudFetch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tables: string[] }) => input)
  .handler(async ({ data, context }): Promise<string> => {
    const db = context.supabase as unknown as LooseClient;
    const out: Record<string, Array<Record<string, unknown>>> = {};
    for (const table of data.tables) {
      if (!isAllowedTable(table)) continue;
      const { data: rows, error } = await db.from(table).select("*");
      if (error) throw new Error(`${table}: ${error.message}`);
      out[table] = (rows ?? []) as Array<Record<string, unknown>>;
    }
    return JSON.stringify(out);
  });


/** Apply inserts/updates/deletes for the signed-in user. RLS scopes everything. */
export const cloudApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { payload: string }) => input)
  .handler(async ({ data, context }) => {
    const db = context.supabase as unknown as LooseClient;
    const ops = JSON.parse(data.payload) as TableOp[];
    for (const op of ops) {

      if (!isAllowedTable(op.table)) continue;
      if (op.upsert?.length) {
        const rows = op.upsert.map((r) => ({ ...r, owner_id: context.userId }));
        const { error } = await db.from(op.table).upsert(rows, { onConflict: "owner_id,id" });
        if (error) throw new Error(`${op.table} upsert: ${error.message}`);
      }
      if (op.remove?.length) {
        const { error } = await db.from(op.table).delete().in("id", op.remove);
        if (error) throw new Error(`${op.table} delete: ${error.message}`);
      }
    }
    return { ok: true };
  });

/** Wipe every cloud row the signed-in user owns (demo reset). */
export const cloudPurge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tables: string[] }) => input)
  .handler(async ({ data, context }) => {
    const db = context.supabase as unknown as LooseClient;
    for (const table of data.tables) {
      if (!isAllowedTable(table)) continue;
      const { error } = await db.from(table).delete().eq("owner_id", context.userId);
      if (error) throw new Error(`${table} purge: ${error.message}`);
    }
    return { ok: true };
  });
