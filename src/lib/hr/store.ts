import { useSyncExternalStore } from "react";
import { fireFinanceEvent } from "@/lib/finance/emit";
import { makeCrud } from "@/lib/crud";
import type { HRState } from "./types";

const KEY = "faith-erp:hr:v1";

function iso(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}
function ymd(offsetDays: number) {
  return iso(offsetDays).slice(0, 10);
}

function seed(): HRState {
  const employees: HRState["employees"] = [
    { id: "e1", code: "EMP-1001", name: "Arjun Mehta", email: "arjun.mehta@faith.co.in", phone: "+91 98200 11001", designation: "CEO", department: "Executive", location: "Pune HQ", band: "B5", status: "active", joinDate: "2015-04-01", ctc: 12000000, gender: "M", skills: ["s1","s2"] },
    { id: "e2", code: "EMP-1002", name: "Priya Sharma", email: "priya.sharma@faith.co.in", phone: "+91 98200 11002", designation: "VP Engineering", department: "Engineering", managerId: "e1", location: "Pune HQ", band: "B4", status: "active", joinDate: "2016-06-10", ctc: 6800000, gender: "F", skills: ["s3","s4","s5"] },
    { id: "e3", code: "EMP-1003", name: "Rahul Deshpande", email: "rahul.d@faith.co.in", phone: "+91 98200 11003", designation: "Plant Head", department: "Manufacturing", managerId: "e1", location: "Chakan Plant", band: "B4", status: "active", joinDate: "2017-02-15", ctc: 5800000, gender: "M", skills: ["s6","s7"] },
    { id: "e4", code: "EMP-1004", name: "Neha Kulkarni", email: "neha.k@faith.co.in", phone: "+91 98200 11004", designation: "Senior Design Engineer", department: "Engineering", managerId: "e2", location: "Pune HQ", band: "B3", status: "active", joinDate: "2019-08-01", ctc: 2400000, gender: "F", skills: ["s3","s5","s8"] },
    { id: "e5", code: "EMP-1005", name: "Vikram Patil", email: "vikram.p@faith.co.in", phone: "+91 98200 11005", designation: "PLC Automation Lead", department: "Engineering", managerId: "e2", location: "Chakan Plant", band: "B3", status: "active", joinDate: "2018-11-20", ctc: 2800000, gender: "M", skills: ["s4","s9"] },
    { id: "e6", code: "EMP-1006", name: "Sneha Iyer", email: "sneha.i@faith.co.in", phone: "+91 98200 11006", designation: "QA Manager", department: "Quality", managerId: "e1", location: "Chakan Plant", band: "B3", status: "on-leave", joinDate: "2018-01-10", ctc: 2600000, gender: "F", skills: ["s10","s11"] },
    { id: "e7", code: "EMP-1007", name: "Rohit Jadhav", email: "rohit.j@faith.co.in", phone: "+91 98200 11007", designation: "Shop Supervisor", department: "Manufacturing", managerId: "e3", location: "Chakan Plant", band: "B2", status: "active", joinDate: "2020-03-05", ctc: 1400000, gender: "M", skills: ["s6"] },
    { id: "e8", code: "EMP-1008", name: "Karan Verma", email: "karan.v@faith.co.in", phone: "+91 98200 11008", designation: "Procurement Lead", department: "Procurement", managerId: "e1", location: "Pune HQ", band: "B3", status: "active", joinDate: "2019-05-22", ctc: 2200000, gender: "M", skills: ["s12"] },
    { id: "e9", code: "EMP-1009", name: "Ananya Rao", email: "ananya.r@faith.co.in", phone: "+91 98200 11009", designation: "Finance Controller", department: "Finance", managerId: "e1", location: "Pune HQ", band: "B4", status: "active", joinDate: "2017-09-14", ctc: 4200000, gender: "F", skills: ["s13"] },
    { id: "e10", code: "EMP-1010", name: "Suresh Kamble", email: "suresh.k@faith.co.in", phone: "+91 98200 11010", designation: "Welding Technician", department: "Manufacturing", managerId: "e7", location: "Chakan Plant", band: "B1", status: "active", joinDate: "2021-07-01", ctc: 620000, gender: "M", skills: ["s6"] },
    { id: "e11", code: "EMP-1011", name: "Divya Nair", email: "divya.n@faith.co.in", phone: "+91 98200 11011", designation: "CAD Designer", department: "Engineering", managerId: "e2", location: "Pune HQ", band: "B2", status: "active", joinDate: "2022-01-11", ctc: 1200000, gender: "F", skills: ["s3","s8"] },
    { id: "e12", code: "EMP-1012", name: "Manoj Pillai", email: "manoj.p@faith.co.in", phone: "+91 98200 11012", designation: "HR Business Partner", department: "HR", managerId: "e1", location: "Pune HQ", band: "B3", status: "active", joinDate: "2019-04-18", ctc: 1900000, gender: "M", skills: ["s14"] },
    { id: "e13", code: "EMP-1013", name: "Kavya Menon", email: "kavya.m@faith.co.in", phone: "+91 98200 11013", designation: "Sales Manager", department: "Sales", managerId: "e1", location: "Pune HQ", band: "B3", status: "active", joinDate: "2020-10-05", ctc: 2600000, gender: "F", skills: ["s15"] },
    { id: "e14", code: "EMP-1014", name: "Aditya Joshi", email: "aditya.j@faith.co.in", phone: "+91 98200 11014", designation: "Robotics Engineer", department: "Engineering", managerId: "e5", location: "Chakan Plant", band: "B2", status: "notice", joinDate: "2021-02-14", ctc: 1600000, gender: "M", skills: ["s4","s9"] },
    { id: "e15", code: "EMP-1015", name: "Farah Khan", email: "farah.k@faith.co.in", phone: "+91 98200 11015", designation: "QC Inspector", department: "Quality", managerId: "e6", location: "Chakan Plant", band: "B1", status: "active", joinDate: "2022-06-20", ctc: 720000, gender: "F", skills: ["s10"] },
  ];

  const skills: HRState["skills"] = [
    { id: "s1", name: "Strategic Leadership", category: "Soft-Skill" },
    { id: "s2", name: "P&L Management", category: "Soft-Skill" },
    { id: "s3", name: "SolidWorks / CATIA", category: "Engineering" },
    { id: "s4", name: "Siemens PLC / TIA", category: "Automation" },
    { id: "s5", name: "BIW Fixture Design", category: "Engineering" },
    { id: "s6", name: "MIG/TIG Welding", category: "Manufacturing" },
    { id: "s7", name: "Lean & Six Sigma", category: "Manufacturing" },
    { id: "s8", name: "GD&T", category: "Engineering" },
    { id: "s9", name: "KUKA / FANUC Robotics", category: "Automation" },
    { id: "s10", name: "CMM Inspection", category: "Quality" },
    { id: "s11", name: "APQP / PPAP", category: "Quality" },
    { id: "s12", name: "Strategic Sourcing", category: "Soft-Skill" },
    { id: "s13", name: "IND-AS Reporting", category: "Soft-Skill" },
    { id: "s14", name: "HR Business Partnering", category: "Soft-Skill" },
    { id: "s15", name: "Enterprise Sales", category: "Soft-Skill" },
  ];

  const empSkills: HRState["empSkills"] = employees.flatMap((e) =>
    e.skills.map((sid, i) => ({ empId: e.id, skillId: sid, level: (Math.min(5, 3 + (i % 3)) as 1|2|3|4|5), certified: i === 0, lastAssessed: ymd(-60 - i * 15) })),
  );

  const attendance: HRState["attendance"] = [];
  for (let d = 0; d < 14; d++) {
    const day = ymd(-d);
    employees.forEach((e) => {
      const isWeekend = [0, 6].includes(new Date(day).getDay());
      const roll = (e.id.charCodeAt(1) + d) % 20;
      const status = isWeekend ? "week-off" : roll === 0 ? "leave" : roll === 1 ? "wfh" : "present";
      attendance.push({
        id: `att-${e.id}-${d}`,
        empId: e.id,
        date: day,
        status,
        in: status === "present" || status === "wfh" ? "09:12" : undefined,
        out: status === "present" || status === "wfh" ? "18:34" : undefined,
        hours: status === "present" || status === "wfh" ? 8.6 : 0,
      });
    });
  }

  const balances: HRState["balances"] = employees.map((e) => ({
    empId: e.id, casual: 6, sick: 8, earned: 14, compOff: 2,
  }));

  const leaves: HRState["leaves"] = [
    { id: "l1", code: "LV-2401", empId: "e6", type: "sick", from: ymd(-2), to: ymd(3), days: 6, reason: "Medical — surgery recovery", status: "approved", approver: "Arjun Mehta", raisedAt: iso(-5) },
    { id: "l2", code: "LV-2402", empId: "e4", type: "casual", from: ymd(5), to: ymd(6), days: 2, reason: "Personal", status: "pending", approver: "Priya Sharma", raisedAt: iso(-1) },
    { id: "l3", code: "LV-2403", empId: "e10", type: "earned", from: ymd(10), to: ymd(15), days: 6, reason: "Family function", status: "pending", approver: "Rohit Jadhav", raisedAt: iso(-2) },
    { id: "l4", code: "LV-2404", empId: "e11", type: "casual", from: ymd(-8), to: ymd(-8), days: 1, reason: "Bank work", status: "approved", approver: "Priya Sharma", raisedAt: iso(-10) },
    { id: "l5", code: "LV-2405", empId: "e14", type: "unpaid", from: ymd(-1), to: ymd(-1), days: 1, reason: "Personal", status: "rejected", approver: "Vikram Patil", raisedAt: iso(-3) },
    { id: "l6", code: "LV-2406", empId: "e15", type: "sick", from: ymd(-4), to: ymd(-3), days: 2, reason: "Viral fever", status: "approved", approver: "Sneha Iyer", raisedAt: iso(-5) },
  ];

  const weekStart = ymd(-((new Date().getDay() + 6) % 7));
  const timesheets: HRState["timesheets"] = [
    { id: "ts1", empId: "e4", weekOf: weekStart, projectCode: "PRJ-1021", taskCode: "WBS-2.1", mon: 6, tue: 7, wed: 8, thu: 6, fri: 5, sat: 0, sun: 0, status: "submitted", approver: "Priya Sharma" },
    { id: "ts2", empId: "e4", weekOf: weekStart, projectCode: "PRJ-1021", taskCode: "WBS-3.4", mon: 2, tue: 1, wed: 0, thu: 2, fri: 3, sat: 0, sun: 0, status: "submitted", approver: "Priya Sharma" },
    { id: "ts3", empId: "e5", weekOf: weekStart, projectCode: "PRJ-1024", taskCode: "WBS-4.2", mon: 8, tue: 8, wed: 7, thu: 8, fri: 6, sat: 4, sun: 0, status: "approved", approver: "Priya Sharma" },
    { id: "ts4", empId: "e11", weekOf: weekStart, projectCode: "PRJ-1024", taskCode: "WBS-1.3", mon: 7, tue: 8, wed: 8, thu: 7, fri: 6, sat: 0, sun: 0, status: "draft", approver: "Priya Sharma" },
    { id: "ts5", empId: "e14", weekOf: weekStart, projectCode: "PRJ-1022", taskCode: "WBS-5.1", mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0, status: "submitted", approver: "Vikram Patil" },
    { id: "ts6", empId: "e10", weekOf: weekStart, projectCode: "PRJ-1021", taskCode: "WBS-6.2", mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 4, sun: 0, status: "approved", approver: "Rohit Jadhav" },
  ];

  const trainings: HRState["trainings"] = [
    { id: "t1", code: "TRN-24-01", title: "Advanced Siemens TIA Portal V18", provider: "Siemens India", category: "Automation", hours: 40, seats: 12, enrolled: 10, startDate: ymd(-14), endDate: ymd(-9), status: "completed", cost: 240000 },
    { id: "t2", code: "TRN-24-02", title: "GD&T Level 2 Certification", provider: "TÜV Rheinland", category: "Engineering", hours: 24, seats: 15, enrolled: 12, startDate: ymd(-3), endDate: ymd(4), status: "in-progress", cost: 180000 },
    { id: "t3", code: "TRN-24-03", title: "Lean Six Sigma Green Belt", provider: "KPMG Academy", category: "Manufacturing", hours: 60, seats: 10, enrolled: 8, startDate: ymd(20), endDate: ymd(60), status: "planned", cost: 320000 },
    { id: "t4", code: "TRN-24-04", title: "Robotics Safety & PL-d Compliance", provider: "KUKA College", category: "Automation", hours: 16, seats: 20, enrolled: 18, startDate: ymd(-60), endDate: ymd(-55), status: "expired", cost: 140000 },
    { id: "t5", code: "TRN-24-05", title: "APQP / PPAP Refresher", provider: "AIAG", category: "Quality", hours: 20, seats: 12, enrolled: 6, startDate: ymd(35), endDate: ymd(38), status: "planned", cost: 96000 },
  ];

  const payrollRuns: HRState["payrollRuns"] = [
    { id: "pr1", code: "PR-2408", period: "Aug 2025", employees: 15, gross: 4325000, deductions: 862000, net: 3463000, status: "paid", runOn: iso(-40), releasedOn: iso(-38) },
    { id: "pr2", code: "PR-2409", period: "Sep 2025", employees: 15, gross: 4382000, deductions: 875000, net: 3507000, status: "released", runOn: iso(-10), releasedOn: iso(-8) },
    { id: "pr3", code: "PR-2410", period: "Oct 2025", employees: 15, gross: 4405000, deductions: 878000, net: 3527000, status: "draft", runOn: iso(-1) },
  ];

  const payslips: HRState["payslips"] = employees.map((e, i) => {
    const monthly = Math.round(e.ctc / 12);
    const basic = Math.round(monthly * 0.45);
    const hra = Math.round(monthly * 0.2);
    const allowances = monthly - basic - hra;
    const gross = basic + hra + allowances;
    const pf = Math.round(basic * 0.12);
    const pt = 200;
    const tds = Math.round(gross * (e.band === "B5" ? 0.18 : e.band === "B4" ? 0.14 : e.band === "B3" ? 0.09 : 0.04));
    const other = i % 4 === 0 ? 1500 : 0;
    const net = gross - pf - pt - tds - other;
    return { id: `ps-${e.id}`, runId: "pr2", empId: e.id, basic, hra, allowances, gross, pf, pt, tds, other, net };
  });

  const reviews: HRState["reviews"] = [
    { id: "r1", code: "REV-H1-25-01", empId: "e4", cycle: "H1 2025", reviewer: "Priya Sharma", selfRating: 4, managerRating: 4, finalRating: 4, status: "closed", goals: 6, goalsAchieved: 5, strengths: "Strong CAD execution and design ownership", improvements: "Cross-team communication", updatedAt: iso(-30) },
    { id: "r2", code: "REV-H1-25-02", empId: "e5", cycle: "H1 2025", reviewer: "Priya Sharma", selfRating: 5, managerRating: 4, finalRating: 4, status: "calibration", goals: 5, goalsAchieved: 5, strengths: "PLC architecture leadership", improvements: "Documentation rigor", updatedAt: iso(-4) },
    { id: "r3", code: "REV-H1-25-03", empId: "e7", cycle: "H1 2025", reviewer: "Rahul Deshpande", selfRating: 3, managerRating: 3, finalRating: 3, status: "manager", goals: 5, goalsAchieved: 3, strengths: "Shop-floor discipline", improvements: "Root cause analysis depth", updatedAt: iso(-1) },
    { id: "r4", code: "REV-H1-25-04", empId: "e11", cycle: "H1 2025", reviewer: "Priya Sharma", selfRating: 4, managerRating: 0, finalRating: 0, status: "self", goals: 4, goalsAchieved: 3, strengths: "Fast learner on new CAD tools", improvements: "Estimation accuracy", updatedAt: iso(-2) },
    { id: "r5", code: "REV-H1-25-05", empId: "e10", cycle: "H1 2025", reviewer: "Rohit Jadhav", selfRating: 4, managerRating: 4, finalRating: 4, status: "closed", goals: 4, goalsAchieved: 4, strengths: "Consistent welding quality", improvements: "Advanced-material welding certifications", updatedAt: iso(-45) },
    { id: "r6", code: "REV-H1-25-06", empId: "e15", cycle: "H1 2025", reviewer: "Sneha Iyer", selfRating: 3, managerRating: 4, finalRating: 4, status: "closed", goals: 5, goalsAchieved: 4, strengths: "High attention to detail on CMM", improvements: "SPC tool proficiency", updatedAt: iso(-20) },
  ];

  return { employees, attendance, leaves, balances, timesheets, skills, empSkills, trainings, payrollRuns, payslips, reviews };
}

