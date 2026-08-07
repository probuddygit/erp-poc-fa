/**
 * Project intelligence engine — deterministic, grounded analytics used by the
 * Project Systems module and the AI Project Copilot. No network calls: every
 * number here is derived from the project store so the copilot cannot hallucinate.
 */
import type {
  Project,
  WbsNode,
  Milestone,
  Risk,
  Issue,
  ChangeRequest,
  TeamMember,
  BudgetLine,
  RAG,
} from "./types";
import { projectsStore, upsertProjectRecord } from "./store";

const DAY = 86_400_000;
export const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
const d = (iso: string) => new Date(iso);
const days = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export const addDays = (iso: string, n: number) =>
  new Date(d(iso).getTime() + n * DAY).toISOString().slice(0, 10);

export interface Evm {
  bac: number; // budget at completion
  pv: number; // planned value
  ev: number; // earned value
  ac: number; // actual cost
  spi: number;
  cpi: number;
  sv: number;
  cv: number;
  eac: number; // estimate at completion
  vac: number; // variance at completion
  etc: number;
  plannedPct: number;
  actualPct: number;
  scheduleSlipDays: number;
  forecastFinish: string;
  profitability: number; // forecast margin % on order value
}

/** Earned value analysis from WBS weights, budget lines and elapsed schedule. */
export function projectEvm(project: Project, wbs: WbsNode[], budget: BudgetLine[]): Evm {
  const bac = budget.length ? budget.reduce((s, b) => s + b.planned, 0) : project.budget;
  const ac = budget.length ? budget.reduce((s, b) => s + b.actual, 0) : project.spent;

  const start = d(project.startDate);
  const end = d(project.endDate);
  const totalDays = Math.max(days(start, end), 1);
  const elapsed = clamp(days(start, today()), 0, totalDays);
  const plannedPct = Math.round((elapsed / totalDays) * 100);

  const leaves = wbs.filter((w) => !wbs.some((c) => c.parentId === w.id));
  const weightTotal = leaves.reduce((s, w) => s + (w.weight || 1), 0);
  const actualPct = leaves.length
    ? Math.round(
        leaves.reduce((s, w) => s + (w.weight || 1) * w.progress, 0) / Math.max(weightTotal, 1),
      )
    : project.progress;

  const pv = (bac * plannedPct) / 100;
  const ev = (bac * actualPct) / 100;
  const spi = pv > 0 ? ev / pv : 1;
  const cpi = ac > 0 ? ev / ac : 1;
  const eac = cpi > 0 ? bac / cpi : bac;
  const remainingDays = Math.max(totalDays - elapsed, 0);
  const scheduleSlipDays =
    spi > 0 ? Math.round(remainingDays / Math.max(spi, 0.2)) - remainingDays : 0;

  return {
    bac,
    pv,
    ev,
    ac,
    spi: Number(spi.toFixed(2)),
    cpi: Number(cpi.toFixed(2)),
    sv: ev - pv,
    cv: ev - ac,
    eac,
    vac: bac - eac,
    etc: Math.max(eac - ac, 0),
    plannedPct,
    actualPct,
    scheduleSlipDays,
    forecastFinish: addDays(project.endDate, scheduleSlipDays),
    profitability:
      project.value > 0 ? Math.round(((project.value - eac) / project.value) * 100) : 0,
  };
}

export interface HealthResult {
  score: number;
  rag: RAG;
  drivers: Array<{ label: string; delta: number; detail: string }>;
}

