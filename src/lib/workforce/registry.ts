import type { WFCollection } from "./types";

export type ColKind = "text" | "code" | "status" | "money" | "date" | "num" | "emp" | "score" | "progress" | "badge";

export interface ColDef {
  key: string;
  label: string;
  kind?: ColKind;
  align?: "left" | "right";
}

export interface TabDef {
  key: WFCollection;
  label: string;
  newLabel: string;
  cols: ColDef[];
  defaults?: Record<string, unknown>;
  /** Status values that can be approved / rejected inline. */
  approvable?: string[];
  approveTo?: string;
  rejectTo?: string;
}

export type CopilotKey = "recruitment" | "performance" | "learning" | "admin" | "safety" | "compliance";

export interface SectionDef {
  title: string;
  subtitle: string;
  copilot?: CopilotKey;
  copilotTitle?: string;
  askQuery?: string;
  tabs: TabDef[];
}

const APPROVE = { approvable: ["pending", "draft", "requested"], approveTo: "approved", rejectTo: "rejected" };

export const WORKFORCE_SECTIONS: Record<string, SectionDef> = {
  recruitment: {
    title: "Recruitment & Onboarding",
    subtitle: "Manpower planning → requisition → sourcing → interview → offer → onboarding, with AI resume ranking and TAT monitoring.",
    copilot: "recruitment",
    copilotTitle: "HR Copilot — Talent Acquisition",
    askQuery: "Summarise our recruitment pipeline, TAT and the best candidates in play",
    tabs: [
      { key: "manpowerPlans", label: "Manpower Planning", newLabel: "New Plan", ...APPROVE, cols: [{ key: "code", label: "Plan", kind: "code" }, { key: "department", label: "Department" }, { key: "position", label: "Position" }, { key: "budgeted", label: "Budgeted", kind: "num" }, { key: "onboard", label: "On-board", kind: "num" }, { key: "gap", label: "Gap", kind: "num" }, { key: "quarter", label: "Quarter" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "requisitions", label: "Requisitions (MRF)", newLabel: "New Requisition", ...APPROVE, cols: [{ key: "code", label: "MRF", kind: "code" }, { key: "position", label: "Position" }, { key: "department", label: "Dept" }, { key: "grade", label: "Grade", kind: "badge" }, { key: "vacancies", label: "Vac.", kind: "num" }, { key: "targetDate", label: "Target", kind: "date" }, { key: "budgetCtc", label: "Budget CTC", kind: "money" }, { key: "priority", label: "Priority", kind: "status" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "jobPostings", label: "Positions & JD", newLabel: "New Posting", cols: [{ key: "code", label: "JD", kind: "code" }, { key: "title", label: "Title" }, { key: "requisition", label: "MRF" }, { key: "channel", label: "Channel" }, { key: "postedOn", label: "Posted", kind: "date" }, { key: "applications", label: "Apps", kind: "num" }, { key: "shortlisted", label: "Shortlist", kind: "num" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "candidates", label: "Resume Bank & Screening", newLabel: "Add Candidate", cols: [{ key: "code", label: "ID", kind: "code" }, { key: "name", label: "Candidate" }, { key: "position", label: "Position" }, { key: "source", label: "Source" }, { key: "experience", label: "Exp", kind: "num" }, { key: "expectedCtc", label: "Expected", kind: "money" }, { key: "noticeDays", label: "Notice", kind: "num" }, { key: "matchScore", label: "AI Match", kind: "score" }, { key: "stage", label: "Stage", kind: "badge" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "interviews", label: "Interviews & Feedback", newLabel: "Schedule Interview", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "candidate", label: "Candidate" }, { key: "round", label: "Round" }, { key: "panel", label: "Panel" }, { key: "scheduledOn", label: "Date", kind: "date" }, { key: "mode", label: "Mode" }, { key: "rating", label: "Rating", kind: "num" }, { key: "recommendation", label: "Reco", kind: "badge" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "offers", label: "Offer Management", newLabel: "New Offer", cols: [{ key: "code", label: "Offer", kind: "code" }, { key: "candidate", label: "Candidate" }, { key: "position", label: "Position" }, { key: "grade", label: "Grade", kind: "badge" }, { key: "ctc", label: "CTC", kind: "money" }, { key: "joiningDate", label: "Joining", kind: "date" }, { key: "acceptance", label: "Acceptance", kind: "badge" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "onboarding", label: "Joining & Onboarding", newLabel: "New Onboarding", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "candidate", label: "New Joiner" }, { key: "joiningDate", label: "Joining", kind: "date" }, { key: "buddy", label: "Buddy" }, { key: "documents", label: "Docs" }, { key: "itAssets", label: "IT Assets", kind: "badge" }, { key: "safetyInduction", label: "Safety", kind: "badge" }, { key: "progress", label: "Progress", kind: "progress" }, { key: "status", label: "Status", kind: "status" }] },
    ],
  },

  performance: {
    title: "Performance Management",
    subtitle: "KPI library, goal alignment, self & manager assessment, calibration, appraisal consolidation and salary revision workflow.",
    copilot: "performance",
    copilotTitle: "HR Copilot — Performance & Talent Risk",
    askQuery: "Which employees are at attrition risk and who is promotion-ready this cycle?",
    tabs: [
      { key: "kpiLibrary", label: "KPI / KRA Library", newLabel: "New KPI", cols: [{ key: "code", label: "Code", kind: "code" }, { key: "name", label: "KPI" }, { key: "department", label: "Department" }, { key: "type", label: "Measure", kind: "badge" }, { key: "uom", label: "UoM" }, { key: "target", label: "Target", kind: "num" }, { key: "weightage", label: "Wt %", kind: "num" }, { key: "frequency", label: "Frequency" }] },
      { key: "goals", label: "Individual Goals", newLabel: "Assign Goal", cols: [{ key: "code", label: "Goal", kind: "code" }, { key: "empId", label: "Employee", kind: "emp" }, { key: "kpi", label: "KPI" }, { key: "cycle", label: "Cycle" }, { key: "target", label: "Target", kind: "num" }, { key: "achieved", label: "Achieved", kind: "num" }, { key: "weightage", label: "Wt %", kind: "num" }, { key: "score", label: "Score", kind: "num" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "appraisals", label: "Appraisal Consolidation", newLabel: "New Appraisal", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "empId", label: "Employee", kind: "emp" }, { key: "cycle", label: "Cycle" }, { key: "selfScore", label: "Self", kind: "num" }, { key: "managerScore", label: "Manager", kind: "num" }, { key: "calibratedScore", label: "Calibrated", kind: "num" }, { key: "rating", label: "Rating", kind: "badge" }, { key: "incrementPct", label: "Increment %", kind: "num" }, { key: "promotion", label: "Promotion", kind: "badge" }, { key: "status", label: "Stage", kind: "status" }] },
      { key: "promotions", label: "Promotion & Increment", newLabel: "Recommend Promotion", ...APPROVE, cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "empId", label: "Employee", kind: "emp" }, { key: "fromGrade", label: "From", kind: "badge" }, { key: "toGrade", label: "To", kind: "badge" }, { key: "effectiveDate", label: "Effective", kind: "date" }, { key: "currentCtc", label: "Current", kind: "money" }, { key: "revisedCtc", label: "Revised", kind: "money" }, { key: "incrementPct", label: "Inc %", kind: "num" }, { key: "status", label: "Status", kind: "status" }] },
    ],
  },

  learning: {
    title: "Learning & Development",
    subtitle: "Training need identification, calendar, competency matrix, trainers, attendance, feedback and 3-year training records.",
    copilot: "learning",
    copilotTitle: "Training Copilot",
    askQuery: "What are our biggest skill gaps and what training should we plan next quarter?",
    tabs: [
      { key: "tni", label: "Training Needs (TNI)", newLabel: "New TNI", ...APPROVE, cols: [{ key: "code", label: "TNI", kind: "code" }, { key: "level", label: "Level", kind: "badge" }, { key: "area", label: "Need" }, { key: "identifiedBy", label: "Identified By" }, { key: "employeesImpacted", label: "Impacted", kind: "num" }, { key: "priority", label: "Priority", kind: "status" }, { key: "source", label: "Source" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "trainingPlans", label: "Training Plan & Calendar", newLabel: "New Plan", cols: [{ key: "code", label: "Plan", kind: "code" }, { key: "title", label: "Programme" }, { key: "tni", label: "TNI" }, { key: "trainer", label: "Trainer" }, { key: "month", label: "Month" }, { key: "mode", label: "Mode", kind: "badge" }, { key: "participants", label: "Pax", kind: "num" }, { key: "budget", label: "Budget", kind: "money" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "competencies", label: "Competency Matrix", newLabel: "New Competency", cols: [{ key: "code", label: "Code", kind: "code" }, { key: "role", label: "Role" }, { key: "competency", label: "Competency" }, { key: "requiredLevel", label: "Required", kind: "num" }, { key: "avgLevel", label: "Current", kind: "num" }, { key: "gap", label: "Gap", kind: "num" }, { key: "criticality", label: "Criticality", kind: "status" }] },
      { key: "trainers", label: "Trainer Management", newLabel: "Add Trainer", cols: [{ key: "code", label: "Code", kind: "code" }, { key: "name", label: "Trainer" }, { key: "type", label: "Type", kind: "badge" }, { key: "specialisation", label: "Specialisation" }, { key: "rating", label: "Rating", kind: "num" }, { key: "costPerDay", label: "Cost / Day", kind: "money" }, { key: "empanelled", label: "Empanelled", kind: "badge" }] },
      { key: "trainingFeedback", label: "Feedback & Evaluation", newLabel: "Add Feedback", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "training", label: "Training" }, { key: "empId", label: "Employee", kind: "emp" }, { key: "contentScore", label: "Content", kind: "num" }, { key: "trainerScore", label: "Trainer", kind: "num" }, { key: "relevance", label: "Relevance", kind: "num" }, { key: "postTestScore", label: "Post-test", kind: "num" }, { key: "effectiveness", label: "Effectiveness", kind: "status" }] },
    ],
  },

  engagement: {
    title: "Employee Engagement",
    subtitle: "Rewards & recognition, wellness and recreation, engagement calendar, satisfaction surveys and retention programmes.",
    copilot: "performance",
    copilotTitle: "HR Copilot — Engagement & Retention",
    askQuery: "How engaged is the workforce and what retention actions do you recommend?",
    tabs: [
      { key: "recognitions", label: "Rewards & Recognition", newLabel: "Nominate", ...APPROVE, cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "empId", label: "Employee", kind: "emp" }, { key: "award", label: "Award" }, { key: "category", label: "Category", kind: "badge" }, { key: "month", label: "Period" }, { key: "nominatedBy", label: "Nominated By" }, { key: "rewardValue", label: "Value", kind: "money" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "wellness", label: "Wellness & Recreation", newLabel: "New Programme", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "program", label: "Programme" }, { key: "type", label: "Type", kind: "badge" }, { key: "scheduledOn", label: "Date", kind: "date" }, { key: "vendor", label: "Vendor" }, { key: "participants", label: "Pax", kind: "num" }, { key: "budget", label: "Budget", kind: "money" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "surveys", label: "Satisfaction Surveys", newLabel: "New Survey", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "title", label: "Survey" }, { key: "audience", label: "Audience" }, { key: "runOn", label: "Run On", kind: "date" }, { key: "invited", label: "Invited", kind: "num" }, { key: "responses", label: "Responses", kind: "num" }, { key: "avgScore", label: "Avg Score", kind: "num" }, { key: "enps", label: "eNPS", kind: "num" }, { key: "status", label: "Status", kind: "status" }] },
    ],
  },

  compensation: {
    title: "Compensation & Benefits",
    subtitle: "Salary grades and pay structures, benchmarking, statutory benefits (PF, ESIC, MLWF), insurance and salary audits.",
    copilot: "performance",
    copilotTitle: "HR Copilot — Compensation",
    askQuery: "Analyse our compensation positioning against market benchmarks and budget impact",
    tabs: [
      { key: "salaryGrades", label: "Salary Grades & Benchmarks", newLabel: "New Grade", cols: [{ key: "code", label: "Grade", kind: "code" }, { key: "grade", label: "Description" }, { key: "minCtc", label: "Min", kind: "money" }, { key: "midCtc", label: "Mid", kind: "money" }, { key: "maxCtc", label: "Max", kind: "money" }, { key: "benchmark", label: "Market", kind: "money" }, { key: "positioning", label: "Positioning", kind: "status" }, { key: "headcount", label: "Headcount", kind: "num" }] },
      { key: "benefits", label: "Benefits & Statutory", newLabel: "New Benefit", cols: [{ key: "code", label: "Code", kind: "code" }, { key: "benefit", label: "Benefit" }, { key: "provider", label: "Provider" }, { key: "coverage", label: "Coverage" }, { key: "employerCost", label: "Employer", kind: "money" }, { key: "employeeCost", label: "Employee", kind: "money" }, { key: "renewalDate", label: "Renewal", kind: "date" }, { key: "status", label: "Status", kind: "status" }] },
    ],
  },

  administration: {
    title: "Administration & Facility Management",
    subtitle: "Gate pass, visitors, facilities, canteen, transport, housekeeping, utilities, admin procurement and inventory.",
    copilot: "admin",
    copilotTitle: "Admin Copilot",
    askQuery: "Where can we reduce administration and facility spend this quarter?",
    tabs: [
      { key: "gatePasses", label: "Gate Pass", newLabel: "New Gate Pass", cols: [{ key: "code", label: "GP", kind: "code" }, { key: "type", label: "Type", kind: "badge" }, { key: "material", label: "Material" }, { key: "issuedTo", label: "Issued To" }, { key: "vendor", label: "Party" }, { key: "issuedOn", label: "Issued", kind: "date" }, { key: "expectedBack", label: "Return By", kind: "date" }, { key: "value", label: "Value", kind: "money" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "visitors", label: "Visitor Management", newLabel: "Log Visitor", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "name", label: "Visitor" }, { key: "company", label: "Company" }, { key: "host", label: "Host" }, { key: "purpose", label: "Purpose" }, { key: "date", label: "Date", kind: "date" }, { key: "inTime", label: "In" }, { key: "outTime", label: "Out" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "facilityBookings", label: "Facility Booking", newLabel: "Book Facility", ...APPROVE, approveTo: "confirmed", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "facility", label: "Facility" }, { key: "bookedBy", label: "Booked By" }, { key: "date", label: "Date", kind: "date" }, { key: "from", label: "From" }, { key: "to", label: "To" }, { key: "purpose", label: "Purpose" }, { key: "attendees", label: "Pax", kind: "num" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "canteen", label: "Canteen", newLabel: "New Period", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "month", label: "Period" }, { key: "vendor", label: "Vendor" }, { key: "mealsServed", label: "Meals", kind: "num" }, { key: "ratePerMeal", label: "Rate", kind: "num" }, { key: "amount", label: "Amount", kind: "money" }, { key: "subsidy", label: "Subsidy", kind: "money" }, { key: "hygieneScore", label: "Hygiene", kind: "num" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "transport", label: "Bus & Transport", newLabel: "Add Route", cols: [{ key: "code", label: "Code", kind: "code" }, { key: "type", label: "Type", kind: "badge" }, { key: "route", label: "Route" }, { key: "vendor", label: "Vendor" }, { key: "capacity", label: "Cap.", kind: "num" }, { key: "occupancy", label: "Occupancy", kind: "num" }, { key: "monthlyCost", label: "Monthly", kind: "money" }, { key: "fuelLtr", label: "Fuel (L)", kind: "num" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "housekeeping", label: "Housekeeping", newLabel: "Add Area", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "area", label: "Area" }, { key: "contractor", label: "Contractor" }, { key: "headcount", label: "Staff", kind: "num" }, { key: "frequency", label: "Frequency" }, { key: "auditScore", label: "Audit", kind: "num" }, { key: "monthlyCost", label: "Monthly", kind: "money" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "stationery", label: "Stationery & Consumables", newLabel: "Add Item", cols: [{ key: "code", label: "Code", kind: "code" }, { key: "item", label: "Item" }, { key: "category", label: "Category", kind: "badge" }, { key: "opening", label: "Opening", kind: "num" }, { key: "issued", label: "Issued", kind: "num" }, { key: "closing", label: "Closing", kind: "num" }, { key: "reorder", label: "Reorder", kind: "num" }, { key: "unitCost", label: "Unit Cost", kind: "money" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "utilityBills", label: "Utilities & Bills", newLabel: "Add Bill", ...APPROVE, approveTo: "paid", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "utility", label: "Utility", kind: "badge" }, { key: "period", label: "Period" }, { key: "vendor", label: "Provider" }, { key: "units", label: "Units", kind: "num" }, { key: "amount", label: "Amount", kind: "money" }, { key: "dueDate", label: "Due", kind: "date" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "adminInvoices", label: "Invoice Verification", newLabel: "Add Invoice", ...APPROVE, cols: [{ key: "code", label: "Invoice", kind: "code" }, { key: "vendor", label: "Vendor" }, { key: "category", label: "Category", kind: "badge" }, { key: "invoiceDate", label: "Date", kind: "date" }, { key: "amount", label: "Amount", kind: "money" }, { key: "poRef", label: "PO Ref" }, { key: "threeWayMatch", label: "3-Way Match", kind: "status" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "adminQuotes", label: "Vendor Quotes (3-quote)", newLabel: "Add Quote", cols: [{ key: "code", label: "RFQ", kind: "code" }, { key: "requirement", label: "Requirement" }, { key: "vendor", label: "Vendor" }, { key: "quoteAmount", label: "Quote", kind: "money" }, { key: "deliveryDays", label: "Delivery", kind: "num" }, { key: "rating", label: "Rating", kind: "num" }, { key: "recommended", label: "Recommended", kind: "badge" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "adminStock", label: "Scrap & Waste", newLabel: "Add Entry", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "category", label: "Category", kind: "badge" }, { key: "item", label: "Item" }, { key: "quantity", label: "Qty", kind: "num" }, { key: "uom", label: "UoM" }, { key: "disposalVendor", label: "Vendor" }, { key: "realisation", label: "Realisation", kind: "money" }, { key: "disposedOn", label: "Date", kind: "date" }, { key: "status", label: "Status", kind: "status" }] },
    ],
  },

  travel: {
    title: "Travel & Expense",
    subtitle: "Travel desk requests, ticket / hotel / cab bookings, expense claims with policy checks and duplicate detection.",
    copilot: "admin",
    copilotTitle: "Admin Copilot — Travel & Expense",
    askQuery: "Analyse travel spend and flag any expense policy violations",
    tabs: [
      { key: "travelRequests", label: "Travel Requests", newLabel: "New Travel Request", ...APPROVE, cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "empId", label: "Employee", kind: "emp" }, { key: "purpose", label: "Purpose" }, { key: "destination", label: "Destination" }, { key: "fromDate", label: "From", kind: "date" }, { key: "toDate", label: "To", kind: "date" }, { key: "mode", label: "Mode", kind: "badge" }, { key: "estimatedCost", label: "Estimate", kind: "money" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "bookings", label: "Ticket / Hotel / Cab", newLabel: "New Booking", ...APPROVE, approvable: ["hold"], approveTo: "confirmed", rejectTo: "cancelled", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "type", label: "Type", kind: "badge" }, { key: "travelRef", label: "Travel" }, { key: "vendor", label: "Vendor" }, { key: "detail", label: "Details" }, { key: "amount", label: "Amount", kind: "money" }, { key: "bookedOn", label: "Booked", kind: "date" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "expenseClaims", label: "Expense Claims", newLabel: "New Claim", ...APPROVE, cols: [{ key: "code", label: "Claim", kind: "code" }, { key: "empId", label: "Employee", kind: "emp" }, { key: "travelRef", label: "Travel" }, { key: "category", label: "Category", kind: "badge" }, { key: "claimDate", label: "Date", kind: "date" }, { key: "amount", label: "Amount", kind: "money" }, { key: "receipts", label: "Receipts", kind: "num" }, { key: "policyFlag", label: "Policy Check", kind: "status" }, { key: "status", label: "Status", kind: "status" }] },
    ],
  },

  safety: {
    title: "Safety (EHS)",
    subtitle: "Incidents, near misses, hazard and risk registers, safety audits, OHSAS reviews, KPIs and safety rewards.",
    copilot: "safety",
    copilotTitle: "Safety Copilot",
    askQuery: "What are our highest safety risks and how do we prevent the next incident?",
    tabs: [
      { key: "incidents", label: "Safety Incidents", newLabel: "Report Incident", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "type", label: "Type", kind: "badge" }, { key: "area", label: "Area" }, { key: "date", label: "Date", kind: "date" }, { key: "severity", label: "Severity", kind: "status" }, { key: "injured", label: "Person" }, { key: "lostDays", label: "Lost Days", kind: "num" }, { key: "rootCause", label: "Root Cause" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "nearMisses", label: "Near Miss", newLabel: "Report Near Miss", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "area", label: "Area" }, { key: "date", label: "Date", kind: "date" }, { key: "description", label: "Observation" }, { key: "reportedBy", label: "Reported By" }, { key: "potential", label: "Potential", kind: "status" }, { key: "action", label: "Action" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "hazards", label: "Hazard Register", newLabel: "Add Hazard", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "hazard", label: "Hazard" }, { key: "area", label: "Area" }, { key: "category", label: "Category", kind: "badge" }, { key: "likelihood", label: "L", kind: "num" }, { key: "severity", label: "S", kind: "num" }, { key: "riskScore", label: "Risk", kind: "score" }, { key: "owner", label: "Owner" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "risks", label: "Risk Register", newLabel: "Add Risk", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "risk", label: "Risk" }, { key: "category", label: "Category" }, { key: "inherentScore", label: "Inherent", kind: "num" }, { key: "residualScore", label: "Residual", kind: "num" }, { key: "mitigation", label: "Mitigation" }, { key: "owner", label: "Owner" }, { key: "reviewDate", label: "Review", kind: "date" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "safetyAudits", label: "Audits & OHSAS Reviews", newLabel: "Plan Audit", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "type", label: "Audit" }, { key: "area", label: "Area" }, { key: "auditor", label: "Auditor" }, { key: "date", label: "Date", kind: "date" }, { key: "findings", label: "Findings", kind: "num" }, { key: "closed", label: "Closed", kind: "num" }, { key: "score", label: "Score", kind: "score" }, { key: "status", label: "Status", kind: "status" }] },
    ],
  },

  compliance: {
    title: "Compliance Management",
    subtitle: "Company, customer, vendor and statutory compliance calendar with renewal alerts and audit tracking.",
    copilot: "compliance",
    copilotTitle: "Compliance Copilot",
    askQuery: "What compliance obligations are due or overdue and what should we do first?",
    tabs: [
      { key: "complianceItems", label: "Compliance Calendar", newLabel: "New Obligation", ...APPROVE, approvable: ["pending", "overdue"], approveTo: "filed", rejectTo: "waived", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "type", label: "Type", kind: "badge" }, { key: "requirement", label: "Requirement" }, { key: "authority", label: "Authority" }, { key: "frequency", label: "Frequency" }, { key: "owner", label: "Owner" }, { key: "dueDate", label: "Due", kind: "date" }, { key: "lastFiled", label: "Last Filed", kind: "date" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "auditTracking", label: "Audit Tracking", newLabel: "New Audit", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "audit", label: "Audit" }, { key: "auditor", label: "Auditor" }, { key: "date", label: "Date", kind: "date" }, { key: "ncrs", label: "NCRs", kind: "num" }, { key: "closed", label: "Closed", kind: "num" }, { key: "dueDate", label: "Closure Due", kind: "date" }, { key: "status", label: "Status", kind: "status" }] },
    ],
  },

  documents: {
    title: "Document Management & Data Governance",
    subtitle: "Digital repository with version control, labels, naming standards, review cycles, retention and deletion approvals.",
    copilot: "compliance",
    copilotTitle: "Compliance Copilot — Documents",
    askQuery: "Which controlled documents are overdue for review or missing?",
    tabs: [
      { key: "documents", label: "Document Repository", newLabel: "Upload Document", cols: [{ key: "code", label: "Doc No.", kind: "code" }, { key: "title", label: "Title" }, { key: "category", label: "Category", kind: "badge" }, { key: "owner", label: "Owner" }, { key: "version", label: "Ver" }, { key: "label", label: "Label", kind: "badge" }, { key: "reviewDate", label: "Review", kind: "date" }, { key: "retention", label: "Retention" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "dataGovernance", label: "Data Governance", newLabel: "Add Folder Policy", cols: [{ key: "code", label: "Ref", kind: "code" }, { key: "folder", label: "Server Folder" }, { key: "convention", label: "Naming Convention" }, { key: "owner", label: "Owner" }, { key: "lastReview", label: "Last Review", kind: "date" }, { key: "nextReview", label: "Next Review", kind: "date" }, { key: "archivePolicy", label: "Archive Policy" }, { key: "status", label: "Status", kind: "status" }] },
    ],
  },

  "contract-labour": {
    title: "Contract Labour Management",
    subtitle: "Contractor master, deployed workforce, attendance, billing, statutory compliance and performance scoring.",
    copilot: "compliance",
    copilotTitle: "Compliance Copilot — Contract Labour",
    askQuery: "Are all our contractors statutory compliant and which billing should be held?",
    tabs: [
      { key: "contractors", label: "Contractor Master", newLabel: "Add Contractor", cols: [{ key: "code", label: "Code", kind: "code" }, { key: "contractor", label: "Contractor" }, { key: "category", label: "Category", kind: "badge" }, { key: "licenceNo", label: "Licence" }, { key: "licenceExpiry", label: "Expiry", kind: "date" }, { key: "workers", label: "Workers", kind: "num" }, { key: "pfEsicCompliant", label: "PF/ESIC", kind: "badge" }, { key: "performanceScore", label: "Score", kind: "num" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "contractWorkers", label: "Deployed Workforce", newLabel: "Add Worker", cols: [{ key: "code", label: "ID", kind: "code" }, { key: "name", label: "Worker" }, { key: "contractor", label: "Contractor" }, { key: "skill", label: "Skill" }, { key: "area", label: "Area" }, { key: "daysWorked", label: "Days", kind: "num" }, { key: "rate", label: "Rate", kind: "money" }, { key: "inductionDone", label: "Induction", kind: "badge" }, { key: "status", label: "Status", kind: "status" }] },
      { key: "contractBills", label: "Billing & Compliance", newLabel: "Add Bill", ...APPROVE, cols: [{ key: "code", label: "Bill", kind: "code" }, { key: "contractor", label: "Contractor" }, { key: "period", label: "Period" }, { key: "manDays", label: "Man-days", kind: "num" }, { key: "amount", label: "Amount", kind: "money" }, { key: "pfEsic", label: "PF / ESIC", kind: "money" }, { key: "complianceDocs", label: "Docs", kind: "status" }, { key: "status", label: "Status", kind: "status" }] },
    ],
  },
};
