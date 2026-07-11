export type RAG = "green" | "amber" | "red";
export type ProjectStatus = "planning" | "active" | "on-hold" | "closed";
export type TaskStatus = "not-started" | "in-progress" | "blocked" | "done";
export type Severity = "low" | "medium" | "high" | "critical";

export interface Project {
  id: string;
  code: string;
  name: string;
  customerName: string;
  oaId?: string;
  value: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  progress: number; // 0-100
  rag: RAG;
  manager: string;
  createdAt: string;
}

export interface WbsNode {
  id: string;
  projectId: string;
  parentId?: string;
  code: string;
  name: string;
  owner: string;
  start: string;
  end: string;
  progress: number;
  status: TaskStatus;
  weight: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  due: string;
  status: "upcoming" | "at-risk" | "achieved" | "missed";
  billing?: number;
}

export interface Risk {
  id: string;
  projectId: string;
  title: string;
  category: "Schedule" | "Cost" | "Technical" | "Supplier" | "Quality" | "Safety";
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  mitigation: string;
  owner: string;
  status: "open" | "mitigated" | "closed";
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  severity: Severity;
  raisedBy: string;
  assignee: string;
  status: "open" | "in-progress" | "resolved";
  raisedAt: string;
}

export interface ChangeRequest {
  id: string;
  projectId: string;
  code: string;
  title: string;
  impactCost: number;
  impactDays: number;
  status: "draft" | "pending" | "approved" | "rejected";
  raisedBy: string;
  raisedAt: string;
}

export interface ProjectDoc {
  id: string;
  projectId: string;
  name: string;
  kind: "Charter" | "Drawing" | "Contract" | "MoM" | "Report" | "Other";
  size: string;
  uploadedBy: string;
  at: string;
}

export interface TeamMember {
  id: string;
  projectId: string;
  name: string;
  role: string;
  allocationPct: number;
  email: string;
}

export interface CalendarEvent {
  id: string;
  projectId: string;
  title: string;
  date: string;
  kind: "milestone" | "review" | "meeting" | "delivery";
}

export interface BudgetLine {
  id: string;
  projectId: string;
  category: "Labour" | "Material" | "Equipment" | "Subcontract" | "Overhead";
  planned: number;
  committed: number;
  actual: number;
}

export interface ProjectsState {
  projects: Project[];
  wbs: WbsNode[];
  milestones: Milestone[];
  risks: Risk[];
  issues: Issue[];
  changes: ChangeRequest[];
  docs: ProjectDoc[];
  team: TeamMember[];
  events: CalendarEvent[];
  budget: BudgetLine[];
}
