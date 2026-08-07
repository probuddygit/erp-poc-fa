/**
 * AI-assisted project planning. Templates encode Faith Automation's delivery
 * methodology per project type; the recommender picks a template from contract
 * value / customer / keywords and generates a full execution plan (WBS,
 * milestones, budget, risks, documents, calendar, team) that the PM can review,
 * modify and apply.
 */
import type { ProjectsState, Project } from "./types";
import { projectsStore, upsertProjectRecord } from "./store";
import { addDays } from "./intelligence";

export interface TemplatePhase {
  name: string;
  /** Share of the total duration (0-1). */
  duration: number;
  weight: number;
  ownerRole: string;
  tasks: Array<{ name: string; deliverable: string }>;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  minValue: number;
  phases: TemplatePhase[];
  milestones: Array<{ name: string; at: number; billingPct: number }>;
  budgetSplit: Record<"Labour" | "Material" | "Equipment" | "Subcontract" | "Overhead", number>;
  risks: Array<{ title: string; category: "Schedule" | "Cost" | "Technical" | "Supplier" | "Quality" | "Safety"; probability: 1 | 2 | 3 | 4 | 5; impact: 1 | 2 | 3 | 4 | 5; mitigation: string }>;
  docFolders: string[];
  roles: Array<{ role: string; allocationPct: number }>;
  qualityChecklist: string[];
}

const BIW: ProjectTemplate = {
  id: "biw-line",
  name: "BIW Welding Line",
  description: "Full body-in-white line: concept, simulation, fixture build, robot integration, tryout and buy-off.",
  keywords: ["biw", "body", "weld", "line", "framing", "underbody"],
  minValue: 30_000_000,
  phases: [
    { name: "Concept & Contract Freeze", duration: 0.1, weight: 8, ownerRole: "Project Manager", tasks: [
      { name: "Kick-off & scope freeze", deliverable: "Signed project charter" },
      { name: "Customer input data review", deliverable: "Input data register" },
    ] },
    { name: "Engineering & Simulation", duration: 0.22, weight: 22, ownerRole: "Design Lead", tasks: [
      { name: "Process layout & cycle time study", deliverable: "Approved layout" },
      { name: "Fixture 3D design", deliverable: "Released 3D models" },
      { name: "Robot simulation & reach study", deliverable: "Simulation report" },
      { name: "Design review & release", deliverable: "Design release note" },
    ] },
    { name: "Procurement & Manufacturing", duration: 0.28, weight: 28, ownerRole: "Purchase Lead", tasks: [
      { name: "Long-lead item ordering", deliverable: "PO release schedule" },
      { name: "Fixture fabrication", deliverable: "Fabricated fixtures" },
      { name: "Machining & sub-assembly", deliverable: "Dimensional report" },
    ] },
    { name: "Assembly & Integration", duration: 0.2, weight: 22, ownerRole: "Production Lead", tasks: [
      { name: "Mechanical assembly", deliverable: "Assembly completion report" },
      { name: "Electrical panel & wiring", deliverable: "Wiring test record" },
      { name: "Robot programming & teach", deliverable: "Program backup" },
    ] },
    { name: "Tryout, Buy-off & Handover", duration: 0.2, weight: 20, ownerRole: "Quality Lead", tasks: [
      { name: "In-house tryout & CMM validation", deliverable: "CMM report" },
      { name: "Customer buy-off & PPAP", deliverable: "Buy-off certificate" },
      { name: "Site installation & commissioning", deliverable: "Commissioning report" },
      { name: "Training & documentation handover", deliverable: "Handover dossier" },
    ] },
  ],
  milestones: [
    { name: "Contract & Charter Signed", at: 0.05, billingPct: 20 },
    { name: "Design Freeze", at: 0.3, billingPct: 20 },
    { name: "Fixtures Ready for Assembly", at: 0.55, billingPct: 20 },
    { name: "In-house Tryout Accepted", at: 0.8, billingPct: 25 },
    { name: "Site Buy-off & Handover", at: 1, billingPct: 15 },
  ],
  budgetSplit: { Labour: 0.22, Material: 0.34, Equipment: 0.24, Subcontract: 0.14, Overhead: 0.06 },
  risks: [
    { title: "Customer input data changes after design freeze", category: "Schedule", probability: 4, impact: 4, mitigation: "Lock the input register at kick-off; route all later changes through the change control board." },
    { title: "Robot / long-lead equipment delivery slippage", category: "Supplier", probability: 3, impact: 5, mitigation: "Place long-lead POs in week 1 and track weekly with Procurement." },
    { title: "Dimensional non-conformance at tryout", category: "Quality", probability: 3, impact: 4, mitigation: "Stage-wise CMM checks at fixture and assembly stages before tryout." },
    { title: "Site readiness delay at customer plant", category: "Schedule", probability: 3, impact: 3, mitigation: "Joint site-readiness checklist signed 4 weeks before dispatch." },
    { title: "Safety incident during installation", category: "Safety", probability: 2, impact: 5, mitigation: "Site-specific HIRA, permit-to-work and daily toolbox talks." },
  ],
  docFolders: ["01 Contract & Charter", "02 Inputs & Standards", "03 Design & Drawings", "04 Simulation", "05 Procurement", "06 Manufacturing & QA", "07 Tryout & Buy-off", "08 Commissioning & Handover", "09 Meeting Minutes", "10 Invoices & Billing"],
  roles: [
    { role: "Project Manager", allocationPct: 60 },
    { role: "Design Lead", allocationPct: 80 },
    { role: "Simulation Engineer", allocationPct: 50 },
    { role: "Purchase Lead", allocationPct: 30 },
    { role: "Production Lead", allocationPct: 70 },
    { role: "Quality Lead", allocationPct: 40 },
  ],
  qualityChecklist: ["Input data register signed", "Design review closure", "Incoming material inspection", "Fixture CMM report", "Electrical safety test", "Cycle time validation", "Customer buy-off checklist"],
};