/** Composite project health score (0–100) blending schedule, cost, risk, issues and change load. */
export function projectHealth(
  project: Project,
  evm: Evm,
  risks: Risk[],
  issues: Issue[],
  changes: ChangeRequest[],
  milestones: Milestone[],
): HealthResult {
  const drivers: HealthResult["drivers"] = [];
  let score = 100;

  const schedPenalty = Math.round(clamp((1 - evm.spi) * 120, 0, 35));
  if (schedPenalty > 0)
    drivers.push({
      label: "Schedule",
      delta: -schedPenalty,
      detail: `SPI ${evm.spi} · forecast slip ${evm.scheduleSlipDays}d`,
    });
  score -= schedPenalty;

  const costPenalty = Math.round(clamp((1 - evm.cpi) * 120, 0, 30));
  if (costPenalty > 0)
    drivers.push({
      label: "Cost",
      delta: -costPenalty,
      detail: `CPI ${evm.cpi} · EAC overrun ${Math.round(-evm.vac).toLocaleString("en-IN")}`,
    });
  score -= costPenalty;

  const openRisks = risks.filter((r) => r.status === "open");
  const critical = openRisks.filter((r) => r.probability * r.impact >= 15).length;
  const riskPenalty = Math.min(openRisks.length * 2 + critical * 5, 20);
  if (riskPenalty > 0)
    drivers.push({
      label: "Risk",
      delta: -riskPenalty,
      detail: `${openRisks.length} open · ${critical} critical`,
    });
  score -= riskPenalty;

  const openIssues = issues.filter((i) => i.status !== "resolved");
  const sevWeight = { low: 1, medium: 2, high: 4, critical: 6 } as const;
  const issuePenalty = Math.min(
    openIssues.reduce((s, i) => s + sevWeight[i.severity], 0),
    20,
  );
  if (issuePenalty > 0)
    drivers.push({
      label: "Issues",
      delta: -issuePenalty,
      detail: `${openIssues.length} unresolved`,
    });
  score -= issuePenalty;

  const missed = milestones.filter((m) => m.status === "missed").length;
  const atRisk = milestones.filter((m) => m.status === "at-risk").length;
  const msPenalty = Math.min(missed * 6 + atRisk * 3, 18);
  if (msPenalty > 0)
    drivers.push({
      label: "Milestones",
      delta: -msPenalty,
      detail: `${missed} missed · ${atRisk} at risk`,
    });
  score -= msPenalty;

  const pending = changes.filter((c) => c.status === "pending").length;
  if (pending) {
    const p = Math.min(pending * 3, 10);
    drivers.push({ label: "Change load", delta: -p, detail: `${pending} awaiting decision` });
    score -= p;
  }

  if (project.status === "on-hold") {
    drivers.push({ label: "On hold", delta: -10, detail: "Project execution paused" });
    score -= 10;
  }

  score = Math.round(clamp(score));
  return { score, rag: score >= 75 ? "green" : score >= 50 ? "amber" : "red", drivers };
}

/* ------------------------------------------------------------------ */
/* Schedule intelligence                                               */
/* ------------------------------------------------------------------ */

/** Longest date-driven chain of leaf tasks — the critical path. */
export function criticalPath(wbs: WbsNode[]): WbsNode[] {
  const leaves = wbs
    .filter((w) => !wbs.some((c) => c.parentId === w.id))
    .slice()
    .sort((a, b) => d(a.start).getTime() - d(b.start).getTime());
  const chain: WbsNode[] = [];
  let cursor = -Infinity;
  for (const t of leaves) {
    if (d(t.start).getTime() >= cursor) {
      chain.push(t);
      cursor = d(t.end).getTime();
    }
  }
  return chain;
}

export interface ScheduleFinding {
  taskId: string;
  code: string;
  name: string;
  slipDays: number;
  reason: string;
  onCriticalPath: boolean;
}

/** Tasks that are behind their planned burn-down, with predicted slip in days. */
export function delayedTasks(wbs: WbsNode[]): ScheduleFinding[] {
  const cp = new Set(criticalPath(wbs).map((t) => t.id));
  const now = today();
  return wbs
    .filter((w) => w.status !== "done")
    .map((w) => {
      const start = d(w.start);
      const end = d(w.end);
      const span = Math.max(days(start, end), 1);
      const elapsed = clamp(days(start, now), 0, span);
      const expected = Math.round((elapsed / span) * 100);
      const gap = expected - w.progress;
      const slip = gap > 0 ? Math.round((gap / 100) * span) : 0;
      const overdue = now > end && w.progress < 100;
      if (!overdue && gap <= 10) return null;
      return {
        taskId: w.id,
        code: w.code,
        name: w.name,
        slipDays: Math.max(slip, overdue ? days(end, now) : 0),
        reason:
          w.status === "blocked"
            ? "Task is blocked"
            : overdue
              ? `Past planned finish, ${w.progress}% complete`
              : `${gap}% behind planned progress`,
        onCriticalPath: cp.has(w.id),
      } as ScheduleFinding;
    })
    .filter((x): x is ScheduleFinding => x !== null)
    .sort((a, b) => b.slipDays - a.slipDays);
}

/**
 * Push successor tasks (and milestones) out by the predicted slip of delayed
 * predecessors. Returns a human-readable list of what moved.
 */
