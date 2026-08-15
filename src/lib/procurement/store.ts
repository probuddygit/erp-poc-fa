import { useSyncExternalStore } from "react";
import type { ProcurementState, Vendor, Requisition, Rfq, PurchaseOrder, Grn } from "./types";
import { makeCrud, type MutableStore } from "@/lib/crud";
import { projectsStore } from "@/lib/projects/store";

const KEY = "faith-erp:procurement:v1";

function iso(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

function seed(): ProcurementState {
  const vendors: Vendor[] = [
    { id: "v1", code: "SUP-1001", name: "Tata Steel Ltd", category: "Raw Material", country: "IN", city: "Jamshedpur", rating: "A", qualification: "qualified", onboardedAt: iso(-820), onTimePct: 96, qualityPct: 98, leadTimeDays: 14, spendYtd: 42500000, contact: "R. Sharma", email: "sales@tatasteel.com", phone: "+91 98200 12345", certifications: ["IATF 16949", "ISO 9001", "ISO 14001"], active: true },
    { id: "v2", code: "SUP-1002", name: "Bosch Rexroth India", category: "Components", country: "IN", city: "Bengaluru", rating: "A", qualification: "qualified", onboardedAt: iso(-1400), onTimePct: 92, qualityPct: 99, leadTimeDays: 28, spendYtd: 18700000, contact: "K. Iyer", email: "orders@boschrexroth.in", phone: "+91 80456 22112", certifications: ["IATF 16949", "ISO 9001"], active: true },
    { id: "v3", code: "SUP-1003", name: "Fanuc Automation", category: "Capital Goods", country: "JP", city: "Yamanashi", rating: "A", qualification: "qualified", onboardedAt: iso(-2100), onTimePct: 94, qualityPct: 99, leadTimeDays: 60, spendYtd: 91200000, contact: "H. Tanaka", email: "biw@fanuc.co.jp", phone: "+81 555 8811", certifications: ["ISO 9001", "CE"], active: true },
    { id: "v4", code: "SUP-1004", name: "SKF Bearings", category: "Components", country: "SE", city: "Gothenburg", rating: "A", qualification: "qualified", onboardedAt: iso(-3000), onTimePct: 88, qualityPct: 97, leadTimeDays: 42, spendYtd: 5400000, contact: "L. Andersson", email: "asia@skf.com", phone: "+46 31 337 10", certifications: ["ISO 9001", "IATF 16949"], active: true },
    { id: "v5", code: "SUP-1005", name: "Hindalco Industries", category: "Raw Material", country: "IN", city: "Mumbai", rating: "B", qualification: "in-review", onboardedAt: iso(-160), onTimePct: 82, qualityPct: 94, leadTimeDays: 21, spendYtd: 6100000, contact: "M. Deshmukh", email: "auto@hindalco.com", phone: "+91 22 6691 6000", certifications: ["ISO 9001"], active: true },
    { id: "v6", code: "SUP-1006", name: "KUKA Robotics", category: "Capital Goods", country: "DE", city: "Augsburg", rating: "A", qualification: "qualified", onboardedAt: iso(-1800), onTimePct: 90, qualityPct: 98, leadTimeDays: 84, spendYtd: 62400000, contact: "S. Weber", email: "india@kuka.com", phone: "+49 821 797 0", certifications: ["ISO 9001", "CE", "UL"], active: true },
    { id: "v7", code: "SUP-1007", name: "SRF Industrial Chemicals", category: "Consumables", country: "IN", city: "Bhiwadi", rating: "B", qualification: "conditional", onboardedAt: iso(-480), onTimePct: 78, qualityPct: 91, leadTimeDays: 10, spendYtd: 1240000, contact: "A. Kapoor", email: "sales@srf.com", phone: "+91 124 434 7000", certifications: ["ISO 9001", "ISO 14001"], active: true },
    { id: "v8", code: "SUP-1008", name: "PrecisionTech Fabricators", category: "Services", country: "IN", city: "Pune", rating: "C", qualification: "draft", onboardedAt: iso(-30), onTimePct: 0, qualityPct: 0, leadTimeDays: 21, spendYtd: 0, contact: "V. Patil", email: "info@precisiontech.in", phone: "+91 20 6788 4321", certifications: [], active: true },
    { id: "v9", code: "SUP-1009", name: "Legacy Weldtech", category: "Services", country: "IN", city: "Chennai", rating: "C", qualification: "blacklisted", onboardedAt: iso(-2400), onTimePct: 55, qualityPct: 68, leadTimeDays: 30, spendYtd: 0, contact: "N. Rao", email: "sales@legacywt.in", phone: "+91 44 2345 9911", certifications: [], active: false },
  ];

  const requisitions: Requisition[] = [
    { id: "r1", code: "PR-2401", title: "Servo drives for Hyundai BIW cell 3", projectCode: "PRJ-1021", requestedBy: "A. Menon", department: "Engineering", createdAt: iso(-4), needBy: iso(21), priority: "high", status: "pending", approver: "V. Rao (Head - Purchase)", totalEst: 1840000, lines: [
      { id: "l1", itemCode: "ITM-4402", description: "AC Servo Drive 5kW", qty: 6, uom: "EA", estRate: 210000, needBy: iso(21) },
      { id: "l2", itemCode: "ITM-4403", description: "Encoder cable 10m", qty: 6, uom: "EA", estRate: 8500, needBy: iso(21) },
    ]},
    { id: "r2", code: "PR-2402", title: "MIG wire consumables — monthly", requestedBy: "S. Kulkarni", department: "Production", createdAt: iso(-2), needBy: iso(7), priority: "medium", status: "approved", approver: "V. Rao", totalEst: 340000, lines: [
      { id: "l3", itemCode: "ITM-2201", description: "ER70S-6 MIG wire 1.2mm", qty: 400, uom: "KG", estRate: 210, needBy: iso(7) },
      { id: "l4", itemCode: "ITM-2202", description: "Argon-CO2 mix cylinder", qty: 40, uom: "EA", estRate: 6400, needBy: iso(7) },
    ]},
    { id: "r3", code: "PR-2403", title: "Fixture steel plates - EV floor", projectCode: "PRJ-1024", requestedBy: "R. Iyer", department: "Engineering", createdAt: iso(-6), needBy: iso(14), priority: "critical", status: "pending", approver: "V. Rao", totalEst: 2450000, lines: [
      { id: "l5", itemCode: "ITM-1101", description: "EN31 Steel plate 30mm", qty: 12, uom: "EA", estRate: 185000, needBy: iso(14) },
    ]},
    { id: "r4", code: "PR-2404", title: "Calibration services - torque tools", requestedBy: "P. Deshmukh", department: "Quality", createdAt: iso(-10), needBy: iso(3), priority: "low", status: "converted", approver: "V. Rao", totalEst: 62000, lines: [] },
    { id: "r5", code: "PR-2405", title: "Robot spares - safety scanners", projectCode: "PRJ-1021", requestedBy: "A. Menon", department: "Engineering", createdAt: iso(-1), needBy: iso(30), priority: "high", status: "draft", approver: "—", totalEst: 940000, lines: [] },
    { id: "r6", code: "PR-2406", title: "Machined blocks — reject", requestedBy: "K. Nair", department: "Production", createdAt: iso(-12), needBy: iso(-2), priority: "medium", status: "rejected", approver: "V. Rao", totalEst: 118000, lines: [], notes: "Duplicate request; consolidate with PR-2402." },
  ];

  const rfqs: Rfq[] = [
    { id: "q1", code: "RFQ-3301", title: "Servo drives + encoders", requisitionCode: "PR-2401", projectCode: "PRJ-1021", issuedAt: iso(-3), dueAt: iso(4), buyer: "N. Verma", status: "responses", vendorCount: 4, bids: [
      { vendorId: "v2", vendorName: "Bosch Rexroth India", amount: 1720000, leadTimeDays: 26, paymentTerms: "Net 45", validity: iso(30), score: 92 },
      { vendorId: "v3", vendorName: "Fanuc Automation", amount: 1980000, leadTimeDays: 45, paymentTerms: "50% adv", validity: iso(30), score: 88 },
      { vendorId: "v4", vendorName: "SKF Bearings", amount: 1810000, leadTimeDays: 38, paymentTerms: "Net 60", validity: iso(30), score: 84 },
    ]},
    { id: "q2", code: "RFQ-3302", title: "EN31 plates — bulk", requisitionCode: "PR-2403", projectCode: "PRJ-1024", issuedAt: iso(-5), dueAt: iso(2), buyer: "N. Verma", status: "evaluating", vendorCount: 3, bids: [
      { vendorId: "v1", vendorName: "Tata Steel Ltd", amount: 2210000, leadTimeDays: 12, paymentTerms: "Net 30", validity: iso(20), score: 96 },
      { vendorId: "v5", vendorName: "Hindalco Industries", amount: 2050000, leadTimeDays: 18, paymentTerms: "Net 45", validity: iso(20), score: 82 },
    ]},
    { id: "q3", code: "RFQ-3303", title: "Robot spares", issuedAt: iso(-1), dueAt: iso(9), buyer: "S. Rao", status: "issued", vendorCount: 3, bids: [] },
    { id: "q4", code: "RFQ-3304", title: "MIG consumables annual", issuedAt: iso(-30), dueAt: iso(-18), buyer: "N. Verma", status: "awarded", vendorCount: 4, poCode: "PO-5501", bids: [
      { vendorId: "v1", vendorName: "Tata Steel Ltd", amount: 342000, leadTimeDays: 6, paymentTerms: "Net 30", validity: iso(-5), score: 95, awarded: true },
    ]},
    { id: "q5", code: "RFQ-3305", title: "Fixture machining services", issuedAt: iso(0), dueAt: iso(11), buyer: "S. Rao", status: "draft", vendorCount: 0, bids: [] },
  ];

  const pos: PurchaseOrder[] = [
    { id: "p1", code: "PO-5501", vendorId: "v1", vendorName: "Tata Steel Ltd", rfqCode: "RFQ-3304", buyer: "N. Verma", createdAt: iso(-16), promisedDate: iso(-4), currency: "INR", status: "received", amount: 342000, received: 342000, invoiced: 342000, paymentTerms: "Net 30", incoterms: "DAP Plant", amendments: [], lines: [
      { id: "pl1", itemCode: "ITM-2201", description: "ER70S-6 MIG wire 1.2mm", qty: 400, uom: "KG", rate: 210, amount: 84000, receivedQty: 400, dueDate: iso(-4) },
      { id: "pl2", itemCode: "ITM-2202", description: "Argon-CO2 mix cylinder", qty: 40, uom: "EA", rate: 6450, amount: 258000, receivedQty: 40, dueDate: iso(-4) },
    ]},
    { id: "p2", code: "PO-5502", vendorId: "v3", vendorName: "Fanuc Automation", projectCode: "PRJ-1021", buyer: "N. Verma", createdAt: iso(-40), promisedDate: iso(14), currency: "JPY", status: "acknowledged", amount: 12400000, received: 0, invoiced: 0, paymentTerms: "30% adv", incoterms: "FOB Yokohama", amendments: [
      { id: "am1", at: iso(-8), by: "N. Verma", reason: "Qty +2 for spare cells", fromValue: 11800000, toValue: 12400000 },
    ], lines: [] },
    { id: "p3", code: "PO-5503", vendorId: "v2", vendorName: "Bosch Rexroth India", projectCode: "PRJ-1021", buyer: "N. Verma", createdAt: iso(-2), promisedDate: iso(26), currency: "INR", status: "sent", amount: 1720000, received: 0, invoiced: 0, paymentTerms: "Net 45", incoterms: "DAP Plant", amendments: [], lines: [] },
    { id: "p4", code: "PO-5504", vendorId: "v6", vendorName: "KUKA Robotics", projectCode: "PRJ-1024", buyer: "S. Rao", createdAt: iso(-70), promisedDate: iso(20), currency: "EUR", status: "partial", amount: 24800000, received: 12400000, invoiced: 12400000, paymentTerms: "30% adv, 60% BL, 10% acc.", incoterms: "CIF Nhava Sheva", amendments: [], lines: [] },
    { id: "p5", code: "PO-5505", vendorId: "v1", vendorName: "Tata Steel Ltd", projectCode: "PRJ-1024", buyer: "N. Verma", createdAt: iso(-1), promisedDate: iso(12), currency: "INR", status: "pending", amount: 2210000, received: 0, invoiced: 0, paymentTerms: "Net 30", incoterms: "DAP Plant", amendments: [], lines: [] },
    { id: "p6", code: "PO-5506", vendorId: "v7", vendorName: "SRF Industrial Chemicals", buyer: "N. Verma", createdAt: iso(-25), promisedDate: iso(-10), currency: "INR", status: "closed", amount: 96000, received: 96000, invoiced: 96000, paymentTerms: "Net 30", incoterms: "DAP Plant", amendments: [], lines: [] },
  ];

  const grns: Grn[] = [
    { id: "g1", code: "GRN-7701", poCode: "PO-5501", vendorName: "Tata Steel Ltd", receivedAt: iso(-4), receivedBy: "Stores - Bay 2", status: "posted", invoiceNo: "INV/TS/24-01144", invoiceMatch: "3-way-matched", amount: 342000, qcResult: "passed", lines: [
      { itemCode: "ITM-2201", description: "ER70S-6 MIG wire", orderedQty: 400, receivedQty: 400, acceptedQty: 400, rejectedQty: 0 },
      { itemCode: "ITM-2202", description: "Argon-CO2 cylinder", orderedQty: 40, receivedQty: 40, acceptedQty: 40, rejectedQty: 0 },
    ]},
    { id: "g2", code: "GRN-7702", poCode: "PO-5504", vendorName: "KUKA Robotics", receivedAt: iso(-6), receivedBy: "Stores - Bay 1", status: "posted", invoiceNo: "KUKA-24/0987", invoiceMatch: "matched", amount: 12400000, qcResult: "passed", lines: [] },
    { id: "g3", code: "GRN-7703", poCode: "PO-5506", vendorName: "SRF Industrial Chemicals", receivedAt: iso(-10), receivedBy: "Stores - Chem", status: "quality-hold", invoiceNo: "SRF/24/778", invoiceMatch: "hold", amount: 96000, qcResult: "pending", lines: [
      { itemCode: "ITM-6601", description: "Passivation chemical 20L", orderedQty: 6, receivedQty: 6, acceptedQty: 0, rejectedQty: 0 },
    ]},
    { id: "g4", code: "GRN-7704", poCode: "PO-5501", vendorName: "Tata Steel Ltd", receivedAt: iso(-2), receivedBy: "Stores - Bay 2", status: "posted", invoiceMatch: "unmatched", amount: 84000, qcResult: "passed", lines: [] },
  ];

  return { vendors, requisitions, rfqs, pos, grns };
}

function load(): ProcurementState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as ProcurementState;
  } catch {
    return seed();
  }
}

