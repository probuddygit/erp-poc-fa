import type { QualityDocument } from "@/lib/quality/documents";
import type { ColDef } from "./registry";
import type { WFRecord } from "./types";

const fmt = (v: unknown, kind?: string) => {
  if (v === undefined || v === null || v === "") return "—";
  if (kind === "money") return `₹ ${Math.round(Number(v)).toLocaleString("en-IN")}`;
  if (kind === "date") {
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  return String(v);
};

/** Print / download view for any Workforce & Administration record. */
export function workforceDocument(
  kind: string,
  record: WFRecord,
  cols: ColDef[],
  resolve: (key: string, value: unknown) => string,
): QualityDocument {
  const docNo = String(record.code ?? record.id).slice(0, 24);
  const titleKey = cols.find((c) => !["code", "status"].includes(c.key));
  return {
    kind,
    docNo,
    title: titleKey ? resolve(titleKey.key, record[titleKey.key]) : docNo,
    meta: cols.slice(0, 8).map((c) => ({
      label: c.label,
      value: c.kind === "emp" ? resolve(c.key, record[c.key]) : fmt(record[c.key], c.kind),
    })),
    table: {
      columns: ["Field", "Value"],
      rows: cols.map((c) => [c.label, c.kind === "emp" ? resolve(c.key, record[c.key]) : fmt(record[c.key], c.kind)]),
    },
    notes: [
      { label: "Generated", value: new Date().toLocaleString("en-IN") },
      { label: "Source", value: "Faith Automation ERP — Workforce & Administration Suite" },
    ],
    filename: `${docNo}.html`,
  };
}