export function rescheduleFromDelays(projectId: string): string[] {
  const s = projectsStore.get();
  const wbs = s.wbs.filter((w) => w.projectId === projectId);
  const findings = delayedTasks(wbs);
  if (findings.length === 0) return [];

  const moves: string[] = [];
  const shiftBy = Math.max(...findings.map((f) => f.slipDays));
  const latestDelayedEnd = Math.max(
    ...findings.map((f) => d(wbs.find((w) => w.id === f.taskId)!.end).getTime()),
  );

  projectsStore.update((st) => {
    st.wbs = st.wbs.map((w) => {
      if (w.projectId !== projectId || w.status === "done") return w;
      const isSuccessor = d(w.start).getTime() > latestDelayedEnd;
      const isDelayed = findings.some((f) => f.taskId === w.id);
      if (!isSuccessor && !isDelayed) return w;
      moves.push(`${w.code} ${w.name} → ${addDays(w.end, shiftBy)}`);
      return {
        ...w,
        start: addDays(w.start, isDelayed ? 0 : shiftBy),
        end: addDays(w.end, shiftBy),
      };
    });
    st.milestones = st.milestones.map((m) => {
      if (m.projectId !== projectId || m.status === "achieved") return m;
      if (d(m.due).getTime() <= latestDelayedEnd) return { ...m, status: "at-risk" as const };
      moves.push(`Milestone ${m.name} → ${addDays(m.due, shiftBy)}`);
      return { ...m, due: addDays(m.due, shiftBy), status: "at-risk" as const };
    });
    st.projects = st.projects.map((p) =>
      p.id === projectId ? { ...p, endDate: addDays(p.endDate, shiftBy), rag: "amber" as RAG } : p,
    );
  });
  return moves;
}

/* ------------------------------------------------------------------ */
/* Resource intelligence                                               */
/* ------------------------------------------------------------------ */

export interface ResourceLoad {
  name: string;
  totalAllocation: number;
  projects: string[];
  conflict: boolean;
}

export function resourceLoads(): ResourceLoad[] {
  const s = projectsStore.get();
  const byName = new Map<string, ResourceLoad>();
  for (const t of s.team) {
    const proj = s.projects.find((p) => p.id === t.projectId);
    const rec = byName.get(t.name) ?? {
      name: t.name,
      totalAllocation: 0,
      projects: [],
      conflict: false,
    };
    rec.totalAllocation += t.allocationPct;
    if (proj) rec.projects.push(proj.code);
    rec.conflict = rec.totalAllocation > 100;
    byName.set(t.name, rec);
  }
  return [...byName.values()].sort((a, b) => b.totalAllocation - a.totalAllocation);
}

/** Best-fit owner for a task/issue: least loaded team member, role-matched when possible. */
export function recommendOwner(projectId: string, hint?: string): string {
  const s = projectsStore.get();
  const team = s.team.filter((t) => t.projectId === projectId);
  if (team.length === 0) return s.projects.find((p) => p.id === projectId)?.manager ?? "Unassigned";
  const loads = resourceLoads();
  const load = (n: string) => loads.find((l) => l.name === n)?.totalAllocation ?? 0;
  const h = (hint ?? "").toLowerCase();
  const matched = team.filter(
    (t) =>
      h &&
      (h.includes(t.role.toLowerCase().split(" ")[0]) ||
        t.role
          .toLowerCase()
          .split(" ")
          .some((w) => h.includes(w))),
  );
  const pool = matched.length ? matched : team;
  return pool.slice().sort((a, b) => load(a.name) - load(b.name))[0].name;
}

/* ------------------------------------------------------------------ */
/* Risk / issue intelligence                                           */
/* ------------------------------------------------------------------ */

export interface RiskDraft {
  title: string;
  category: Risk["category"];
  probability: Risk["probability"];
  impact: Risk["impact"];
  mitigation: string;
  owner: string;
  status: "open";
  source: string;
}

