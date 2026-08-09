import { useSyncExternalStore } from "react";
import { makeCrud } from "@/lib/crud";
import { WF_COLLECTIONS, type WFCollection, type WFRecord, type WorkforceState } from "./types";

const KEY = "faith-erp:workforce:v1";

function ymd(off: number) {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return d.toISOString().slice(0, 10);
}
const iso = (off: number) => {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return d.toISOString();
};

function empty(): WorkforceState {
  return Object.fromEntries(WF_COLLECTIONS.map((k) => [k, []])) as WorkforceState;
}

function seed(): WorkforceState {
  const s = empty();

  /* ---------------- Recruitment & Onboarding ---------------- */
  s.manpowerPlans = [
    { id: "mp1", code: "MPP-25-01", department: "Engineering", position: "Robotics Engineer", budgeted: 4, onboard: 2, gap: 2, quarter: "Q3 FY25", justification: "BIW line expansion for TATA order", status: "approved" },
    { id: "mp2", code: "MPP-25-02", department: "Manufacturing", position: "Welding Technician", budgeted: 8, onboard: 6, gap: 2, quarter: "Q3 FY25", justification: "Second shift ramp-up at Chakan", status: "approved" },
    { id: "mp3", code: "MPP-25-03", department: "Quality", position: "CMM Inspector", budgeted: 3, onboard: 2, gap: 1, quarter: "Q4 FY25", justification: "PPAP throughput for new customer", status: "pending" },
    { id: "mp4", code: "MPP-25-04", department: "Sales", position: "Key Account Manager", budgeted: 2, onboard: 1, gap: 1, quarter: "Q4 FY25", justification: "EV segment coverage", status: "draft" },
  ];
  s.requisitions = [
    { id: "mr1", code: "MRF-2501", position: "Robotics Engineer", department: "Engineering", grade: "B2", vacancies: 2, type: "permanent", raisedBy: "Priya Sharma", raisedOn: ymd(-22), targetDate: ymd(20), budgetCtc: 1800000, status: "approved", priority: "high" },
    { id: "mr2", code: "MRF-2502", position: "Welding Technician", department: "Manufacturing", grade: "B1", vacancies: 2, type: "contract", raisedBy: "Rahul Deshpande", raisedOn: ymd(-15), targetDate: ymd(10), budgetCtc: 620000, status: "approved", priority: "medium" },
    { id: "mr3", code: "MRF-2503", position: "CMM Inspector", department: "Quality", grade: "B1", vacancies: 1, type: "permanent", raisedBy: "Sneha Iyer", raisedOn: ymd(-6), targetDate: ymd(35), budgetCtc: 780000, status: "pending", priority: "medium" },
  ];
  s.jobPostings = [
    { id: "jp1", code: "JD-2501", title: "Robotics Engineer (KUKA/FANUC)", requisition: "MRF-2501", channel: "Naukri + LinkedIn", postedOn: ymd(-20), applications: 84, shortlisted: 12, status: "open", jd: "Own robot programming, simulation and commissioning for BIW cells. 3-6 yrs on KUKA/FANUC, PLC integration exposure." },
    { id: "jp2", code: "JD-2502", title: "Welding Technician — MIG/TIG", requisition: "MRF-2502", channel: "Referral + Local", postedOn: ymd(-13), applications: 41, shortlisted: 9, status: "open", jd: "MIG/TIG welding of fixtures and sub-assemblies to WPS. ITI + 2 yrs shop-floor experience." },
    { id: "jp3", code: "JD-2503", title: "CMM Inspector", requisition: "MRF-2503", channel: "Naukri", postedOn: ymd(-3), applications: 12, shortlisted: 2, status: "open", jd: "CMM programming and dimensional inspection, GD&T, PPAP documentation." },
  ];
  s.candidates = [
    { id: "cd1", code: "CAN-2501", name: "Nikhil Rane", position: "Robotics Engineer", source: "LinkedIn", experience: 5, currentCtc: 1400000, expectedCtc: 1850000, noticeDays: 60, matchScore: 92, stage: "interview", status: "in-progress", email: "nikhil.rane@mail.com", phone: "+91 90000 21001", skills: "KUKA, TIA Portal, RobotStudio" },
    { id: "cd2", code: "CAN-2502", name: "Shreya Bose", position: "Robotics Engineer", source: "Naukri", experience: 4, currentCtc: 1200000, expectedCtc: 1600000, noticeDays: 30, matchScore: 86, stage: "screening", status: "in-progress", email: "shreya.bose@mail.com", phone: "+91 90000 21002", skills: "FANUC, PLC, Vision" },
    { id: "cd3", code: "CAN-2503", name: "Imran Shaikh", position: "Welding Technician", source: "Referral", experience: 6, currentCtc: 480000, expectedCtc: 620000, noticeDays: 15, matchScore: 78, stage: "offer", status: "in-progress", email: "imran.s@mail.com", phone: "+91 90000 21003", skills: "MIG, TIG, Fixture welding" },
    { id: "cd4", code: "CAN-2504", name: "Pooja Kale", position: "CMM Inspector", source: "Naukri", experience: 3, currentCtc: 520000, expectedCtc: 720000, noticeDays: 30, matchScore: 71, stage: "screening", status: "in-progress", email: "pooja.k@mail.com", phone: "+91 90000 21004", skills: "CMM, GD&T, PPAP" },
    { id: "cd5", code: "CAN-2505", name: "Vivek Sawant", position: "Robotics Engineer", source: "Naukri", experience: 2, currentCtc: 700000, expectedCtc: 1100000, noticeDays: 30, matchScore: 54, stage: "screening", status: "rejected", email: "vivek.s@mail.com", phone: "+91 90000 21005", skills: "PLC basics" },
  ];
  s.interviews = [
    { id: "iv1", code: "INT-2501", candidate: "Nikhil Rane", round: "Technical 1", panel: "Vikram Patil", scheduledOn: ymd(-2), mode: "In-person", rating: 4, recommendation: "proceed", status: "completed", feedback: "Strong on robot kinematics and cycle-time optimisation." },
    { id: "iv2", code: "INT-2502", candidate: "Nikhil Rane", round: "Technical 2", panel: "Priya Sharma", scheduledOn: ymd(2), mode: "Video", rating: 0, recommendation: "", status: "scheduled", feedback: "" },
    { id: "iv3", code: "INT-2503", candidate: "Shreya Bose", round: "Screening", panel: "Manoj Pillai", scheduledOn: ymd(1), mode: "Video", rating: 0, recommendation: "", status: "scheduled", feedback: "" },
    { id: "iv4", code: "INT-2504", candidate: "Imran Shaikh", round: "Practical Trade Test", panel: "Rohit Jadhav", scheduledOn: ymd(-4), mode: "In-person", rating: 4, recommendation: "proceed", status: "completed", feedback: "Weld bead quality within WPS; clean fit-up." },
  ];
  s.offers = [
    { id: "of1", code: "OFR-2501", candidate: "Imran Shaikh", position: "Welding Technician", grade: "B1", ctc: 620000, joiningDate: ymd(12), releasedOn: ymd(-2), status: "released", acceptance: "pending" },
    { id: "of2", code: "OFR-2502", candidate: "Nikhil Rane", position: "Robotics Engineer", grade: "B2", ctc: 1800000, joiningDate: ymd(45), releasedOn: "", status: "draft", acceptance: "—" },
  ];
  s.onboarding = [
    { id: "ob1", code: "ONB-2501", candidate: "Imran Shaikh", joiningDate: ymd(12), buddy: "Rohit Jadhav", documents: "8/11", itAssets: "pending", inductionDone: "no", safetyInduction: "pending", progress: 45, status: "in-progress" },
    { id: "ob2", code: "ONB-2502", candidate: "Farah Khan", joiningDate: ymd(-120), buddy: "Sneha Iyer", documents: "11/11", itAssets: "issued", inductionDone: "yes", safetyInduction: "done", progress: 100, status: "completed" },
  ];

  /* ---------------- Performance Management ---------------- */
  s.kpiLibrary = [
    { id: "k1", code: "KPI-ENG-01", name: "Design release adherence", department: "Engineering", uom: "%", target: 95, weightage: 25, frequency: "Quarterly", type: "Percentage" },
    { id: "k2", code: "KPI-ENG-02", name: "ECN rework cost", department: "Engineering", uom: "INR", target: 250000, weightage: 15, frequency: "Quarterly", type: "Value" },
    { id: "k3", code: "KPI-MFG-01", name: "OEE", department: "Manufacturing", uom: "%", target: 82, weightage: 30, frequency: "Monthly", type: "Percentage" },
    { id: "k4", code: "KPI-QA-01", name: "Customer PPM", department: "Quality", uom: "PPM", target: 250, weightage: 30, frequency: "Monthly", type: "Quantity" },
    { id: "k5", code: "KPI-HR-01", name: "Recruitment TAT", department: "HR", uom: "Days", target: 45, weightage: 20, frequency: "Quarterly", type: "Timeline" },
    { id: "k6", code: "KPI-SAF-01", name: "Lost time injuries", department: "EHS", uom: "Count", target: 0, weightage: 25, frequency: "Monthly", type: "Quantity" },
  ];
  s.goals = [
    { id: "g1", code: "GOL-2501", empId: "e4", kpi: "KPI-ENG-01", cycle: "Q3 FY25", target: 95, achieved: 91, weightage: 25, score: 3.8, status: "in-progress" },
    { id: "g2", code: "GOL-2502", empId: "e5", kpi: "KPI-ENG-01", cycle: "Q3 FY25", target: 95, achieved: 97, weightage: 25, score: 4.6, status: "achieved" },
    { id: "g3", code: "GOL-2503", empId: "e7", kpi: "KPI-MFG-01", cycle: "Q3 FY25", target: 82, achieved: 74, weightage: 30, score: 2.8, status: "at-risk" },
    { id: "g4", code: "GOL-2504", empId: "e15", kpi: "KPI-QA-01", cycle: "Q3 FY25", target: 250, achieved: 180, weightage: 30, score: 4.4, status: "achieved" },
    { id: "g5", code: "GOL-2505", empId: "e11", kpi: "KPI-ENG-02", cycle: "Q3 FY25", target: 250000, achieved: 310000, weightage: 15, score: 2.5, status: "at-risk" },
    { id: "g6", code: "GOL-2506", empId: "e12", kpi: "KPI-HR-01", cycle: "Q3 FY25", target: 45, achieved: 38, weightage: 20, score: 4.5, status: "achieved" },
  ];
  s.appraisals = [
    { id: "ap1", code: "APR-25-01", empId: "e5", cycle: "Annual FY25", selfScore: 4.5, managerScore: 4.2, calibratedScore: 4.3, rating: "Exceeds", incrementPct: 12, promotion: "recommended", newGrade: "B4", status: "calibration" },
    { id: "ap2", code: "APR-25-02", empId: "e4", cycle: "Annual FY25", selfScore: 4.0, managerScore: 3.8, calibratedScore: 3.9, rating: "Meets+", incrementPct: 9, promotion: "not-now", newGrade: "B3", status: "manager" },
    { id: "ap3", code: "APR-25-03", empId: "e7", cycle: "Annual FY25", selfScore: 3.4, managerScore: 3.0, calibratedScore: 3.0, rating: "Meets", incrementPct: 6, promotion: "not-now", newGrade: "B2", status: "self" },
    { id: "ap4", code: "APR-25-04", empId: "e15", cycle: "Annual FY25", selfScore: 3.8, managerScore: 4.1, calibratedScore: 4.1, rating: "Exceeds", incrementPct: 11, promotion: "recommended", newGrade: "B2", status: "closed" },
  ];
  s.promotions = [
    { id: "pm1", code: "PRM-2501", empId: "e5", fromGrade: "B3", toGrade: "B4", effectiveDate: ymd(30), currentCtc: 2800000, revisedCtc: 3220000, incrementPct: 15, recommendedBy: "Priya Sharma", status: "pending" },
    { id: "pm2", code: "PRM-2502", empId: "e15", fromGrade: "B1", toGrade: "B2", effectiveDate: ymd(30), currentCtc: 720000, revisedCtc: 828000, incrementPct: 15, recommendedBy: "Sneha Iyer", status: "approved" },
  ];

  /* ---------------- Learning & Development ---------------- */
  s.tni = [
    { id: "tn1", code: "TNI-25-01", level: "Organization", area: "Industry 4.0 readiness", identifiedBy: "Arjun Mehta", employeesImpacted: 15, priority: "high", source: "Strategy review", status: "approved" },
    { id: "tn2", code: "TNI-25-02", level: "Department", area: "Robotics safety re-certification", identifiedBy: "Vikram Patil", employeesImpacted: 18, priority: "critical", source: "Certification expiry", status: "approved" },
    { id: "tn3", code: "TNI-25-03", level: "Employee", area: "SPC & MSA tools", identifiedBy: "Sneha Iyer", employeesImpacted: 4, priority: "medium", source: "Appraisal gap", status: "pending" },
    { id: "tn4", code: "TNI-25-04", level: "Department", area: "GD&T Level 2", identifiedBy: "Priya Sharma", employeesImpacted: 6, priority: "medium", source: "Skill matrix gap", status: "approved" },
  ];
  s.trainingPlans = [
    { id: "tp1", code: "TPL-25-01", title: "Robotics Safety & PL-d re-certification", tni: "TNI-25-02", trainer: "KUKA College", month: "Nov 2025", budget: 160000, participants: 18, mode: "External", status: "planned" },
    { id: "tp2", code: "TPL-25-02", title: "SPC / MSA workshop", tni: "TNI-25-03", trainer: "Internal — Sneha Iyer", month: "Dec 2025", budget: 40000, participants: 6, mode: "Internal", status: "planned" },
    { id: "tp3", code: "TPL-25-03", title: "Industry 4.0 & digital twin primer", tni: "TNI-25-01", trainer: "Siemens India", month: "Jan 2026", budget: 300000, participants: 15, mode: "External", status: "draft" },
  ];
  s.competencies = [
    { id: "cm1", code: "CMP-01", role: "Robotics Engineer", competency: "KUKA / FANUC programming", requiredLevel: 4, avgLevel: 3.2, gap: 0.8, criticality: "high" },
    { id: "cm2", code: "CMP-02", role: "Design Engineer", competency: "GD&T", requiredLevel: 4, avgLevel: 3.6, gap: 0.4, criticality: "medium" },
    { id: "cm3", code: "CMP-03", role: "QC Inspector", competency: "CMM Inspection", requiredLevel: 4, avgLevel: 3.9, gap: 0.1, criticality: "medium" },
    { id: "cm4", code: "CMP-04", role: "Welding Technician", competency: "MIG/TIG to WPS", requiredLevel: 3, avgLevel: 2.4, gap: 0.6, criticality: "high" },
  ];
  s.trainers = [
    { id: "tr1", code: "TRN-P-01", name: "KUKA College", type: "External", specialisation: "Robotics safety", rating: 4.6, costPerDay: 45000, empanelled: "yes" },
    { id: "tr2", code: "TRN-P-02", name: "Siemens India", type: "External", specialisation: "Automation / TIA", rating: 4.4, costPerDay: 55000, empanelled: "yes" },
    { id: "tr3", code: "TRN-P-03", name: "Sneha Iyer", type: "Internal", specialisation: "Quality tools", rating: 4.2, costPerDay: 0, empanelled: "yes" },
  ];
  s.trainingFeedback = [
    { id: "tf1", code: "TFB-2401", training: "TRN-24-01", empId: "e5", contentScore: 5, trainerScore: 5, relevance: 5, effectiveness: "high", postTestScore: 88, remarks: "Directly usable on the TATA cell" },
    { id: "tf2", code: "TFB-2402", training: "TRN-24-01", empId: "e14", contentScore: 4, trainerScore: 4, relevance: 4, effectiveness: "medium", postTestScore: 72, remarks: "Needs more hands-on" },
    { id: "tf3", code: "TFB-2403", training: "TRN-24-02", empId: "e11", contentScore: 4, trainerScore: 5, relevance: 5, effectiveness: "high", postTestScore: 81, remarks: "Good GD&T coverage" },
  ];

  /* ---------------- Engagement ---------------- */
  s.recognitions = [
    { id: "rc1", code: "RNR-2501", empId: "e5", award: "Star Performer", category: "Delivery", month: "Sep 2025", nominatedBy: "Priya Sharma", rewardValue: 25000, status: "approved" },
    { id: "rc2", code: "RNR-2502", empId: "e15", award: "Quality Champion", category: "Quality", month: "Sep 2025", nominatedBy: "Sneha Iyer", rewardValue: 15000, status: "approved" },
    { id: "rc3", code: "RNR-2503", empId: "e10", award: "Safety Hero", category: "Safety", month: "Oct 2025", nominatedBy: "Rohit Jadhav", rewardValue: 10000, status: "pending" },
  ];
  s.wellness = [
    { id: "wl1", code: "WEL-2501", program: "Annual health check-up", type: "Health", scheduledOn: ymd(18), vendor: "Apollo Clinics", participants: 15, budget: 90000, status: "planned" },
    { id: "wl2", code: "WEL-2502", program: "Yoga & stress management", type: "Wellness", scheduledOn: ymd(-10), vendor: "Internal", participants: 11, budget: 20000, status: "completed" },
    { id: "wl3", code: "WEL-2503", program: "Diwali family day", type: "Recreation", scheduledOn: ymd(25), vendor: "EventCo", participants: 60, budget: 250000, status: "planned" },
  ];
  s.surveys = [
    { id: "sv1", code: "SUR-2501", title: "Employee satisfaction pulse — Q3", audience: "All employees", responses: 13, invited: 15, avgScore: 3.9, enps: 32, status: "completed", runOn: ymd(-12) },
    { id: "sv2", code: "SUR-2502", title: "Manager effectiveness survey", audience: "Engineering", responses: 4, invited: 6, avgScore: 4.1, enps: 40, status: "in-progress", runOn: ymd(-3) },
  ];

  /* ---------------- Compensation ---------------- */
  s.salaryGrades = [
    { id: "sg1", code: "B1", grade: "B1 — Technician", minCtc: 400000, midCtc: 620000, maxCtc: 850000, benchmark: 640000, positioning: "at-market", headcount: 3 },
    { id: "sg2", code: "B2", grade: "B2 — Engineer", minCtc: 900000, midCtc: 1400000, maxCtc: 1900000, benchmark: 1520000, positioning: "below-market", headcount: 4 },
    { id: "sg3", code: "B3", grade: "B3 — Lead / Manager", minCtc: 1900000, midCtc: 2500000, maxCtc: 3200000, benchmark: 2480000, positioning: "at-market", headcount: 5 },
    { id: "sg4", code: "B4", grade: "B4 — Head", minCtc: 4000000, midCtc: 5500000, maxCtc: 7000000, benchmark: 5300000, positioning: "above-market", headcount: 3 },
  ];
  s.benefits = [
    { id: "bn1", code: "BEN-PF", benefit: "Provident Fund", provider: "EPFO", coverage: "All employees", employerCost: 1890000, employeeCost: 1890000, renewalDate: ymd(200), status: "active" },
    { id: "bn2", code: "BEN-ESIC", benefit: "ESIC", provider: "ESIC", coverage: "Below ₹21k wage", employerCost: 128000, employeeCost: 34000, renewalDate: ymd(200), status: "active" },
    { id: "bn3", code: "BEN-GMC", benefit: "Group Mediclaim ₹5L", provider: "ICICI Lombard", coverage: "Employee + family", employerCost: 780000, employeeCost: 0, renewalDate: ymd(64), status: "renewal-due" },
    { id: "bn4", code: "BEN-GPA", benefit: "Group Personal Accident", provider: "Bajaj Allianz", coverage: "All employees", employerCost: 145000, employeeCost: 0, renewalDate: ymd(120), status: "active" },
    { id: "bn5", code: "BEN-MLWF", benefit: "MLWF", provider: "Maharashtra Labour Welfare Board", coverage: "All employees", employerCost: 4500, employeeCost: 1800, renewalDate: ymd(45), status: "active" },
  ];

  /* ---------------- Administration & Facility ---------------- */
  s.gatePasses = [
    { id: "gp1", code: "GP-2501", type: "Returnable", material: "Fixture jig — trial", issuedTo: "Rohit Jadhav", vendor: "Precision Tools", issuedOn: ymd(-6), expectedBack: ymd(4), value: 180000, status: "open" },
    { id: "gp2", code: "GP-2502", type: "Non-returnable", material: "Scrap MS offcuts 1.2T", issuedTo: "Stores", vendor: "Shree Scrap Traders", issuedOn: ymd(-2), expectedBack: "", value: 42000, status: "closed" },
  ];
  s.visitors = [
    { id: "vs1", code: "VIS-2501", name: "Rajesh Kumar", company: "TATA Motors", host: "Kavya Menon", purpose: "Customer audit", inTime: "10:05", outTime: "13:20", date: ymd(-1), badge: "V-014", status: "closed" },
    { id: "vs2", code: "VIS-2502", name: "Anita Desai", company: "Siemens", host: "Vikram Patil", purpose: "Technical review", inTime: "11:30", outTime: "", date: ymd(0), badge: "V-021", status: "in-premise" },
  ];
  s.facilityBookings = [
    { id: "fb1", code: "FBK-2501", facility: "Board Room", bookedBy: "Arjun Mehta", date: ymd(1), from: "10:00", to: "12:00", purpose: "Customer QBR", attendees: 8, status: "confirmed" },
    { id: "fb2", code: "FBK-2502", facility: "Training Hall", bookedBy: "Manoj Pillai", date: ymd(3), from: "09:00", to: "17:00", purpose: "Safety induction", attendees: 20, status: "confirmed" },
  ];
  s.canteen = [
    { id: "cn1", code: "CAN-2509", month: "Sep 2025", vendor: "Annapurna Caterers", mealsServed: 3120, ratePerMeal: 62, amount: 193440, subsidy: 96720, hygieneScore: 4.4, status: "verified" },
    { id: "cn2", code: "CAN-2510", month: "Oct 2025", vendor: "Annapurna Caterers", mealsServed: 3245, ratePerMeal: 62, amount: 201190, subsidy: 100595, hygieneScore: 4.5, status: "pending" },
  ];
  s.transport = [
    { id: "trn1", code: "BUS-01", type: "Employee Bus", route: "Pune HQ ↔ Chakan Plant", vendor: "Sai Travels", capacity: 32, occupancy: 27, monthlyCost: 145000, fuelLtr: 1180, status: "active" },
    { id: "trn2", code: "CAB-01", type: "Cab", route: "Airport transfers", vendor: "Ola Corporate", capacity: 4, occupancy: 3, monthlyCost: 38000, fuelLtr: 0, status: "active" },
  ];
  s.housekeeping = [
    { id: "hk1", code: "HK-2510", area: "Plant shop floor", contractor: "CleanPro Services", headcount: 6, frequency: "Daily x2", auditScore: 4.2, monthlyCost: 96000, status: "active" },
    { id: "hk2", code: "HK-2511", area: "Pune HQ office", contractor: "CleanPro Services", headcount: 3, frequency: "Daily", auditScore: 4.6, monthlyCost: 48000, status: "active" },
  ];
  s.stationery = [
    { id: "st1", code: "STN-001", item: "A4 Paper (ream)", category: "Stationery", opening: 120, issued: 48, closing: 72, reorder: 60, unitCost: 280, status: "ok" },
    { id: "st2", code: "STN-002", item: "Safety gloves (pair)", category: "Safety material", opening: 200, issued: 145, closing: 55, reorder: 80, unitCost: 120, status: "reorder" },
    { id: "st3", code: "STN-003", item: "Welding electrodes (kg)", category: "Consumable", opening: 400, issued: 260, closing: 140, reorder: 150, unitCost: 210, status: "reorder" },
    { id: "st4", code: "STN-004", item: "Printer toner", category: "Stationery", opening: 12, issued: 5, closing: 7, reorder: 4, unitCost: 3600, status: "ok" },
  ];
  s.utilityBills = [
    { id: "ub1", code: "UTL-2510-EL", utility: "Electricity", period: "Oct 2025", vendor: "MSEDCL", units: 84200, amount: 742000, dueDate: ymd(6), status: "pending" },
    { id: "ub2", code: "UTL-2510-WT", utility: "Water", period: "Oct 2025", vendor: "MIDC", units: 1850, amount: 46000, dueDate: ymd(8), status: "pending" },
    { id: "ub3", code: "UTL-2509-EL", utility: "Electricity", period: "Sep 2025", vendor: "MSEDCL", units: 81100, amount: 716000, dueDate: ymd(-24), status: "paid" },
  ];
  s.adminInvoices = [
    { id: "ai1", code: "ADM-INV-2501", vendor: "CleanPro Services", category: "Housekeeping", invoiceDate: ymd(-9), amount: 144000, poRef: "PO-ADM-118", threeWayMatch: "matched", status: "approved" },
    { id: "ai2", code: "ADM-INV-2502", vendor: "Sai Travels", category: "Transport", invoiceDate: ymd(-5), amount: 145000, poRef: "PO-ADM-121", threeWayMatch: "variance", status: "pending" },
    { id: "ai3", code: "ADM-INV-2503", vendor: "Annapurna Caterers", category: "Canteen", invoiceDate: ymd(-3), amount: 201190, poRef: "PO-ADM-124", threeWayMatch: "matched", status: "pending" },
  ];
  s.adminQuotes = [
    { id: "aq1", code: "ADM-RFQ-2501", requirement: "Office furniture — 20 workstations", vendor: "Featherlite", quoteAmount: 860000, deliveryDays: 30, rating: 4.3, recommended: "no", status: "received" },
    { id: "aq2", code: "ADM-RFQ-2501", requirement: "Office furniture — 20 workstations", vendor: "Godrej Interio", quoteAmount: 792000, deliveryDays: 25, rating: 4.6, recommended: "yes", status: "received" },
    { id: "aq3", code: "ADM-RFQ-2501", requirement: "Office furniture — 20 workstations", vendor: "Local Fabricator", quoteAmount: 705000, deliveryDays: 40, rating: 3.4, recommended: "no", status: "received" },
  ];
  s.adminStock = [
    { id: "as1", code: "SCR-2510", category: "Scrap", item: "MS offcuts", quantity: 1.2, uom: "MT", disposalVendor: "Shree Scrap Traders", realisation: 42000, disposedOn: ymd(-2), status: "disposed" },
    { id: "as2", code: "WST-2510", category: "Hazardous waste", item: "Used cutting oil", quantity: 400, uom: "Ltr", disposalVendor: "MPCB Authorised — EcoSafe", realisation: 0, disposedOn: ymd(5), status: "scheduled" },
  ];

  /* ---------------- Travel & Expense ---------------- */
  s.travelRequests = [
    { id: "tv1", code: "TRV-2501", empId: "e13", purpose: "Customer visit — TATA Pune", destination: "Pune", fromDate: ymd(4), toDate: ymd(5), mode: "Cab", estimatedCost: 8500, advance: 5000, status: "approved" },
    { id: "tv2", code: "TRV-2502", empId: "e5", purpose: "Commissioning support", destination: "Chennai", fromDate: ymd(9), toDate: ymd(13), mode: "Flight", estimatedCost: 46000, advance: 25000, status: "pending" },
    { id: "tv3", code: "TRV-2503", empId: "e8", purpose: "Vendor audit", destination: "Rajkot", fromDate: ymd(-12), toDate: ymd(-10), mode: "Train", estimatedCost: 18000, advance: 10000, status: "completed" },
  ];
  s.expenseClaims = [
    { id: "ex1", code: "EXP-2501", empId: "e8", travelRef: "TRV-2503", category: "Travel", claimDate: ymd(-8), amount: 17420, receipts: 6, policyFlag: "within-policy", status: "approved" },
    { id: "ex2", code: "EXP-2502", empId: "e13", travelRef: "", category: "Client entertainment", claimDate: ymd(-4), amount: 9800, receipts: 3, policyFlag: "exceeds-limit", status: "pending" },
    { id: "ex3", code: "EXP-2503", empId: "e5", travelRef: "", category: "Local conveyance", claimDate: ymd(-3), amount: 2450, receipts: 4, policyFlag: "duplicate-suspect", status: "pending" },
  ];
  s.bookings = [
    { id: "bk1", code: "BKG-2501", type: "Flight", travelRef: "TRV-2502", vendor: "MakeMyTrip Corporate", detail: "PNQ → MAA, 06:20", amount: 7400, bookedOn: ymd(-1), status: "hold" },
    { id: "bk2", code: "BKG-2502", type: "Hotel", travelRef: "TRV-2502", vendor: "Lemon Tree Chennai", detail: "4 nights, twin", amount: 21600, bookedOn: ymd(-1), status: "hold" },
    { id: "bk3", code: "BKG-2503", type: "Cab", travelRef: "TRV-2501", vendor: "Ola Corporate", detail: "HQ ↔ TATA plant", amount: 3200, bookedOn: ymd(-2), status: "confirmed" },
  ];

  /* ---------------- Safety (EHS) ---------------- */
  s.incidents = [
    { id: "in1", code: "INC-2501", type: "First aid", area: "Welding bay", date: ymd(-18), severity: "low", injured: "Suresh Kamble", lostDays: 0, rootCause: "Missing hand shield", capa: "Toolbox talk + PPE audit", status: "closed" },
    { id: "in2", code: "INC-2502", type: "Lost time injury", area: "Assembly line 2", date: ymd(-6), severity: "high", injured: "Contract worker — Sanjay", lostDays: 4, rootCause: "Unguarded pinch point", capa: "Guard retrofit + LOTO refresher", status: "open" },
    { id: "in3", code: "INC-2503", type: "Property damage", area: "Store yard", date: ymd(-30), severity: "medium", injured: "—", lostDays: 0, rootCause: "Forklift reversing without spotter", capa: "Reverse alarm + spotter SOP", status: "closed" },
  ];
  s.nearMisses = [
    { id: "nm1", code: "NM-2501", area: "Paint booth", date: ymd(-4), description: "Solvent drum stored near hot work", reportedBy: "Rohit Jadhav", potential: "high", action: "Relocate to flammable cabinet", status: "open" },
    { id: "nm2", code: "NM-2502", area: "Robot cell 3", date: ymd(-9), description: "Light curtain bypass observed", reportedBy: "Vikram Patil", potential: "critical", action: "Interlock audit on all cells", status: "in-progress" },
    { id: "nm3", code: "NM-2503", area: "Stores", date: ymd(-14), description: "Rack overload beyond SWL", reportedBy: "Karan Verma", potential: "medium", action: "Load labelling", status: "closed" },
  ];
  s.hazards = [
    { id: "hz1", code: "HAZ-01", hazard: "Unguarded pinch points on line 2", area: "Assembly", category: "Mechanical", likelihood: 4, severity: 4, riskScore: 16, control: "Fixed guard + interlock", owner: "Rahul Deshpande", status: "open" },
    { id: "hz2", code: "HAZ-02", hazard: "Welding fume exposure", area: "Welding bay", category: "Occupational health", likelihood: 3, severity: 3, riskScore: 9, control: "LEV + respirator programme", owner: "Rohit Jadhav", status: "mitigated" },
    { id: "hz3", code: "HAZ-03", hazard: "Flammable solvent storage", area: "Paint booth", category: "Fire", likelihood: 3, severity: 5, riskScore: 15, control: "FLC cabinet + hot work permit", owner: "Rahul Deshpande", status: "open" },
    { id: "hz4", code: "HAZ-04", hazard: "Manual handling of fixtures", area: "Assembly", category: "Ergonomic", likelihood: 3, severity: 2, riskScore: 6, control: "Lifting tackle + training", owner: "Rohit Jadhav", status: "mitigated" },
  ];
  s.risks = [
    { id: "rk1", code: "RSK-01", risk: "Fire in paint booth", category: "Fire safety", inherentScore: 20, residualScore: 10, mitigation: "Sprinkler + hot work permit + mock drill", owner: "Rahul Deshpande", reviewDate: ymd(21), status: "open" },
    { id: "rk2", code: "RSK-02", risk: "Contract labour untrained on LOTO", category: "Operational", inherentScore: 16, residualScore: 8, mitigation: "Mandatory induction before gate pass", owner: "Manoj Pillai", reviewDate: ymd(10), status: "open" },
    { id: "rk3", code: "RSK-03", risk: "Machine guarding non-conformance in audit", category: "Compliance", inherentScore: 12, residualScore: 4, mitigation: "Guard retrofit programme", owner: "Rahul Deshpande", reviewDate: ymd(-5), status: "mitigated" },
  ];
  s.safetyAudits = [
    { id: "sa1", code: "SAF-AUD-2501", type: "Internal safety audit", area: "Chakan Plant", auditor: "Rahul Deshpande", date: ymd(-20), findings: 9, closed: 7, score: 82, standard: "ISO 45001", status: "in-progress" },
    { id: "sa2", code: "SAF-AUD-2502", type: "OHSAS review", area: "Pune HQ", auditor: "External — TÜV", date: ymd(-70), findings: 4, closed: 4, score: 91, standard: "ISO 45001", status: "closed" },
    { id: "sa3", code: "SAF-AUD-2503", type: "Fire mock drill", area: "Chakan Plant", auditor: "Rohit Jadhav", date: ymd(14), findings: 0, closed: 0, score: 0, standard: "Factories Act", status: "planned" },
  ];

  /* ---------------- Compliance ---------------- */
  s.complianceItems = [
    { id: "cp1", code: "CMP-2501", type: "Statutory", requirement: "PF monthly ECR filing", authority: "EPFO", frequency: "Monthly", owner: "Ananya Rao", dueDate: ymd(4), lastFiled: ymd(-26), status: "pending" },
    { id: "cp2", code: "CMP-2502", type: "Statutory", requirement: "ESIC monthly contribution", authority: "ESIC", frequency: "Monthly", owner: "Ananya Rao", dueDate: ymd(6), lastFiled: ymd(-24), status: "pending" },
    { id: "cp3", code: "CMP-2503", type: "Statutory", requirement: "Factory licence renewal", authority: "DISH Maharashtra", frequency: "Annual", owner: "Rahul Deshpande", dueDate: ymd(38), lastFiled: ymd(-327), status: "pending" },
    { id: "cp4", code: "CMP-2504", type: "Company", requirement: "ISO 9001 surveillance audit", authority: "TÜV Rheinland", frequency: "Annual", owner: "Sneha Iyer", dueDate: ymd(56), lastFiled: ymd(-309), status: "pending" },
    { id: "cp5", code: "CMP-2505", type: "Customer", requirement: "TATA supplier compliance declaration", authority: "TATA Motors", frequency: "Half-yearly", owner: "Kavya Menon", dueDate: ymd(-3), lastFiled: ymd(-186), status: "overdue" },
    { id: "cp6", code: "CMP-2506", type: "Vendor", requirement: "Contractor labour licence verification", authority: "Internal", frequency: "Quarterly", owner: "Manoj Pillai", dueDate: ymd(12), lastFiled: ymd(-78), status: "pending" },
    { id: "cp7", code: "CMP-2507", type: "Statutory", requirement: "MLWF half-yearly remittance", authority: "MLWB", frequency: "Half-yearly", owner: "Ananya Rao", dueDate: ymd(45), lastFiled: ymd(-137), status: "filed" },
  ];
  s.auditTracking = [
    { id: "at1", code: "AUD-2501", audit: "ISO 9001 internal audit", auditor: "Sneha Iyer", date: ymd(-40), ncrs: 6, closed: 5, dueDate: ymd(7), status: "in-progress" },
    { id: "at2", code: "AUD-2502", audit: "Customer process audit — TATA", auditor: "TATA SQA", date: ymd(-14), ncrs: 3, closed: 1, dueDate: ymd(9), status: "in-progress" },
    { id: "at3", code: "AUD-2503", audit: "Statutory labour inspection", auditor: "Labour Dept", date: ymd(-95), ncrs: 2, closed: 2, dueDate: ymd(-60), status: "closed" },
  ];

  /* ---------------- Documents & Governance ---------------- */
  s.documents = [
    { id: "dc1", code: "DOC-HR-001", title: "Employee Handbook v3.2", category: "HR Policy", owner: "Manoj Pillai", version: "3.2", label: "Internal", reviewDate: ymd(90), retention: "Permanent", storage: "server/hr/policies", status: "approved" },
    { id: "dc2", code: "DOC-SAF-014", title: "Emergency Response Plan", category: "Safety", owner: "Rahul Deshpande", version: "2.0", label: "Controlled", reviewDate: ymd(-6), retention: "5 years", storage: "server/ehs/plans", status: "review-due" },
    { id: "dc3", code: "DOC-CMP-008", title: "Factory Licence 2025", category: "Compliance", owner: "Rahul Deshpande", version: "1.0", label: "Statutory", reviewDate: ymd(38), retention: "10 years", storage: "server/compliance/licences", status: "approved" },
    { id: "dc4", code: "DOC-ADM-021", title: "Canteen vendor contract", category: "Administration", owner: "Manoj Pillai", version: "1.1", label: "Confidential", reviewDate: ymd(120), retention: "7 years", storage: "server/admin/contracts", status: "approved" },
    { id: "dc5", code: "DOC-HR-042", title: "Old salary structure FY22", category: "HR Policy", owner: "Manoj Pillai", version: "1.0", label: "Archive", reviewDate: ymd(-200), retention: "3 years", storage: "server/archive/hr", status: "deletion-requested" },
  ];
  s.dataGovernance = [
    { id: "dg1", code: "GOV-01", folder: "server/hr", convention: "HR_<type>_<yyyy>_<seq>", owner: "Manoj Pillai", lastReview: ymd(-25), archivePolicy: "Archive after 3 yrs", nextReview: ymd(5), status: "compliant" },
    { id: "dg2", code: "GOV-02", folder: "server/ehs", convention: "EHS_<doc>_<rev>", owner: "Rahul Deshpande", lastReview: ymd(-60), archivePolicy: "Retain 5 yrs", nextReview: ymd(-2), status: "review-due" },
    { id: "dg3", code: "GOV-03", folder: "server/admin", convention: "ADM_<vendor>_<yyyy>", owner: "Manoj Pillai", lastReview: ymd(-12), archivePolicy: "Retain 7 yrs", nextReview: ymd(18), status: "compliant" },
  ];

  /* ---------------- Contract Labour ---------------- */
  s.contractors = [
    { id: "ct1", code: "CTR-01", contractor: "CleanPro Services", category: "Housekeeping", licenceNo: "CLR/PN/2451", licenceExpiry: ymd(75), workers: 9, pfEsicCompliant: "yes", performanceScore: 4.2, status: "active" },
    { id: "ct2", code: "CTR-02", contractor: "SecureForce Pvt Ltd", category: "Security", licenceNo: "CLR/PN/2188", licenceExpiry: ymd(-8), workers: 12, pfEsicCompliant: "yes", performanceScore: 3.8, status: "licence-expired" },
    { id: "ct3", code: "CTR-03", contractor: "Shakti Manpower", category: "Operational labour", licenceNo: "CLR/PN/2610", licenceExpiry: ymd(210), workers: 24, pfEsicCompliant: "partial", performanceScore: 3.5, status: "active" },
  ];
  s.contractWorkers = [
    { id: "cw1", code: "CLW-1001", name: "Sanjay Pawar", contractor: "Shakti Manpower", skill: "Fitter", area: "Assembly", daysWorked: 22, rate: 720, inductionDone: "yes", status: "active" },
    { id: "cw2", code: "CLW-1002", name: "Ravi Yadav", contractor: "Shakti Manpower", skill: "Helper", area: "Welding bay", daysWorked: 24, rate: 560, inductionDone: "yes", status: "active" },
    { id: "cw3", code: "CLW-1003", name: "Salim Ansari", contractor: "SecureForce Pvt Ltd", skill: "Security guard", area: "Main gate", daysWorked: 26, rate: 640, inductionDone: "no", status: "active" },
    { id: "cw4", code: "CLW-1004", name: "Meena Jadhav", contractor: "CleanPro Services", skill: "Housekeeping", area: "Shop floor", daysWorked: 25, rate: 520, inductionDone: "yes", status: "active" },
  ];
  s.contractBills = [
    { id: "cb1", code: "CLB-2510-01", contractor: "Shakti Manpower", period: "Oct 2025", manDays: 528, amount: 348480, pfEsic: 46200, complianceDocs: "submitted", status: "pending" },
    { id: "cb2", code: "CLB-2510-02", contractor: "CleanPro Services", period: "Oct 2025", manDays: 225, amount: 144000, pfEsic: 19100, complianceDocs: "submitted", status: "approved" },
    { id: "cb3", code: "CLB-2510-03", contractor: "SecureForce Pvt Ltd", period: "Oct 2025", manDays: 312, amount: 199680, pfEsic: 26400, complianceDocs: "missing", status: "on-hold" },
  ];

  return s;
}