const ROBOT_CELL: ProjectTemplate = {
  id: "robot-cell",
  name: "Robotic Cell / Special Purpose Machine",
  description: "Single-cell automation: design, build, integration and commissioning.",
  keywords: ["cell", "robot", "spm", "station", "gantry", "pick"],
  minValue: 5_000_000,
  phases: [
    { name: "Definition", duration: 0.12, weight: 10, ownerRole: "Project Manager", tasks: [
      { name: "Kick-off & requirement freeze", deliverable: "URS sign-off" },
      { name: "Concept layout", deliverable: "Concept drawing" },
    ] },
    { name: "Design", duration: 0.25, weight: 25, ownerRole: "Design Lead", tasks: [
      { name: "Mechanical design", deliverable: "Released drawings" },
      { name: "Electrical & controls design", deliverable: "Schematics" },
    ] },
    { name: "Build", duration: 0.33, weight: 35, ownerRole: "Production Lead", tasks: [
      { name: "Material procurement", deliverable: "Goods receipt" },
      { name: "Mechanical build", deliverable: "Build completion" },
      { name: "Panel build & wiring", deliverable: "Wiring checklist" },
    ] },
    { name: "Integration & Handover", duration: 0.3, weight: 30, ownerRole: "Quality Lead", tasks: [
      { name: "PLC / robot programming", deliverable: "Program backup" },
      { name: "Internal trial run", deliverable: "Trial report" },
      { name: "Customer FAT & dispatch", deliverable: "FAT certificate" },
      { name: "Site commissioning", deliverable: "SAT certificate" },
    ] },
  ],
  milestones: [
    { name: "Requirement Freeze", at: 0.1, billingPct: 25 },
    { name: "Design Release", at: 0.35, billingPct: 20 },
    { name: "Factory Acceptance Test", at: 0.8, billingPct: 35 },
    { name: "Site Acceptance & Handover", at: 1, billingPct: 20 },
  ],
  budgetSplit: { Labour: 0.25, Material: 0.3, Equipment: 0.25, Subcontract: 0.13, Overhead: 0.07 },
  risks: [
    { title: "Scope creep on cell requirements", category: "Cost", probability: 3, impact: 4, mitigation: "URS baseline with signed change control." },
    { title: "Controls hardware lead time", category: "Supplier", probability: 3, impact: 4, mitigation: "Order controls hardware at design release." },
    { title: "Cycle time not met at FAT", category: "Technical", probability: 2, impact: 5, mitigation: "Simulate cycle time at design stage and validate at trial run." },
  ],
  docFolders: ["01 Contract", "02 URS & Inputs", "03 Design", "04 Procurement", "05 Build & QA", "06 FAT/SAT", "07 Minutes", "08 Billing"],
  roles: [
    { role: "Project Manager", allocationPct: 40 },
    { role: "Design Lead", allocationPct: 70 },
    { role: "Controls Engineer", allocationPct: 60 },
    { role: "Production Lead", allocationPct: 60 },
    { role: "Quality Lead", allocationPct: 30 },
  ],
  qualityChecklist: ["URS sign-off", "Design review", "Incoming inspection", "Safety circuit validation", "FAT checklist", "SAT checklist"],
};