/** Emerging risks derived from live schedule, cost, resource and quality signals. */
export function suggestRisks(projectId: string): RiskDraft[] {
  const s = projectsStore.get();
  const project = s.projects.find((p) => p.id === projectId);
  if (!project) return [];
  const wbs = s.wbs.filter((w) => w.projectId === projectId);
  const budget = s.budget.filter((b) => b.projectId === projectId);
  const risks = s.risks.filter((r) => r.projectId === projectId);
  const issues = s.issues.filter((i) => i.projectId === projectId && i.status !== "resolved");
  const evm = projectEvm(project, wbs, budget);
  const out: RiskDraft[] = [];
  const exists = (t: string) => risks.some((r) => r.title.toLowerCase() === t.toLowerCase());

  const delayed = delayedTasks(wbs);
  const cpDelayed = delayed.filter((t) => t.onCriticalPath);
  if (cpDelayed.length) {
    const t = `Critical path slippage on ${cpDelayed[0].code} ${cpDelayed[0].name}`;
    if (!exists(t))
      out.push({
        title: t,
        category: "Schedule",
        probability: 4,
        impact: 5,
        mitigation:
          "Re-sequence successors, add second shift on the critical activity and re-baseline the milestone dates.",
        owner: recommendOwner(projectId, cpDelayed[0].name),
        status: "open",
        source: `${cpDelayed.length} critical-path tasks slipping, max ${cpDelayed[0].slipDays}d`,
      });
  }
  if (evm.cpi < 0.95) {
    const t = "Cost overrun forecast at completion";
    if (!exists(t))
      out.push({
        title: t,
        category: "Cost",
        probability: evm.cpi < 0.85 ? 5 : 3,
        impact: 4,
        mitigation:
          "Freeze discretionary spend, re-negotiate open POs and route a change request for scope additions.",
        owner: project.manager,
        status: "open",
        source: `CPI ${evm.cpi}, EAC variance ${Math.round(evm.vac).toLocaleString("en-IN")}`,
      });
  }
  const overCommitted = budget.filter((b) => b.committed > b.planned);
  if (overCommitted.length) {
    const t = `Committed spend exceeds plan on ${overCommitted[0].category}`;
    if (!exists(t))
      out.push({
        title: t,
        category: "Supplier",
        probability: 3,
        impact: 4,
        mitigation:
          "Review open purchase commitments with Procurement and hold further releases pending re-estimate.",
        owner: recommendOwner(projectId, "purchase"),
        status: "open",
        source: `${overCommitted.length} budget lines over-committed`,
      });
  }
  const conflicts = resourceLoads().filter((l) => l.conflict && l.projects.includes(project.code));
  if (conflicts.length) {
    const t = `Resource over-allocation — ${conflicts[0].name}`;
    if (!exists(t))
      out.push({
        title: t,
        category: "Technical",
        probability: 4,
        impact: 3,
        mitigation:
          "Re-balance allocation across projects or engage a subcontract resource for the overlap window.",
        owner: project.manager,
        status: "open",
        source: `${conflicts[0].name} loaded at ${conflicts[0].totalAllocation}% across ${conflicts[0].projects.join(", ")}`,
      });
  }
  const criticalIssues = issues.filter((i) => i.severity === "critical" || i.severity === "high");
  if (criticalIssues.length >= 2) {
    const t = "Unresolved high-severity issues threatening delivery";
    if (!exists(t))
      out.push({
        title: t,
        category: "Quality",
        probability: 3,
        impact: 4,
        mitigation:
          "Run a daily war-room until the high-severity queue clears; raise NCR/CAPA where quality-related.",
        owner: recommendOwner(projectId, "quality"),
        status: "open",
        source: `${criticalIssues.length} high/critical issues open`,
      });
  }
  return out;
}

const SEV_KEYWORDS: Array<[Issue["severity"], RegExp]> = [
  ["critical", /(safety|line down|stop|shutdown|breach|reject|fail(ed|ure)?\s+audit)/i],
  ["high", /(delay|leak|crash|not working|damage|escalat|overheat|misalign)/i],
  ["medium", /(rework|adjust|calibrat|pending|shortage|deviation)/i],
];

export interface IssueTriage {
  severity: Issue["severity"];
  assignee: string;
  rootCause: string;
  resolution: string;
  slaDays: number;
  impact: string;
}

