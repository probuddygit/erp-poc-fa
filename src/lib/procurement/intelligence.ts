/**
 * Procurement intelligence engine — deterministic supplier scoring, lead-time
 * prediction, spend concentration, PO risk and 3-way-match analytics grounded in
 * the procurement store. Powers the AI Procurement Copilot.
 */
import type { ProcurementState, Vendor, PurchaseOrder } from "./types";
import { setRequisitionStatus, awardBid, upsertProcurement } from "./store";
import type { AiAction } from "@/components/ai/module-copilot";

const DAY = 86_400_000;
const days = (iso?: string) => (iso ? Math.round((Date.now() - new Date(iso).getTime()) / DAY) : 0);
const until = (iso?: string) => (iso ? Math.round((new Date(iso).getTime() - Date.now()) / DAY) : 0);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export interface VendorScore {
  vendor: Vendor;
  score: number;
  rag: "green" | "amber" | "red";
  delivery: number;
  quality: number;
  responsiveness: number;
  predictedLeadTime: number;
  openValue: number;
  riskFlags: string[];
}

/** Composite supplier scorecard: delivery, quality, responsiveness and risk flags. */
export function vendorScorecards(s: ProcurementState): VendorScore[] {
  return s.vendors
    .map((v) => {
      const pos = s.pos.filter((p) => p.vendorId === v.id);
      const late = pos.filter((p) => until(p.promisedDate) < 0 && !["received", "closed", "cancelled"].includes(p.status));
      const openValue = pos.filter((p) => !["closed", "cancelled"].includes(p.status)).reduce((a, p) => a + (p.amount - p.received), 0);
      const grns = s.grns.filter((g) => g.vendorName === v.name);
      const rejected = grns.reduce((a, g) => a + g.lines.reduce((x, l) => x + l.rejectedQty, 0), 0);
      const received = grns.reduce((a, g) => a + g.lines.reduce((x, l) => x + l.receivedQty, 0), 0) || 1;

      const delivery = clamp(Math.round(v.onTimePct - late.length * 6));
      const quality = clamp(Math.round(Math.min(v.qualityPct, 100 - (rejected / received) * 100)));
      const bids = s.rfqs.flatMap((r) => r.bids.filter((b) => b.vendorId === v.id));
      const responsiveness = clamp(bids.length ? Math.round(bids.reduce((a, b) => a + b.score, 0) / bids.length) : 60);

      // Predicted lead time = catalogue lead time adjusted by observed lateness.
      const slip = late.length ? Math.round(late.reduce((a, p) => a + Math.abs(until(p.promisedDate)), 0) / late.length) : 0;
      const predictedLeadTime = v.leadTimeDays + Math.round(slip * 0.6);

      const riskFlags: string[] = [];
      if (v.qualification === "blacklisted") riskFlags.push("Blacklisted");
      if (v.qualification === "in-review") riskFlags.push("Qualification pending");
      if (late.length) riskFlags.push(`${late.length} overdue PO${late.length > 1 ? "s" : ""}`);
      if (v.certifications.length === 0) riskFlags.push("No certifications on file");
      if (openValue > 2_000_000) riskFlags.push("High open exposure");

      const score = clamp(Math.round(delivery * 0.4 + quality * 0.35 + responsiveness * 0.25 - riskFlags.length * 3));
      return {
        vendor: v,
        score,
        rag: score >= 80 ? "green" : score >= 60 ? "amber" : "red",
        delivery,
        quality,
        responsiveness,
        predictedLeadTime,
        openValue,
        riskFlags,
      } as VendorScore;
    })
    .sort((a, b) => b.score - a.score);
}

export interface PoRisk {
  po: PurchaseOrder;
  risk: number;
  daysLate: number;
  reason: string;
}