let state: ProcurementState = load();
const listeners = new Set<() => void>();

function save() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const procurement = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  update(mut: (s: ProcurementState) => void) { mut(state); state = { ...state }; save(); },
  reset() { state = seed(); save(); },
};

export function useProcurement<T>(sel: (s: ProcurementState) => T): T {
  return useSyncExternalStore(procurement.subscribe, () => sel(state), () => sel(state));
}

/* ---------------- CRUD ---------------- */
const procCrud = makeCrud<ProcurementState & Record<string, unknown>>(
  procurement as unknown as MutableStore<ProcurementState & Record<string, unknown>>,
);

const ARRAY_DEFAULTS: Record<string, Record<string, unknown>> = {
  vendors: { active: true, certifications: [] },
  requisitions: { lines: [] },
  rfqs: { bids: [] },
  pos: { amendments: [], lines: [] },
  grns: { lines: [] },
};

export function upsertProcurement(key: string, record: Record<string, unknown>): string {
  const r: Record<string, unknown> = { ...ARRAY_DEFAULTS[key], ...record };
  if (!r.createdAt && (key === "requisitions" || key === "pos")) r.createdAt = new Date().toISOString();
  if (!r.onboardedAt && key === "vendors") r.onboardedAt = new Date().toISOString();
  if (key === "vendors" && typeof r.certificationsText === "string") {
    r.certifications = (r.certificationsText as string).split(",").map((x) => x.trim()).filter(Boolean);
  }
  // Auto-populate project details from the Project Master for full traceability.
  if ((key === "requisitions" || key === "rfqs" || key === "pos") && typeof r.projectCode === "string" && r.projectCode) {
    const project = projectsStore.get().projects.find((p) => p.code === r.projectCode);
    if (project) {
      r.projectName = project.name;
      r.customerName = project.customerName;
      if (key === "requisitions" && !r.approver) r.approver = project.manager;
      if (key === "rfqs" && !r.buyer) r.buyer = project.manager;
    }
  }
  const id = procCrud.upsert(key, r);

  // A GRN that carries a supplier invoice is an accounting event: book the
  // vendor bill (and capitalise it when the vendor supplies capital goods).
  if (key === "grns" && typeof r.invoiceNo === "string" && r.invoiceNo) {
    const code = String(r.code ?? procurement.get().grns.find((g) => g.id === id)?.code ?? "");
    if (code) {
      fireFinanceEvent({ type: "grn.invoiced", grnCode: code });
      fireFinanceEvent({ type: "asset.received", grnCode: code });
    }
  }
  return id;
}


