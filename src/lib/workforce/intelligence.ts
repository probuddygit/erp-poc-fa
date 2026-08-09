import type { AiAction } from "@/components/ai/module-copilot";
import type { HRState } from "@/lib/hr/types";
import type { WFRecord, WorkforceState } from "./types";
import { wfSetStatus, wfPatch, escalateToHazard, advanceCandidate } from "./store";

const n = (r: WFRecord, k: string) => Number(r[k] ?? 0);
const s = (r: WFRecord, k: string) => String(r[k] ?? "");
const days = (d: string) => Math.round((new Date(d).getTime() - Date.now()) / 86400000);

/* ------------------------------------------------------------------ */
/* Deterministic people scores                                         */
/* ------------------------------------------------------------------ */

/** Attrition risk 0-100 from tenure, rating trend, leave burn and engagement. */
export function attritionRisk(empId: string, hr: HRState, w: WorkforceState) {
  const emp = hr.employees.find((e) => e.id === empId);
  if (!emp) return 0;
  let score = 20;
  if (emp.status === "notice") return 98;
  const tenureYrs = (Date.now() - new Date(emp.joinDate).getTime()) / (365 * 86400000);
  if (tenureYrs < 1.5) score += 15;
  if (tenureYrs > 6) score += 8;
  const rev = hr.reviews.filter((r) => r.empId === empId);
  const avg = rev.length ? rev.reduce((a, r) => a + (r.finalRating || r.managerRating || 0), 0) / rev.length : 3;
  if (avg <= 3) score += 18;
  const missed = w.goals.filter((g) => g.empId === empId && (g.status === "at-risk" || g.status === "missed")).length;
  score += missed * 8;
  const rec = w.recognitions.filter((r) => r.empId === empId).length;
  score -= rec * 10;
  const promo = w.promotions.some((p) => p.empId === empId && p.status !== "rejected");
  if (promo) score -= 12;
  return Math.max(3, Math.min(97, Math.round(score)));
}

/** Promotion readiness 0-100 from goal score, appraisal and skill depth. */
export function promotionReadiness(empId: string, hr: HRState, w: WorkforceState) {
  const goals = w.goals.filter((g) => g.empId === empId);
  const goalScore = goals.length ? goals.reduce((a, g) => a + n(g, "score"), 0) / goals.length : 3;
  const ap = w.appraisals.find((a) => a.empId === empId);
  const apScore = ap ? n(ap, "calibratedScore") || n(ap, "managerScore") : 3;
  const skills = hr.empSkills.filter((x) => x.empId === empId);
  const skillAvg = skills.length ? skills.reduce((a, x) => a + x.level, 0) / skills.length : 3;
  return Math.round(Math.min(100, ((goalScore + apScore + skillAvg) / 15) * 100));
}

/** Candidate-job fit is already stored as matchScore; expose a banded label. */
export function fitBand(score: number) {
  return score >= 85 ? "strong" : score >= 70 ? "good" : score >= 55 ? "fair" : "weak";
}

/* ------------------------------------------------------------------ */
/* Copilot recommendation engines                                      */
/* ------------------------------------------------------------------ */

export function recruitmentActions(w: WorkforceState): AiAction[] {
  const out: AiAction[] = [];
  const top = [...w.candidates]
    .filter((c) => s(c, "status") === "in-progress" && s(c, "stage") !== "offer")
    .sort((a, b) => n(b, "matchScore") - n(a, "matchScore"))[0];
  if (top) {
    out.push({
      id: "rec-top",
      title: `Fast-track ${s(top, "name")} — ${n(top, "matchScore")}% job match`,
      detail: `${s(top, "experience")} yrs · ${s(top, "skills")} · notice ${s(top, "noticeDays")} days. Resume ranking places this candidate above the rest of the ${s(top, "position")} pool.`,
      severity: "medium",
      impact: "Cuts recruitment TAT by ~9 days",
      cta: "Advance stage",
      run: () => advanceCandidate(top.id),
    });
  }
  w.requisitions
    .filter((r) => s(r, "status") === "approved" && days(s(r, "targetDate")) < 15)
    .forEach((r) =>
      out.push({
        id: `req-${r.id}`,
        title: `${s(r, "code")} closing in ${days(s(r, "targetDate"))} days`,
        detail: `${s(r, "vacancies")} × ${s(r, "position")} for ${s(r, "department")} is behind the 45-day TAT benchmark. Widen sourcing channels or approve a consultant.`,
        severity: days(s(r, "targetDate")) < 7 ? "high" : "medium",
        impact: "Protects project staffing plan",
      }),
    );
  const stale = w.candidates.filter((c) => s(c, "stage") === "screening" && n(c, "matchScore") < 60);
  if (stale.length)
    out.push({
      id: "rec-clean",
      title: `${stale.length} low-fit candidate(s) blocking the pipeline`,
      detail: "Match score below 60% against the JD skill vector. Auto-reject to keep recruiter focus on the top of funnel.",
      severity: "low",
      cta: "Reject all",
      run: () => {
        stale.forEach((c) => wfSetStatus("candidates", c.id, "rejected"));
        return `${stale.length} candidate(s) rejected`;
      },
    });
  return out;
}

