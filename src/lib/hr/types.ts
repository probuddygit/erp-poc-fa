export type EmpStatus = "active" | "on-leave" | "notice" | "exited";
export type LeaveType = "casual" | "sick" | "earned" | "comp-off" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type AttendanceStatus = "present" | "absent" | "leave" | "wfh" | "holiday" | "week-off";
export type SkillLevel = 1 | 2 | 3 | 4 | 5;
export type TrainingStatus = "planned" | "in-progress" | "completed" | "expired";
export type PayrollStatus = "draft" | "locked" | "released" | "paid";
export type ReviewStatus = "self" | "manager" | "calibration" | "closed";

export interface Employee {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  managerId?: string;
  location: string;
  band: "B1" | "B2" | "B3" | "B4" | "B5";
  status: EmpStatus;
  joinDate: string;
  ctc: number; // annual INR
  gender: "M" | "F" | "Other";
  skills: string[]; // skill ids
}

export interface Attendance {
  id: string;
  empId: string;
  date: string; // ISO date
  status: AttendanceStatus;
  in?: string;
  out?: string;
  hours: number;
}

export interface LeaveRequest {
  id: string;
  code: string;
  empId: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approver: string;
  raisedAt: string;
}

export interface LeaveBalance {
  empId: string;
  casual: number;
  sick: number;
  earned: number;
  compOff: number;
}

export interface Timesheet {
  id: string;
  empId: string;
  weekOf: string; // Monday ISO
  projectCode: string;
  taskCode: string;
  mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  approver: string;
}

export interface Skill {
  id: string;
  name: string;
  category: "Engineering" | "Manufacturing" | "Quality" | "Software" | "Soft-Skill" | "Automation";
}

export interface EmployeeSkill {
  empId: string;
  skillId: string;
  level: SkillLevel;
  certified: boolean;
  lastAssessed: string;
}

export interface Training {
  id: string;
  code: string;
  title: string;
  provider: string;
  category: string;
  hours: number;
  seats: number;
  enrolled: number;
  startDate: string;
  endDate: string;
  status: TrainingStatus;
  cost: number;
}

export interface PayrollRun {
  id: string;
  code: string;
  period: string; // e.g. "Sep 2025"
  employees: number;
  gross: number;
  deductions: number;
  net: number;
  status: PayrollStatus;
  runOn: string;
  releasedOn?: string;
}

export interface Payslip {
  id: string;
  runId: string;
  empId: string;
  basic: number;
  hra: number;
  allowances: number;
  gross: number;
  pf: number;
  pt: number;
  tds: number;
  other: number;
  net: number;
}

export interface Review {
  id: string;
  code: string;
  empId: string;
  cycle: string; // "H1 2025"
  reviewer: string;
  selfRating: number; // 1-5
  managerRating: number;
  finalRating: number;
  status: ReviewStatus;
  goals: number;
  goalsAchieved: number;
  strengths: string;
  improvements: string;
  updatedAt: string;
}

export interface HRState {
  employees: Employee[];
  attendance: Attendance[];
  leaves: LeaveRequest[];
  balances: LeaveBalance[];
  timesheets: Timesheet[];
  skills: Skill[];
  empSkills: EmployeeSkill[];
  trainings: Training[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  reviews: Review[];
}