/** Delivery-risk prediction per open PO, using vendor reliability and promise dates. */
export function poRisks(s: ProcurementState): PoRisk[] {
  const scores = new Map(vendorScorecards(s).map((v) => [v.vendor.id, v]));
  return s.pos
    .filter((p) => !["received", "closed", "cancelled"].includes(p.status))
    .map((p) => {
      const sc = scores.get(p.vendorId);
      const left = until(p.promisedDate);
      const fulfilled = p.amount ? p.received / p.amount : 0;
      let risk = clamp(Math.round(60 - (sc?.delivery ?? 60) * 0.5 + (left < 0 ? 45 : left < 7 ? 20 : 0) + (fulfilled < 0.3 ? 15 : 0)));
      if (p.status === "draft" || p.status === "pending") risk = clamp(risk + 10);
      const reason =
        left < 0
          ? `Overdue by ${Math.abs(left)} days with ${Math.round(fulfilled * 100)}% received`
          : left < 7
            ? `Due in ${left} days, only ${Math.round(fulfilled * 100)}% received`
            : `Vendor on-time performance ${sc?.delivery ?? 0}%`;
      return { po: p, risk, daysLate: left < 0 ? Math.abs(left) : 0, reason };
    })
    .sort((a, b) => b.risk - a.risk);
}

/** Spend concentration (share held by the top vendors) and single-source exposure. */
export function spendConcentration(s: ProcurementState) {
  const total = s.vendors.reduce((a, v) => a + v.spendYtd, 0) || 1;
  const sorted = [...s.vendors].sort((a, b) => b.spendYtd - a.spendYtd);
  const top3 = sorted.slice(0, 3).reduce((a, v) => a + v.spendYtd, 0);
  const byCategory = new Map<string, number>();
  s.vendors.forEach((v) => byCategory.set(v.category, (byCategory.get(v.category) ?? 0) + 1));
  const singleSource = [...byCategory.entries()].filter(([, n]) => n === 1).map(([c]) => c);
  return { total, top3Pct: Math.round((top3 / total) * 100), singleSource, leader: sorted[0] };
}

/** Negotiation savings opportunities from RFQ bid spread. */
export function savingsOpportunities(s: ProcurementState) {
  return s.rfqs
    .filter((r) => r.bids.length >= 2)
    .map((r) => {
      const amounts = r.bids.map((b) => b.amount);
      const low = Math.min(...amounts);
      const high = Math.max(...amounts);
      const best = r.bids.slice().sort((a, b) => b.score - a.score)[0]!;
      const cheapest = r.bids.slice().sort((a, b) => a.amount - b.amount)[0]!;
      return { rfq: r, low, high, spread: high - low, spreadPct: Math.round(((high - low) / (high || 1)) * 100), best, cheapest };
    })
    .sort((a, b) => b.spread - a.spread);
}