function load(): HRState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
    return JSON.parse(raw) as HRState;
  } catch { return seed(); }
}

let state: HRState = load();
const listeners = new Set<() => void>();

function save() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const hr = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  update(mut: (s: HRState) => void) { mut(state); state = { ...state }; save(); },
  reset() { state = seed(); save(); },
};

export function useHR<T>(sel: (s: HRState) => T): T {
  return useSyncExternalStore(hr.subscribe, () => sel(state), () => sel(state));
}

/* ------------------------------------------------------------------ */
/* CRUD + workflow actions                                             */
/* ------------------------------------------------------------------ */

const { upsert: baseUpsert, remove: hrRemove } = makeCrud<HRState & Record<string, unknown>>(
  hr as unknown as { update(mut: (s: HRState & Record<string, unknown>) => void): void },
);

function nextCode(prefix: string, existing: string[]) {
  const nums = existing
    .map((c) => Number(c.replace(/\D/g, "").slice(-4)))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 2400) + 1;
  return `${prefix}-${next}`;
}

function daysBetween(from: string, to: string) {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

/** Insert/update any HR collection, applying module defaults + derived fields. */
export function hrUpsert(key: string, record: Record<string, unknown>): string {
  const rec: Record<string, unknown> = { ...record };

  if (key === "employees") {
    if (!rec.skills) rec.skills = [];
    if (!rec.status) rec.status = "active";
    if (!rec.code) rec.code = nextCode("EMP", state.employees.map((e) => e.code));
  }

  if (key === "leaves") {
    rec.days = daysBetween(String(rec.from ?? ""), String(rec.to ?? ""));
    if (!rec.id) {
      rec.code = nextCode("LV", state.leaves.map((l) => l.code));
      rec.status = "pending";
      rec.raisedAt = new Date().toISOString();
    }
  }

  if (key === "timesheets") {
    for (const dayKey of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]) {
      rec[dayKey] = Number(rec[dayKey] ?? 0) || 0;
    }
    if (typeof rec.weekOf === "string") rec.weekOf = rec.weekOf.slice(0, 10);
    if (!rec.id) rec.status = "draft";
  }

  if (key === "attendance") {
    if (typeof rec.date === "string") rec.date = rec.date.slice(0, 10);
    rec.hours = Number(rec.hours ?? 0) || 0;
  }

  if (key === "trainings") {
    if (!rec.code) rec.code = nextCode("TRN", state.trainings.map((t) => t.code));
    if (rec.enrolled === undefined) rec.enrolled = 0;
    if (!rec.status) rec.status = "planned";
  }

  if (key === "reviews") {
    rec.updatedAt = new Date().toISOString();
    if (!rec.id) {
      rec.code = nextCode("REV", state.reviews.map((r) => r.code));
      rec.status = "self";
      rec.finalRating = 0;
    }
  }

  if (key === "empSkills") {
    // empSkills has a composite key, not an id — handle it explicitly.
    const empId = String(rec.empId);
    const skillId = String(rec.skillId);
    const entry = {
      empId,
      skillId,
      level: Math.min(5, Math.max(1, Number(rec.level ?? 1))),
      certified: rec.certified === "yes" || rec.certified === true,
      lastAssessed: String(rec.lastAssessed ?? new Date().toISOString()).slice(0, 10),
    };
    hr.update((s) => {
      const idx = s.empSkills.findIndex((x) => x.empId === empId && x.skillId === skillId);
      if (idx >= 0) s.empSkills[idx] = entry as HRState["empSkills"][number];
      else s.empSkills = [entry as HRState["empSkills"][number], ...s.empSkills];
      const emp = s.employees.find((e) => e.id === empId);
      if (emp && !emp.skills.includes(skillId)) emp.skills = [...emp.skills, skillId];
    });
    return `${empId}:${skillId}`;
  }

  if (key === "balances") {
    const empId = String(rec.empId);
    hr.update((s) => {
      const idx = s.balances.findIndex((b) => b.empId === empId);
      const entry = {
        empId,
        casual: Number(rec.casual ?? 0),
        sick: Number(rec.sick ?? 0),
        earned: Number(rec.earned ?? 0),
        compOff: Number(rec.compOff ?? 0),
      };
      if (idx >= 0) s.balances[idx] = entry;
      else s.balances = [entry, ...s.balances];
    });
    return empId;
  }

  return baseUpsert(key, rec);
}