function load(): WorkforceState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return { ...empty(), ...(JSON.parse(raw) as WorkforceState) };
  } catch {
    return seed();
  }
}

let state: WorkforceState = load();
const listeners = new Set<() => void>();

function save() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const workforce = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  update(mut: (s: WorkforceState) => void) {
    mut(state);
    state = { ...state };
    save();
  },
  reset() {
    state = seed();
    save();
  },
};

export function useWorkforce<T>(sel: (s: WorkforceState) => T): T {
  return useSyncExternalStore(workforce.subscribe, () => sel(state), () => sel(state));
}

/** Convenience: read one collection. */
export function useWFList(key: WFCollection): WFRecord[] {
  return useWorkforce((s) => s[key] ?? []);
}

const { upsert: baseUpsert, remove: baseRemove } = makeCrud<WorkforceState & Record<string, unknown>>(
  workforce as unknown as { update(mut: (s: WorkforceState & Record<string, unknown>) => void): void },
);

const PREFIX: Partial<Record<WFCollection, string>> = {
  requisitions: "MRF", candidates: "CAN", interviews: "INT", offers: "OFR", onboarding: "ONB",
  goals: "GOL", appraisals: "APR", promotions: "PRM", tni: "TNI", trainingPlans: "TPL",
  recognitions: "RNR", wellness: "WEL", surveys: "SUR", gatePasses: "GP", visitors: "VIS",
  facilityBookings: "FBK", travelRequests: "TRV", expenseClaims: "EXP", bookings: "BKG",
  incidents: "INC", nearMisses: "NM", risks: "RSK", safetyAudits: "SAF-AUD",
  complianceItems: "CMP", auditTracking: "AUD", contractBills: "CLB", adminInvoices: "ADM-INV",
};