/** 3-way match exceptions: receipts with no invoice, holds and quality blocks. */
export function matchExceptions(s: ProcurementState) {
  return s.grns
    .filter((g) => g.invoiceMatch === "unmatched" || g.invoiceMatch === "hold" || g.status === "quality-hold")
    .map((g) => ({
      grn: g,
      reason:
        g.status === "quality-hold"
          ? "Held in quality inspection"
          : g.invoiceMatch === "hold"
            ? "Invoice value mismatch against PO"
            : "No supplier invoice received",
      ageDays: days(g.receivedAt),
    }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

/** Requisition cycle-time analytics — approval load and ageing. */
export function requisitionCycle(s: ProcurementState) {
  const pending = s.requisitions.filter((r) => r.status === "pending");
  const converted = s.requisitions.filter((r) => r.status === "converted");
  const avgApprovalDays = pending.length ? Math.round(pending.reduce((a, r) => a + days(r.createdAt), 0) / pending.length) : 0;
  return {
    pending,
    avgApprovalDays,
    conversionPct: s.requisitions.length ? Math.round((converted.length / s.requisitions.length) * 100) : 0,
    valueAwaiting: pending.reduce((a, r) => a + r.totalEst, 0),
  };
}

/** Ranked next-best actions for the Procurement Copilot, each with a one-click fix. */
export function procurementActions(s: ProcurementState): AiAction[] {
  const out: AiAction[] = [];
  const risks = poRisks(s);
  const scores = vendorScorecards(s);
  const cycle = requisitionCycle(s);
  const savings = savingsOpportunities(s);
  const exceptions = matchExceptions(s);
  const conc = spendConcentration(s);

  const overdue = risks.filter((r) => r.daysLate > 0);
  if (overdue.length) {
    const top = overdue[0]!;
    out.push({
      id: "proc-overdue",
      severity: "high",
      title: `${overdue.length} purchase orders past their promised date`,
      detail: `Worst: ${top.po.code} (${top.po.vendorName}) — ${top.reason}.`,
      impact: `₹${overdue.reduce((a, r) => a + (r.po.amount - r.po.received), 0).toLocaleString("en-IN")} of value at risk`,
      cta: "Expedite",
      run: () => {
        upsertProcurement("pos", { id: top.po.id, status: "acknowledged", promisedDate: new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10) });
        return `${top.po.code} expedited — vendor re-committed to a 7-day window`;
      },
    });
  }

  const highValuePending = cycle.pending.slice().sort((a, b) => b.totalEst - a.totalEst)[0];
  if (highValuePending) {
    out.push({
      id: "proc-approve",
      severity: cycle.avgApprovalDays > 5 ? "high" : "medium",
      title: `${cycle.pending.length} requisitions awaiting approval`,
      detail: `₹${cycle.valueAwaiting.toLocaleString("en-IN")} held up, averaging ${cycle.avgApprovalDays} days in queue. Largest: ${highValuePending.code} — ${highValuePending.title}.`,
      impact: "Each approval day pushes material availability by one day",
      cta: "Approve largest",
      run: () => {
        setRequisitionStatus(highValuePending.id, "approved");
        return `${highValuePending.code} approved and released to sourcing`;
      },
    });
  }

  const toAward = s.rfqs.filter((r) => r.status === "responses" || r.status === "evaluating").filter((r) => r.bids.length);
  if (toAward.length) {
    const rfq = toAward[0]!;
    const winner = rfq.bids.slice().sort((a, b) => b.score - a.score)[0]!;
    out.push({
      id: "proc-award",
      severity: "medium",
      title: `${toAward.length} RFQs ready for award decision`,
      detail: `${rfq.code} — recommended vendor ${winner.vendorName} (score ${winner.score}, ₹${winner.amount.toLocaleString("en-IN")}, ${winner.leadTimeDays} day lead time).`,
      impact: "Recommendation weighs price, lead time and past delivery performance",
      cta: "Award",
      run: () => {
        awardBid(rfq.id, winner.vendorId);
        return `${rfq.code} awarded to ${winner.vendorName}`;
      },
    });
  }

  const bigSaving = savings.find((x) => x.spreadPct >= 10);
  if (bigSaving) {
    out.push({
      id: "proc-savings",
      severity: "medium",
      title: `Negotiation headroom on ${bigSaving.rfq.code}`,
      detail: `Bid spread of ₹${bigSaving.spread.toLocaleString("en-IN")} (${bigSaving.spreadPct}%) between ${bigSaving.cheapest.vendorName} and the highest quote.`,
      impact: `Potential saving ₹${bigSaving.spread.toLocaleString("en-IN")} if benchmarked to lowest compliant bid`,
    });
  }

  if (exceptions.length) {
    const top = exceptions[0]!;
    out.push({
      id: "proc-match",
      severity: "high",
      title: `${exceptions.length} goods receipts failing 3-way match`,
      detail: `Oldest: ${top.grn.code} (${top.grn.vendorName}) — ${top.reason}, ${top.ageDays} days open.`,
      impact: "Blocks invoice booking and distorts payables ageing",
      cta: "Chase invoice",
      run: () => {
        upsertProcurement("grns", { id: top.grn.id, invoiceMatch: "matched" });
        return `${top.grn.code} flagged as matched pending finance verification`;
      },
    });
  }

  const weak = scores.filter((v) => v.rag === "red" && v.vendor.qualification !== "blacklisted");
  if (weak.length) {
    const v = weak[0]!;
    out.push({
      id: "proc-vendor",
      severity: "medium",
      title: `${weak.length} suppliers scoring below threshold`,
      detail: `${v.vendor.name}: delivery ${v.delivery}%, quality ${v.quality}%, predicted lead time ${v.predictedLeadTime} days. ${v.riskFlags.join(" · ")}`,
      impact: "Recommend dual-sourcing or a conditional qualification review",
      cta: "Flag for review",
      run: () => {
        upsertProcurement("vendors", { id: v.vendor.id, qualification: "in-review" });
        return `${v.vendor.name} moved to qualification review`;
      },
    });
  }

  if (conc.top3Pct >= 60 && conc.leader) {
    out.push({
      id: "proc-conc",
      severity: "low",
      title: `Spend concentrated — top 3 vendors hold ${conc.top3Pct}%`,
      detail: `${conc.leader.name} alone carries the largest share.${conc.singleSource.length ? ` Single-source categories: ${conc.singleSource.join(", ")}.` : ""}`,
      impact: "Supply continuity risk — develop an alternate source",
    });
  }

  return out;
}
