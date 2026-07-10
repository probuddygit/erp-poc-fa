import type { LucideIcon } from "lucide-react";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "email"
  | "phone"
  | "date"
  | "select"
  | "boolean";

export interface SelectOption {
  label: string;
  value: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: SelectOption[];
  /** Section header used to group fields on Create/Edit/View. */
  group?: string;
  /** Include as a column on the List page. */
  showInList?: boolean;
  /** Match against on the search bar. */
  searchable?: boolean;
  /** Expose as a filter chip on the List page. */
  filterable?: boolean;
  /** Included in CSV templates and import/export. */
  importable?: boolean;
  defaultValue?: unknown;
  /** Form column span (1..2). */
  span?: 1 | 2;
}

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export interface MasterRecord {
  id: string;
  code: string;
  data: Record<string, unknown>;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  uploadedAt: string;
  uploadedBy?: string;
  dataUrl: string;
}

export interface ActivityEvent {
  id: string;
  ts: string;
  type:
    | "created"
    | "updated"
    | "submitted"
    | "approved"
    | "rejected"
    | "commented"
    | "attachment_added"
    | "attachment_removed"
    | "imported";
  actor?: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ApprovalEvent {
  id: string;
  ts: string;
  step: string;
  status: "pending" | "approved" | "rejected";
  actor?: string;
  comment?: string;
}

export interface MasterDef {
  /** URL slug, e.g. "customers" */
  key: string;
  name: string;
  pluralName: string;
  description?: string;
  icon: LucideIcon;
  /** Tailwind color token, e.g. "bg-primary/10 text-primary". */
  accentClass?: string;
  /** Prefix for auto-generated codes, e.g. "CUS". */
  codePrefix: string;
  fields: FieldDef[];
  requiresApproval?: boolean;
  /** Ordered approval step labels. */
  approvalSteps?: string[];
  /** Field key used as secondary display label after `code`. */
  titleField?: string;
}
