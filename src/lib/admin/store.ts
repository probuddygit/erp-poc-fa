import { useSyncExternalStore } from "react";

export type AdminRole = "Admin" | "Sales" | "Projects" | "Engineering" | "Purchase" | "Stores" | "Production" | "Quality" | "Finance" | "HR" | "Executives";

export interface Company { id: string; code: string; name: string; legalName: string; gstin: string; pan: string; cin: string; currency: string; fyStart: string; }
export interface Branch { id: string; companyId: string; code: string; name: string; type: "HQ" | "Plant" | "Warehouse" | "Sales-Office"; city: string; state: string; gstin: string; headcount: number; active: boolean; }
export interface UserRow { id: string; name: string; email: string; department: string; roles: AdminRole[]; status: "active" | "invited" | "disabled"; lastLogin: string; mfa: boolean; }
export interface Permission { id: string; module: string; action: "view" | "create" | "edit" | "approve" | "delete"; roles: AdminRole[]; }
export interface ApprovalWorkflow { id: string; code: string; name: string; object: string; steps: { level: number; role: AdminRole; thresholdInr?: number; slaHours: number }[]; active: boolean; }
export interface NumberingSeries { id: string; object: string; prefix: string; padding: number; next: number; example: string; resetFreq: "never" | "yearly" | "monthly"; active: boolean; }
export interface MdmGovernance { id: string; entity: string; owner: AdminRole; dedupe: boolean; approval: boolean; changeAudit: boolean; qualityScore: number; }
export interface AuditEvent { id: string; when: string; actor: string; action: string; entity: string; ref: string; ip: string; severity: "info" | "warn" | "critical"; }
export interface HealthMetric { key: string; label: string; value: string; tone: "ok" | "warn" | "err"; sub: string; }

export interface AdminState {
  companies: Company[]; branches: Branch[]; users: UserRow[]; permissions: Permission[];
  workflows: ApprovalWorkflow[]; series: NumberingSeries[]; governance: MdmGovernance[];
  audit: AuditEvent[]; health: HealthMetric[];
}

const KEY = "faith-erp:admin:v1";