function nextCode(prefix: string, existing: string[]) {
  const nums = existing.map((c) => Number(String(c).replace(/\D/g, "").slice(-4))).filter((n) => !Number.isNaN(n));
  return `${prefix}-${(nums.length ? Math.max(...nums) : 2500) + 1}`;
}

/** Insert/update any workforce collection, filling code + sensible defaults. */
export function wfUpsert(key: string, record: Record<string, unknown>): string {
  const rec = { ...record };
  const col = key as WFCollection;
  if (!rec.code && PREFIX[col]) {
    rec.code = nextCode(PREFIX[col]!, (state[col] ?? []).map((r) => String(r.code ?? "")));
  }
  if (!rec.id && !rec.status) rec.status = "draft";

  // derived helpers
  if (col === "hazards" || col === "risks") {
    const l = Number(rec.likelihood ?? 0);
    const sv = Number(rec.severity ?? 0);
    if (l && sv) rec.riskScore = l * sv;
  }
  if (col === "manpowerPlans") {
    rec.gap = Math.max(0, Number(rec.budgeted ?? 0) - Number(rec.onboard ?? 0));
  }
  if (col === "promotions") {
    const cur = Number(rec.currentCtc ?? 0);
    const rev = Number(rec.revisedCtc ?? 0);
    if (cur && rev) rec.incrementPct = Math.round(((rev - cur) / cur) * 100);
  }
  if (col === "goals") {
    const t = Number(rec.target ?? 0);
    const a = Number(rec.achieved ?? 0);
    if (t) rec.score = Math.min(5, Math.round((a / t) * 4 * 10) / 10);
  }
  if (col === "candidates" && rec.matchScore === undefined) rec.matchScore = 60;
  if (col === "onboarding" && rec.progress === undefined) rec.progress = 0;

  rec.updatedAt = new Date().toISOString();
  return baseUpsert(key as never, rec);
}