export function hrDelete(key: string, id: string) {
  if (key === "empSkills") {
    const [empId, skillId] = id.split(":");
    hr.update((s) => {
      s.empSkills = s.empSkills.filter((x) => !(x.empId === empId && x.skillId === skillId));
    });
    return;
  }
  if (key === "balances") {
    hr.update((s) => { s.balances = s.balances.filter((b) => b.empId !== id); });
    return;
  }
  hrRemove(key, id);
}

/* ---- Leave workflow ---- */

const LEAVE_BUCKET: Record<string, keyof Omit<HRState["balances"][number], "empId">> = {
  casual: "casual",
  sick: "sick",
  earned: "earned",
  "comp-off": "compOff",
};

export function setLeaveStatus(id: string, status: "approved" | "rejected" | "cancelled" | "pending") {
  hr.update((s) => {
    const l = s.leaves.find((x) => x.id === id);
    if (!l) return;
    const wasApproved = l.status === "approved";
    l.status = status;
    const bucket = LEAVE_BUCKET[l.type];
    if (!bucket) return;
    const bal = s.balances.find((b) => b.empId === l.empId);
    if (!bal) return;
    if (status === "approved" && !wasApproved) bal[bucket] = Math.max(0, bal[bucket] - l.days);
    if (status !== "approved" && wasApproved) bal[bucket] = bal[bucket] + l.days;
  });
}

