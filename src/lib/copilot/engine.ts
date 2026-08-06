// AI Executive Copilot — deterministic query engine over local ERP stores.
// Returns rich response cards (KPIs, tables, charts, references) that the chat UI renders.
import { projectsStore } from "@/lib/projects/store";
import { crm } from "@/lib/crm/store";
import { plmStore } from "@/lib/plm/store";
import { predictiveAnswer, PREDICTIVE_SUGGESTIONS } from "./predictive";

export type Reference = { label: string; to: string };

export type KpiCard = {
  kind: "kpi";
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "warning" | "danger";
};

export type TableCard = {
  kind: "table";
  title: string;
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string | number>[];
  emptyText?: string;
};

export type ChartCard = {
  kind: "chart";
  chart: "bar" | "pie";
  title: string;
  data: { name: string; value: number; tone?: string }[];
};

export type TextCard = { kind: "text"; body: string };

export type ResponseCard = KpiCard | TableCard | ChartCard | TextCard;

export interface CopilotResponse {
  headline: string;
  summary: string;
  cards: ResponseCard[];
  references: Reference[];
  followUps: string[];
}

const inr = (n: number) =>
  n >= 1e7
    ? `₹${(n / 1e7).toFixed(2)}Cr`
    : n >= 1e5
      ? `₹${(n / 1e5).toFixed(1)}L`
      : `₹${n.toLocaleString("en-IN")}`;

const pct = (n: number) => `${n.toFixed(1)}%`;

function match(q: string, ...keys: string[]) {
  const s = q.toLowerCase();
  return keys.some((k) => s.includes(k));
}

// ─── Handlers ──────────────────────────────────────────────────────────────

function delayedProjects(): CopilotResponse {
  const { projects } = projectsStore.get();
  const today = Date.now();
  const delayed = projects
    .filter((p) => p.status !== "closed")
    .map((p) => {
      const end = new Date(p.endDate).getTime();
      const daysLeft = Math.round((end - today) / 86400000);
      const expectedProgress = Math.max(
        0,
        Math.min(
          100,
          ((today - new Date(p.startDate).getTime()) / (end - new Date(p.startDate).getTime())) *
            100,
        ),
      );
      const slip = expectedProgress - p.progress;
      return { p, daysLeft, slip };
    })
    .filter(({ p, slip }) => p.rag !== "green" || slip > 10)
    .sort((a, b) => b.slip - a.slip);

  return {
    headline: `${delayed.length} projects at risk of slipping`,
    summary:
      delayed.length === 0
        ? "All active projects are tracking green with progress at or above plan."
        : `${delayed.filter((d) => d.p.rag === "red").length} red, ${delayed.filter((d) => d.p.rag === "amber").length} amber. Sorted by schedule slip vs plan.`,
    cards: [
      {
        kind: "kpi",
        label: "Delayed",
        value: String(delayed.length),
        tone: delayed.length > 0 ? "warning" : "positive",
      },
      {
        kind: "kpi",
        label: "Red RAG",
        value: String(delayed.filter((d) => d.p.rag === "red").length),
        tone: "danger",
      },
      {
        kind: "kpi",
        label: "Avg slip",
        value: delayed.length
          ? `${(delayed.reduce((a, b) => a + b.slip, 0) / delayed.length).toFixed(1)} pts`
          : "0",
      },
      {
        kind: "table",
        title: "Projects behind plan",
        columns: [
          { key: "code", label: "Code" },
          { key: "name", label: "Project" },
          { key: "rag", label: "RAG" },
          { key: "progress", label: "Progress", align: "right" },
          { key: "slip", label: "Slip vs plan", align: "right" },
          { key: "days", label: "Days to due", align: "right" },
        ],
        rows: delayed.slice(0, 8).map(({ p, slip, daysLeft }) => ({
          code: p.code,
          name: p.name,
          rag: p.rag.toUpperCase(),
          progress: `${p.progress}%`,
          slip: slip > 0 ? `+${slip.toFixed(0)} pts` : `${slip.toFixed(0)} pts`,
          days: daysLeft,
        })),
        emptyText: "No delayed projects.",
      },
    ],
    references: delayed
      .slice(0, 5)
      .map(({ p }) => ({ label: `${p.code} · ${p.name}`, to: `/projects/${p.id}` })),
    followUps: [
      "Show budget variance",
      "Which projects have procurement delays?",
      "Show engineering bottlenecks",
    ],
  };
}