function seed(): AdminState {
  const iso = (h: number) => { const x = new Date(); x.setHours(x.getHours() + h); return x.toISOString(); };

  const companies: Company[] = [
    { id: "c1", code: "FAITH", name: "Faith Automation", legalName: "Faith Automation Pvt. Ltd.", gstin: "27AABCF1234H1Z5", pan: "AABCF1234H", cin: "U29253PN2010PTC135678", currency: "INR", fyStart: "04-01" },
  ];
  const branches: Branch[] = [
    { id: "b1", companyId: "c1", code: "HQ-PUN", name: "Pune Headquarters",   type: "HQ",           city: "Pune",     state: "Maharashtra", gstin: "27AABCF1234H1Z5", headcount: 82,  active: true },
    { id: "b2", companyId: "c1", code: "PL-CHK", name: "Chakan Plant",        type: "Plant",        city: "Chakan",   state: "Maharashtra", gstin: "27AABCF1234H1Z5", headcount: 214, active: true },
    { id: "b3", companyId: "c1", code: "WH-BHO", name: "Bhosari Warehouse",   type: "Warehouse",    city: "Bhosari",  state: "Maharashtra", gstin: "27AABCF1234H1Z5", headcount: 18,  active: true },
    { id: "b4", companyId: "c1", code: "SO-CHE", name: "Chennai Sales Office",type: "Sales-Office", city: "Chennai",  state: "Tamil Nadu",  gstin: "33AABCF1234H1Z9", headcount: 6,   active: true },
    { id: "b5", companyId: "c1", code: "SO-BLR", name: "Bengaluru Sales",     type: "Sales-Office", city: "Bengaluru",state: "Karnataka",   gstin: "29AABCF1234H1Z2", headcount: 4,   active: false },
  ];

  const users: UserRow[] = [
    { id: "u1", name: "Arjun Mehta",       email: "arjun.mehta@faith.co.in",  department: "Executive",     roles: ["Admin","Executives"], status: "active", lastLogin: iso(-2),   mfa: true },
    { id: "u2", name: "Priya Sharma",      email: "priya.sharma@faith.co.in", department: "Engineering",   roles: ["Engineering"],        status: "active", lastLogin: iso(-8),   mfa: true },
    { id: "u3", name: "Rahul Deshpande",   email: "rahul.d@faith.co.in",      department: "Manufacturing", roles: ["Production"],         status: "active", lastLogin: iso(-1),   mfa: true },
    { id: "u4", name: "Ananya Rao",        email: "ananya.r@faith.co.in",     department: "Finance",       roles: ["Finance"],            status: "active", lastLogin: iso(-4),   mfa: true },
    { id: "u5", name: "Karan Verma",       email: "karan.v@faith.co.in",      department: "Procurement",   roles: ["Purchase"],           status: "active", lastLogin: iso(-12),  mfa: false },
    { id: "u6", name: "Sneha Iyer",        email: "sneha.i@faith.co.in",      department: "Quality",       roles: ["Quality"],            status: "active", lastLogin: iso(-26),  mfa: true },
    { id: "u7", name: "Kavya Menon",       email: "kavya.m@faith.co.in",      department: "Sales",         roles: ["Sales"],              status: "active", lastLogin: iso(-3),   mfa: false },
    { id: "u8", name: "Manoj Pillai",      email: "manoj.p@faith.co.in",      department: "HR",            roles: ["HR"],                 status: "active", lastLogin: iso(-30),  mfa: true },
    { id: "u9", name: "Rohit Jadhav",      email: "rohit.j@faith.co.in",      department: "Manufacturing", roles: ["Stores","Production"],status: "active", lastLogin: iso(-18),  mfa: false },
    { id: "u10",name: "Aditya Joshi",      email: "aditya.j@faith.co.in",     department: "Engineering",   roles: ["Engineering"],        status: "disabled", lastLogin: iso(-720), mfa: false },
    { id: "u11",name: "Nikhil Bhosle",     email: "nikhil.b@faith.co.in",     department: "Projects",      roles: ["Projects"],           status: "invited", lastLogin: "",       mfa: false },
    { id: "u12",name: "Farah Khan",        email: "farah.k@faith.co.in",      department: "Quality",       roles: ["Quality"],            status: "active", lastLogin: iso(-72),  mfa: true },
  ];

  const permissions: Permission[] = [
    { id: "p1", module: "CRM",          action: "view",    roles: ["Admin","Sales","Executives"] },
    { id: "p2", module: "CRM",          action: "approve", roles: ["Admin","Sales"] },
    { id: "p3", module: "Projects",     action: "view",    roles: ["Admin","Projects","Engineering","Executives"] },
    { id: "p4", module: "Projects",     action: "edit",    roles: ["Admin","Projects"] },
    { id: "p5", module: "Procurement",  action: "approve", roles: ["Admin","Purchase","Finance","Executives"] },
    { id: "p6", module: "Inventory",    action: "edit",    roles: ["Admin","Stores","Production"] },
    { id: "p7", module: "Quality",      action: "approve", roles: ["Admin","Quality"] },
    { id: "p8", module: "Finance",      action: "approve", roles: ["Admin","Finance","Executives"] },
    { id: "p9", module: "HR",           action: "edit",    roles: ["Admin","HR"] },
    { id: "p10",module: "Reports",      action: "view",    roles: ["Admin","Executives","Finance","Projects","Quality","HR","Sales","Purchase","Production","Stores","Engineering"] },
    { id: "p11",module: "Administration",action: "edit",   roles: ["Admin"] },
  ];

  const workflows: ApprovalWorkflow[] = [
    { id: "w1", code: "WF-OA-01",  name: "Order Acknowledgement", object: "OA",              active: true, steps: [
      { level: 1, role: "Sales", slaHours: 8 },
      { level: 2, role: "Finance", thresholdInr: 5000000, slaHours: 16 },
      { level: 3, role: "Executives", thresholdInr: 25000000, slaHours: 24 },
    ]},
    { id: "w2", code: "WF-PO-01",  name: "Purchase Order",         object: "PO",             active: true, steps: [
      { level: 1, role: "Purchase", slaHours: 8 },
      { level: 2, role: "Finance", thresholdInr: 1000000, slaHours: 16 },
      { level: 3, role: "Executives", thresholdInr: 10000000, slaHours: 24 },
    ]},
    { id: "w3", code: "WF-ECN-01", name: "Engineering Change",     object: "ECN",            active: true, steps: [
      { level: 1, role: "Engineering", slaHours: 24 },
      { level: 2, role: "Quality", slaHours: 24 },
      { level: 3, role: "Projects", slaHours: 24 },
    ]},
    { id: "w4", code: "WF-EXP-01", name: "Expense Claim",          object: "Expense",        active: true, steps: [
      { level: 1, role: "HR", slaHours: 24 },
      { level: 2, role: "Finance", thresholdInr: 50000, slaHours: 24 },
    ]},
    { id: "w5", code: "WF-LV-01",  name: "Leave Request",          object: "Leave",          active: true, steps: [
      { level: 1, role: "HR", slaHours: 8 },
    ]},
    { id: "w6", code: "WF-NCR-01", name: "Non-Conformance Report", object: "NCR",            active: true, steps: [
      { level: 1, role: "Quality", slaHours: 16 },
      { level: 2, role: "Engineering", slaHours: 24 },
    ]},
    { id: "w7", code: "WF-JV-01",  name: "Journal Voucher",        object: "JV",             active: false, steps: [
      { level: 1, role: "Finance", slaHours: 8 },
      { level: 2, role: "Executives", thresholdInr: 500000, slaHours: 16 },
    ]},
  ];

  const series: NumberingSeries[] = [
    { id: "n1", object: "Project",   prefix: "PRJ",  padding: 4, next: 128, example: "PRJ-0128", resetFreq: "never",   active: true },
    { id: "n2", object: "Opportunity",prefix: "OPP", padding: 4, next: 214, example: "OPP-0214", resetFreq: "never",   active: true },
    { id: "n3", object: "RFQ",       prefix: "RFQ",  padding: 4, next: 88,  example: "RFQ-0088", resetFreq: "yearly",  active: true },
    { id: "n4", object: "Quotation", prefix: "QT",   padding: 4, next: 156, example: "QT-0156",  resetFreq: "yearly",  active: true },
    { id: "n5", object: "PO",        prefix: "PO",   padding: 5, next: 4212,example: "PO-04212", resetFreq: "yearly",  active: true },
    { id: "n6", object: "GRN",       prefix: "GRN",  padding: 5, next: 2088,example: "GRN-02088",resetFreq: "yearly",  active: true },
    { id: "n7", object: "Invoice",   prefix: "INV",  padding: 6, next: 10248,example:"INV-010248",resetFreq:"yearly",  active: true },
    { id: "n8", object: "NCR",       prefix: "NCR",  padding: 4, next: 62,  example: "NCR-0062", resetFreq: "yearly",  active: true },
    { id: "n9", object: "ECN",       prefix: "ECN",  padding: 4, next: 41,  example: "ECN-0041", resetFreq: "never",   active: true },
    { id: "n10",object:"Employee",   prefix: "EMP",  padding: 4, next: 1016,example:"EMP-1016",  resetFreq: "never",   active: true },
  ];

  const governance: MdmGovernance[] = [
    { id: "g1", entity: "Customer", owner: "Sales",      dedupe: true,  approval: true,  changeAudit: true, qualityScore: 96 },
    { id: "g2", entity: "Supplier", owner: "Purchase",   dedupe: true,  approval: true,  changeAudit: true, qualityScore: 92 },
    { id: "g3", entity: "Item",     owner: "Engineering",dedupe: true,  approval: true,  changeAudit: true, qualityScore: 88 },
    { id: "g4", entity: "Employee", owner: "HR",         dedupe: true,  approval: false, changeAudit: true, qualityScore: 94 },
    { id: "g5", entity: "Machine",  owner: "Production", dedupe: false, approval: false, changeAudit: true, qualityScore: 82 },
    { id: "g6", entity: "GL Account",owner:"Finance",    dedupe: true,  approval: true,  changeAudit: true, qualityScore: 98 },
  ];

  const audit: AuditEvent[] = [
    { id: "a1", when: iso(-1),  actor: "Ananya Rao",     action: "APPROVE",  entity: "PO",          ref: "PO-04198", ip: "10.12.4.22",  severity: "info" },
    { id: "a2", when: iso(-2),  actor: "Karan Verma",    action: "CREATE",   entity: "RFQ",         ref: "RFQ-0087", ip: "10.12.4.31",  severity: "info" },
    { id: "a3", when: iso(-3),  actor: "system",         action: "SCHEDULE", entity: "Report",      ref: "RPT-1007", ip: "10.0.0.1",    severity: "warn" },
    { id: "a4", when: iso(-4),  actor: "Priya Sharma",   action: "APPROVE",  entity: "ECN",         ref: "ECN-0040", ip: "10.12.4.14",  severity: "info" },
    { id: "a5", when: iso(-5),  actor: "Arjun Mehta",    action: "UPDATE",   entity: "Workflow",    ref: "WF-OA-01", ip: "10.12.4.2",   severity: "warn" },
    { id: "a6", when: iso(-8),  actor: "system",         action: "LOGIN-FAIL",entity: "Auth",        ref: "aditya.j", ip: "203.0.113.9", severity: "critical" },
    { id: "a7", when: iso(-12), actor: "Sneha Iyer",     action: "CREATE",   entity: "NCR",         ref: "NCR-0061", ip: "10.12.4.19",  severity: "info" },
    { id: "a8", when: iso(-24), actor: "Rohit Jadhav",   action: "TRANSFER", entity: "Stock",       ref: "ST-0442",  ip: "10.12.4.55",  severity: "info" },
    { id: "a9", when: iso(-30), actor: "Manoj Pillai",   action: "INVITE",   entity: "User",        ref: "nikhil.b", ip: "10.12.4.9",   severity: "info" },
    { id: "a10",when: iso(-48), actor: "Ananya Rao",     action: "EXPORT",   entity: "Report",      ref: "RPT-1002", ip: "10.12.4.22",  severity: "warn" },
  ];

  const health: HealthMetric[] = [
    { key: "db",   label: "Database",       value: "Healthy",  tone: "ok",   sub: "p95 34ms · 12/20 conn" },
    { key: "auth", label: "Auth Service",   value: "Healthy",  tone: "ok",   sub: "OIDC · MFA on 8/12" },
    { key: "fn",   label: "Server Functions",value:"Healthy",  tone: "ok",   sub: "1.2k invocations / 24h" },
    { key: "sto",  label: "Storage",        value: "62% used", tone: "warn", sub: "246 GB / 400 GB · attachments" },
    { key: "queue",label: "Job Queue",      value: "Healthy",  tone: "ok",   sub: "0 stuck · 4 in-flight" },
    { key: "sec",  label: "Security",       value: "1 alert",  tone: "warn", sub: "Repeated login-fail from ext. IP" },
  ];

  return { companies, branches, users, permissions, workflows, series, governance, audit, health };
}

function load(): AdminState {
  if (typeof window === "undefined") return seed();
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch {}
  const s = seed();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  return s;
}

let state: AdminState = load();
const listeners = new Set<() => void>();
function emit() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} listeners.forEach((l) => l()); }

export const adminStore = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  toggleUserStatus: (id: string) => {
    state = { ...state, users: state.users.map((u) => u.id === id
      ? { ...u, status: u.status === "active" ? "disabled" : "active" as UserRow["status"] } : u) };
    emit();
  },
  toggleBranch: (id: string) => {
    state = { ...state, branches: state.branches.map((b) => b.id === id ? { ...b, active: !b.active } : b) };
    emit();
  },
  toggleWorkflow: (id: string) => {
    state = { ...state, workflows: state.workflows.map((w) => w.id === id ? { ...w, active: !w.active } : w) };
    emit();
  },
  toggleSeries: (id: string) => {
    state = { ...state, series: state.series.map((s) => s.id === id ? { ...s, active: !s.active } : s) };
    emit();
  },
};

export function useAdmin<T>(sel: (s: AdminState) => T): T {
  return useSyncExternalStore(adminStore.subscribe, () => sel(state), () => sel(state));
}