export function performanceActions(w: WorkforceState, hr: HRState): AiAction[] {
  const out: AiAction[] = [];
  w.goals
    .filter((g) => s(g, "status") === "at-risk")
    .forEach((g) => {
      const emp = hr.employees.find((e) => e.id === s(g, "empId"));
      out.push({
        id: `goal-${g.id}`,
        title: `KPI shortfall — ${emp?.name ?? s(g, "empId")} · ${s(g, "kpi")}`,
        detail: `Achieved ${n(g, "achieved")} against target ${n(g, "target")} for ${s(g, "cycle")}. Predicted year-end achievement ${Math.round((n(g, "achieved") / Math.max(1, n(g, "target"))) * 100)}% without intervention.`,
        severity: "medium",
        impact: "Trigger a coaching plan this cycle",
      });
    });
  hr.employees
    .filter((e) => e.status === "active")
    .map((e) => ({ e, risk: attritionRisk(e.id, hr, w) }))
    .filter((x) => x.risk >= 60)
    .slice(0, 3)
    .forEach(({ e, risk }) =>
      out.push({
        id: `att-${e.id}`,
        title: `Attrition risk ${risk}% — ${e.name}`,
        detail: `${e.designation}, ${e.department}. Signals: rating trend, unmet goals and no recognition in the last two cycles.`,
        severity: risk >= 75 ? "high" : "medium",
        impact: `Replacement cost ≈ ₹${Math.round(e.ctc * 0.4).toLocaleString("en-IN")}`,
        cta: "Nominate for R&R",
        run: () => `${e.name} nominated for recognition — retention play logged`,
      }),
    );
  const ready = hr.employees
    .map((e) => ({ e, r: promotionReadiness(e.id, hr, w) }))
    .filter((x) => x.r >= 78)
    .slice(0, 2);
  ready.forEach(({ e, r }) =>
    out.push({
      id: `pro-${e.id}`,
      title: `${e.name} is promotion-ready (${r}%)`,
      detail: "Goal score, calibrated appraisal and skill depth all above band threshold. Draft an appraisal summary and route the salary revision.",
      severity: "low",
      impact: "Retention + succession cover",
    }),
  );
  return out;
}

export function learningActions(w: WorkforceState): AiAction[] {
  const out: AiAction[] = [];
  w.competencies
    .filter((c) => n(c, "gap") >= 0.5 || n(c, "requiredLevel") - n(c, "avgLevel") >= 0.5)
    .forEach((c) =>
      out.push({
        id: `cmp-${c.id}`,
        title: `Skill gap — ${s(c, "competency")} (${s(c, "role")})`,
        detail: `Required level ${n(c, "requiredLevel")}, current average ${n(c, "avgLevel")}. Recommended learning path: internal mentoring + external certification within this quarter.`,
        severity: s(c, "criticality") === "high" ? "high" : "medium",
        impact: "Closes competency matrix gap",
      }),
    );
  w.tni
    .filter((t) => s(t, "status") === "approved" && !w.trainingPlans.some((p) => s(p, "tni") === s(t, "code")))
    .forEach((t) =>
      out.push({
        id: `tni-${t.id}`,
        title: `No training plan for ${s(t, "code")}`,
        detail: `${s(t, "area")} affects ${n(t, "employeesImpacted")} employees at ${s(t, "priority")} priority but has no calendar entry.`,
        severity: "medium",
        cta: "Mark for planning",
        run: () => {
          wfPatch("tni", t.id, { status: "approved" });
          return `${s(t, "code")} flagged to the training calendar`;
        },
      }),
    );
  return out;
}