function budgetVariance(): CopilotResponse {
  const { projects } = projectsStore.get();
  const active = projects.filter((p) => p.status !== "closed");
  const rows = active
    .map((p) => {
      const variance = p.spent - p.budget * (p.progress / 100);
      const util = p.budget ? (p.spent / p.budget) * 100 : 0;
      return { p, variance, util };
    })
    .sort((a, b) => b.variance - a.variance);

  const totalBudget = active.reduce((a, p) => a + p.budget, 0);
  const totalSpent = active.reduce((a, p) => a + p.spent, 0);
  const overrun = rows.filter((r) => r.variance > 0);

  return {
    headline: `${inr(totalSpent)} spent of ${inr(totalBudget)} planned`,
    summary: `${overrun.length} projects are spending faster than earned progress. Portfolio consumption at ${pct(
      (totalSpent / totalBudget) * 100,
    )}.`,
    cards: [
      { kind: "kpi", label: "Portfolio Budget", value: inr(totalBudget) },
      {
        kind: "kpi",
        label: "Spent",
        value: inr(totalSpent),
        tone: totalSpent > totalBudget * 0.9 ? "warning" : "default",
      },
      {
        kind: "kpi",
        label: "Overrun projects",
        value: String(overrun.length),
        tone: overrun.length ? "danger" : "positive",
      },
      {
        kind: "chart",
        chart: "bar",
        title: "Cost variance by project (₹L)",
        data: rows.slice(0, 8).map((r) => ({
          name: r.p.code,
          value: Math.round(r.variance / 1e5),
          tone: r.variance > 0 ? "danger" : "positive",
        })),
      },
      {
        kind: "table",
        title: "Budget vs Actual",
        columns: [
          { key: "code", label: "Code" },
          { key: "name", label: "Project" },
          { key: "budget", label: "Budget", align: "right" },
          { key: "spent", label: "Spent", align: "right" },
          { key: "util", label: "Utilization", align: "right" },
          { key: "var", label: "Variance", align: "right" },
        ],
        rows: rows.slice(0, 8).map((r) => ({
          code: r.p.code,
          name: r.p.name,
          budget: inr(r.p.budget),
          spent: inr(r.p.spent),
          util: pct(r.util),
          var: (r.variance > 0 ? "+" : "") + inr(Math.round(r.variance)),
        })),
      },
    ],
    references: rows
      .slice(0, 5)
      .map((r) => ({ label: `${r.p.code} · ${r.p.name}`, to: `/projects/${r.p.id}` })),
    followUps: [
      "Which projects are delayed?",
      "Show engineering bottlenecks",
      "Which RFQs are pending?",
    ],
  };
}

function pendingRfqs(): CopilotResponse {
  const state = crm.get();
  const open = state.rfqs.filter((r) => r.status === "received" || r.status === "in-review");
  const today = Date.now();
  const enriched = open
    .map((r) => ({ r, daysToDue: Math.round((new Date(r.dueDate).getTime() - today) / 86400000) }))
    .sort((a, b) => a.daysToDue - b.daysToDue);

  const overdue = enriched.filter((e) => e.daysToDue < 0).length;
  const totalValue = state.opportunities
    .filter((o) => open.some((r) => r.opportunityId === o.id))
    .reduce((a, o) => a + o.value, 0);

  return {
    headline: `${open.length} RFQs pending response`,
    summary: `${overdue} are past their due date. Linked opportunity value ≈ ${inr(totalValue)}.`,
    cards: [
      {
        kind: "kpi",
        label: "Open RFQs",
        value: String(open.length),
        tone: open.length ? "warning" : "positive",
      },
      {
        kind: "kpi",
        label: "Overdue",
        value: String(overdue),
        tone: overdue ? "danger" : "positive",
      },
      { kind: "kpi", label: "Linked pipeline", value: inr(totalValue) },
      {
        kind: "chart",
        chart: "pie",
        title: "RFQs by status",
        data: [
          { name: "Received", value: state.rfqs.filter((r) => r.status === "received").length },
          { name: "In review", value: state.rfqs.filter((r) => r.status === "in-review").length },
          { name: "Responded", value: state.rfqs.filter((r) => r.status === "responded").length },
          { name: "Closed", value: state.rfqs.filter((r) => r.status === "closed").length },
        ],
      },
      {
        kind: "table",
        title: "RFQs awaiting action",
        columns: [
          { key: "code", label: "RFQ" },
          { key: "customer", label: "Customer" },
          { key: "title", label: "Title" },
          { key: "owner", label: "Owner" },
          { key: "due", label: "Due (days)", align: "right" },
          { key: "status", label: "Status" },
        ],
        rows: enriched.slice(0, 8).map((e) => ({
          code: e.r.code,
          customer: e.r.customerName,
          title: e.r.title,
          owner: e.r.owner,
          due: e.daysToDue,
          status: e.r.status,
        })),
      },
    ],
    references: enriched
      .slice(0, 5)
      .map((e) => ({ label: `${e.r.code} · ${e.r.customerName}`, to: `/crm/rfqs/${e.r.id}` })),
    followUps: [
      "Show budget variance",
      "Which projects are delayed?",
      "Show engineering bottlenecks",
    ],
  };
}

