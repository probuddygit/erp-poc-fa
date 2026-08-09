/**
 * Export / print / share helpers shared by Reports and Administration.
 * Everything is client-side so the demo works with no backend dependency.
 */
import { toast } from "sonner";
import { labelize, type Row } from "./datasets";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function cell(v: unknown) {
  if (v === null || v === undefined) return "";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

function slug(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "export";
}

export function toCsv(rows: Row[], columns?: string[]) {
  const cols = columns?.length ? columns : Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    const s = cell(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map(labelize).join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function exportCsvRows(name: string, rows: Row[], columns?: string[]) {
  if (!rows.length) return toast.error("Nothing to export");
  download(new Blob([toCsv(rows, columns)], { type: "text/csv;charset=utf-8" }), `${slug(name)}.csv`);
  toast.success(`${rows.length} rows exported to CSV`);
}

function tableHtml(title: string, rows: Row[], columns?: string[], subtitle?: string) {
  const cols = columns?.length ? columns : Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;margin:28px}
    h1{font-size:18px;margin:0 0 2px}
    .sub{font-size:11px;color:#64748b;margin-bottom:14px}
    table{border-collapse:collapse;width:100%;font-size:11px}
    th{background:#0f2a4a;color:#fff;text-align:left;padding:6px 8px;font-weight:600}
    td{border-bottom:1px solid #e2e8f0;padding:5px 8px}
    tr:nth-child(even) td{background:#f8fafc}
    .foot{margin-top:16px;font-size:10px;color:#94a3b8}
  </style></head><body>
  <h1>${title}</h1>
  <div class="sub">${subtitle ?? ""}${subtitle ? " · " : ""}Faith Automation ERP · generated ${new Date().toLocaleString("en-IN")} · ${rows.length} rows</div>
  <table><thead><tr>${cols.map((c) => `<th>${labelize(c)}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${cell(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>
  <div class="foot">Confidential — Faith Automation Pvt. Ltd.</div>
  </body></html>`;
}

export function exportExcelRows(name: string, rows: Row[], columns?: string[]) {
  if (!rows.length) return toast.error("Nothing to export");
  const html = tableHtml(name, rows, columns);
  download(new Blob([html], { type: "application/vnd.ms-excel" }), `${slug(name)}.xls`);
  toast.success(`${rows.length} rows exported to Excel`);
}

export function printRows(name: string, rows: Row[], columns?: string[], subtitle?: string) {
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return toast.error("Pop-up blocked — allow pop-ups to print");
  w.document.write(tableHtml(name, rows, columns, subtitle));
  w.document.close();
  setTimeout(() => w.print(), 350);
}

/** "Download PDF" — opens the print dialog with Save-as-PDF as destination. */
export function exportPdfRows(name: string, rows: Row[], columns?: string[], subtitle?: string) {
  if (!rows.length) return toast.error("Nothing to export");
  printRows(name, rows, columns, subtitle);
  toast.success("Print dialog opened — choose “Save as PDF”");
}

export function emailRows(name: string, rows: Row[], to = "", columns?: string[]) {
  const cols = columns?.length ? columns : Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).slice(0, 6);
  const preview = rows
    .slice(0, 12)
    .map((r) => cols.map((c) => `${labelize(c)}: ${cell(r[c])}`).join(" | "))
    .join("\n");
  const body = `Report: ${name}\nGenerated: ${new Date().toLocaleString("en-IN")}\nRows: ${rows.length}\n\n${preview}${rows.length > 12 ? `\n… ${rows.length - 12} more rows in the attached export.` : ""}\n\n— Faith Automation ERP`;
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(`[Faith ERP] ${name}`)}&body=${encodeURIComponent(body)}`;
  toast.success("Email draft prepared");
}

export async function copyRows(rows: Row[], columns?: string[]) {
  try {
    await navigator.clipboard.writeText(toCsv(rows, columns));
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Clipboard unavailable");
  }
}

/** Parse a pasted / uploaded CSV into rows. */
export function parseCsv(text: string): Row[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
      } else if (ch === "," && !quoted) { out.push(cur); cur = ""; } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const header = split(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const cells = split(l);
    const row: Row = {};
    header.forEach((h, i) => { row[h] = cells[i]?.trim() ?? ""; });
    return row;
  });
}

export function readFileText(accept = ".csv"): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, text: String(reader.result ?? "") });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
