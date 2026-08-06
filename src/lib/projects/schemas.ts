import type { FieldSpec } from "@/components/record-dialog";

export type ProjectsSubKind =
  | "projects"
  | "wbs"
  | "milestones"
  | "risks"
  | "issues"
  | "changes"
  | "docs"
  | "team"
  | "events"
  | "budget";

export const PROJECT_SCHEMAS: Record<ProjectsSubKind, FieldSpec[]> = {
  projects: [
    { name: "code", label: "Code", type: "text", required: true, placeholder: "PRJ-1000" },
    { name: "name", label: "Project Name", type: "text", required: true, colSpan: 2 },
    { name: "customerName", label: "Customer", type: "text", required: true },
    { name: "manager", label: "Project Manager", type: "text", required: true },
    { name: "value", label: "Order Value (INR)", type: "number", required: true },
    { name: "budget", label: "Budget (INR)", type: "number", required: true },
    { name: "spent", label: "Cost Consumed (INR)", type: "number" },
    { name: "progress", label: "Progress %", type: "number" },
    { name: "startDate", label: "Start Date", type: "date", required: true },
    { name: "endDate", label: "End Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", options: ["planning", "active", "on-hold", "closed"], required: true },
    { name: "rag", label: "RAG", type: "select", options: ["green", "amber", "red"], required: true },
  ],
  wbs: [
    { name: "code", label: "WBS Code", type: "text", required: true, placeholder: "1.1" },
    { name: "name", label: "Task Name", type: "text", required: true, colSpan: 2 },
    { name: "owner", label: "Owner", type: "text" },
    { name: "start", label: "Start", type: "date", required: true },
    { name: "end", label: "End", type: "date", required: true },
    { name: "progress", label: "Progress %", type: "number" },
    { name: "weight", label: "Weight", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["not-started", "in-progress", "blocked", "done"], required: true },
  ],
  milestones: [
    { name: "name", label: "Milestone Name", type: "text", required: true, colSpan: 2 },
    { name: "due", label: "Due Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", options: ["upcoming", "at-risk", "achieved", "missed"], required: true },
    { name: "billing", label: "Billing (INR)", type: "number" },
  ],
  risks: [
    { name: "title", label: "Risk Title", type: "text", required: true, colSpan: 2 },
    { name: "category", label: "Category", type: "select", options: ["Schedule", "Cost", "Technical", "Supplier", "Quality", "Safety"], required: true },
    { name: "owner", label: "Owner", type: "text", required: true },
    { name: "probability", label: "Probability (1-5)", type: "number", required: true },
    { name: "impact", label: "Impact (1-5)", type: "number", required: true },
    { name: "status", label: "Status", type: "select", options: ["open", "mitigated", "closed"], required: true },
    { name: "mitigation", label: "Mitigation Plan", type: "textarea" },
  ],
  issues: [
    { name: "title", label: "Issue", type: "text", required: true, colSpan: 2 },
    { name: "severity", label: "Severity", type: "select", options: ["low", "medium", "high", "critical"], required: true },
    { name: "raisedBy", label: "Raised By", type: "text" },
    { name: "assignee", label: "Assignee", type: "text", required: true },
    { name: "status", label: "Status", type: "select", options: ["open", "in-progress", "resolved"], required: true },
  ],
  changes: [
    { name: "code", label: "Code", type: "text", required: true, placeholder: "CR-01" },
    { name: "title", label: "Change Title", type: "text", required: true, colSpan: 2 },
    { name: "impactCost", label: "Cost Impact (INR)", type: "number", required: true },
    { name: "impactDays", label: "Schedule Impact (Days)", type: "number", required: true },
    { name: "raisedBy", label: "Raised By", type: "text" },
    { name: "status", label: "Status", type: "select", options: ["draft", "pending", "approved", "rejected"], required: true },
  ],
  docs: [
    { name: "fileUrl", label: "File", type: "file", colSpan: 2 },
    { name: "name", label: "Document Name", type: "text", required: true, colSpan: 2 },
    { name: "kind", label: "Kind", type: "select", options: ["Charter", "Drawing", "Contract", "MoM", "Report", "Other"], required: true },
    { name: "version", label: "Version / Rev", type: "text", placeholder: "Rev A" },
    { name: "size", label: "Size", type: "text", placeholder: "1.2 MB" },
    { name: "uploadedBy", label: "Uploaded By", type: "text" },
    { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ],
  team: [
    { name: "name", label: "Member Name", type: "text", required: true },
    { name: "role", label: "Role", type: "text", required: true },
    { name: "email", label: "Email", type: "email", colSpan: 2 },
    { name: "allocationPct", label: "Allocation %", type: "number", required: true },
  ],
  events: [
    { name: "title", label: "Event Title", type: "text", required: true, colSpan: 2 },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "kind", label: "Kind", type: "select", options: ["milestone", "review", "meeting", "delivery"], required: true },
  ],
  budget: [
    { name: "category", label: "Category", type: "select", options: ["Labour", "Material", "Equipment", "Subcontract", "Overhead"], required: true },
    { name: "planned", label: "Planned (INR)", type: "number", required: true },
    { name: "committed", label: "Committed (INR)", type: "number", required: true },
    { name: "actual", label: "Actual (INR)", type: "number", required: true },
  ],
};