/* ---- Timesheet workflow ---- */

export function setTimesheetStatus(id: string, status: "draft" | "submitted" | "approved" | "rejected") {
  hr.update((s) => {
    const t = s.timesheets.find((x) => x.id === id);
    if (t) t.status = status;
  });
  // Approved hours become project labour cost in the GL.
  if (status === "approved") fireFinanceEvent({ type: "timesheet.approved", timesheetId: id });
}

export function submitAllDrafts(empId?: string) {
  let n = 0;
  hr.update((s) => {
    s.timesheets.forEach((t) => {
      if (t.status === "draft" && (!empId || t.empId === empId)) {
        t.status = "submitted";
        n += 1;
      }
    });
  });
  return n;
}

/* ---- Payroll workflow ---- */

export function createPayrollRun(code: string, period: string): string {
  const id = crypto.randomUUID();
  hr.update((s) => {
    const active = s.employees.filter((e) => e.status !== "exited");
    const slips = active.map((e) => {
      const monthly = Math.round(e.ctc / 12);
      const basic = Math.round(monthly * 0.45);
      const hra = Math.round(monthly * 0.2);
      const allowances = monthly - basic - hra;
      const gross = basic + hra + allowances;
      const pf = Math.round(basic * 0.12);
      const pt = 200;
      const tds = Math.round(gross * (e.band === "B5" ? 0.18 : e.band === "B4" ? 0.14 : e.band === "B3" ? 0.09 : 0.04));
      const other = 0;
      return { id: `ps-${id}-${e.id}`, runId: id, empId: e.id, basic, hra, allowances, gross, pf, pt, tds, other, net: gross - pf - pt - tds - other };
    });
    const gross = slips.reduce((a, p) => a + p.gross, 0);
    const net = slips.reduce((a, p) => a + p.net, 0);
    s.payrollRuns = [
      { id, code, period, employees: slips.length, gross, deductions: gross - net, net, status: "draft", runOn: new Date().toISOString() },
      ...s.payrollRuns,
    ];
    s.payslips = [...slips, ...s.payslips];
  });
  return id;
}

