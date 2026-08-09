/**
 * Workforce & Administration Suite — data layer.
 *
 * The suite spans 14 sub-modules and ~45 record collections. Rather than
 * hand-typing every collection, records share a flexible shape and the UI is
 * driven by column/field metadata (see registry.tsx + schemas.ts).
 */
export interface WFRecord {
  id: string;
  [key: string]: unknown;
}

export const WF_COLLECTIONS = [
  // Recruitment & Onboarding
  "manpowerPlans",
  "requisitions",
  "jobPostings",
  "candidates",
  "interviews",
  "offers",
  "onboarding",
  // Performance Management
  "kpiLibrary",
  "goals",
  "appraisals",
  "promotions",
  // Learning & Development
  "tni",
  "trainingPlans",
  "competencies",
  "trainers",
  "trainingFeedback",
  // Engagement
  "recognitions",
  "wellness",
  "surveys",
  // Compensation
  "salaryGrades",
  "benefits",
  // Administration & Facility
  "gatePasses",
  "visitors",
  "facilityBookings",
  "canteen",
  "transport",
  "housekeeping",
  "stationery",
  "utilityBills",
  "adminInvoices",
  "adminQuotes",
  "adminStock",
  // Travel & Expense
  "travelRequests",
  "expenseClaims",
  "bookings",
  // Safety (EHS)
  "incidents",
  "nearMisses",
  "hazards",
  "risks",
  "safetyAudits",
  // Compliance
  "complianceItems",
  "auditTracking",
  // Documents & Data Governance
  "documents",
  "dataGovernance",
  // Contract Labour
  "contractors",
  "contractWorkers",
  "contractBills",
] as const;

export type WFCollection = (typeof WF_COLLECTIONS)[number];

export type WorkforceState = Record<WFCollection, WFRecord[]>;