/** Classify, assign and recommend a resolution for an issue using project context. */
export function triageIssue(projectId: string, title: string, current?: Issue): IssueTriage {
  const match = SEV_KEYWORDS.find(([, re]) => re.test(title));
  const severity = match?.[0] ?? current?.severity ?? "low";
  const slaDays = { critical: 1, high: 3, medium: 7, low: 14 }[severity];
  const t = title.toLowerCase();
  const rootCause = /delay|late|shortage/.test(t)
    ? "Upstream supply or predecessor task slippage"
    : /align|fit|dimension|tolerance/.test(t)
      ? "Fixture / tooling dimensional deviation from released drawing"
      : /program|plc|robot|software/.test(t)
        ? "Control logic or program revision mismatch"
        : "Execution deviation from the approved method statement";
  const resolution = /delay|shortage/.test(t)
    ? "Expedite with the vendor, re-sequence dependent tasks and inform the customer of revised dates."
    : /align|fit|dimension|tolerance/.test(t)
      ? "Re-measure against the master drawing, raise an NCR and correct at the fixture shop before re-trial."
      : "Assign the owner below, agree a containment action within SLA and record the permanent fix in the decision log.";
  return {
    severity,
    assignee:
      current?.assignee && current.assignee !== "Unassigned"
        ? current.assignee
        : recommendOwner(projectId, title),
    rootCause,
    resolution,
    slaDays,
    impact:
      severity === "critical" || severity === "high"
        ? "Likely to affect the critical path and the next billing milestone if unresolved within SLA."
        : "Contained impact — monitor at the weekly review.",
  };
}