const RETROFIT: ProjectTemplate = {
  id: "retrofit",
  name: "Retrofit / Upgrade & Service",
  description: "Brownfield upgrade, line rebalancing or controls migration executed inside a customer shutdown window.",
  keywords: ["retrofit", "upgrade", "migration", "service", "amc", "rebuild", "conveyor"],
  minValue: 0,
  phases: [
    { name: "Survey & Planning", duration: 0.2, weight: 20, ownerRole: "Project Manager", tasks: [
      { name: "Site survey & as-built capture", deliverable: "Survey report" },
      { name: "Shutdown window planning", deliverable: "Shutdown plan" },
    ] },
    { name: "Engineering & Supply", duration: 0.35, weight: 35, ownerRole: "Design Lead", tasks: [
      { name: "Upgrade design", deliverable: "Modification drawings" },
      { name: "Material & spares procurement", deliverable: "Goods receipt" },
    ] },
    { name: "Execution", duration: 0.3, weight: 30, ownerRole: "Production Lead", tasks: [
      { name: "Removal & installation", deliverable: "Installation record" },
      { name: "Migration & testing", deliverable: "Test record" },
    ] },
    { name: "Validation & Handover", duration: 0.15, weight: 15, ownerRole: "Quality Lead", tasks: [
      { name: "Production trial", deliverable: "Trial report" },
      { name: "Handover & training", deliverable: "Handover note" },
    ] },
  ],
  milestones: [
    { name: "Survey Approved", at: 0.15, billingPct: 30 },
    { name: "Material at Site", at: 0.6, billingPct: 30 },
    { name: "Line Restart Achieved", at: 1, billingPct: 40 },
  ],
  budgetSplit: { Labour: 0.35, Material: 0.28, Equipment: 0.15, Subcontract: 0.15, Overhead: 0.07 },
  risks: [
    { title: "Shutdown window shorter than planned", category: "Schedule", probability: 4, impact: 5, mitigation: "Pre-fabricate off-site and stage a rehearsal before the window." },
    { title: "As-built differs from documentation", category: "Technical", probability: 4, impact: 3, mitigation: "Physical survey with photographic record before design." },
    { title: "Working at height / hot work incident", category: "Safety", probability: 2, impact: 5, mitigation: "Permit-to-work and dedicated safety steward on shift." },
  ],
  docFolders: ["01 Contract", "02 Site Survey", "03 Design", "04 Procurement", "05 Execution Records", "06 Trial & Handover", "07 Minutes", "08 Billing"],
  roles: [
    { role: "Project Manager", allocationPct: 40 },
    { role: "Site Engineer", allocationPct: 90 },
    { role: "Controls Engineer", allocationPct: 40 },
    { role: "Quality Lead", allocationPct: 25 },
  ],
  qualityChecklist: ["Site survey sign-off", "Permit-to-work issued", "Installation checklist", "Functional test", "Production trial acceptance"],
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [BIW, ROBOT_CELL, RETROFIT];

export interface TemplateRecommendation {
  template: ProjectTemplate;
  confidence: number;
  reasons: string[];
  alternatives: ProjectTemplate[];
}

/** Recommend the delivery template from project name, customer history and contract value. */
export function recommendTemplate(
  input: { name: string; value: number; customerName?: string },
  state: ProjectsState = projectsStore.get(),
): TemplateRecommendation {
  const text = input.name.toLowerCase();
  const scored = PROJECT_TEMPLATES.map((t) => {
    const reasons: string[] = [];
    let score = 20;
    const hits = t.keywords.filter((k) => text.includes(k));
    if (hits.length) {
      score += hits.length * 22;
      reasons.push(`Scope wording matches ${hits.join(", ")}`);
    }
    if (input.value >= t.minValue && t.minValue > 0) {
      score += 20;
      reasons.push(`Contract value ₹${Math.round(input.value).toLocaleString("en-IN")} fits ${t.name} band`);
    }
    const prior = state.projects.filter(
      (p) => input.customerName && p.customerName === input.customerName && p.name.toLowerCase().split(" ").some((w) => t.keywords.includes(w)),
    );
    if (prior.length) {
      score += 15;
      reasons.push(`${prior.length} similar past project(s) for ${input.customerName}`);
    }
    if (t.id === "retrofit" && input.value < 5_000_000) {
      score += 15;
      reasons.push("Smaller contract value typical of upgrade/service work");
    }
    return { t, score, reasons };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  return {
    template: best.t,
    confidence: Math.min(Math.round(best.score), 96),
    reasons: best.reasons.length ? best.reasons : ["Default methodology for automation delivery"],
    alternatives: scored.slice(1).map((s) => s.t),
  };
}

export interface GeneratedPlan {
  templateId: string;
  templateName: string;
  wbs: Array<{ code: string; name: string; owner: string; start: string; end: string; weight: number; progress: number; status: "not-started"; children: Array<{ code: string; name: string; owner: string; start: string; end: string; weight: number; deliverable: string }> }>;
  milestones: Array<{ name: string; due: string; status: "upcoming"; billing: number }>;
  budget: Array<{ category: string; planned: number; committed: number; actual: number }>;
  risks: ProjectTemplate["risks"];
  docFolders: string[];
  roles: ProjectTemplate["roles"];
  events: Array<{ title: string; date: string; kind: "milestone" | "review" | "meeting" | "delivery" }>;
  qualityChecklist: string[];
  estimatedFinish: string;
}

/** Build the full execution plan for a project from a template. Pure — nothing is written. */
export function generatePlan(project: Project, template: ProjectTemplate): GeneratedPlan {
  const start = project.startDate.slice(0, 10);
  const totalDays = Math.max(
    Math.round((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / 86_400_000),
    30,
  );
  const budgetBase = project.budget || Math.round(project.value * 0.78);

  let cursor = 0;
  const wbs: GeneratedPlan["wbs"] = template.phases.map((phase, pi) => {
    const phaseDays = Math.max(Math.round(totalDays * phase.duration), 5);
    const pStart = addDays(start, cursor);
    const pEnd = addDays(start, cursor + phaseDays);
    const taskDays = Math.max(Math.floor(phaseDays / phase.tasks.length), 2);
    const children = phase.tasks.map((task, ti) => ({
      code: `${pi + 1}.${ti + 1}`,
      name: task.name,
      owner: phase.ownerRole,
      start: addDays(start, cursor + ti * taskDays),
      end: addDays(start, cursor + Math.min((ti + 1) * taskDays, phaseDays)),
      weight: Math.max(Math.round(phase.weight / phase.tasks.length), 1),
      deliverable: task.deliverable,
    }));
    cursor += phaseDays;
    return {
      code: String(pi + 1),
      name: phase.name,
      owner: phase.ownerRole,
      start: pStart,
      end: pEnd,
      weight: phase.weight,
      progress: 0,
      status: "not-started" as const,
      children,
    };
  });

  const milestones = template.milestones.map((m) => ({
    name: m.name,
    due: addDays(start, Math.round(totalDays * m.at)),
    status: "upcoming" as const,
    billing: Math.round((project.value || budgetBase) * (m.billingPct / 100)),
  }));

  const budget = (Object.entries(template.budgetSplit) as Array<[string, number]>).map(([category, pct]) => ({
    category,
    planned: Math.round(budgetBase * pct),
    committed: 0,
    actual: 0,
  }));

  const events: GeneratedPlan["events"] = [
    { title: "Project kick-off meeting", date: start, kind: "meeting" },
    ...milestones.map((m) => ({ title: m.name, date: m.due, kind: "milestone" as const })),
    { title: "Monthly customer review", date: addDays(start, 30), kind: "review" as const },
  ];

  return {
    templateId: template.id,
    templateName: template.name,
    wbs,
    milestones,
    budget,
    risks: template.risks,
    docFolders: template.docFolders,
    roles: template.roles,
    events,
    qualityChecklist: template.qualityChecklist,
    estimatedFinish: addDays(start, cursor),
  };
}

export interface ApplyOptions {
  wbs?: boolean;
  milestones?: boolean;
  budget?: boolean;
  risks?: boolean;
  docs?: boolean;
  team?: boolean;
  calendar?: boolean;
  replaceExisting?: boolean;
}

/** Write a generated plan into the project store. Returns a summary of what was created. */
export function applyPlan(
  projectId: string,
  plan: GeneratedPlan,
  opts: ApplyOptions = {},
): Record<string, number> {
  const o: Required<ApplyOptions> = {
    wbs: true, milestones: true, budget: true, risks: true, docs: true, team: true, calendar: true,
    replaceExisting: false, ...opts,
  };
  const state = projectsStore.get();
  const project = state.projects.find((p) => p.id === projectId);
  const created: Record<string, number> = {};

  if (o.replaceExisting) {
    projectsStore.update((st) => {
      for (const k of ["wbs", "milestones", "budget", "risks", "events"] as const) {
        (st[k] as Array<{ projectId: string }>) = (st[k] as Array<{ projectId: string }>).filter(
          (r) => r.projectId !== projectId,
        ) as never;
      }
    });
  }

  if (o.wbs) {
    let n = 0;
    for (const phase of plan.wbs) {
      const parentId = upsertProjectRecord("wbs", {
        code: phase.code, name: phase.name, owner: phase.owner, start: phase.start, end: phase.end,
        progress: 0, status: "not-started", weight: phase.weight,
      }, projectId);
      n++;
      for (const child of phase.children) {
        upsertProjectRecord("wbs", {
          parentId, code: child.code, name: child.name, owner: child.owner, start: child.start,
          end: child.end, progress: 0, status: "not-started", weight: child.weight,
        }, projectId);
        n++;
      }
    }
    created.tasks = n;
  }
  if (o.milestones) {
    plan.milestones.forEach((m) => upsertProjectRecord("milestones", { ...m }, projectId));
    created.milestones = plan.milestones.length;
  }
  if (o.budget) {
    plan.budget.forEach((b) => upsertProjectRecord("budget", { ...b }, projectId));
    created.budgetLines = plan.budget.length;
  }
  if (o.risks) {
    plan.risks.forEach((r) => upsertProjectRecord("risks", {
      ...r, owner: project?.manager ?? "Project Manager", status: "open",
    }, projectId));
    created.risks = plan.risks.length;
  }
  if (o.docs) {
    plan.docFolders.forEach((f) => upsertProjectRecord("docs", {
      name: f, kind: "Other", size: "Folder", uploadedBy: "Template Engine",
      at: new Date().toISOString(), notes: "Auto-created project document folder",
    }, projectId));
    created.docFolders = plan.docFolders.length;
  }
  if (o.team && project) {
    plan.roles.forEach((r, i) => upsertProjectRecord("team", {
      name: i === 0 ? project.manager : `${r.role} (to assign)`,
      role: r.role,
      allocationPct: r.allocationPct,
      email: "",
    }, projectId));
    created.team = plan.roles.length;
  }
  if (o.calendar) {
    plan.events.forEach((e) => upsertProjectRecord("events", { ...e }, projectId));
    created.events = plan.events.length;
  }
  if (project) {
    upsertProjectRecord("projects", { ...project, endDate: plan.estimatedFinish });
  }
  return created;
}

/** One-call provisioning used when a Sales Order / OA is approved. */
export function autoPlanProject(projectId: string, templateId?: string) {
  const state = projectsStore.get();
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return null;
  const rec = templateId
    ? { template: PROJECT_TEMPLATES.find((t) => t.id === templateId) ?? PROJECT_TEMPLATES[0], confidence: 100, reasons: ["Template selected by the project manager"], alternatives: [] as ProjectTemplate[] }
    : recommendTemplate(project, state);
  const plan = generatePlan(project, rec.template);
  const created = applyPlan(projectId, plan);
  return { recommendation: rec, plan, created };
}
