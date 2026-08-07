/**
 * Printable / emailable project documents — status reports, milestone
 * completion certificates, executive summaries and portfolio reports.
 * Reuses the shared document renderer used across Quality and Procurement.
 */
import type { QualityDocument } from "@/lib/quality/documents";
import type {
  Project,
  WbsNode,
  Milestone,
  Risk,
  Issue,
  ChangeRequest,
  BudgetLine,
  TeamMember,
} from "./types";
import {
  projectEvm,
  projectHealth,
  statusNarrative,
  delayedTasks,
  nextBestActions,
  type Evm,
} from "./intelligence";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const dt = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export interface ProjectBundle {
  project: Project;
  wbs: WbsNode[];
  milestones: Milestone[];
  risks: Risk[];
  issues: Issue[];
  changes: ChangeRequest[];
  budget: BudgetLine[];
  team: TeamMember[];
}

export function projectStatusReport(b: ProjectBundle): QualityDocument {
  const evm: Evm = projectEvm(b.project, b.wbs, b.budget);
  const health = projectHealth(b.project, evm, b.risks, b.issues, b.changes, b.milestones);
  const delayed = delayedTasks(b.wbs);
  const actions = nextBestActions(
    b.project,
    evm,
    b.wbs,
    b.milestones,
    b.risks,
    b.issues,
    b.changes,
    b.team,
  );

  return {
    kind: "Project Status Report",
    docNo: `${b.project.code}-STATUS`,
    title: `${b.project.name} — ${b.project.customerName}`,
    meta: [
      { label: "Project Manager", value: b.project.manager },
      { label: "Status", value: b.project.status },
      { label: "Health Score", value: `${health.score}/100 (${health.rag})` },
      { label: "Baseline", value: `${dt(b.project.startDate)} → ${dt(b.project.endDate)}` },
      { label: "Forecast Finish", value: dt(evm.forecastFinish) },
      { label: "Progress", value: `${evm.actualPct}% actual vs ${evm.plannedPct}% planned` },
      { label: "SPI / CPI", value: `${evm.spi} / ${evm.cpi}` },
      { label: "Contract Value", value: inr(b.project.value) },
      { label: "Budget (BAC)", value: inr(evm.bac) },
      { label: "Actual Cost (AC)", value: inr(evm.ac) },
      { label: "Estimate at Completion", value: inr(evm.eac) },
      { label: "Forecast Margin", value: `${evm.profitability}%` },
      {
        label: "Open Risks / Issues",
        value: `${b.risks.filter((r) => r.status === "open").length} / ${b.issues.filter((i) => i.status !== "resolved").length}`,
      },
      {
        label: "Change Requests",
        value: `${b.changes.length} raised · ${b.changes.filter((c) => c.status === "approved").length} approved`,
      },
    ],
    table: {
      columns: ["Milestone", "Due", "Status", "Billing"],
      rows: b.milestones.map((m) => [
        m.name,
        dt(m.due),
        m.status,
        m.billing ? inr(m.billing) : "—",
      ]),
    },
    notes: [
      {
        label: "Executive summary",
        value: statusNarrative(b.project, evm, health, b.milestones, b.risks, b.issues),
      },
      {
        label: "Schedule exceptions",
        value: delayed.length
          ? delayed
              .slice(0, 5)
              .map(
                (t) =>
                  `${t.code} ${t.name} — ${t.slipDays}d (${t.reason})${t.onCriticalPath ? " [critical path]" : ""}`,
              )
              .join("; ")
          : "No tasks behind plan.",
      },
      {
        label: "Recommended actions",
        value: actions.map((a) => `${a.title} — ${a.detail}`).join(" | "),
      },
    ],
    filename: `${b.project.code}-status-report`,
  };
}

export function milestoneCertificate(project: Project, m: Milestone): QualityDocument {
  return {
    kind: "Milestone Completion Certificate",
    docNo: `${project.code}-MS-${m.name.slice(0, 12).toUpperCase().replace(/\s+/g, "-")}`,
    title: `${m.name} — ${project.name}`,
    meta: [
      { label: "Project", value: `${project.code} — ${project.name}` },
      { label: "Customer", value: project.customerName },
      { label: "Project Manager", value: project.manager },
      { label: "Milestone", value: m.name },
      { label: "Planned Due", value: dt(m.due) },
      { label: "Status", value: m.status },
      { label: "Billing Value", value: m.billing ? inr(m.billing) : "—" },
    ],
    notes: [
      {
        label: "Declaration",
        value: `The deliverables associated with ${m.name} have been completed in accordance with the contract scope and are submitted for customer acceptance.`,
      },
      {
        label: "Customer sign-off",
        value:
          "Name: ____________________   Designation: ____________________   Date: ____________",
      },
      {
        label: "Billing instruction",
        value: m.billing
          ? `On acceptance, Finance is authorised to invoice ${inr(m.billing)} against this milestone.`
          : "No billing linked to this milestone.",
      },
    ],
    filename: `${project.code}-${m.name.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}-certificate`,
  };
}

export function portfolioReport(bundles: ProjectBundle[]): QualityDocument {
  const rows = bundles.map((b) => {
    const evm = projectEvm(b.project, b.wbs, b.budget);
    const health = projectHealth(b.project, evm, b.risks, b.issues, b.changes, b.milestones);
    return [
      b.project.code,
      b.project.name,
      b.project.customerName,
      `${health.score} (${health.rag})`,
      String(evm.spi),
      String(evm.cpi),
      inr(b.project.value),
      inr(evm.eac),
      `${evm.profitability}%`,
      dt(evm.forecastFinish),
    ];
  });
  const totalValue = bundles.reduce((s, b) => s + b.project.value, 0);
  return {
    kind: "Portfolio Performance Report",
    docNo: `PORTFOLIO-${new Date().toISOString().slice(0, 10)}`,
    title: "Project Systems — portfolio performance and forecast",
    meta: [
      { label: "Projects", value: String(bundles.length) },
      { label: "Order Book", value: inr(totalValue) },
      { label: "Generated", value: dt(new Date().toISOString()) },
    ],
    table: {
      columns: [
        "Code",
        "Project",
        "Customer",
        "Health",
        "SPI",
        "CPI",
        "Value",
        "EAC",
        "Margin",
        "Forecast Finish",
      ],
      rows,
    },
    filename: `portfolio-performance-${new Date().toISOString().slice(0, 10)}`,
  };
}

/** CSV export for Excel — used by the Export CTA. */
export function downloadCsv(
  filename: string,
  columns: string[],
  rows: Array<Array<string | number>>,
) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open the mail client with a pre-composed project update. */
export function emailDocument(doc: QualityDocument, to = "") {
  const body = [
    doc.title,
    "",
    ...doc.meta.map((m) => `${m.label}: ${m.value}`),
    "",
    ...(doc.notes ?? []).map((n) => `${n.label}:\n${n.value}`),
  ].join("\n");
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(`${doc.kind} — ${doc.docNo}`)}&body=${encodeURIComponent(body)}`;
}