function procurementDelays(): CopilotResponse {
  const { projects, risks, issues } = projectsStore.get();
  const supplierRisks = risks.filter((r) => r.category === "Supplier" && r.status !== "closed");
  const affected = new Set(supplierRisks.map((r) => r.projectId));
  const openIssues = issues.filter(
    (i) => i.status !== "resolved" && /supplier|material|vendor|delivery|procure/i.test(i.title),
  );
  openIssues.forEach((i) => affected.add(i.projectId));

  const rows = projects
    .filter((p) => affected.has(p.id))
    .map((p) => ({
      p,
      riskCount: supplierRisks.filter((r) => r.projectId === p.id).length,
      issueCount: openIssues.filter((i) => i.projectId === p.id).length,
    }));

  return {
    headline: `${affected.size} projects impacted by procurement`,
    summary: `${supplierRisks.length} open supplier risks and ${openIssues.length} live procurement issues across the portfolio.`,
    cards: [
      {
        kind: "kpi",
        label: "Impacted projects",
        value: String(affected.size),
        tone: affected.size ? "warning" : "positive",
      },
      {
        kind: "kpi",
        label: "Supplier risks",
        value: String(supplierRisks.length),
        tone: "warning",
      },
      { kind: "kpi", label: "Open issues", value: String(openIssues.length) },
      {
        kind: "table",
        title: "Projects flagged for procurement delay",
        columns: [
          { key: "code", label: "Code" },
          { key: "name", label: "Project" },
          { key: "rag", label: "RAG" },
          { key: "risks", label: "Supplier risks", align: "right" },
          { key: "issues", label: "Open issues", align: "right" },
        ],
        rows: rows.map((r) => ({
          code: r.p.code,
          name: r.p.name,
          rag: r.p.rag.toUpperCase(),
          risks: r.riskCount,
          issues: r.issueCount,
        })),
        emptyText: "No procurement flags detected.",
      },
    ],
    references: rows
      .slice(0, 5)
      .map((r) => ({ label: `${r.p.code} · ${r.p.name}`, to: `/projects/${r.p.id}` })),
    followUps: [
      "Which projects are delayed?",
      "Show budget variance",
      "Show engineering bottlenecks",
    ],
  };
}

