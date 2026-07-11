import type { ProjectsState, Project } from "./types";

const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

function makeProjects(): Project[] {
  return [
    {
      id: "p1", code: "PRJ-1001", name: "Body Side Assembly Line — Hyundai",
      customerName: "Hyundai Motors India", oaId: "oa-hmi", value: 12000000,
      budget: 9500000, spent: 3450000, startDate: days(-45), endDate: days(120),
      status: "active", progress: 34, rag: "amber", manager: "N. Rao", createdAt: days(-45),
    },
    {
      id: "p2", code: "PRJ-1002", name: "EV Battery Tray BIW Line — Tata Motors",
      customerName: "Tata Motors — Pune", value: 8500000,
      budget: 6700000, spent: 1100000, startDate: days(-20), endDate: days(180),
      status: "active", progress: 15, rag: "green", manager: "R. Iyer", createdAt: days(-20),
    },
    {
      id: "p3", code: "PRJ-1003", name: "Robotic Spot Weld Retrofit — Ashok Leyland",
      customerName: "Ashok Leyland", value: 2700000,
      budget: 2100000, spent: 1980000, startDate: days(-95), endDate: days(10),
      status: "active", progress: 88, rag: "red", manager: "S. Kapoor", createdAt: days(-95),
    },
    {
      id: "p4", code: "PRJ-1004", name: "Underbody Weld Cell — Mahindra",
      customerName: "Mahindra Auto", value: 4200000,
      budget: 3400000, spent: 0, startDate: days(15), endDate: days(200),
      status: "planning", progress: 3, rag: "green", manager: "S. Kapoor", createdAt: days(-5),
    },
  ];
}

export function seed(): ProjectsState {
  const projects = makeProjects();
  const s: ProjectsState = {
    projects,
    wbs: [], milestones: [], risks: [], issues: [], changes: [],
    docs: [], team: [], events: [], budget: [],
  };

  const wbsTemplate = [
    { code: "1", name: "Project Initiation", children: ["Kickoff", "Charter Sign-off"] },
    { code: "2", name: "Engineering & Design", children: ["Concept Design", "Detailed Design", "Design Review", "Drawing Release"] },
    { code: "3", name: "Procurement", children: ["Vendor Selection", "PO Release", "Material Receipt"] },
    { code: "4", name: "Manufacturing & Assembly", children: ["Structural Fab", "Weld Fixture Build", "Sub-assembly", "Final Assembly"] },
    { code: "5", name: "Commissioning", children: ["FAT", "SAT", "Handover"] },
  ];

  projects.forEach((p, pi) => {
    // WBS
    wbsTemplate.forEach((phase, i) => {
      const parentId = uid();
      s.wbs.push({
        id: parentId, projectId: p.id, code: `${phase.code}`, name: phase.name,
        owner: p.manager, start: days(-45 + i * 20 + pi * 3), end: days(-45 + (i + 1) * 25 + pi * 3),
        progress: Math.max(0, Math.min(100, p.progress + (2 - i) * 15)),
        status: i < 2 ? "done" : i === 2 ? "in-progress" : "not-started",
        weight: 20,
      });
      phase.children.forEach((c, ci) => {
        s.wbs.push({
          id: uid(), projectId: p.id, parentId,
          code: `${phase.code}.${ci + 1}`, name: c,
          owner: ["A. Menon", "K. Sharma", "P. Gupta", "V. Nair"][ci % 4],
          start: days(-45 + i * 20 + ci * 4 + pi * 3),
          end: days(-45 + i * 20 + (ci + 1) * 5 + pi * 3),
          progress: Math.floor(Math.random() * 100),
          status: (["done", "in-progress", "not-started", "blocked"] as const)[Math.floor(Math.random() * 4)],
          weight: 5,
        });
      });
    });

    // Milestones
    ["Kickoff", "Design Freeze", "FAT Clear", "SAT Clear", "Handover"].forEach((m, i) => {
      s.milestones.push({
        id: uid(), projectId: p.id, name: m,
        due: days(-40 + i * 40),
        status: i < 2 ? "achieved" : i === 2 ? "at-risk" : "upcoming",
        billing: i === 0 ? p.value * 0.1 : i === 2 ? p.value * 0.3 : i === 4 ? p.value * 0.2 : undefined,
      });
    });

    // Risks
    [
      ["Import lead time volatility", "Supplier", 4, 4],
      ["Weld fixture tolerance stack-up", "Technical", 3, 4],
      ["Skilled robot programmer availability", "Schedule", 3, 3],
    ].forEach(([t, c, pr, im]) => {
      s.risks.push({
        id: uid(), projectId: p.id, title: t as string,
        category: c as "Schedule" | "Cost" | "Technical" | "Supplier" | "Quality" | "Safety",
        probability: pr as 1 | 2 | 3 | 4 | 5, impact: im as 1 | 2 | 3 | 4 | 5,
        mitigation: "Dual-source & buffer stock", owner: p.manager,
        status: "open",
      });
    });

    // Issues
    ["Fixture bracket revision needed", "PLC I/O count exceeded", "Weld gun cable clash"].forEach((t, i) => {
      s.issues.push({
        id: uid(), projectId: p.id, title: t,
        severity: (["high", "medium", "low"] as const)[i],
        raisedBy: "K. Sharma", assignee: p.manager,
        status: i === 0 ? "in-progress" : "open",
        raisedAt: days(-3 - i),
      });
    });

    // Change Requests
    s.changes.push({
      id: uid(), projectId: p.id, code: `CR-${p.code}-01`,
      title: "Add safety light curtain — Zone 3",
      impactCost: 240000, impactDays: 7, status: "pending",
      raisedBy: "Customer", raisedAt: days(-6),
    });

    // Docs
    ["Project Charter.pdf", "Contract.pdf", "Layout GA.dwg", "FAT Report Draft.docx"].forEach((n, i) => {
      s.docs.push({
        id: uid(), projectId: p.id, name: n,
        kind: (["Charter", "Contract", "Drawing", "Report"] as const)[i],
        size: `${(0.4 + i * 0.6).toFixed(1)} MB`,
        uploadedBy: p.manager, at: days(-30 + i * 5),
      });
    });

    // Team
    [
      ["Project Manager", p.manager, 100],
      ["Lead Engineer", "K. Sharma", 80],
      ["Mechanical Designer", "A. Menon", 60],
      ["Controls Engineer", "V. Nair", 70],
      ["Site Supervisor", "P. Gupta", 50],
    ].forEach(([role, name, alloc]) => {
      s.team.push({
        id: uid(), projectId: p.id, name: name as string, role: role as string,
        allocationPct: alloc as number,
        email: `${(name as string).toLowerCase().replace(/[^a-z]/g, ".")}@faithautomation.com`,
      });
    });

    // Calendar
    ["Design Review", "Customer Visit", "Vendor Meeting", "FAT Dry Run", "Handover"].forEach((e, i) => {
      s.events.push({
        id: uid(), projectId: p.id, title: e,
        date: days(-3 + i * 9),
        kind: (["review", "meeting", "meeting", "review", "milestone"] as const)[i],
      });
    });

    // Budget
    (["Labour", "Material", "Equipment", "Subcontract", "Overhead"] as const).forEach((cat, i) => {
      const planned = p.budget * [0.25, 0.4, 0.2, 0.1, 0.05][i];
      s.budget.push({
        id: uid(), projectId: p.id, category: cat,
        planned, committed: planned * 0.75, actual: planned * (p.progress / 100) * 0.9,
      });
    });
  });

  return s;
}
