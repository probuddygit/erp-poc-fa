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
