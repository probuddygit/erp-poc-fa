import type { CrmState } from "./types";

const days = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString();

export function seed(): CrmState {
  return {
    customers: [
      { id: "c1", code: "CUS-1001", name: "Tata Motors — Pune", segment: "OEM", region: "West India", owner: "R. Iyer", status: "active", annualRevenue: 42000000, createdAt: days(-120) },
      { id: "c2", code: "CUS-1002", name: "Mahindra Auto", segment: "OEM", region: "West India", owner: "S. Kapoor", status: "active", annualRevenue: 28000000, createdAt: days(-90) },
      { id: "c3", code: "CUS-1003", name: "Hyundai Motors India", segment: "OEM", region: "South India", owner: "N. Rao", status: "active", annualRevenue: 61000000, createdAt: days(-200) },
      { id: "c4", code: "CUS-1004", name: "Bosch Chassis Systems", segment: "Tier-1", region: "South India", owner: "R. Iyer", status: "prospect", createdAt: days(-30) },
      { id: "c5", code: "CUS-1005", name: "Ashok Leyland", segment: "OEM", region: "South India", owner: "S. Kapoor", status: "active", annualRevenue: 18000000, createdAt: days(-60) },
    ],
    leads: [
      { id: "l1", code: "LEAD-2001", title: "EV Battery Tray BIW Line", customerName: "Tata Motors — Pune", source: "Referral", owner: "R. Iyer", estValue: 8500000, status: "qualified", createdAt: days(-14) },
      { id: "l2", code: "LEAD-2002", title: "Underbody Weld Cell Upgrade", customerName: "Mahindra Auto", source: "Event", owner: "S. Kapoor", estValue: 4200000, status: "contacted", createdAt: days(-9) },
      { id: "l3", code: "LEAD-2003", title: "Body Side Sub-Assembly Line", customerName: "Hyundai Motors India", source: "Website", owner: "N. Rao", estValue: 12000000, status: "new", createdAt: days(-3) },
      { id: "l4", code: "LEAD-2004", title: "Robotic Spot Weld Retrofit", customerName: "Ashok Leyland", source: "Outbound", owner: "S. Kapoor", estValue: 2700000, status: "qualified", createdAt: days(-21) },
    ],
    opportunities: [
      { id: "o1", code: "OPP-3001", name: "EV Battery Tray BIW Line", customerName: "Tata Motors — Pune", value: 8500000, probability: 65, stage: "solution-discussion", owner: "R. Iyer", expectedClose: days(30), createdAt: days(-10) },
      { id: "o2", code: "OPP-3002", name: "Underbody Weld Cell Upgrade", customerName: "Mahindra Auto", value: 4200000, probability: 40, stage: "qualification", owner: "S. Kapoor", expectedClose: days(45), createdAt: days(-7) },
      { id: "o3", code: "OPP-3003", name: "Body Side Sub-Assembly Line", customerName: "Hyundai Motors India", value: 12000000, probability: 55, stage: "rfq-received", owner: "N. Rao", expectedClose: days(20), createdAt: days(-25) },
      { id: "o4", code: "OPP-3004", name: "Robotic Spot Weld Retrofit", customerName: "Ashok Leyland", value: 2700000, probability: 80, stage: "won", owner: "S. Kapoor", expectedClose: days(-2), createdAt: days(-40) },
      { id: "o5", code: "OPP-3005", name: "Rear Floor Assembly Cell", customerName: "Bosch Chassis Systems", value: 5400000, probability: 25, stage: "discovery", owner: "R. Iyer", expectedClose: days(60), createdAt: days(-4) },
    ],
    rfqs: [
      { id: "r1", code: "RFQ-4001", opportunityId: "o1", customerName: "Tata Motors — Pune", title: "EV Battery Tray BIW Line — RFQ", dueDate: days(5), owner: "R. Iyer", status: "technical-review", createdAt: days(-9) },
      { id: "r2", code: "RFQ-4002", opportunityId: "o3", customerName: "Hyundai Motors India", title: "Body Side Assembly — RFQ v2", dueDate: days(2), owner: "N. Rao", status: "ready-for-proposal", createdAt: days(-18) },
      { id: "r3", code: "RFQ-4003", opportunityId: "o5", customerName: "Bosch Chassis Systems", title: "Rear Floor Cell — RFQ", dueDate: days(12), owner: "R. Iyer", status: "draft", createdAt: days(-2) },
    ],
    proposals: [
      { id: "p1", code: "PRP-5001", rfqId: "r1", customerName: "Tata Motors — Pune", title: "EV Battery Tray BIW — Technical + Commercial", version: "v1.2", owner: "R. Iyer", status: "customer-review", createdAt: days(-6) },
      { id: "p2", code: "PRP-5002", rfqId: "r2", customerName: "Hyundai Motors India", title: "Body Side Assembly Proposal", version: "v2.0", owner: "N. Rao", status: "commercial-approved", createdAt: days(-15) },
    ],
    quotations: [
      { id: "q1", code: "QUO-6001", proposalId: "p1", customerName: "Tata Motors — Pune", title: "EV Battery Tray BIW — Quotation", value: 8500000, validity: days(20), owner: "R. Iyer", status: "submitted", createdAt: days(-4) },
      { id: "q2", code: "QUO-6002", proposalId: "p2", customerName: "Hyundai Motors India", title: "Body Side Assembly — Quotation", value: 12000000, validity: days(15), owner: "N. Rao", status: "accepted", createdAt: days(-10) },
      { id: "q3", code: "QUO-6003", customerName: "Ashok Leyland", title: "Robotic Spot Weld Retrofit — Quotation", value: 2700000, validity: days(30), owner: "S. Kapoor", status: "accepted", createdAt: days(-30) },
    ],
    oas: [
      { id: "oa1", code: "OA-7001", quotationId: "q2", customerName: "Hyundai Motors India", title: "Body Side Assembly Line", value: 12000000, poNumber: "PO-HMI-88214", owner: "N. Rao", status: "finance-validation", createdAt: days(-3) },
      { id: "oa2", code: "OA-7002", quotationId: "q3", customerName: "Ashok Leyland", title: "Robotic Spot Weld Retrofit", value: 2700000, poNumber: "PO-AL-55901", owner: "S. Kapoor", status: "draft", createdAt: days(-1) },
    ],
    salesOrders: [
      { id: "so1", code: "SO-8001", oaId: "oa2", customerName: "Ashok Leyland", title: "Robotic Spot Weld Retrofit", value: 2700000, poNumber: "PO-AL-55901", deliveryDate: days(75), paymentTerms: "30% advance, 60% on despatch, 10% on commissioning", owner: "S. Kapoor", status: "open", createdAt: days(-1) },
    ],

    activities: [
      { id: "a1", entityKind: "opportunities", entityId: "o1", type: "call", title: "Discovery call with plant engineering", actor: "R. Iyer", at: days(-6) },
      { id: "a2", entityKind: "opportunities", entityId: "o1", type: "meeting", title: "Technical walkthrough at Pune plant", actor: "R. Iyer", at: days(-3) },
      { id: "a3", entityKind: "rfqs", entityId: "r1", type: "email", title: "RFQ clarifications received", actor: "Customer", at: days(-2) },
      { id: "a4", entityKind: "oas", entityId: "oa1", type: "system", title: "Awaiting Finance approval", actor: "System", at: days(-1) },
    ],
    notes: [
      { id: "n1", entityKind: "opportunities", entityId: "o1", body: "Customer prefers KUKA robots. Confirm cell layout by next week.", author: "R. Iyer", at: days(-3) },
      { id: "n2", entityKind: "oas", entityId: "oa1", body: "PO received on letterhead. Kickoff pending internal approval.", author: "N. Rao", at: days(-1) },
    ],
    emails: [
      { id: "e1", entityKind: "opportunities", entityId: "o1", direction: "in", subject: "RE: EV Battery Tray BIW — Cycle Time Clarification", preview: "Please share cycle time assumptions for 60 JPH target…", from: "vendor.dev@tatamotors.com", to: "sales@faithautomation.com", at: days(-2) },
      { id: "e2", entityKind: "opportunities", entityId: "o1", direction: "out", subject: "Proposal v1.2 — EV Battery Tray BIW", preview: "PFA the revised proposal incorporating your inputs…", from: "r.iyer@faithautomation.com", to: "vendor.dev@tatamotors.com", at: days(-6) },
      { id: "e3", entityKind: "oas", entityId: "oa1", direction: "in", subject: "Purchase Order — Body Side Assembly Line", preview: "Please find attached PO-HMI-88214…", from: "procurement@hyundai.co.in", to: "sales@faithautomation.com", at: days(-3) },
    ],
    documents: [
      { id: "d1", entityKind: "opportunities", entityId: "o1", name: "NDA_TataMotors_signed.pdf", kind: "NDA", size: "412 KB", uploadedBy: "R. Iyer", at: days(-40) },
      { id: "d2", entityKind: "rfqs", entityId: "r1", name: "RFQ_EV_BatteryTray_v1.pdf", kind: "Spec", size: "2.4 MB", uploadedBy: "Customer", at: days(-9) },
      { id: "d3", entityKind: "oas", entityId: "oa1", name: "PO-HMI-88214.pdf", kind: "PO", size: "318 KB", uploadedBy: "N. Rao", at: days(-3) },
    ],
    approvals: [
      { id: "ap1", entityKind: "proposals", entityId: "p2", step: "Engineering Review", approver: "K. Sharma", status: "approved", at: days(-17) },
      { id: "ap2", entityKind: "proposals", entityId: "p2", step: "Commercial Review", approver: "N. Rao", status: "approved", at: days(-16) },
      { id: "ap3", entityKind: "oas", entityId: "oa1", step: "Sales Head", approver: "V. Menon", status: "approved", at: days(-2) },
      { id: "ap4", entityKind: "oas", entityId: "oa1", step: "Finance", approver: "P. Gupta", status: "pending", at: days(-1) },
    ],
    projects: [],
  };
}