export function wfDelete(key: string, id: string) {
  baseRemove(key as never, id);
}

/** Generic status transition used by every approve / reject / close CTA. */
export function wfSetStatus(key: WFCollection, id: string, status: string) {
  workforce.update((s) => {
    const r = (s[key] ?? []).find((x) => x.id === id);
    if (r) {
      r.status = status;
      r.updatedAt = new Date().toISOString();
    }
  });
}

export function wfPatch(key: WFCollection, id: string, patch: Record<string, unknown>) {
  workforce.update((s) => {
    const r = (s[key] ?? []).find((x) => x.id === id);
    if (r) Object.assign(r, patch, { updatedAt: new Date().toISOString() });
  });
}

/** Bulk status change for toolbar actions. */
export function wfBulkStatus(key: WFCollection, from: string, to: string) {
  let n = 0;
  workforce.update((s) => {
    (s[key] ?? []).forEach((r) => {
      if (r.status === from) {
        r.status = to;
        n += 1;
      }
    });
  });
  return n;
}

/* ---------------- Cross-module automation ---------------- */

/** Recruitment: move a candidate to the next stage, creating the downstream record. */
export function advanceCandidate(id: string): string {
  const ORDER = ["applied", "screening", "interview", "offer", "hired"];
  let msg = "No change";
  workforce.update((s) => {
    const c = s.candidates.find((x) => x.id === id);
    if (!c) return;
    const i = ORDER.indexOf(String(c.stage ?? "applied"));
    const next = ORDER[Math.min(ORDER.length - 1, i + 1)];
    c.stage = next;
    msg = `${c.name} moved to ${next}`;
    if (next === "interview" && !s.interviews.some((iv) => iv.candidate === c.name && iv.status === "scheduled")) {
      s.interviews = [
        { id: crypto.randomUUID(), code: nextCode("INT", s.interviews.map((x) => String(x.code))), candidate: c.name, round: "Technical 1", panel: "Panel — TBD", scheduledOn: ymd(3), mode: "Video", rating: 0, recommendation: "", status: "scheduled", feedback: "" },
        ...s.interviews,
      ];
      msg += " · interview scheduled";
    }
    if (next === "offer" && !s.offers.some((o) => o.candidate === c.name)) {
      s.offers = [
        { id: crypto.randomUUID(), code: nextCode("OFR", s.offers.map((x) => String(x.code))), candidate: c.name, position: c.position, grade: "B2", ctc: Number(c.expectedCtc ?? 0), joiningDate: ymd(Number(c.noticeDays ?? 30)), releasedOn: "", status: "draft", acceptance: "—" },
        ...s.offers,
      ];
      msg += " · draft offer created";
    }
    if (next === "hired" && !s.onboarding.some((o) => o.candidate === c.name)) {
      s.onboarding = [
        { id: crypto.randomUUID(), code: nextCode("ONB", s.onboarding.map((x) => String(x.code))), candidate: c.name, joiningDate: ymd(Number(c.noticeDays ?? 30)), buddy: "TBD", documents: "0/11", itAssets: "pending", inductionDone: "no", safetyInduction: "pending", progress: 0, status: "in-progress" },
        ...s.onboarding,
      ];
      c.status = "hired";
      msg += " · onboarding checklist created";
    }
  });
  return msg;
}

