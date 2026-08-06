import type { Inspection, NCR, CAPA, Checklist, Gauge } from "./types";

const COMPANY = {
  name: "Faith Automation Pvt. Ltd.",
  line1: "BIW Systems & Industrial Automation",
  line2: "Plot 42, MIDC Chakan, Pune 410501, India",
};

export interface QualityDocument {
  kind: string;
  docNo: string;
  title: string;
  meta: Array<{ label: string; value: string }>;
  table?: { columns: string[]; rows: string[][] };
  notes?: Array<{ label: string; value: string }>;
  filename: string;
}

const d = (v?: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function inspectionDocument(i: Inspection, plan?: Checklist): QualityDocument {
  return {
    kind: "Inspection Report",
    docNo: i.code,
    title: `${i.stage.replace("-", " ")} inspection — ${i.itemDescription}`,
    meta: [
      { label: "Stage", value: i.stage },
      { label: "Reference", value: `${i.refType} ${i.refCode}` },
      { label: "Item", value: `${i.itemCode} — ${i.itemDescription}` },
      { label: "Quantity", value: `${i.qty} ${i.uom}` },
      { label: "Vendor / Project", value: i.vendorName ?? i.projectCode ?? "—" },
      { label: "Inspector", value: i.inspector },
      { label: "Inspection Plan", value: `${i.checklistCode}${plan ? ` (${plan.revision})` : ""}` },
      { label: "Scheduled", value: d(i.scheduledFor) },
      { label: "Completed", value: d(i.completedAt) },
      { label: "Result", value: i.status.toUpperCase() },
      { label: "Pass Rate", value: `${i.passRate}%` },
      { label: "Defects (C/M/m)", value: `${i.criticalDefects} / ${i.majorDefects} / ${i.minorDefects}` },
      { label: "Linked NCR", value: i.ncrCode ?? "—" },
    ],
    table: plan
      ? {
          columns: ["#", "Parameter", "Type", "Method", "Nominal", "LSL / USL", "Critical"],
          rows: plan.checks.map((c, n) => [
            String(n + 1),
            c.parameter,
            c.type,
            c.method,
            `${c.nominal ?? "—"} ${c.unit ?? ""}`.trim(),
            c.lsl !== undefined || c.usl !== undefined ? `${c.lsl ?? "—"} / ${c.usl ?? "—"}` : "—",
            c.critical ? "Yes" : "No",
          ]),
        }
      : undefined,
    notes: i.remarks ? [{ label: "Remarks", value: i.remarks }] : undefined,
    filename: `${i.code}-inspection-report.html`,
  };
}

export function ncrDocument(n: NCR): QualityDocument {
  return {
    kind: "Non-Conformance Report",
    docNo: n.code,
    title: n.itemDescription,
    meta: [
      { label: "Raised On", value: d(n.raisedAt) },
      { label: "Raised By", value: n.raisedBy },
      { label: "Source", value: n.source },
      { label: "Item", value: `${n.itemCode} — ${n.itemDescription}` },
      { label: "Quantity", value: `${n.qty} ${n.uom}` },
      { label: "Vendor / Project", value: n.vendorName ?? n.projectCode ?? "—" },
      { label: "Severity", value: n.severity.toUpperCase() },
      { label: "Disposition", value: n.disposition?.replace(/-/g, " ") ?? "Pending" },
      { label: "Status", value: n.status },
      { label: "Cost Impact", value: `INR ${n.costImpact.toLocaleString("en-IN")}` },
      { label: "Source Inspection", value: n.inspectionCode ?? "—" },
      { label: "Linked CAPA", value: n.linkedCapa ?? "—" },
    ],
    notes: [
      { label: "Defect", value: n.defect },
      ...(n.containment ? [{ label: "Containment", value: n.containment }] : []),
    ],
    filename: `${n.code}-ncr.html`,
  };
}

export function capaDocument(c: CAPA): QualityDocument {
  return {
    kind: "CAPA / 8D Report",
    docNo: c.code,
    title: c.title,
    meta: [
      { label: "Owner", value: c.owner },
      { label: "Team", value: c.team.join(", ") || "—" },
      { label: "Linked NCR", value: c.ncrCode ?? "—" },
      { label: "Opened", value: d(c.openedAt) },
      { label: "Target Close", value: d(c.targetClose) },
      { label: "Actual Close", value: d(c.actualClose) },
      { label: "Stage", value: c.stage },
      { label: "Status", value: c.status },
      { label: "Effectiveness", value: `${c.effectivenessPct}%` },
    ],
    notes: [
      { label: "Root cause (D4)", value: c.rootCause ?? "Pending analysis" },
      { label: "Corrective action (D5)", value: c.correctiveAction ?? "—" },
      { label: "Preventive action (D7)", value: c.preventiveAction ?? "—" },
    ],
    filename: `${c.code}-capa-8d.html`,
  };
}

export function calibrationDocument(g: Gauge): QualityDocument {
  return {
    kind: "Calibration Record",
    docNo: g.code,
    title: g.name,
    meta: [
      { label: "Type", value: g.type },
      { label: "Location", value: g.location },
      { label: "Owner", value: g.owner },
      { label: "Range", value: g.range },
      { label: "Least Count", value: g.leastCount },
      { label: "Last Calibrated", value: d(g.lastCalibrated) },
      { label: "Next Due", value: d(g.nextDue) },
      { label: "Frequency", value: `${g.frequencyDays} days` },
      { label: "Provider", value: g.provider },
      { label: "Certificate", value: g.certificateNo ?? "—" },
      { label: "Status", value: g.status },
    ],
    filename: `${g.code}-calibration.html`,
  };
}

export function checklistDocument(c: Checklist): QualityDocument {
  return {
    kind: "Inspection Plan",
    docNo: c.code,
    title: c.title,
    meta: [
      { label: "Stage", value: c.stage },
      { label: "Revision", value: c.revision },
      { label: "Item", value: c.itemCode ? `${c.itemCode} — ${c.itemDescription ?? ""}` : "—" },
      { label: "Owner", value: c.owner },
      { label: "Status", value: c.status },
      { label: "Updated", value: d(c.updatedAt) },
    ],
    table: {
      columns: ["#", "Parameter", "Type", "Method", "Nominal", "LSL / USL", "Critical"],
      rows: c.checks.map((k, n) => [
        String(n + 1),
        k.parameter,
        k.type,
        k.method,
        `${k.nominal ?? "—"} ${k.unit ?? ""}`.trim(),
        k.lsl !== undefined || k.usl !== undefined ? `${k.lsl ?? "—"} / ${k.usl ?? "—"}` : "—",
        k.critical ? "Yes" : "No",
      ]),
    },
    filename: `${c.code}-${c.revision}-plan.html`,
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderQualityDocHtml(doc: QualityDocument) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.kind)} ${esc(doc.docNo)}</title>
<style>
*{box-sizing:border-box}
body{font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;color:#0f172a;margin:0;padding:32px;background:#fff}
h1{font-size:18px;margin:0 0 2px}
.head{display:flex;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:16px}
.co{font-size:12px;color:#475569;line-height:1.5}
.badge{display:inline-block;border:1px solid #0f172a;border-radius:4px;padding:2px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;margin:16px 0}
.meta div{border-bottom:1px dotted #cbd5e1;padding-bottom:4px}
.k{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;display:block}
.v{font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}
th{background:#f1f5f9;text-align:left;padding:6px;border:1px solid #cbd5e1;text-transform:uppercase;font-size:9px;letter-spacing:.06em}
td{padding:6px;border:1px solid #e2e8f0}
.note{margin-top:14px;font-size:12px}
.note .k{margin-bottom:2px}
footer{margin-top:28px;border-top:1px solid #cbd5e1;padding-top:10px;font-size:10px;color:#64748b;display:flex;justify-content:space-between}
@media print{body{padding:12mm}}
</style></head><body>
<div class="head">
  <div><h1>${esc(COMPANY.name)}</h1><div class="co">${esc(COMPANY.line1)}<br>${esc(COMPANY.line2)}</div></div>
  <div style="text-align:right">
    <span class="badge">${esc(doc.kind)}</span>
    <div style="font-size:16px;font-weight:700;margin-top:6px">${esc(doc.docNo)}</div>
    <div class="co">${esc(doc.title)}</div>
  </div>
</div>
<div class="meta">${doc.meta
    .map((m) => `<div><span class="k">${esc(m.label)}</span><span class="v">${esc(m.value)}</span></div>`)
    .join("")}</div>
${
  doc.table
    ? `<table><thead><tr>${doc.table.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${doc.table.rows
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`
    : ""
}
${(doc.notes ?? [])
    .map((n) => `<div class="note"><span class="k">${esc(n.label)}</span>${esc(n.value)}</div>`)
    .join("")}
<footer><span>Generated ${new Date().toLocaleString("en-IN")}</span><span>Quality Management · Faith Automation ERP</span></footer>
</body></html>`;
}

/** Open a print window for any quality document. */
export function printQualityDoc(doc: QualityDocument) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false;
  w.document.write(renderQualityDocHtml(doc));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

/** Download any quality document as a self-contained HTML file. */
export function downloadQualityDoc(doc: QualityDocument) {
  const url = URL.createObjectURL(
    new Blob([renderQualityDocHtml(doc)], { type: "text/html;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.filename;
  a.click();
  URL.revokeObjectURL(url);
}