export function setPayrollStatus(id: string, status: "draft" | "locked" | "released" | "paid") {
  hr.update((s) => {
    const r = s.payrollRuns.find((p) => p.id === id);
    if (!r) return;
    r.status = status;
    if (status === "released" || status === "paid") r.releasedOn = new Date().toISOString();
  });
  // Releasing a run posts the salary journal in Finance straight away.
  if (status === "released" || status === "paid") {
    fireFinanceEvent({ type: "payroll.released", runId: id });
  }
}


export function deletePayrollRun(id: string) {
  hr.update((s) => {
    s.payrollRuns = s.payrollRuns.filter((r) => r.id !== id);
    s.payslips = s.payslips.filter((p) => p.runId !== id);
  });
}

/* ---- Review workflow ---- */

const REVIEW_STAGES = ["self", "manager", "calibration", "closed"] as const;

export function advanceReview(id: string) {
  hr.update((s) => {
    const r = s.reviews.find((x) => x.id === id);
    if (!r) return;
    const i = REVIEW_STAGES.indexOf(r.status);
    if (i < REVIEW_STAGES.length - 1) r.status = REVIEW_STAGES[i + 1];
    if (r.status === "closed" && !r.finalRating) r.finalRating = r.managerRating || r.selfRating;
    r.updatedAt = new Date().toISOString();
  });
}

export function reopenReview(id: string) {
  hr.update((s) => {
    const r = s.reviews.find((x) => x.id === id);
    if (!r) return;
    const i = REVIEW_STAGES.indexOf(r.status);
    if (i > 0) r.status = REVIEW_STAGES[i - 1];
    r.updatedAt = new Date().toISOString();
  });
}

/* ---- Training workflow ---- */

export function enrollTraining(id: string) {
  hr.update((s) => {
    const t = s.trainings.find((x) => x.id === id);
    if (t && t.enrolled < t.seats) t.enrolled += 1;
  });
}

export function setTrainingStatus(id: string, status: HRState["trainings"][number]["status"]) {
  hr.update((s) => {
    const t = s.trainings.find((x) => x.id === id);
    if (t) t.status = status;
  });
}