export const deleteProcurement = (key: string, id: string) => procCrud.remove(key, id);

function entry(by: string, action: string, note?: string) {
  return { id: crypto.randomUUID(), at: new Date().toISOString(), by, action, note };
}

/** Append an audit trail entry to a PR or an RFQ. */
export function logProcurementAudit(key: "requisitions" | "rfqs", id: string, by: string, action: string, note?: string) {
  procurement.update((s) => {
    const rec = (s[key] as Array<Requisition | Rfq>).find((x) => x.id === id);
    if (rec) rec.audit = [...(rec.audit ?? []), entry(by, action, note)];
  });
}

/** Approve / reject a purchase requisition. */
export function setRequisitionStatus(id: string, status: Requisition["status"], by = "Procurement") {
  procurement.update((s) => {
    const r = s.requisitions.find((x) => x.id === id);
    if (!r) return;
    r.status = status;
    r.audit = [...(r.audit ?? []), entry(by, `PR ${status}`)];
  });
}

/** Record the vendors an RFQ was floated to and move it into the "sent" state. */
export function sendRfqToVendors(rfqId: string, vendorIds: string[], by = "Procurement") {
  procurement.update((s) => {
    const rfq = s.rfqs.find((r) => r.id === rfqId);
    if (!rfq) return;
    const vendors = s.vendors.filter((v) => vendorIds.includes(v.id));
    rfq.vendorIds = vendorIds;
    rfq.vendorNames = vendors.map((v) => v.name);
    rfq.vendorCount = Math.max(vendorIds.length, rfq.bids.length);
    rfq.sentAt = new Date().toISOString();
    if (["draft", "issued"].includes(rfq.status)) rfq.status = "sent";
    rfq.audit = [...(rfq.audit ?? []), entry(by, "RFQ sent to vendors", vendors.map((v) => v.name).join(", "))];
  });
}

