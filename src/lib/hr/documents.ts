import type { QualityDocument } from "@/lib/quality/documents";
import type { Employee, LeaveRequest, Payslip, PayrollRun, Timesheet, Review, Training } from "./types";

const d = (v?: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const inr = (n: number) => `₹ ${Math.round(n).toLocaleString("en-IN")}`;

export function payslipDocument(p: Payslip, emp: Employee, run?: PayrollRun): QualityDocument {
  return {
    kind: "Payslip",
    docNo: `${run?.code ?? "PR"}-${emp.code}`,
    title: `Salary slip — ${emp.name} · ${run?.period ?? ""}`,
    meta: [
      { label: "Employee", value: `${emp.name} (${emp.code})` },
      { label: "Designation", value: emp.designation },
      { label: "Department", value: emp.department },
      { label: "Location", value: emp.location },
      { label: "Band", value: emp.band },
      { label: "Date of Joining", value: d(emp.joinDate) },
      { label: "Pay Period", value: run?.period ?? "—" },
      { label: "Payment Status", value: (run?.status ?? "draft").toUpperCase() },
    ],
    table: {
      columns: ["Component", "Type", "Amount"],
      rows: [
        ["Basic", "Earning", inr(p.basic)],
        ["HRA", "Earning", inr(p.hra)],
        ["Other Allowances", "Earning", inr(p.allowances)],
        ["Gross Earnings", "Total", inr(p.gross)],
        ["Provident Fund", "Deduction", inr(p.pf)],
        ["Professional Tax", "Deduction", inr(p.pt)],
        ["TDS", "Deduction", inr(p.tds)],
        ["Other Deductions", "Deduction", inr(p.other)],
        ["Net Pay", "Total", inr(p.net)],
      ],
    },
    notes: [{ label: "Note", value: "Computer-generated payslip. No signature required." }],
    filename: `${run?.code ?? "payslip"}-${emp.code}.html`,
  };
}

export function leaveDocument(l: LeaveRequest, emp: Employee): QualityDocument {
  return {
    kind: "Leave Request",
    docNo: l.code,
    title: `${l.type} leave — ${emp.name}`,
    meta: [
      { label: "Employee", value: `${emp.name} (${emp.code})` },
      { label: "Department", value: emp.department },
      { label: "Leave Type", value: l.type },
      { label: "From", value: d(l.from) },
      { label: "To", value: d(l.to) },
      { label: "Days", value: String(l.days) },
      { label: "Approver", value: l.approver },
      { label: "Status", value: l.status.toUpperCase() },
      { label: "Raised On", value: d(l.raisedAt) },
    ],
    notes: [{ label: "Reason", value: l.reason }],
    filename: `${l.code}.html`,
  };
}

export function timesheetDocument(t: Timesheet, emp: Employee): QualityDocument {
  const total = t.mon + t.tue + t.wed + t.thu + t.fri + t.sat + t.sun;
  return {
    kind: "Timesheet",
    docNo: `TS-${emp.code}-${t.weekOf}`,
    title: `Weekly timesheet — ${emp.name} · ${t.projectCode} / ${t.taskCode}`,
    meta: [
      { label: "Employee", value: `${emp.name} (${emp.code})` },
      { label: "Week Of", value: d(t.weekOf) },
      { label: "Project", value: t.projectCode },
      { label: "Task (WBS)", value: t.taskCode },
      { label: "Approver", value: t.approver },
      { label: "Status", value: t.status.toUpperCase() },
      { label: "Total Hours", value: `${total} h` },
    ],
    table: {
      columns: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Total"],
      rows: [[t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun, total].map((n) => String(n))],
    },
    filename: `timesheet-${emp.code}-${t.weekOf}.html`,
  };
}

export function reviewDocument(r: Review, emp: Employee): QualityDocument {
  return {
    kind: "Performance Review",
    docNo: r.code,
    title: `${r.cycle} appraisal — ${emp.name}`,
    meta: [
      { label: "Employee", value: `${emp.name} (${emp.code})` },
      { label: "Designation", value: emp.designation },
      { label: "Cycle", value: r.cycle },
      { label: "Reviewer", value: r.reviewer },
      { label: "Stage", value: r.status.toUpperCase() },
      { label: "Self Rating", value: `${r.selfRating}/5` },
      { label: "Manager Rating", value: `${r.managerRating || "—"}/5` },
      { label: "Final Rating", value: `${r.finalRating || "—"}/5` },
      { label: "Goals", value: `${r.goalsAchieved}/${r.goals} achieved` },
      { label: "Last Updated", value: d(r.updatedAt) },
    ],
    notes: [
      { label: "Strengths", value: r.strengths || "—" },
      { label: "Improvements", value: r.improvements || "—" },
    ],
    filename: `${r.code}.html`,
  };
}

export function employeeDocument(e: Employee, managerName: string): QualityDocument {
  return {
    kind: "Employee Profile",
    docNo: e.code,
    title: `${e.name} — ${e.designation}`,
    meta: [
      { label: "Employee Code", value: e.code },
      { label: "Name", value: e.name },
      { label: "Email", value: e.email },
      { label: "Phone", value: e.phone },
      { label: "Designation", value: e.designation },
      { label: "Department", value: e.department },
      { label: "Reporting Manager", value: managerName },
      { label: "Location", value: e.location },
      { label: "Band", value: e.band },
      { label: "Status", value: e.status.toUpperCase() },
      { label: "Date of Joining", value: d(e.joinDate) },
      { label: "Annual CTC", value: inr(e.ctc) },
    ],
    filename: `${e.code}.html`,
  };
}

export function trainingDocument(t: Training): QualityDocument {
  return {
    kind: "Training Nomination",
    docNo: t.code,
    title: t.title,
    meta: [
      { label: "Provider", value: t.provider },
      { label: "Category", value: t.category },
      { label: "Duration", value: `${t.hours} h` },
      { label: "Seats", value: `${t.enrolled}/${t.seats} enrolled` },
      { label: "Start", value: d(t.startDate) },
      { label: "End", value: d(t.endDate) },
      { label: "Cost", value: inr(t.cost) },
      { label: "Status", value: t.status.toUpperCase() },
    ],
    filename: `${t.code}.html`,
  };
}
