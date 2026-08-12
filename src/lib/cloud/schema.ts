/**
 * Cloud persistence schema map.
 *
 * Every ERP collection that lives in the cloud declares the table it maps to,
 * the concrete columns that exist on that table, and any field/column aliases.
 * Fields that are not declared columns are round-tripped through the table's
 * `extra` jsonb column, so the app never loses data the schema doesn't model.
 *
 * This module is client-safe: both the sync engine (browser) and the server
 * functions import it.
 */

import { ENGINEERING_TABLES, PROJECT_TABLES } from "./schema.projects";

export interface TableMap {
  /** Postgres table name in the public schema. */
  table: string;
  /** Concrete (snake_case) columns, excluding id/owner_id/extra/timestamps. */
  columns: string[];
  /** entity field -> column overrides (defaults to snake_case of the field). */
  aliases?: Record<string, string>;
}

/** Fields present on every revenue-lifecycle document. */
const LIFECYCLE = [
  "contact_person",
  "contact_email",
  "contact_phone",
  "next_follow_up",
  "cancelled_at",
  "cancel_reason",
  "company_id",
  "created_at_iso",
];

const createdAtAlias = { createdAt: "created_at_iso" };

/** collection key (as used in the module store state) -> table mapping. */
export const CRM_TABLES: Record<string, TableMap> = {
  customers: {
    table: "crm_customers",
    columns: [
      "code", "name", "segment", "region", "owner", "status",
      "annual_revenue", "gstin", "payment_terms", "currency", ...LIFECYCLE,
    ],
    aliases: createdAtAlias,
  },
  leads: {
    table: "crm_leads",
    columns: [
      "code", "title", "customer_id", "customer_name", "source", "campaign",
      "owner", "est_value", "score", "status", "opportunity_id", ...LIFECYCLE,
    ],
    aliases: createdAtAlias,
  },
  opportunities: {
    table: "crm_opportunities",
    columns: [
      "code", "name", "customer_id", "customer_name", "lead_id", "value",
      "probability", "stage", "owner", "expected_close", "last_stage_at", ...LIFECYCLE,
    ],
    aliases: createdAtAlias,
  },
  rfqs: {
    table: "crm_rfqs",
    columns: [
      "code", "opportunity_id", "customer_name", "title", "due_date", "owner",
      "scope", "delivery_schedule", "commercial_terms", "extracted_from", "status", ...LIFECYCLE,
    ],
    aliases: createdAtAlias,
  },
  proposals: {
    table: "crm_proposals",
    columns: [
      "code", "rfq_id", "opportunity_id", "customer_name", "title", "version",
      "template", "executive_summary", "scope", "deliverables", "methodology",
      "timeline", "assumptions", "terms", "value", "owner", "status", ...LIFECYCLE,
    ],
    aliases: createdAtAlias,
  },
  quotations: {
    table: "crm_quotations",
    columns: [
      "code", "proposal_id", "opportunity_id", "customer_name", "title", "value",
      "discount_pct", "tax_pct", "freight", "margin_pct", "currency", "payment_terms",
      "delivery_terms", "validity", "revision", "views", "owner", "status", ...LIFECYCLE,
    ],
    aliases: createdAtAlias,
  },
  oas: {
    table: "crm_oas",
    columns: [
      "code", "quotation_id", "customer_name", "title", "value", "po_number",
      "po_date", "owner", "status", "sales_order_id", "project_id", ...LIFECYCLE,
    ],
    aliases: createdAtAlias,
  },
  salesOrders: {
    table: "crm_sales_orders",
    columns: [
      "code", "oa_id", "customer_name", "title", "value", "po_number", "delivery_date",
      "payment_terms", "owner", "project_code", "project_id", "status", ...LIFECYCLE,
    ],
    aliases: createdAtAlias,
  },
  activities: {
    table: "crm_activities",
    columns: ["entity_kind", "entity_id", "type", "title", "detail", "actor", "at"],
  },
  notes: {
    table: "crm_notes",
    columns: ["entity_kind", "entity_id", "body", "author", "at"],
  },
  emails: {
    table: "crm_emails",
    columns: [
      "entity_kind", "entity_id", "direction", "subject", "preview",
      "from_addr", "to_addr", "at",
    ],
    aliases: { from: "from_addr", to: "to_addr" },
  },
  documents: {
    table: "crm_documents",
    columns: ["entity_kind", "entity_id", "name", "kind", "size", "uploaded_by", "at"],
  },
  approvals: {
    table: "crm_approvals",
    columns: ["entity_kind", "entity_id", "step", "approver", "status", "comment", "at"],
  },
  projects: {
    table: "crm_projects",
    columns: ["code", "name", "customer_name", "value", "oa_id", "status", "created_at_iso"],
    aliases: createdAtAlias,
  },
};

/** Every table the cloud data API is allowed to touch. */
export const ALLOWED_TABLES: string[] = [
  ...Object.values(CRM_TABLES),
  ...Object.values(PROJECT_TABLES),
  ...Object.values(ENGINEERING_TABLES),
].map((t) => t.table);

export function isAllowedTable(table: string) {
  return ALLOWED_TABLES.includes(table);
}

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Convert an app record into a database row for `map`. */
export function toRow(map: TableMap, rec: Record<string, unknown>) {
  const row: Record<string, unknown> = { id: String(rec["id"] ?? "") };
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (k === "id" || v === undefined) continue;
    const col = map.aliases?.[k] ?? snake(k);
    if (map.columns.includes(col)) row[col] = v;
    else extra[k] = v;
  }
  row["extra"] = extra;
  return row;
}

/** Convert a database row back into the app record shape. */
export function fromRow(map: TableMap, row: Record<string, unknown>) {
  const reverse = new Map<string, string>();
  for (const [field, col] of Object.entries(map.aliases ?? {})) reverse.set(col, field);
  const rec: Record<string, unknown> = { id: row["id"] };
  for (const col of map.columns) {
    const v = row[col];
    if (v === null || v === undefined) continue;
    rec[reverse.get(col) ?? camel(col)] = v;
  }
  const extra = row["extra"];
  if (extra && typeof extra === "object") Object.assign(rec, extra as Record<string, unknown>);
  return rec;
}

const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