/** Move an RFQ through its tracking states. */
export function setRfqStatus(rfqId: string, status: Rfq["status"], by = "Procurement", note?: string) {
  procurement.update((s) => {
    const rfq = s.rfqs.find((r) => r.id === rfqId);
    if (!rfq) return;
    rfq.status = status;
    rfq.audit = [...(rfq.audit ?? []), entry(by, `RFQ ${status.replace(/-/g, " ")}`, note)];
  });
}

/** Award an RFQ bid — marks the bid and moves the RFQ to awarded. */
export function awardBid(rfqId: string, vendorId: string, by = "Procurement") {
  procurement.update((s) => {
    const rfq = s.rfqs.find((r) => r.id === rfqId);
    if (!rfq) return;
    const won = rfq.bids.find((b) => b.vendorId === vendorId);
    rfq.bids = rfq.bids.map((b) => ({ ...b, awarded: b.vendorId === vendorId }));
    rfq.status = "awarded";
    rfq.audit = [...(rfq.audit ?? []), entry(by, "Bid awarded", won?.vendorName)];
  });
}

/** Award a bid and auto-create the resulting purchase order, fully linked back to the RFQ. */
export function awardBidAndCreatePo(rfqId: string, vendorId: string, by = "Procurement"): string | null {
  let poCode: string | null = null;
  procurement.update((s) => {
    const rfq = s.rfqs.find((r) => r.id === rfqId);
    if (!rfq) return;
    const bid = rfq.bids.find((b) => b.vendorId === vendorId);
    if (!bid) return;
    const vendor = s.vendors.find((v) => v.name === bid.vendorName || v.id === bid.vendorId);
    const nextNo = 5500 + s.pos.length + 1;
    poCode = `PO-${nextNo}`;
    const promised = new Date();
    promised.setDate(promised.getDate() + (bid.leadTimeDays || 14));
    s.pos = [
      ...s.pos,
      {
        id: crypto.randomUUID(),
        code: poCode,
        vendorId: vendor?.id ?? bid.vendorId,
        vendorName: bid.vendorName,
        rfqCode: rfq.code,
        projectCode: rfq.projectCode,
        buyer: rfq.buyer,
        createdAt: new Date().toISOString(),
        promisedDate: promised.toISOString(),
        currency: "INR",
        status: "draft",
        amount: bid.amount,
        received: 0,
        invoiced: 0,
        paymentTerms: bid.paymentTerms || "Net 30",
        incoterms: "DAP Plant",
        amendments: [],
        lines: [],
      },
    ];
    rfq.bids = rfq.bids.map((b) => ({ ...b, awarded: b.vendorId === vendorId }));
    rfq.status = "awarded";
    rfq.poCode = poCode;
    rfq.audit = [
      ...(rfq.audit ?? []),
      entry(by, "Vendor selected & PO created", `${bid.vendorName} · ${poCode}`),
    ];
  });
  return poCode;
}

