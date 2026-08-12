/** Cloud table maps for the Project Systems and Engineering (PLM) modules. */
import type { TableMap } from "./schema";

const createdAtAlias = { createdAt: "created_at_iso" };

export const PROJECT_TABLES: Record<string, TableMap> = {
  projects: {
    table: "prj_projects",
    columns: [
      "code", "name", "customer_name", "oa_id", "value", "budget", "spent",
      "start_date", "end_date", "status", "progress", "rag", "manager", "created_at_iso",
    ],
    aliases: createdAtAlias,
  },
  wbs: {
    table: "prj_wbs",
    columns: [
      "project_id", "parent_id", "code", "name", "owner", "start", "end",
      "progress", "status", "weight",
    ],
  },
  milestones: {
    table: "prj_milestones",
    columns: ["project_id", "name", "due", "status", "billing"],
  },
  risks: {
    table: "prj_risks",
    columns: ["project_id", "title", "category", "probability", "impact", "mitigation", "owner", "status"],
  },
  issues: {
    table: "prj_issues",
    columns: ["project_id", "title", "severity", "raised_by", "assignee", "status", "raised_at"],
  },
  changes: {
    table: "prj_changes",
    columns: ["project_id", "code", "title", "impact_cost", "impact_days", "status", "raised_by", "raised_at"],
  },
  docs: {
    table: "prj_docs",
    columns: [
      "project_id", "name", "kind", "size", "uploaded_by", "at", "version",
      "notes", "file_url", "file_url_name", "file_url_type",
    ],
  },
  team: {
    table: "prj_team",
    columns: ["project_id", "name", "role", "allocation_pct", "email"],
  },
  events: {
    table: "prj_events",
    columns: ["project_id", "title", "date", "kind"],
  },
  budget: {
    table: "prj_budget",
    columns: ["project_id", "category", "planned", "committed", "actual"],
  },
};

export const ENGINEERING_TABLES: Record<string, TableMap> = {
  items: {
    table: "eng_items",
    columns: ["code", "name", "type", "uom", "rev", "std_cost", "make_buy", "lifecycle", "created_at_iso"],
    aliases: { ...createdAtAlias, make_buy: "make_buy" },
  },
  parts: {
    table: "eng_parts",
    columns: ["code", "name", "category", "supplier", "material", "weight", "rev", "created_at_iso"],
    aliases: createdAtAlias,
  },
  drawings: {
    table: "eng_drawings",
    columns: [
      "number", "title", "item_code", "rev", "format", "size", "uploaded_by",
      "released_at", "status", "project_code",
    ],
  },
  bom: {
    table: "eng_bom",
    columns: [
      "kind", "parent_id", "item_code", "item_name", "qty", "uom", "rev",
      "ref_des", "procurement", "root_id", "project_code",
    ],
  },
  ecns: {
    table: "eng_ecns",
    columns: [
      "code", "title", "item_code", "from_rev", "to_rev", "reason", "effectivity",
      "status", "raised_by", "created_at_iso",
    ],
    aliases: createdAtAlias,
  },
  ecrs: {
    table: "eng_ecrs",
    columns: [
      "code", "title", "item_code", "description", "priority", "status",
      "raised_by", "created_at_iso", "linked_ecn",
    ],
    aliases: createdAtAlias,
  },
  reviews: {
    table: "eng_reviews",
    columns: ["code", "title", "item_code", "reviewers", "scheduled", "outcome", "actions"],
  },
  designDocs: {
    table: "eng_design_docs",
    columns: [
      "code", "title", "category", "project_code", "item_code", "bom_root_id", "ecr_code",
      "ecn_code", "owner", "discipline", "status", "version", "created_at_iso", "updated_at_iso",
      "file_url", "file_url_name", "file_url_type", "size", "notes", "versions", "audit",
    ],
    aliases: { createdAt: "created_at_iso", updatedAt: "updated_at_iso" },
  },
  workOrders: {
    table: "eng_work_orders",
    columns: [
      "code", "item_code", "item_name", "qty", "uom", "project_code", "bom_root_id",
      "bom_node_id", "work_center", "planned_start", "planned_end", "status",
      "est_cost", "reserved_value", "created_at_iso", "source",
    ],
    aliases: createdAtAlias,
  },
};