/** Travel: approving a travel request auto-creates the booking placeholders. */
export function approveTravel(id: string): string {
  let msg = "Travel approved";
  workforce.update((s) => {
    const t = s.travelRequests.find((x) => x.id === id);
    if (!t) return;
    t.status = "approved";
    const ref = String(t.code);
    if (!s.bookings.some((b) => b.travelRef === ref)) {
      s.bookings = [
        { id: crypto.randomUUID(), code: nextCode("BKG", s.bookings.map((x) => String(x.code))), type: String(t.mode ?? "Cab"), travelRef: ref, vendor: "Travel desk — TBD", detail: `${t.destination} · ${t.fromDate} → ${t.toDate}`, amount: Number(t.estimatedCost ?? 0), bookedOn: ymd(0), status: "hold" },
        ...s.bookings,
      ];
      msg += " · booking request raised with travel desk";
    }
  });
  return msg;
}

/** Safety: converting a near-miss / incident into a hazard-register entry. */
export function escalateToHazard(area: string, description: string, owner: string): string {
  workforce.update((s) => {
    s.hazards = [
      { id: crypto.randomUUID(), code: `HAZ-${s.hazards.length + 1}`.padStart(6, "0"), hazard: description, area, category: "Operational", likelihood: 3, severity: 4, riskScore: 12, control: "To be defined", owner, status: "open" },
      ...s.hazards,
    ];
  });
  return "Added to hazard register";
}

export { iso, ymd };