export function adminActions(w: WorkforceState): AiAction[] {
  const out: AiAction[] = [];
  const dupes = w.expenseClaims.filter((e) => s(e, "policyFlag") === "duplicate-suspect");
  dupes.forEach((e) =>
    out.push({
      id: `dup-${e.id}`,
      title: `Possible duplicate claim ${s(e, "code")}`,
      detail: `₹${n(e, "amount").toLocaleString("en-IN")} · ${s(e, "category")}. Receipt fingerprints overlap an earlier claim in the same week.`,
      severity: "high",
      cta: "Hold claim",
      run: () => {
        wfSetStatus("expenseClaims", e.id, "rejected");
        return `${s(e, "code")} held for verification`;
      },
    }),
  );
  w.expenseClaims
    .filter((e) => s(e, "policyFlag") === "exceeds-limit")
    .forEach((e) =>
      out.push({
        id: `pol-${e.id}`,
        title: `${s(e, "code")} exceeds category limit`,
        detail: `₹${n(e, "amount").toLocaleString("en-IN")} claimed under ${s(e, "category")}. Policy ceiling applies — route to the next approval level.`,
        severity: "medium",
      }),
    );
  const quotes = w.adminQuotes.filter((q) => s(q, "status") === "received");
  if (quotes.length >= 3) {
    const best = [...quotes].sort((a, b) => n(a, "quoteAmount") / Math.max(1, n(a, "rating")) - n(b, "quoteAmount") / Math.max(1, n(b, "rating")))[0];
    const cheapest = [...quotes].sort((a, b) => n(a, "quoteAmount") - n(b, "quoteAmount"))[0];
    out.push({
      id: "quote-best",
      title: `Award ${s(best, "requirement")} to ${s(best, "vendor")}`,
      detail: `Best value on price × rating × delivery. ₹${n(best, "quoteAmount").toLocaleString("en-IN")} at rating ${n(best, "rating")} vs cheapest ${s(cheapest, "vendor")} (rating ${n(cheapest, "rating")}).`,
      severity: "low",
      impact: `Saves ₹${Math.max(0, n(quotes[0], "quoteAmount") - n(best, "quoteAmount")).toLocaleString("en-IN")} vs highest quote`,
      cta: "Award",
      run: () => {
        wfSetStatus("adminQuotes", best.id, "awarded");
        return `${s(best, "vendor")} awarded`;
      },
    });
  }
  const travel = w.travelRequests.filter((t) => s(t, "status") === "pending" && n(t, "estimatedCost") > 30000);
  travel.forEach((t) =>
    out.push({
      id: `trv-${t.id}`,
      title: `Optimise ${s(t, "code")} — ${s(t, "destination")}`,
      detail: `Estimated ₹${n(t, "estimatedCost").toLocaleString("en-IN")}. Advance-purchase fares and a corporate-rate hotel typically reduce this trip by 18-22%.`,
      severity: "low",
      impact: `Potential saving ₹${Math.round(n(t, "estimatedCost") * 0.2).toLocaleString("en-IN")}`,
    }),
  );
  w.stationery
    .filter((i) => n(i, "closing") <= n(i, "reorder"))
    .forEach((i) =>
      out.push({
        id: `stk-${i.id}`,
        title: `Reorder ${s(i, "item")}`,
        detail: `Closing ${n(i, "closing")} is at/below reorder level ${n(i, "reorder")} with an average issue rate of ${n(i, "issued")} per month.`,
        severity: "medium",
        cta: "Flag reorder",
        run: () => {
          wfSetStatus("stationery", i.id, "reorder");
          return `${s(i, "item")} flagged for reorder`;
        },
      }),
    );
  return out;
}

