import type { FieldSpec } from "@/components/record-dialog";

export const HR_SCHEMAS: Record<string, FieldSpec[]> = {
  employees: [
    { name: "code", label: "Employee Code", type: "text", required: true, placeholder: "EMP-1016" },
    { name: "name", label: "Full Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "text" },
    { name: "designation", label: "Designation", type: "text", required: true },
    { name: "department", label: "Department", type: "combobox", optionsKey: "departments", required: true },
    { name: "managerId", label: "Reporting Manager", type: "combobox", optionsKey: "employees" },
    { name: "location", label: "Location", type: "combobox", optionsKey: "locations" },
    { name: "band", label: "Band", type: "select", options: ["B1", "B2", "B3", "B4", "B5"], required: true },
    { name: "status", label: "Status", type: "select", options: ["active", "on-leave", "notice", "exited"], required: true },
    { name: "joinDate", label: "Date of Joining", type: "date", required: true },
    { name: "ctc", label: "Annual CTC (INR)", type: "number", required: true },
    { name: "gender", label: "Gender", type: "select", options: ["M", "F", "Other"] },
  ],

  attendance: [
    { name: "empId", label: "Employee", type: "combobox", optionsKey: "employees", required: true },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", options: ["present", "absent", "leave", "wfh", "holiday", "week-off"], required: true },
    { name: "in", label: "In Time", type: "text", placeholder: "09:15" },
    { name: "out", label: "Out Time", type: "text", placeholder: "18:30" },
    { name: "hours", label: "Hours", type: "number" },
  ],

  leaves: [
    { name: "empId", label: "Employee", type: "combobox", optionsKey: "employees", required: true },
    { name: "type", label: "Leave Type", type: "select", options: ["casual", "sick", "earned", "comp-off", "unpaid"], required: true },
    { name: "from", label: "From", type: "date", required: true },
    { name: "to", label: "To", type: "date", required: true },
    { name: "approver", label: "Approver", type: "combobox", optionsKey: "approvers", required: true },
    { name: "reason", label: "Reason", type: "textarea", required: true },
  ],

  balances: [
    { name: "empId", label: "Employee", type: "combobox", optionsKey: "employees", required: true },
    { name: "casual", label: "Casual", type: "number", required: true },
    { name: "sick", label: "Sick", type: "number", required: true },
    { name: "earned", label: "Earned", type: "number", required: true },
    { name: "compOff", label: "Comp-off", type: "number", required: true },
  ],

  timesheets: [
    { name: "empId", label: "Employee", type: "combobox", optionsKey: "employees", required: true },
    { name: "weekOf", label: "Week Starting (Mon)", type: "date", required: true },
    { name: "projectCode", label: "Project", type: "combobox", optionsKey: "projects", required: true },
    { name: "taskCode", label: "Assigned Task (WBS)", type: "combobox", optionsKey: "tasks", required: true, colSpan: 2 },
    { name: "mon", label: "Mon", type: "number" },
    { name: "tue", label: "Tue", type: "number" },
    { name: "wed", label: "Wed", type: "number" },
    { name: "thu", label: "Thu", type: "number" },
    { name: "fri", label: "Fri", type: "number" },
    { name: "sat", label: "Sat", type: "number" },
    { name: "sun", label: "Sun", type: "number" },
    { name: "approver", label: "Approver", type: "combobox", optionsKey: "approvers", required: true },
  ],

  skills: [
    { name: "name", label: "Skill", type: "text", required: true },
    { name: "category", label: "Category", type: "select", options: ["Engineering", "Manufacturing", "Quality", "Software", "Soft-Skill", "Automation"], required: true },
  ],

  empSkills: [
    { name: "empId", label: "Employee", type: "combobox", optionsKey: "employees", required: true },
    { name: "skillId", label: "Skill", type: "combobox", optionsKey: "skills", required: true },
    { name: "level", label: "Proficiency Level (1-5)", type: "number", required: true },
    { name: "certified", label: "Certified", type: "select", options: ["yes", "no"], required: true },
    { name: "lastAssessed", label: "Last Assessed", type: "date", required: true },
  ],

  trainings: [
    { name: "code", label: "Training Code", type: "text", required: true, placeholder: "TRN-24-06" },
    { name: "title", label: "Title", type: "text", required: true, colSpan: 2 },
    { name: "provider", label: "Provider", type: "text", required: true },
    { name: "category", label: "Category", type: "select", options: ["Engineering", "Manufacturing", "Quality", "Software", "Soft-Skill", "Automation"], required: true },
    { name: "hours", label: "Hours", type: "number", required: true },
    { name: "seats", label: "Seats", type: "number", required: true },
    { name: "enrolled", label: "Enrolled", type: "number" },
    { name: "startDate", label: "Start Date", type: "date", required: true },
    { name: "endDate", label: "End Date", type: "date", required: true },
    { name: "cost", label: "Cost (INR)", type: "number", required: true },
    { name: "status", label: "Status", type: "select", options: ["planned", "in-progress", "completed", "expired"], required: true },
  ],

  payrollRuns: [
    { name: "code", label: "Run Code", type: "text", required: true, placeholder: "PR-2411" },
    { name: "period", label: "Period", type: "text", required: true, placeholder: "Nov 2025" },
  ],

  reviews: [
    { name: "empId", label: "Employee", type: "combobox", optionsKey: "employees", required: true },
    { name: "cycle", label: "Cycle", type: "text", required: true, placeholder: "H2 2025" },
    { name: "reviewer", label: "Reviewer", type: "combobox", optionsKey: "approvers", required: true },
    { name: "goals", label: "Goals", type: "number", required: true },
    { name: "goalsAchieved", label: "Goals Achieved", type: "number" },
    { name: "selfRating", label: "Self Rating (1-5)", type: "number" },
    { name: "managerRating", label: "Manager Rating (1-5)", type: "number" },
    { name: "strengths", label: "Strengths", type: "textarea" },
    { name: "improvements", label: "Improvements", type: "textarea" },
  ],
};
