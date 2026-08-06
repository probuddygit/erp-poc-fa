import { useSyncExternalStore } from "react";
import type { QualityState } from "./types";

const KEY = "faith-erp:quality:v1";

function iso(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

function seed(): QualityState {
  const checklists: QualityState["checklists"] = [
    {
      id: "cl1", code: "CHK-INC-101", title: "EN31 Steel Plate — Incoming", stage: "incoming",
      itemCode: "ITM-1101", itemDescription: "EN31 Steel plate 30mm",
      revision: "R3", owner: "S. Kulkarni", updatedAt: iso(-14), status: "approved",
      checks: [
        { id: "c1", parameter: "Thickness", type: "dimensional", method: "Vernier caliper", nominal: "30.0", lsl: 29.8, usl: 30.2, unit: "mm", critical: true },
        { id: "c2", parameter: "Hardness", type: "material", method: "Rockwell C", nominal: "58-62", lsl: 58, usl: 62, unit: "HRC", critical: true },
        { id: "c3", parameter: "Surface finish", type: "visual", method: "Visual + Ra gauge", nominal: "Ra 1.6", critical: false },
        { id: "c4", parameter: "Mill test cert", type: "material", method: "Document verification", critical: true },
      ],
    },
    {
      id: "cl2", code: "CHK-IP-220", title: "Weld Cell 3 — In-Process", stage: "in-process",
      itemCode: "ITM-7701", itemDescription: "BIW Underbody Sub-Assembly",
      revision: "R2", owner: "N. Iyer", updatedAt: iso(-9), status: "approved",
      checks: [
        { id: "c1", parameter: "Weld penetration", type: "weld", method: "Macro-etch", nominal: ">= 4mm", lsl: 4, unit: "mm", critical: true },
        { id: "c2", parameter: "Nugget diameter", type: "weld", method: "Peel test", nominal: "5.5", lsl: 5.0, usl: 6.0, unit: "mm", critical: true },
        { id: "c3", parameter: "Fixture torque", type: "torque", method: "Torque wrench", nominal: "45", lsl: 43, usl: 47, unit: "Nm", critical: false },
        { id: "c4", parameter: "Spatter / porosity", type: "visual", method: "Visual", critical: false },
      ],
    },
    {
      id: "cl3", code: "CHK-FIN-330", title: "BIW Assembly — Final QC", stage: "final",
      itemCode: "ITM-7701", itemDescription: "BIW Underbody Sub-Assembly",
      revision: "R1", owner: "K. Nair", updatedAt: iso(-3), status: "approved",
      checks: [
        { id: "c1", parameter: "Overall length", type: "dimensional", method: "CMM", nominal: "2450", lsl: 2447, usl: 2453, unit: "mm", critical: true },
        { id: "c2", parameter: "Hole position (H1)", type: "dimensional", method: "CMM", nominal: "TP 0.5", lsl: -0.25, usl: 0.25, unit: "mm", critical: true },
        { id: "c3", parameter: "Paint DFT", type: "material", method: "Elcometer", nominal: "80", lsl: 60, usl: 100, unit: "µm", critical: false },
        { id: "c4", parameter: "Cosmetic", type: "visual", method: "Light booth", critical: false },
      ],
    },
    {
      id: "cl4", code: "CHK-INC-140", title: "AC Servo Drive — Incoming", stage: "incoming",
      itemCode: "ITM-4402", itemDescription: "AC Servo Drive 5kW",
      revision: "R2", owner: "A. Menon", updatedAt: iso(-20), status: "approved",
      checks: [
        { id: "c1", parameter: "Serial verification", type: "functional", method: "Barcode scan", critical: true },
        { id: "c2", parameter: "No-load current", type: "functional", method: "Ammeter", nominal: "0.6", lsl: 0.4, usl: 0.8, unit: "A", critical: true },
        { id: "c3", parameter: "Insulation resistance", type: "functional", method: "500V Megger", nominal: ">= 100", lsl: 100, unit: "MΩ", critical: true },
      ],
    },
  ];

  const inspections: QualityState["inspections"] = [
    { id: "in1", code: "IR-2401", stage: "incoming", refType: "GRN", refCode: "GRN-8801", itemCode: "ITM-1101", itemDescription: "EN31 Steel plate 30mm", qty: 22, uom: "EA", vendorName: "Tata Steel Ltd", inspector: "S. Kulkarni", scheduledFor: iso(-1), completedAt: iso(0), status: "passed", passRate: 100, criticalDefects: 0, majorDefects: 0, minorDefects: 0, checklistCode: "CHK-INC-101" },
    { id: "in2", code: "IR-2402", stage: "incoming", refType: "GRN", refCode: "GRN-8802", itemCode: "ITM-4402", itemDescription: "AC Servo Drive 5kW", qty: 4, uom: "EA", vendorName: "Fanuc Automation", inspector: "A. Menon", scheduledFor: iso(0), status: "in-progress", passRate: 75, criticalDefects: 0, majorDefects: 1, minorDefects: 0, checklistCode: "CHK-INC-140" },
    { id: "in3", code: "IR-2403", stage: "in-process", refType: "WO", refCode: "WO-5501", itemCode: "ITM-7701", itemDescription: "BIW Underbody sub-assembly", qty: 6, uom: "EA", projectCode: "PRJ-1021", inspector: "N. Iyer", scheduledFor: iso(-2), completedAt: iso(-1), status: "rework", passRate: 66, criticalDefects: 1, majorDefects: 1, minorDefects: 2, checklistCode: "CHK-IP-220" },
    { id: "in4", code: "IR-2404", stage: "final", refType: "FG", refCode: "FG-2201", itemCode: "ITM-7701", itemDescription: "BIW Underbody sub-assembly", qty: 4, uom: "EA", projectCode: "PRJ-1024", inspector: "K. Nair", scheduledFor: iso(-3), completedAt: iso(-2), status: "passed", passRate: 100, criticalDefects: 0, majorDefects: 0, minorDefects: 1, checklistCode: "CHK-FIN-330" },
    { id: "in5", code: "IR-2405", stage: "incoming", refType: "GRN", refCode: "GRN-8803", itemCode: "ITM-6601", itemDescription: "Passivation chemical 20L", qty: 4, uom: "EA", vendorName: "SRF Industrial Chemicals", inspector: "P. Deshmukh", scheduledFor: iso(-4), completedAt: iso(-3), status: "failed", passRate: 40, criticalDefects: 2, majorDefects: 1, minorDefects: 0, checklistCode: "CHK-INC-101" },
    { id: "in6", code: "IR-2406", stage: "in-process", refType: "WO", refCode: "WO-5502", itemCode: "ITM-5501", itemDescription: "Weld gun assembly", qty: 2, uom: "EA", projectCode: "PRJ-1021", inspector: "K. Nair", scheduledFor: iso(1), status: "planned", passRate: 0, criticalDefects: 0, majorDefects: 0, minorDefects: 0, checklistCode: "CHK-IP-220" },
    { id: "in7", code: "IR-2407", stage: "final", refType: "PROJ", refCode: "PRJ-1021", itemCode: "ITM-7701", itemDescription: "Hyundai BIW Cell 3 — PDI", qty: 1, uom: "EA", projectCode: "PRJ-1021", inspector: "K. Nair", scheduledFor: iso(3), status: "planned", passRate: 0, criticalDefects: 0, majorDefects: 0, minorDefects: 0, checklistCode: "CHK-FIN-330" },
  ];

  const ncrs: QualityState["ncrs"] = [
    { id: "n1", code: "NCR-4401", raisedAt: iso(-3), raisedBy: "P. Deshmukh", source: "incoming", itemCode: "ITM-6601", itemDescription: "Passivation chemical 20L", qty: 4, uom: "EA", vendorName: "SRF Industrial Chemicals", defect: "pH out of specification (5.2 vs 6.0-7.5)", severity: "high", disposition: "return-to-vendor", status: "containment", costImpact: 62400, linkedCapa: "CAPA-1201" },
    { id: "n2", code: "NCR-4402", raisedAt: iso(-1), raisedBy: "N. Iyer", source: "in-process", itemCode: "ITM-7701", itemDescription: "BIW Underbody sub-assembly", qty: 2, uom: "EA", projectCode: "PRJ-1021", defect: "Weld nugget diameter below LSL on stations 3-4", severity: "critical", disposition: "rework", status: "investigation", costImpact: 184000, linkedCapa: "CAPA-1202" },
    { id: "n3", code: "NCR-4403", raisedAt: iso(-8), raisedBy: "S. Kulkarni", source: "in-process", itemCode: "ITM-5501", itemDescription: "Weld gun assembly", qty: 1, uom: "EA", defect: "Tip alignment drift after 2000 cycles", severity: "medium", disposition: "rework", status: "resolved", costImpact: 12000 },
    { id: "n4", code: "NCR-4404", raisedAt: iso(-20), raisedBy: "K. Nair", source: "customer", itemCode: "ITM-7701", itemDescription: "BIW Underbody sub-assembly", qty: 1, uom: "EA", projectCode: "PRJ-1024", defect: "Field failure — hole position beyond TP on customer CMM", severity: "critical", disposition: "rework", status: "closed", costImpact: 240000, linkedCapa: "CAPA-1200" },
    { id: "n5", code: "NCR-4405", raisedAt: iso(0), raisedBy: "A. Menon", source: "incoming", itemCode: "ITM-4402", itemDescription: "AC Servo Drive 5kW", qty: 1, uom: "EA", vendorName: "Fanuc Automation", defect: "IR test failed on 1 of 4 drives", severity: "high", status: "open", costImpact: 52000 },
    { id: "n6", code: "NCR-4406", raisedAt: iso(-12), raisedBy: "Audit team", source: "audit", itemCode: "ITM-3301", itemDescription: "M8 x 25 Bolt DIN 933", qty: 800, uom: "EA", defect: "Mixed lot — plating grade mismatch", severity: "low", disposition: "use-as-is", status: "closed", costImpact: 3400 },
  ];

  const capas: QualityState["capas"] = [
    { id: "ca1", code: "CAPA-1200", ncrCode: "NCR-4404", title: "Underbody hole position — customer complaint", owner: "K. Nair", team: ["N. Iyer", "S. Kulkarni", "A. Menon"], openedAt: iso(-19), targetClose: iso(-2), actualClose: iso(-4), stage: "D8", status: "closed", rootCause: "Locator pin wear on fixture F-221 not caught in preventive plan", correctiveAction: "Replaced pin; added weekly gauge check", preventiveAction: "Updated PM checklist; added Poka-yoke sensor", effectivenessPct: 100 },
    { id: "ca2", code: "CAPA-1201", ncrCode: "NCR-4401", title: "Passivation chemical pH deviation — SRF", owner: "P. Deshmukh", team: ["Supplier QA", "R. Deshpande"], openedAt: iso(-3), targetClose: iso(11), stage: "D4", status: "in-progress", rootCause: "Vendor batch neutralization step skipped", correctiveAction: "Return lot BAT SRF/24/PC-778", effectivenessPct: 0 },
    { id: "ca3", code: "CAPA-1202", ncrCode: "NCR-4402", title: "Weld nugget diameter — Cell 3 stations 3-4", owner: "N. Iyer", team: ["Maintenance", "Process Eng"], openedAt: iso(-1), targetClose: iso(20), stage: "D2", status: "in-progress", rootCause: "Suspected: electrode wear rate exceeds tip-dress cycle", effectivenessPct: 0 },
    { id: "ca4", code: "CAPA-1203", title: "Reduce incoming inspection cycle time by 30%", owner: "S. Kulkarni", team: ["QA", "Stores"], openedAt: iso(-45), targetClose: iso(-5), stage: "D6", status: "verification", rootCause: "Manual data entry duplicated across GRN and QC", correctiveAction: "Introduced QR-based inspection tablets", preventiveAction: "SOP + operator training", effectivenessPct: 78 },
    { id: "ca5", code: "CAPA-1198", title: "Torque wrench calibration slippage", owner: "A. Menon", team: ["Maintenance"], openedAt: iso(-70), targetClose: iso(-10), stage: "D5", status: "overdue", rootCause: "Calibration frequency not aligned to usage cycles", correctiveAction: "New frequency matrix", effectivenessPct: 40 },
  ];

  const gauges: QualityState["gauges"] = [
    { id: "g1", code: "GA-0101", name: "Mitutoyo Vernier 0-200", type: "Vernier caliper", location: "IQC Lab", owner: "S. Kulkarni", range: "0-200 mm", leastCount: "0.02 mm", lastCalibrated: iso(-80), nextDue: iso(100), frequencyDays: 180, provider: "NABL - Reliance Metrology", certificateNo: "NM/24/1188", status: "in-cal" },
    { id: "g2", code: "GA-0102", name: "Rockwell Hardness Tester", type: "Hardness tester", location: "IQC Lab", owner: "S. Kulkarni", range: "20-70 HRC", leastCount: "0.5 HRC", lastCalibrated: iso(-330), nextDue: iso(35), frequencyDays: 365, provider: "NABL - Reliance Metrology", certificateNo: "NM/23/8811", status: "due-soon" },
    { id: "g3", code: "GA-0203", name: "CMM — Zeiss Contura", type: "CMM", location: "Metrology Room", owner: "K. Nair", range: "1000 x 1200 x 600", leastCount: "0.5 µm", lastCalibrated: iso(-140), nextDue: iso(225), frequencyDays: 365, provider: "Zeiss India", certificateNo: "ZI/24/4402", status: "in-cal" },
    { id: "g4", code: "GA-0304", name: "Torque wrench 20-100 Nm", type: "Torque wrench", location: "Weld Cell 3", owner: "Maintenance", range: "20-100 Nm", leastCount: "0.5 Nm", lastCalibrated: iso(-200), nextDue: iso(-15), frequencyDays: 180, provider: "Bharat Metrology", status: "overdue" },
    { id: "g5", code: "GA-0405", name: "Elcometer 456 DFT gauge", type: "Coating thickness", location: "Paint Shop", owner: "P. Deshmukh", range: "0-1500 µm", leastCount: "1 µm", lastCalibrated: iso(-30), nextDue: iso(150), frequencyDays: 180, provider: "Elcometer India", certificateNo: "EI/24/2201", status: "in-cal" },
    { id: "g6", code: "GA-0506", name: "500V Insulation Megger", type: "Megger", location: "Electrical Test Bay", owner: "A. Menon", range: "0-1000 MΩ", leastCount: "0.1 MΩ", lastCalibrated: iso(-370), nextDue: iso(-5), frequencyDays: 365, provider: "Fluke Calibration", status: "overdue" },
    { id: "g7", code: "GA-0607", name: "Macro-etch microscope", type: "Optical", location: "Weld Lab", owner: "N. Iyer", range: "10x-100x", leastCount: "1 µm", lastCalibrated: iso(-60), nextDue: iso(305), frequencyDays: 365, provider: "In-house", status: "in-cal" },
    { id: "g8", code: "GA-0708", name: "Height gauge 600mm", type: "Height gauge", location: "IQC Lab", owner: "S. Kulkarni", range: "0-600 mm", leastCount: "0.01 mm", lastCalibrated: iso(-410), nextDue: iso(-45), frequencyDays: 365, provider: "NABL - Reliance Metrology", status: "out-of-service" },
  ];

  const suppliers: QualityState["suppliers"] = [
    { id: "sv1", vendorCode: "V-1001", vendorName: "Tata Steel Ltd", category: "Raw Material", lotsReceived: 48, lotsAccepted: 47, ppm: 210, otdPct: 96, ncrCount: 1, responseHours: 8, score: 94, grade: "A", trend: "up" },
    { id: "sv2", vendorCode: "V-1002", vendorName: "Fanuc Automation", category: "Component", lotsReceived: 22, lotsAccepted: 20, ppm: 910, otdPct: 88, ncrCount: 2, responseHours: 18, score: 82, grade: "B", trend: "flat" },
    { id: "sv3", vendorCode: "V-1003", vendorName: "Bosch Rexroth", category: "Component", lotsReceived: 30, lotsAccepted: 30, ppm: 60, otdPct: 98, ncrCount: 0, responseHours: 6, score: 97, grade: "A", trend: "up" },
    { id: "sv4", vendorCode: "V-1004", vendorName: "SRF Industrial Chemicals", category: "Consumable", lotsReceived: 14, lotsAccepted: 12, ppm: 3400, otdPct: 79, ncrCount: 2, responseHours: 36, score: 61, grade: "C", trend: "down" },
    { id: "sv5", vendorCode: "V-1005", vendorName: "KUKA Robotics", category: "Component", lotsReceived: 9, lotsAccepted: 9, ppm: 0, otdPct: 100, ncrCount: 0, responseHours: 4, score: 99, grade: "A", trend: "up" },
    { id: "sv6", vendorCode: "V-1006", vendorName: "Air Liquide", category: "Consumable", lotsReceived: 26, lotsAccepted: 26, ppm: 40, otdPct: 94, ncrCount: 0, responseHours: 10, score: 92, grade: "A", trend: "flat" },
    { id: "sv7", vendorCode: "V-1007", vendorName: "Sundram Fasteners", category: "Component", lotsReceived: 60, lotsAccepted: 58, ppm: 480, otdPct: 91, ncrCount: 1, responseHours: 14, score: 85, grade: "B", trend: "flat" },
    { id: "sv8", vendorCode: "V-1008", vendorName: "Local Machining Co.", category: "Sub-Assembly", lotsReceived: 12, lotsAccepted: 9, ppm: 8200, otdPct: 66, ncrCount: 3, responseHours: 48, score: 48, grade: "D", trend: "down" },
  ];

  return { checklists, inspections, ncrs, capas, gauges, suppliers };
}

function load(): QualityState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as QualityState;
  } catch {
    return seed();
  }
}