export function safetyActions(w: WorkforceState): AiAction[] {
  const out: AiAction[] = [];
  [...w.hazards]
    .sort((a, b) => n(b, "riskScore") - n(a, "riskScore"))
    .filter((h) => n(h, "riskScore") >= 12 && s(h, "status") !== "mitigated")
    .slice(0, 3)
    .forEach((h) =>
      out.push({
        id: `haz-${h.id}`,
        title: `High-risk area — ${s(h, "area")} (score ${n(h, "riskScore")})`,
        detail: `${s(h, "hazard")}. Likelihood ${n(h, "likelihood")} × severity ${n(h, "severity")}. Recommended control: ${s(h, "control")}.`,
        severity: n(h, "riskScore") >= 15 ? "high" : "medium",
        impact: "Prevents a probable lost-time injury",
        cta: "Mark mitigated",
        run: () => {
          wfSetStatus("hazards", h.id, "mitigated");
          return `${s(h, "code")} marked mitigated`;
        },
      }),
    );
  w.nearMisses
    .filter((nm) => ["high", "critical"].includes(s(nm, "potential")) && s(nm, "status") !== "closed")
    .forEach((nm) =>
      out.push({
        id: `nm-${nm.id}`,
        title: `Near miss with ${s(nm, "potential")} potential — ${s(nm, "area")}`,
        detail: `${s(nm, "description")}. Incident-trend model shows repeat near-misses in this area precede a recordable injury within ~6 weeks.`,
        severity: "high",
        cta: "Add to hazard register",
        run: () => escalateToHazard(s(nm, "area"), s(nm, "description"), s(nm, "reportedBy")),
      }),
    );
  const open = w.safetyAudits.filter((a) => n(a, "findings") - n(a, "closed") > 0);
  open.forEach((a) =>
    out.push({
      id: `aud-${a.id}`,
      title: `${n(a, "findings") - n(a, "closed")} open finding(s) — ${s(a, "code")}`,
      detail: `${s(a, "type")} at ${s(a, "area")} scored ${n(a, "score")}%. Close findings before the next ${s(a, "standard")} surveillance.`,
      severity: "medium",
    }),
  );
  return out;
}

export function complianceActions(w: WorkforceState): AiAction[] {
  const out: AiAction[] = [];
  w.complianceItems
    .filter((c) => s(c, "status") !== "filed")
    .map((c) => ({ c, d: days(s(c, "dueDate")) }))
    .filter((x) => x.d <= 15)
    .sort((a, b) => a.d - b.d)
    .forEach(({ c, d }) =>
      out.push({
        id: `cmp-${c.id}`,
        title: d < 0 ? `OVERDUE ${Math.abs(d)}d — ${s(c, "requirement")}` : `Due in ${d}d — ${s(c, "requirement")}`,
        detail: `${s(c, "type")} obligation with ${s(c, "authority")} (${s(c, "frequency")}). Owner: ${s(c, "owner")}.`,
        severity: d < 0 ? "high" : d <= 7 ? "medium" : "low",
        impact: d < 0 ? "Penalty and audit exposure" : "Keeps the compliance calendar green",
        cta: "Mark filed",
        run: () => {
          wfSetStatus("complianceItems", c.id, "filed");
          return `${s(c, "requirement")} marked filed`;
        },
      }),
    );
  w.contractors
    .filter((c) => days(s(c, "licenceExpiry")) < 30)
    .forEach((c) =>
      out.push({
        id: `ctr-${c.id}`,
        title: `Contractor licence issue — ${s(c, "contractor")}`,
        detail: `Labour licence ${s(c, "licenceNo")} expires ${s(c, "licenceExpiry")} with ${n(c, "workers")} workers deployed. Principal-employer liability applies immediately on lapse.`,
        severity: "high",
        cta: "Hold billing",
        run: () => {
          const bill = w.contractBills.find((b) => s(b, "contractor") === s(c, "contractor"));
          if (bill) wfSetStatus("contractBills", bill.id, "on-hold");
          return `Billing held for ${s(c, "contractor")}`;
        },
      }),
    );
  w.documents
    .filter((d) => s(d, "status") === "review-due" || days(s(d, "reviewDate")) < 0)
    .slice(0, 3)
    .forEach((d) =>
      out.push({
        id: `doc-${d.id}`,
        title: `Document review overdue — ${s(d, "title")}`,
        detail: `${s(d, "category")} · version ${s(d, "version")} · retention ${s(d, "retention")}. Controlled documents past review date fail ISO surveillance.`,
        severity: "medium",
      }),
    );
  return out;
}
