import {
  Building2,
  Truck,
  Package,
  UserSquare2,
  Cog,
} from "lucide-react";
import type { MasterDef } from "./types";

/**
 * Every master inherits the same architecture — list, create, edit, view,
 * approvals, activity, attachments, search, filters, import, export, bulk
 * upload — by describing itself here.
 */

const COUNTRIES = [
  { label: "India", value: "IN" },
  { label: "USA", value: "US" },
  { label: "Germany", value: "DE" },
  { label: "Japan", value: "JP" },
  { label: "UK", value: "GB" },
];

export const MASTERS: MasterDef[] = [
  {
    key: "customers",
    name: "Customer",
    pluralName: "Customers",
    description: "OEMs, tier-1 suppliers and end clients.",
    icon: Building2,
    accentClass: "bg-primary/10 text-primary",
    codePrefix: "CUS",
    requiresApproval: true,
    approvalSteps: ["Sales Review", "Finance Review"],
    titleField: "name",
    fields: [
      { key: "name", label: "Legal Name", type: "text", required: true, showInList: true, searchable: true, importable: true, group: "Identity", span: 2 },
      { key: "short_name", label: "Short Name", type: "text", showInList: true, searchable: true, importable: true, group: "Identity" },
      { key: "segment", label: "Segment", type: "select", options: [
        { label: "OEM", value: "OEM" },
        { label: "Tier 1", value: "TIER1" },
        { label: "Tier 2", value: "TIER2" },
        { label: "Aftermarket", value: "AFTER" },
      ], showInList: true, filterable: true, importable: true, group: "Identity" },
      { key: "country", label: "Country", type: "select", options: COUNTRIES, showInList: true, filterable: true, importable: true, group: "Address" },
      { key: "gstin", label: "GSTIN / Tax ID", type: "text", importable: true, group: "Compliance" },
      { key: "credit_limit", label: "Credit Limit", type: "currency", importable: true, group: "Commercial" },
      { key: "payment_terms", label: "Payment Terms", type: "text", placeholder: "e.g. Net 45", importable: true, group: "Commercial" },
      { key: "email", label: "Primary Email", type: "email", importable: true, group: "Contact" },
      { key: "phone", label: "Primary Phone", type: "phone", importable: true, group: "Contact" },
      { key: "active", label: "Active", type: "boolean", defaultValue: true, filterable: true, group: "Status" },
      { key: "notes", label: "Notes", type: "textarea", span: 2, group: "Status" },
    ],
  },
  {
    key: "suppliers",
    name: "Supplier",
    pluralName: "Suppliers",
    description: "Raw material and component vendors.",
    icon: Truck,
    accentClass: "bg-info/10 text-info",
    codePrefix: "SUP",
    requiresApproval: true,
    approvalSteps: ["Purchase Review", "Quality Review", "Finance Review"],
    titleField: "name",
    fields: [
      { key: "name", label: "Supplier Name", type: "text", required: true, showInList: true, searchable: true, importable: true, group: "Identity", span: 2 },
      { key: "category", label: "Category", type: "select", options: [
        { label: "Raw Material", value: "RAW" },
        { label: "Consumables", value: "CONS" },
        { label: "Services", value: "SVC" },
        { label: "Capital Goods", value: "CAP" },
      ], showInList: true, filterable: true, importable: true, group: "Identity" },
      { key: "country", label: "Country", type: "select", options: COUNTRIES, showInList: true, filterable: true, importable: true, group: "Address" },
      { key: "gstin", label: "GSTIN / Tax ID", type: "text", importable: true, group: "Compliance" },
      { key: "rating", label: "Rating", type: "select", options: [
        { label: "A", value: "A" }, { label: "B", value: "B" }, { label: "C", value: "C" },
      ], showInList: true, filterable: true, importable: true, group: "Performance" },
      { key: "lead_time_days", label: "Lead Time (days)", type: "number", importable: true, group: "Performance" },
      { key: "email", label: "Primary Email", type: "email", importable: true, group: "Contact" },
      { key: "phone", label: "Primary Phone", type: "phone", importable: true, group: "Contact" },
      { key: "active", label: "Active", type: "boolean", defaultValue: true, filterable: true, group: "Status" },
    ],
  },
  {
    key: "items",
    name: "Item",
    pluralName: "Items",
    description: "Raw materials, components, sub-assemblies and finished goods.",
    icon: Package,
    accentClass: "bg-accent/15 text-accent-foreground",
    codePrefix: "ITM",
    requiresApproval: false,
    titleField: "description",
    fields: [
      { key: "description", label: "Description", type: "text", required: true, showInList: true, searchable: true, importable: true, group: "General", span: 2 },
      { key: "category", label: "Category", type: "select", options: [
        { label: "Raw Material", value: "RAW" },
        { label: "Component", value: "COMP" },
        { label: "Sub-Assembly", value: "SUB" },
        { label: "Finished Good", value: "FG" },
      ], required: true, showInList: true, filterable: true, importable: true, group: "General" },
      { key: "uom", label: "Unit of Measure", type: "select", options: [
        { label: "Each", value: "EA" }, { label: "Kg", value: "KG" }, { label: "Meter", value: "M" }, { label: "Litre", value: "L" },
      ], required: true, showInList: true, importable: true, group: "General" },
      { key: "hsn_code", label: "HSN Code", type: "text", importable: true, group: "Compliance" },
      { key: "std_cost", label: "Standard Cost", type: "currency", showInList: true, importable: true, group: "Costing" },
      { key: "reorder_level", label: "Reorder Level", type: "number", importable: true, group: "Inventory" },
      { key: "shelf_life_days", label: "Shelf Life (days)", type: "number", importable: true, group: "Inventory" },
      { key: "active", label: "Active", type: "boolean", defaultValue: true, filterable: true, group: "Status" },
    ],
  },
  {
    key: "employees",
    name: "Employee",
    pluralName: "Employees",
    description: "Workforce master across departments.",
    icon: UserSquare2,
    accentClass: "bg-success/10 text-success",
    codePrefix: "EMP",
    requiresApproval: true,
    approvalSteps: ["HR Review"],
    titleField: "full_name",
    fields: [
      { key: "full_name", label: "Full Name", type: "text", required: true, showInList: true, searchable: true, importable: true, group: "Identity", span: 2 },
      { key: "department", label: "Department", type: "select", options: [
        { label: "Engineering", value: "ENG" },
        { label: "Production", value: "PROD" },
        { label: "Quality", value: "QC" },
        { label: "Sales", value: "SALES" },
        { label: "Finance", value: "FIN" },
        { label: "HR", value: "HR" },
      ], showInList: true, filterable: true, importable: true, group: "Identity" },
      { key: "designation", label: "Designation", type: "text", showInList: true, importable: true, group: "Identity" },
      { key: "date_of_joining", label: "Date of Joining", type: "date", importable: true, group: "Employment" },
      { key: "email", label: "Work Email", type: "email", importable: true, group: "Contact" },
      { key: "phone", label: "Phone", type: "phone", importable: true, group: "Contact" },
      { key: "active", label: "Active", type: "boolean", defaultValue: true, filterable: true, group: "Status" },
    ],
  },
  {
    key: "machines",
    name: "Machine",
    pluralName: "Machines",
    description: "Shop-floor assets, cells and stations.",
    icon: Cog,
    accentClass: "bg-warning/10 text-warning",
    codePrefix: "MCH",
    requiresApproval: false,
    titleField: "name",
    fields: [
      { key: "name", label: "Machine Name", type: "text", required: true, showInList: true, searchable: true, importable: true, group: "Identity", span: 2 },
      { key: "type", label: "Type", type: "select", options: [
        { label: "Weld Cell", value: "WELD" },
        { label: "Press", value: "PRESS" },
        { label: "CNC", value: "CNC" },
        { label: "Assembly", value: "ASM" },
      ], showInList: true, filterable: true, importable: true, group: "Identity" },
      { key: "location", label: "Location", type: "text", showInList: true, filterable: true, importable: true, group: "Identity" },
      { key: "capacity_per_hour", label: "Capacity / Hour", type: "number", importable: true, group: "Capability" },
      { key: "commissioned_on", label: "Commissioned On", type: "date", importable: true, group: "Lifecycle" },
      { key: "active", label: "Operational", type: "boolean", defaultValue: true, filterable: true, group: "Status" },
    ],
  },
];

export function findMaster(key: string) {
  return MASTERS.find((m) => m.key === key) ?? null;
}