/** Add an audit-tracked amendment to a purchase order. */
export function addPoAmendment(poId: string, amendment: { by: string; reason: string; fromValue: number; toValue: number }) {
  procurement.update((s) => {
    const po = s.pos.find((p) => p.id === poId);
    if (!po) return;
    po.amendments = [
      ...po.amendments,
      { id: crypto.randomUUID(), at: new Date().toISOString(), ...amendment },
    ];
    po.amount = amendment.toValue;
  });
}

/** Add or replace a vendor bid (quotation response) on an RFQ. */
export function upsertBid(rfqId: string, bid: Record<string, unknown>) {
  procurement.update((s) => {
    const rfq = s.rfqs.find((r) => r.id === rfqId);
    if (!rfq) return;
    const vendorName = String(bid.vendorName ?? "");
    const vendor = s.vendors.find((v) => v.name === vendorName);
    const vendorId = (bid.vendorId as string) || vendor?.id || crypto.randomUUID();
    const amount = Number(bid.amount ?? 0);
    const leadTimeDays = Number(bid.leadTimeDays ?? vendor?.leadTimeDays ?? 0);
    const qualityRating = Number(bid.qualityRating ?? vendor?.qualityPct ?? 0);
    const next = {
      ...bid,
      vendorId,
      vendorName,
      amount,
      leadTimeDays,
      qualityRating,
      score: Number(bid.score ?? Math.round((vendor?.onTimePct ?? 70) * 0.4 + qualityRating * 0.6)),
    } as unknown as Rfq["bids"][number];
    const i = rfq.bids.findIndex((b) => b.vendorId === vendorId);
    rfq.bids = i >= 0 ? rfq.bids.map((b, j) => (j === i ? { ...b, ...next } : b)) : [...rfq.bids, next];
    rfq.vendorCount = Math.max(rfq.vendorCount, rfq.bids.length);
    if (["draft", "issued", "sent", "acknowledged"].includes(rfq.status)) rfq.status = "bid-received";
    rfq.audit = [...(rfq.audit ?? []), entry("Procurement", "Bid response recorded", vendorName)];
  });
}