function engineeringBottlenecks(): CopilotResponse {
  const { ecns, ecrs, reviews, drawings } = plmStore.get();
  const openEcns = ecns.filter((e) => e.status === "draft" || e.status === "pending");
  const openEcrs = ecrs.filter((e) => e.status === "draft" || e.status === "under-review");
  const pendingReviews = reviews.filter((r) => r.outcome === "Pending");
  const stalledDrawings = drawings.filter(
    (d) => d.status === "In Work" || d.status === "Under Review",
  );

  return {
    headline: `${openEcns.length + openEcrs.length} engineering changes waiting`,
    summary: `${openEcns.length} ECNs and ${openEcrs.length} ECRs pending. ${pendingReviews.length} design reviews unresolved. ${stalledDrawings.length} drawings not yet released.`,
    cards: [
      {
        kind: "kpi",
        label: "Pending ECN",
        value: String(openEcns.length),
        tone: openEcns.length ? "warning" : "positive",
      },
      {
        kind: "kpi",
        label: "Pending ECR",
        value: String(openEcrs.length),
        tone: openEcrs.length ? "warning" : "positive",
      },
      { kind: "kpi", label: "Design reviews open", value: String(pendingReviews.length) },
      { kind: "kpi", label: "Drawings unreleased", value: String(stalledDrawings.length) },
      {
        kind: "chart",
        chart: "bar",
        title: "Engineering backlog",
        data: [
          { name: "ECN", value: openEcns.length, tone: "warning" },
          { name: "ECR", value: openEcrs.length, tone: "warning" },
          { name: "Reviews", value: pendingReviews.length },
          { name: "Drawings", value: stalledDrawings.length },
        ],
      },
      {
        kind: "table",
        title: "Top blocking items",
        columns: [
          { key: "type", label: "Type" },
          { key: "code", label: "ID" },
          { key: "title", label: "Title" },
          { key: "status", label: "Status" },
        ],
        rows: [
          ...openEcns
            .slice(0, 4)
            .map((e) => ({ type: "ECN", code: e.code, title: e.title, status: e.status })),
          ...openEcrs
            .slice(0, 3)
            .map((e) => ({ type: "ECR", code: e.code, title: e.title, status: e.status })),
          ...pendingReviews
            .slice(0, 2)
            .map((r) => ({ type: "Review", code: r.code, title: r.title, status: "pending" })),
        ],
      },
    ],
    references: [
      { label: "ECN queue", to: "/engineering/ecns" },
      { label: "ECR queue", to: "/engineering/ecrs" },
      { label: "Design reviews", to: "/engineering/reviews" },
      { label: "Drawing repository", to: "/engineering/drawings" },
    ],
    followUps: ["Which projects are delayed?", "Show budget variance", "Which RFQs are pending?"],
  };
}

function portfolioSummary(): CopilotResponse {
  const { projects } = projectsStore.get();
  const crmState = crm.get();
  const active = projects.filter((p) => p.status !== "closed");
  return {
    headline: "Portfolio at a glance",
    summary: `${active.length} active projects, ${crmState.opportunities.length} live opportunities, ${crmState.rfqs.filter((r) => r.status !== "closed").length} open RFQs.`,
    cards: [
      { kind: "kpi", label: "Active projects", value: String(active.length) },
      { kind: "kpi", label: "Order book", value: inr(active.reduce((a, p) => a + p.value, 0)) },
      {
        kind: "kpi",
        label: "Open pipeline",
        value: inr(crmState.opportunities.reduce((a, o) => a + o.value, 0)),
      },
      {
        kind: "chart",
        chart: "pie",
        title: "Portfolio RAG",
        data: [
          { name: "Green", value: active.filter((p) => p.rag === "green").length },
          { name: "Amber", value: active.filter((p) => p.rag === "amber").length },
          { name: "Red", value: active.filter((p) => p.rag === "red").length },
        ],
      },
    ],
    references: [
      { label: "Executive dashboard", to: "/" },
      { label: "Project portfolio", to: "/projects" },
      { label: "Revenue lifecycle", to: "/crm" },
    ],
    followUps: [
      "Which projects are delayed?",
      "Show budget variance",
      "Which RFQs are pending?",
      "Show engineering bottlenecks",
    ],
  };
}

// ─── Router ────────────────────────────────────────────────────────────────

export function answer(query: string): CopilotResponse {
  const q = query.trim();
  if (!q) return portfolioSummary();

  const predictive = predictiveAnswer(q);
  if (predictive) return predictive;

  if (match(q, "delay", "slip", "late", "behind")) return delayedProjects();
  if (match(q, "budget", "variance", "cost", "overrun", "spend")) return budgetVariance();
  if (match(q, "rfq", "quotation pending", "quote pending")) return pendingRfqs();
  if (match(q, "procure", "supplier", "vendor", "material")) return procurementDelays();
  if (match(q, "engineer", "ecn", "ecr", "bom", "drawing", "design review", "bottleneck"))
    return engineeringBottlenecks();
  if (match(q, "summary", "overview", "portfolio", "status")) return portfolioSummary();

  // Fallback: portfolio + note
  const base = portfolioSummary();
  return {
    ...base,
    headline: "Here's what I can help with",
    summary:
      "I didn't recognize that exact question, so here's a portfolio overview. Try one of the suggestions below or ask about delays, budget, RFQs, procurement, or engineering.",
  };
}

export const SUGGESTIONS: string[] = [
  ...PREDICTIVE_SUGGESTIONS.slice(0, 3),
  "Which projects are delayed?",
  "Show budget variance",
  "Which RFQs are pending?",
  "Which projects have procurement delays?",
  "Show engineering bottlenecks",
];