let state: QualityState = load();
const listeners = new Set<() => void>();

function save() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const quality = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  update(mut: (s: QualityState) => void) { mut(state); state = { ...state }; save(); },
  reset() { state = seed(); save(); },
};

export function useQuality<T>(sel: (s: QualityState) => T): T {
  return useSyncExternalStore(quality.subscribe, () => sel(state), () => sel(state));
}

/* ============================================================
 * CRUD + workflow automation
 * ==========================================================*/

const qCrud = makeCrud<QualityState & Record<string, unknown>>(
  quality as unknown as MutableStore<QualityState & Record<string, unknown>>,
);

function nextCode(existing: string[], prefix: string, start: number) {
  const nums = existing
    .map((c) => Number(c.replace(/\D+/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  return `${prefix}-${(nums.length ? Math.max(...nums) : start) + 1}`;
}

function addDays(fromIso: string, days: number) {
  const d = new Date(fromIso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function calStatusFor(nextDue: string, current?: CalStatus): CalStatus {
  if (current === "out-of-service") return current;
  const days = (new Date(nextDue).getTime() - Date.now()) / 86400000;
  if (days < 0) return "overdue";
  if (days <= 45) return "due-soon";
  return "in-cal";
}

function passRateFor(qty: number, critical: number, major: number, minor: number) {
  if (!qty) return 0;
  const defective = Math.min(qty, critical + major + minor * 0.5);
  return Math.max(0, Math.round(((qty - defective) / qty) * 100));
}

function gradeFor(score: number): SupplierScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  return "D";
}

/** Recalculate supplier quality scorecards from live inspection and NCR data. */
export function recomputeSupplierScores() {
  quality.update((s) => {
    for (const sup of s.suppliers) {
      const insp = s.inspections.filter((i) => i.vendorName === sup.vendorName);
      const ncrs = s.ncrs.filter((n) => n.vendorName === sup.vendorName && n.status !== "closed");
      if (insp.length) {
        const done = insp.filter((i) => i.status === "passed" || i.status === "failed" || i.status === "rework");
        sup.lotsReceived = Math.max(sup.lotsReceived, done.length);
        const accepted = done.filter((i) => i.status === "passed").length;
        sup.lotsAccepted = Math.min(sup.lotsReceived, sup.lotsAccepted + 0 || accepted);
        const avgPass = done.length ? done.reduce((a, i) => a + i.passRate, 0) / done.length : 100;
        sup.ppm = Math.round((100 - avgPass) * 10000);
      }
      sup.ncrCount = ncrs.length;
      const acceptPct = sup.lotsReceived ? (sup.lotsAccepted / sup.lotsReceived) * 100 : 100;
      const score = Math.max(
        0,
        Math.min(100, Math.round(acceptPct * 0.45 + sup.otdPct * 0.35 + Math.max(0, 100 - sup.ncrCount * 12) * 0.2)),
      );
      const prev = sup.score;
      sup.score = score;
      sup.grade = gradeFor(score);
      sup.trend = score > prev ? "up" : score < prev ? "down" : "flat";
    }
  });
}

/** Upsert with auto numbering, derived metrics and cross-module linkage. */
export function upsertQuality(key: string, record: Record<string, unknown>): string {
  const r: Record<string, unknown> = { ...record };
  const s = state;

  if (key === "checklists") {
    if (!r.code) {
      const prefix = r.stage === "incoming" ? "CHK-INC" : r.stage === "in-process" ? "CHK-IP" : "CHK-FIN";
      r.code = nextCode(s.checklists.filter((c) => c.code.startsWith(prefix)).map((c) => c.code), prefix, 100);
    }
    if (!r.revision) r.revision = "R1";
    if (!r.checks) r.checks = [];
    r.updatedAt = new Date().toISOString();
    if (!r.status) r.status = "draft";
  }

  if (key === "inspections") {
    if (!r.code) r.code = nextCode(s.inspections.map((i) => i.code), "IR", 2400);
    const plan = s.checklists.find((c) => c.code === r.checklistCode);
    if (plan) {
      if (!r.stage) r.stage = plan.stage;
      if (!r.itemCode && plan.itemCode) r.itemCode = plan.itemCode;
      if (!r.itemDescription && plan.itemDescription) r.itemDescription = plan.itemDescription;
    }
    const qty = Number(r.qty ?? 0);
    const crit = Number(r.criticalDefects ?? 0);
    const maj = Number(r.majorDefects ?? 0);
    const min = Number(r.minorDefects ?? 0);
    r.criticalDefects = crit; r.majorDefects = maj; r.minorDefects = min;
    r.passRate = r.status === "planned" ? 0 : passRateFor(qty, crit, maj, min);
    if (!r.status) r.status = "planned";
    if ((r.status === "passed" || r.status === "failed" || r.status === "rework") && !r.completedAt) {
      r.completedAt = new Date().toISOString();
    }
  }

  if (key === "ncrs") {
    if (!r.code) r.code = nextCode(s.ncrs.map((n) => n.code), "NCR", 4400);
    if (!r.raisedAt) r.raisedAt = new Date().toISOString();
    if (!r.status) r.status = "open";
    if (r.costImpact === undefined || r.costImpact === null || r.costImpact === "") r.costImpact = 0;
  }

  if (key === "capas") {
    if (!r.code) r.code = nextCode(s.capas.map((c) => c.code), "CAPA", 1200);
    if (!r.openedAt) r.openedAt = new Date().toISOString();
    if (!r.targetClose) r.targetClose = addDays(String(r.openedAt), 30);
    if (!r.stage) r.stage = "D1";
    if (!r.status) r.status = "open";
    if (!r.team) r.team = [];
    if (r.effectivenessPct === undefined || r.effectivenessPct === "") r.effectivenessPct = 0;
    if (r.status !== "closed" && new Date(String(r.targetClose)).getTime() < Date.now()) r.status = "overdue";
  }

  if (key === "gauges") {
    if (!r.code) r.code = nextCode(s.gauges.map((g) => g.code), "GA", 100);
    const last = String(r.lastCalibrated ?? new Date().toISOString());
    const freq = Number(r.frequencyDays ?? 365);
    if (!r.nextDue) r.nextDue = addDays(last, freq);
    r.status = calStatusFor(String(r.nextDue), r.status as CalStatus | undefined);
  }

  const id = qCrud.upsert(key, r);

  // Failing an inspection immediately raises a linked NCR.
  if (key === "inspections" && (r.status === "failed" || r.status === "rework")) {
    raiseNcrFromInspection(id);
  }
  if (key === "ncrs" || key === "inspections") recomputeSupplierScores();

  return id;
}

export const deleteQuality = (key: string, id: string) => qCrud.remove(key, id);

/* ---------------- Inspection plans ---------------- */

export function cloneChecklist(id: string): string | undefined {
  let newId: string | undefined;
  const src = state.checklists.find((c) => c.id === id);
  if (!src) return;
  newId = crypto.randomUUID();
  quality.update((s) => {
    s.checklists = [
      {
        ...src,
        id: newId!,
        code: `${src.code}-C`,
        title: `${src.title} (copy)`,
        revision: "R1",
        status: "draft",
        updatedAt: new Date().toISOString(),
        checks: src.checks.map((c) => ({ ...c, id: crypto.randomUUID() })),
      },
      ...s.checklists,
    ];
  });
  return newId;
}

export function newChecklistRevision(id: string): string | undefined {
  const src = state.checklists.find((c) => c.id === id);
  if (!src) return;
  const num = Number(src.revision.replace(/\D+/g, "")) || 1;
  const newId = crypto.randomUUID();
  quality.update((s) => {
    const old = s.checklists.find((c) => c.id === id);
    if (old) old.status = "obsolete";
    s.checklists = [
      {
        ...src,
        id: newId,
        revision: `R${num + 1}`,
        status: "draft",
        updatedAt: new Date().toISOString(),
        checks: src.checks.map((c) => ({ ...c, id: crypto.randomUUID() })),
      },
      ...s.checklists,
    ];
  });
  return newId;
}

export function setChecklistStatus(id: string, status: Checklist["status"]) {
  quality.update((s) => {
    const c = s.checklists.find((x) => x.id === id);
    if (!c) return;
    c.status = status;
    c.updatedAt = new Date().toISOString();
  });
}

export function upsertCheck(checklistId: string, check: Record<string, unknown>) {
  quality.update((s) => {
    const c = s.checklists.find((x) => x.id === checklistId);
    if (!c) return;
    const row = {
      id: (check.id as string) || crypto.randomUUID(),
      parameter: String(check.parameter ?? ""),
      type: (check.type ?? "dimensional") as Checklist["checks"][number]["type"],
      method: String(check.method ?? ""),
      nominal: (check.nominal as string) || undefined,
      unit: (check.unit as string) || undefined,
      lsl: check.lsl === undefined || check.lsl === "" ? undefined : Number(check.lsl),
      usl: check.usl === undefined || check.usl === "" ? undefined : Number(check.usl),
      critical: check.critical === "yes" || check.critical === true,
    };
    c.checks = check.id ? c.checks.map((k) => (k.id === row.id ? row : k)) : [...c.checks, row];
    c.updatedAt = new Date().toISOString();
  });
}

export function removeCheck(checklistId: string, checkId: string) {
  quality.update((s) => {
    const c = s.checklists.find((x) => x.id === checklistId);
    if (!c) return;
    c.checks = c.checks.filter((k) => k.id !== checkId);
    c.updatedAt = new Date().toISOString();
  });
}

/* ---------------- Inspections ---------------- */

export function startInspection(id: string) {
  quality.update((s) => {
    const i = s.inspections.find((x) => x.id === id);
    if (i && i.status === "planned") i.status = "in-progress";
  });
}

/** Complete an inspection; failures and rework auto-raise a linked NCR. */
export function completeInspection(id: string, result: "passed" | "failed" | "rework") {
  quality.update((s) => {
    const i = s.inspections.find((x) => x.id === id);
    if (!i) return;
    i.status = result;
    i.completedAt = new Date().toISOString();
    i.passRate = result === "passed"
      ? 100
      : passRateFor(i.qty, i.criticalDefects, i.majorDefects, i.minorDefects);
    if (result === "passed") {
      i.criticalDefects = 0;
      i.majorDefects = 0;
    }
  });
  if (result !== "passed") raiseNcrFromInspection(id);
  recomputeSupplierScores();
}

/** Create (once) the NCR that belongs to a failed / rework inspection. */
export function raiseNcrFromInspection(inspectionId: string): string | undefined {
  const insp = state.inspections.find((x) => x.id === inspectionId);
  if (!insp || insp.ncrCode) return insp?.ncrCode;
  const severity: NCR["severity"] =
    insp.criticalDefects > 0 ? "critical" : insp.majorDefects > 0 ? "high" : "medium";
  const code = nextCode(state.ncrs.map((n) => n.code), "NCR", 4400);
  const id = crypto.randomUUID();
  quality.update((s) => {
    s.ncrs = [
      {
        id,
        code,
        raisedAt: new Date().toISOString(),
        raisedBy: insp.inspector,
        source: insp.stage,
        itemCode: insp.itemCode,
        itemDescription: insp.itemDescription,
        qty: insp.qty,
        uom: insp.uom,
        vendorName: insp.vendorName,
        projectCode: insp.projectCode,
        defect: `${insp.status === "rework" ? "Rework raised" : "Inspection failed"} on ${insp.code} — ${insp.criticalDefects} critical / ${insp.majorDefects} major / ${insp.minorDefects} minor defects against plan ${insp.checklistCode}`,
        severity,
        disposition: insp.status === "rework" ? "rework" : undefined,
        status: "open",
        costImpact: 0,
        inspectionCode: insp.code,
      },
      ...s.ncrs,
    ];
    const target = s.inspections.find((x) => x.id === inspectionId);
    if (target) target.ncrCode = code;
  });
  return code;
}

/* ---------------- NCR ---------------- */

export function setNcrStatus(id: string, status: NCR["status"]) {
  quality.update((s) => {
    const n = s.ncrs.find((x) => x.id === id);
    if (n) n.status = status;
  });
  recomputeSupplierScores();
}

export function setNcrDisposition(id: string, disposition: NonNullable<NCR["disposition"]>) {
  quality.update((s) => {
    const n = s.ncrs.find((x) => x.id === id);
    if (!n) return;
    n.disposition = disposition;
    if (n.status === "open") n.status = "containment";
  });
}

/** Escalate an NCR into an 8D CAPA and cross-link both records. */
export function createCapaFromNcr(ncrId: string): string | undefined {
  const ncr = state.ncrs.find((x) => x.id === ncrId);
  if (!ncr) return;
  if (ncr.linkedCapa) return ncr.linkedCapa;
  const code = nextCode(state.capas.map((c) => c.code), "CAPA", 1200);
  const now = new Date().toISOString();
  quality.update((s) => {
    s.capas = [
      {
        id: crypto.randomUUID(),
        code,
        ncrCode: ncr.code,
        title: `${ncr.itemDescription} — ${ncr.defect.slice(0, 60)}`,
        owner: ncr.raisedBy,
        team: ["Quality", "Process Eng"],
        openedAt: now,
        targetClose: addDays(now, ncr.severity === "critical" ? 14 : 30),
        stage: "D1",
        status: "in-progress",
        effectivenessPct: 0,
      },
      ...s.capas,
    ];
    const target = s.ncrs.find((x) => x.id === ncrId);
    if (target) {
      target.linkedCapa = code;
      target.status = "investigation";
    }
  });
  return code;
}

/* ---------------- CAPA ---------------- */

const D_STAGES: CAPAStage[] = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"];

/** Advance the 8D stage; reaching D8 closes the CAPA and its source NCR. */
export function advanceCapa(id: string) {
  quality.update((s) => {
    const c = s.capas.find((x) => x.id === id);
    if (!c) return;
    const idx = D_STAGES.indexOf(c.stage);
    const next = D_STAGES[Math.min(idx + 1, D_STAGES.length - 1)];
    c.stage = next;
    c.effectivenessPct = Math.round(((D_STAGES.indexOf(next) + 1) / D_STAGES.length) * 100);
    c.status = next === "D8" ? "verification" : "in-progress";
  });
}

export function closeCapa(id: string) {
  quality.update((s) => {
    const c = s.capas.find((x) => x.id === id);
    if (!c) return;
    c.stage = "D8";
    c.status = "closed";
    c.actualClose = new Date().toISOString();
    c.effectivenessPct = 100;
    if (c.ncrCode) {
      const n = s.ncrs.find((x) => x.code === c.ncrCode);
      if (n) n.status = "closed";
    }
  });
  recomputeSupplierScores();
}

export function reopenCapa(id: string) {
  quality.update((s) => {
    const c = s.capas.find((x) => x.id === id);
    if (!c) return;
    c.status = "in-progress";
    c.actualClose = undefined;
  });
}

/* ---------------- Calibration ---------------- */

/** Record a calibration event — resets the due date and clears the alert. */
export function recordCalibration(
  gaugeId: string,
  data: { lastCalibrated?: string; provider?: string; certificateNo?: string; frequencyDays?: number },
) {
  quality.update((s) => {
    const g = s.gauges.find((x) => x.id === gaugeId);
    if (!g) return;
    g.lastCalibrated = data.lastCalibrated || new Date().toISOString();
    if (data.provider) g.provider = data.provider;
    if (data.certificateNo) g.certificateNo = data.certificateNo;
    if (data.frequencyDays) g.frequencyDays = Number(data.frequencyDays);
    g.nextDue = addDays(g.lastCalibrated, g.frequencyDays);
    g.status = calStatusFor(g.nextDue);
  });
}

export function setGaugeStatus(id: string, status: CalStatus) {
  quality.update((s) => {
    const g = s.gauges.find((x) => x.id === id);
    if (g) g.status = status;
  });
}

/** Re-evaluate every gauge against today's date. */
export function refreshCalibrationStatuses() {
  quality.update((s) => {
    for (const g of s.gauges) {
      const next = calStatusFor(g.nextDue, g.status);
      if (next !== g.status) g.status = next;
    }
  });
}