export function removeBid(rfqId: string, vendorId: string) {
  procurement.update((s) => {
    const rfq = s.rfqs.find((r) => r.id === rfqId);
    if (rfq) rfq.bids = rfq.bids.filter((b) => b.vendorId !== vendorId);
  });
}

/** Pending-action notifications for procurement users. */
export function procurementAlerts(s: ProcurementState) {
  const now = Date.now();
  const alerts: Array<{ id: string; tone: "warn" | "info"; text: string }> = [];
  s.requisitions
    .filter((r) => r.status === "pending")
    .forEach((r) => alerts.push({ id: `pr-${r.id}`, tone: "warn", text: `${r.code} awaiting your approval — ${r.title}` }));
  s.requisitions
    .filter((r) => r.status === "approved")
    .forEach((r) => alerts.push({ id: `prc-${r.id}`, tone: "info", text: `${r.code} approved and ready to convert into an RFQ` }));
  s.rfqs.forEach((r) => {
    if (["sent", "acknowledged"].includes(r.status) && !r.bids.length)
      alerts.push({ id: `rfq-${r.id}`, tone: "info", text: `${r.code} floated to ${r.vendorCount} vendors — no responses yet` });
    if (r.bids.length && !r.poCode)
      alerts.push({ id: `rfqb-${r.id}`, tone: "warn", text: `${r.code} has ${r.bids.length} vendor quotation(s) pending evaluation` });
    if (new Date(r.dueAt).getTime() < now && !r.poCode)
      alerts.push({ id: `rfqd-${r.id}`, tone: "warn", text: `${r.code} response window closed on ${new Date(r.dueAt).toLocaleDateString("en-IN")}` });
  });
  return alerts;
}