/** Assign every unowned/open issue to the best-fit resource and normalise severity. */
export function autoTriageIssues(projectId: string): number {
  const s = projectsStore.get();
  const issues = s.issues.filter((i) => i.projectId === projectId && i.status !== "resolved");
  let n = 0;
  for (const i of issues) {
    const t = triageIssue(projectId, i.title, i);
    if (i.assignee === t.assignee && i.severity === t.severity) continue;
    upsertProjectRecord("issues", { ...i, assignee: t.assignee, severity: t.severity }, projectId);
    n++;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* Change impact                                                       */
/* ------------------------------------------------------------------ */

export interface ChangeImpact {
  newEndDate: string;
  newBudget: number;
  budgetVariancePct: number;
  marginBefore: number;
  marginAfter: number;
  resourceImpact: string;
  recommendation: "approve" | "approve-with-conditions" | "reject";
  rationale: string;
}

export function assessChange(project: Project, change: ChangeRequest, evm: Evm): ChangeImpact {
  const newBudget = project.budget + change.impactCost;
  const marginBefore =
    project.value > 0 ? Math.round(((project.value - evm.eac) / project.value) * 100) : 0;
  const marginAfter =
    project.value > 0
      ? Math.round(((project.value - (evm.eac + change.impactCost)) / project.value) * 100)
      : 0;
  const rec: ChangeImpact["recommendation"] =
    marginAfter < 0
      ? "reject"
      : marginAfter < 8 || change.impactDays > 21
        ? "approve-with-conditions"
        : "approve";
  return {
    newEndDate: addDays(project.endDate, change.impactDays),
    newBudget,
    budgetVariancePct: Math.round((change.impactCost / Math.max(project.budget, 1)) * 100),
    marginBefore,
    marginAfter,
    resourceImpact:
      change.impactDays > 0
        ? `Extends team engagement by ${change.impactDays} days — re-confirm allocations before approval.`
        : "No additional resource engagement required.",
    recommendation: rec,
    rationale:
      rec === "reject"
        ? "Forecast margin turns negative after this change. Re-price with the customer before approving."
        : rec === "approve-with-conditions"
          ? "Approve only with a customer-funded variation order and a re-baselined schedule."
          : "Impact is absorbable within contingency; approve and re-baseline.",
  };
}

/** Approve a change request and cascade to schedule, budget and billing. */
export function applyChangeApproval(change: ChangeRequest, approver = "You"): string[] {
  const s = projectsStore.get();
  const project = s.projects.find((p) => p.id === change.projectId);
  if (!project) return [];
  const effects: string[] = [];

  upsertProjectRecord("changes", { ...change, status: "approved" }, change.projectId);
  effects.push(`${change.code} approved by ${approver}`);

  if (change.impactDays) {
    upsertProjectRecord("projects", {
      ...project,
      endDate: addDays(project.endDate, change.impactDays),
    });
    effects.push(`Project finish moved to ${addDays(project.endDate, change.impactDays)}`);
    projectsStore.update((st) => {
      st.milestones = st.milestones.map((m) =>
        m.projectId === change.projectId && m.status !== "achieved"
          ? { ...m, due: addDays(m.due, change.impactDays) }
          : m,
      );
    });
    effects.push("Open milestones rescheduled");
  }
  if (change.impactCost) {
    upsertProjectRecord("projects", {
      ...project,
      budget: project.budget + change.impactCost,
      value: project.value + Math.round(change.impactCost * 1.15),
      endDate: addDays(project.endDate, change.impactDays),
    });
    const line = s.budget.find(
      (b) => b.projectId === change.projectId && b.category === "Material",
    );
    if (line) {
      upsertProjectRecord(
        "budget",
        { ...line, planned: line.planned + change.impactCost },
        change.projectId,
      );
    } else {
      upsertProjectRecord(
        "budget",
        { category: "Material", planned: change.impactCost, committed: 0, actual: 0 },
        change.projectId,
      );
    }
    effects.push(
      `Budget uplifted by ${Math.round(change.impactCost).toLocaleString("en-IN")} and contract re-valued`,
    );
  }
  upsertProjectRecord(
    "events",
    {
      title: `${change.code} approved — re-baseline review`,
      date: new Date().toISOString().slice(0, 10),
      kind: "review",
    },
    change.projectId,
  );
  effects.push("Re-baseline review added to the project calendar");
  return effects;
}

/* ------------------------------------------------------------------ */
/* Milestones, billing and next best actions                           */
/* ------------------------------------------------------------------ */

export interface MilestoneAlert {
  milestone: Milestone;
  dueInDays: number;
  level: "overdue" | "due-soon" | "watch";
  action: string;
}

export function milestoneAlerts(milestones: Milestone[]): MilestoneAlert[] {
  const now = today();
  return milestones
    .filter((m) => m.status !== "achieved")
    .map((m) => {
      const dueInDays = days(now, d(m.due));
      const level: MilestoneAlert["level"] =
        dueInDays < 0 ? "overdue" : dueInDays <= 14 ? "due-soon" : "watch";
      return {
        milestone: m,
        dueInDays,
        level,
        action:
          level === "overdue"
            ? "Escalate to the steering committee and agree a recovery date with the customer."
            : level === "due-soon"
              ? "Confirm deliverables, book the customer sign-off and pre-alert Finance for billing."
              : "On track — review at the weekly meeting.",
      };
    })
    .filter((a) => a.level !== "watch" || a.milestone.status === "at-risk")
    .sort((a, b) => a.dueInDays - b.dueInDays);
}

/** Mark a milestone achieved: raises the customer sign-off event and billing trigger. */
export function completeMilestone(m: Milestone): string[] {
  upsertProjectRecord("milestones", { ...m, status: "achieved" }, m.projectId);
  const effects = [`${m.name} marked achieved`];
  upsertProjectRecord(
    "events",
    {
      title: `Customer sign-off — ${m.name}`,
      date: new Date().toISOString().slice(0, 10),
      kind: "review",
    },
    m.projectId,
  );
  effects.push("Customer sign-off scheduled");
  if (m.billing) {
    upsertProjectRecord(
      "docs",
      {
        name: `Billing request — ${m.name}`,
        kind: "Report",
        size: "—",
        uploadedBy: "Workflow Engine",
        at: new Date().toISOString(),
        notes: `Milestone billing of ₹${Math.round(m.billing).toLocaleString("en-IN")} released to Finance for invoicing.`,
      },
      m.projectId,
    );
    effects.push(
      `Finance notified — ₹${Math.round(m.billing).toLocaleString("en-IN")} ready to invoice`,
    );
  }
  return effects;
}

export interface NextAction {
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  tab?: string;
}

export function nextBestActions(
  project: Project,
  evm: Evm,
  wbs: WbsNode[],
  milestones: Milestone[],
  risks: Risk[],
  issues: Issue[],
  changes: ChangeRequest[],
  team: TeamMember[],
): NextAction[] {
  const out: NextAction[] = [];
  const delayed = delayedTasks(wbs);
  const cp = delayed.filter((t) => t.onCriticalPath);
  if (cp.length)
    out.push({
      title: `Recover ${cp.length} critical-path task${cp.length > 1 ? "s" : ""}`,
      detail: `${cp[0].code} ${cp[0].name} is ${cp[0].slipDays}d behind. Auto-reschedule successors and notify stakeholders.`,
      severity: "high",
      tab: "gantt",
    });
  if (evm.cpi < 0.95)
    out.push({
      title: "Contain the cost overrun",
      detail: `CPI ${evm.cpi} forecasts an EAC of ₹${Math.round(evm.eac).toLocaleString("en-IN")} against a BAC of ₹${Math.round(evm.bac).toLocaleString("en-IN")}.`,
      severity: evm.cpi < 0.85 ? "high" : "medium",
      tab: "budget",
    });
  const overdue = milestoneAlerts(milestones).filter((a) => a.level === "overdue");
  if (overdue.length)
    out.push({
      title: `Escalate ${overdue.length} overdue milestone${overdue.length > 1 ? "s" : ""}`,
      detail: `${overdue[0].milestone.name} is ${Math.abs(overdue[0].dueInDays)}d overdue — billing of ₹${Math.round(overdue[0].milestone.billing ?? 0).toLocaleString("en-IN")} is blocked.`,
      severity: "high",
      tab: "milestones",
    });
  const stale = issues.filter(
    (i) => i.status === "open" && (i.severity === "high" || i.severity === "critical"),
  );
  if (stale.length)
    out.push({
      title: `Resolve ${stale.length} high-severity issue${stale.length > 1 ? "s" : ""}`,
      detail: `Auto-triage assigns owners by skill and workload; SLA is ${stale[0].severity === "critical" ? 1 : 3} day(s).`,
      severity: "high",
      tab: "issues",
    });
  const pending = changes.filter((c) => c.status === "pending" || c.status === "draft");
  if (pending.length)
    out.push({
      title: `Decide on ${pending.length} change request${pending.length > 1 ? "s" : ""}`,
      detail: `${pending[0].code} carries ₹${Math.round(pending[0].impactCost).toLocaleString("en-IN")} and +${pending[0].impactDays}d impact.`,
      severity: "medium",
      tab: "changes",
    });
  const newRisks = suggestRisks(project.id);
  if (newRisks.length)
    out.push({
      title: `${newRisks.length} emerging risk${newRisks.length > 1 ? "s" : ""} detected`,
      detail: newRisks[0].title,
      severity: "medium",
      tab: "risks",
    });
  const conflicts = resourceLoads().filter(
    (l) => l.conflict && team.some((t) => t.name === l.name),
  );
  if (conflicts.length)
    out.push({
      title: `Re-balance ${conflicts.length} over-allocated resource${conflicts.length > 1 ? "s" : ""}`,
      detail: `${conflicts[0].name} at ${conflicts[0].totalAllocation}% across ${conflicts[0].projects.join(", ")}.`,
      severity: "medium",
      tab: "team",
    });
  if (out.length === 0)
    out.push({
      title: "Project is tracking to plan",
      detail: `SPI ${evm.spi} · CPI ${evm.cpi} · forecast finish ${evm.forecastFinish}. Keep the weekly cadence.`,
      severity: "low",
    });
  return out;
}

/** Narrative status summary used by the copilot and the status report. */
export function statusNarrative(
  project: Project,
  evm: Evm,
  health: HealthResult,
  milestones: Milestone[],
  risks: Risk[],
  issues: Issue[],
): string {
  const nextMs = milestones
    .filter((m) => m.status !== "achieved")
    .sort((a, b) => a.due.localeCompare(b.due))[0];
  return [
    `${project.code} — ${project.name} for ${project.customerName} is ${project.progress}% complete against a planned ${evm.plannedPct}%, giving an SPI of ${evm.spi} and a CPI of ${evm.cpi}.`,
    `Cost consumed is ₹${Math.round(evm.ac).toLocaleString("en-IN")} of a ₹${Math.round(evm.bac).toLocaleString("en-IN")} budget with an estimate at completion of ₹${Math.round(evm.eac).toLocaleString("en-IN")} (${evm.vac >= 0 ? "under" : "over"} by ₹${Math.abs(Math.round(evm.vac)).toLocaleString("en-IN")}), forecasting a ${evm.profitability}% margin.`,
    `Forecast finish is ${evm.forecastFinish}${evm.scheduleSlipDays > 0 ? ` — ${evm.scheduleSlipDays} days later than the baseline` : " — in line with the baseline"}.`,
    nextMs ? `Next milestone: ${nextMs.name} due ${nextMs.due}.` : "No open milestones.",
    `${risks.filter((r) => r.status === "open").length} open risks and ${issues.filter((i) => i.status !== "resolved").length} unresolved issues. Overall health score ${health.score}/100 (${health.rag}).`,
  ].join(" ");
}
