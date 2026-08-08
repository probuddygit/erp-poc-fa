/**
 * Engineering / PLM intelligence engine — deterministic analytics grounded in the
 * PLM store. Powers design-maturity scoring, BOM health, ECN impact (where-used)
 * analysis and the AI Engineering Copilot. No network calls, no hallucinations.
 */
import type { PlmState, BomNode, ECN, ECR } from "./types";
import { upsertPlm } from "./store";
import type { AiAction } from "@/components/ai/module-copilot";

const DAY = 86_400_000;
const ageDays = (iso?: string) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / DAY)) : 0);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export interface DesignMaturity {
  score: number;
  rag: "green" | "amber" | "red";
  releasedPct: number;
  bomCoveragePct: number;
  costedPct: number;
  changeBacklog: number;
  reviewPassRate: number;
}

/** Composite design-maturity score across drawing release, BOM coverage and change load. */
export function designMaturity(s: PlmState): DesignMaturity {
  const drawings = s.drawings.length || 1;
  const releasedPct = Math.round((s.drawings.filter((d) => d.status === "Released").length / drawings) * 100);

  const bomItems = new Set(s.bom.map((b) => b.itemCode));
  const makeItems = s.items.filter((i) => i.type !== "Raw Material" && i.type !== "Consumable");
  const bomCoveragePct = makeItems.length
    ? Math.round((makeItems.filter((i) => bomItems.has(i.code)).length / makeItems.length) * 100)
    : 100;

  const costedPct = s.items.length
    ? Math.round((s.items.filter((i) => i.stdCost > 0).length / s.items.length) * 100)
    : 100;

  const changeBacklog =
    s.ecns.filter((e) => e.status === "draft" || e.status === "pending").length +
    s.ecrs.filter((e) => e.status === "draft" || e.status === "under-review").length;

  const done = s.reviews.filter((r) => r.outcome !== "Pending");
  const reviewPassRate = done.length
    ? Math.round((done.filter((r) => r.outcome.startsWith("Passed")).length / done.length) * 100)
    : 100;

  const score = clamp(
    Math.round(
      releasedPct * 0.3 + bomCoveragePct * 0.25 + costedPct * 0.2 + reviewPassRate * 0.15 + clamp(100 - changeBacklog * 8) * 0.1,
    ),
  );
  return {
    score,
    rag: score >= 75 ? "green" : score >= 50 ? "amber" : "red",
    releasedPct,
    bomCoveragePct,
    costedPct,
    changeBacklog,
    reviewPassRate,
  };
}

export interface BomFinding {
  id: string;
  itemCode: string;
  kind: "no-drawing" | "no-cost" | "orphan" | "rev-mismatch" | "deep-nesting" | "single-source";
  message: string;
  severity: "high" | "medium" | "low";
}

/** Structural + data-quality audit of every BOM structure. */
export function bomHealth(s: PlmState): BomFinding[] {
  const out: BomFinding[] = [];
  const drawingByItem = new Map(s.drawings.map((d) => [d.itemCode ?? "", d]));
  const itemByCode = new Map(s.items.map((i) => [i.code, i]));
  const depth = (n: BomNode, guard = 0): number => {
    if (!n.parentId || guard > 12) return 0;
    const p = s.bom.find((x) => x.id === n.parentId);
    return p ? 1 + depth(p, guard + 1) : 0;
  };

  for (const n of s.bom) {
    const item = itemByCode.get(n.itemCode);
    if (n.procurement !== "Buy" && !drawingByItem.has(n.itemCode)) {
      out.push({ id: `${n.id}-dwg`, itemCode: n.itemCode, kind: "no-drawing", severity: "high", message: `${n.itemName} is a make part with no released drawing linked.` });
    }
    if (item && item.stdCost === 0) {
      out.push({ id: `${n.id}-cost`, itemCode: n.itemCode, kind: "no-cost", severity: "medium", message: `${n.itemName} has no standard cost — BOM roll-up will understate project cost.` });
    }
    if (!item) {
      out.push({ id: `${n.id}-orphan`, itemCode: n.itemCode, kind: "orphan", severity: "medium", message: `${n.itemCode} appears in a BOM but is missing from the item master.` });
    }
    if (item && item.rev !== n.rev) {
      out.push({ id: `${n.id}-rev`, itemCode: n.itemCode, kind: "rev-mismatch", severity: "high", message: `BOM uses rev ${n.rev} while the item master is at rev ${item.rev}.` });
    }
    if (depth(n) >= 4) {
      out.push({ id: `${n.id}-deep`, itemCode: n.itemCode, kind: "deep-nesting", severity: "low", message: `${n.itemName} sits ${depth(n)} levels deep — consider a phantom sub-assembly.` });
    }
  }
  const seen = new Set<string>();
  return out.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}

export interface EcnImpact {
  ecn: ECN;
  affectedAssemblies: string[];
  affectedNodes: number;
  drawingsToRevise: number;
  costDelta: number;
  riskScore: number;
  recommendation: string;
}

/** Where-used cascade for a change notice: which parents, drawings and cost move. */
export function ecnImpact(s: PlmState, ecn: ECN): EcnImpact {
  const nodes = s.bom.filter((b) => b.itemCode === ecn.itemCode);
  const parents = new Set<string>();
  const walkUp = (n: BomNode, guard = 0) => {
    if (guard > 12) return;
    const p = n.parentId ? s.bom.find((x) => x.id === n.parentId) : undefined;
    if (p) {
      parents.add(p.itemName);
      walkUp(p, guard + 1);
    }
  };
  nodes.forEach((n) => walkUp(n));

  const item = s.items.find((i) => i.code === ecn.itemCode);
  const qty = nodes.reduce((a, n) => a + n.qty, 0) || 1;
  const costDelta = Math.round((item?.stdCost ?? 0) * qty * 0.08);
  const drawingsToRevise = s.drawings.filter((d) => d.itemCode === ecn.itemCode || parents.has(d.title)).length || nodes.length;

  const riskScore = clamp(
    30 + parents.size * 12 + nodes.length * 6 + (ecn.status === "released" ? 20 : 0) + (ageDays(ecn.createdAt) > 21 ? 15 : 0),
  );
  const recommendation =
    riskScore >= 70
      ? "High cascade risk — stage the change with an effectivity break and re-run design review before release."
      : riskScore >= 40
        ? "Moderate impact — revise affected drawings and notify Procurement of the cost delta."
        : "Low impact — safe to release with standard notification.";

  return {
    ecn,
    affectedAssemblies: [...parents],
    affectedNodes: nodes.length,
    drawingsToRevise,
    costDelta,
    riskScore,
    recommendation,
  };
}

/** Ageing analysis of the change backlog (ECR + ECN). */
export function changeBacklogAging(s: PlmState) {
  const open = [
    ...s.ecns.filter((e) => e.status === "draft" || e.status === "pending").map((e) => ({ code: e.code, title: e.title, age: ageDays(e.createdAt), kind: "ECN" as const, id: e.id })),
    ...s.ecrs.filter((e) => e.status === "draft" || e.status === "under-review").map((e) => ({ code: e.code, title: e.title, age: ageDays(e.createdAt), kind: "ECR" as const, id: e.id })),
  ];
  return open.sort((a, b) => b.age - a.age);
}

/** Predicted release-readiness date per open change, from historical cycle time. */
export function changeVelocity(s: PlmState) {
  const closed = s.ecns.filter((e) => e.status === "approved" || e.status === "released");
  const avgCycle = closed.length ? Math.max(3, Math.round(closed.reduce((a, e) => a + ageDays(e.createdAt), 0) / closed.length)) : 14;
  const open = s.ecns.filter((e) => e.status === "draft" || e.status === "pending");
  const throughput = closed.length ? Math.max(1, Math.round(closed.length / 3)) : 1;
  return {
    avgCycleDays: avgCycle,
    monthlyThroughput: throughput,
    backlogClearMonths: open.length ? Math.round((open.length / throughput) * 10) / 10 : 0,
  };
}

/** Reusability signal — parts used in more than one assembly vs one-off designs. */
export function reuseIndex(s: PlmState) {
  const usage = new Map<string, number>();
  s.bom.forEach((b) => usage.set(b.itemCode, (usage.get(b.itemCode) ?? 0) + 1));
  const total = usage.size || 1;
  const reused = [...usage.values()].filter((v) => v > 1).length;
  return {
    pct: Math.round((reused / total) * 100),
    oneOff: [...usage.entries()].filter(([, v]) => v === 1).map(([k]) => k),
  };
}

/** Ranked next-best actions for the Engineering Copilot, each with a one-click fix. */
export function engineeringActions(s: PlmState): AiAction[] {
  const out: AiAction[] = [];
  const findings = bomHealth(s);
  const maturity = designMaturity(s);
  const aging = changeBacklogAging(s);

  const noDrawing = findings.filter((f) => f.kind === "no-drawing");
  if (noDrawing.length) {
    out.push({
      id: "eng-drawings",
      severity: "high",
      title: `${noDrawing.length} make parts have no released drawing`,
      detail: noDrawing.slice(0, 3).map((f) => f.itemCode).join(", ") + (noDrawing.length > 3 ? ` +${noDrawing.length - 3} more` : ""),
      impact: "Blocks manufacturing release and shop-floor issue",
      cta: "Raise reviews",
      run: () => {
        noDrawing.slice(0, 3).forEach((f, i) => {
          upsertPlm("reviews", {
            code: `DR-AI-${Date.now().toString().slice(-4)}${i}`,
            title: `Drawing release review — ${f.itemCode}`,
            itemCode: f.itemCode,
            reviewers: ["Design Lead", "Manufacturing Engineer"],
            scheduled: new Date(Date.now() + 3 * DAY).toISOString().slice(0, 10),
            outcome: "Pending",
            actions: 1,
          });
        });
        return `Scheduled ${Math.min(3, noDrawing.length)} design reviews for missing drawings`;
      },
    });
  }

  const revMismatch = findings.filter((f) => f.kind === "rev-mismatch");
  if (revMismatch.length) {
    out.push({
      id: "eng-rev",
      severity: "high",
      title: `${revMismatch.length} BOM lines are on a stale revision`,
      detail: revMismatch.slice(0, 3).map((f) => f.message).join(" "),
      impact: "Risk of building to superseded design",
    });
  }

  const noCost = findings.filter((f) => f.kind === "no-cost");
  if (noCost.length) {
    out.push({
      id: "eng-cost",
      severity: "medium",
      title: `${noCost.length} BOM items have no standard cost`,
      detail: "Project cost roll-up and quotation pricing will be understated until costs are set.",
      impact: "Distorts EBOM cost roll-up",
    });
  }

  const stale = aging.filter((a) => a.age > 21);
  if (stale.length) {
    const first = stale[0]!;
    out.push({
      id: "eng-backlog",
      severity: "medium",
      title: `${stale.length} change requests ageing beyond 21 days`,
      detail: `Oldest: ${first.kind} ${first.code} — ${first.title} (${first.age} days).`,
      impact: `Backlog clears in ~${changeVelocity(s).backlogClearMonths} months at current throughput`,
      cta: "Escalate oldest",
      run: () => {
        if (first.kind === "ECR") upsertPlm("ecrs", { id: first.id, status: "under-review", priority: "High" });
        else upsertPlm("ecns", { id: first.id, status: "pending" });
        return `${first.code} escalated for immediate review`;
      },
    });
  }

  const highImpact = s.ecns
    .filter((e) => e.status === "pending" || e.status === "draft")
    .map((e) => ecnImpact(s, e))
    .filter((i) => i.riskScore >= 60)
    .sort((a, b) => b.riskScore - a.riskScore);
  if (highImpact.length) {
    const top = highImpact[0]!;
    out.push({
      id: "eng-ecn-impact",
      severity: "high",
      title: `${top.ecn.code} has a wide where-used cascade`,
      detail: `${top.affectedNodes} BOM lines and ${top.affectedAssemblies.length} parent assemblies affected. ${top.recommendation}`,
      impact: `Estimated cost impact ₹${top.costDelta.toLocaleString("en-IN")}`,
    });
  }

  const pendingReviews = s.reviews.filter((r) => r.outcome === "Pending" && new Date(r.scheduled).getTime() < Date.now());
  if (pendingReviews.length) {
    out.push({
      id: "eng-reviews",
      severity: "medium",
      title: `${pendingReviews.length} design reviews overdue`,
      detail: pendingReviews.slice(0, 3).map((r) => r.code).join(", "),
      impact: "Delays drawing release gate",
    });
  }

  if (maturity.bomCoveragePct < 80) {
    out.push({
      id: "eng-coverage",
      severity: "low",
      title: `BOM coverage at ${maturity.bomCoveragePct}%`,
      detail: "Some assemblies and sub-assemblies in the item master have no BOM structure yet.",
      impact: "MBOM handover to Production will be incomplete",
    });
  }

  return out;
}

export type { ECR };

/* ------------------------------------------------------------------ */
/* AI similarity: duplicate + reuse recommendations                    */
/* ------------------------------------------------------------------ */

const STOP = new Set(["the", "of", "for", "and", "with", "mm", "type", "std"]);
function tokens(s: string) {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}
function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((t) => { if (b.has(t)) inter++; });
  return inter / (a.size + b.size - inter);
}

export interface DuplicateCandidate {
  aCode: string;
  aName: string;
  bCode: string;
  bName: string;
  similarity: number;
  reason: string;
}

/** Find likely duplicate item-master records by code, description and specification overlap. */
export function duplicateItems(s: PlmState, threshold = 0.6): DuplicateCandidate[] {
  const out: DuplicateCandidate[] = [];
  const list = s.items;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!;
      const b = list[j]!;
      const nameSim = jaccard(tokens(a.name), tokens(b.name));
      const sameSpec = a.uom === b.uom && a.type === b.type;
      const costSim = a.stdCost && b.stdCost ? 1 - Math.abs(a.stdCost - b.stdCost) / Math.max(a.stdCost, b.stdCost) : 0;
      const score = nameSim * 0.7 + (sameSpec ? 0.2 : 0) + costSim * 0.1;
      if (nameSim >= 0.45 && score >= threshold) {
        out.push({
          aCode: a.code,
          aName: a.name,
          bCode: b.code,
          bName: b.name,
          similarity: Math.round(score * 100),
          reason: `${Math.round(nameSim * 100)}% description match${sameSpec ? `, same type & UoM` : ""}.`,
        });
      }
    }
  }
  return out.sort((x, y) => y.similarity - x.similarity);
}

/** Recommend an existing item-master record instead of creating a new part. */
export function recommendReuse(s: PlmState, description: string, limit = 5) {
  const t = tokens(description);
  return s.items
    .map((i) => ({ item: i, score: Math.round(jaccard(t, tokens(i.name)) * 100) }))
    .filter((r) => r.score > 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Make vs Buy                                                          */
/* ------------------------------------------------------------------ */

export interface MakeBuyAdvice {
  itemCode: string;
  itemName: string;
  current: "Make" | "Buy";
  recommended: "Make" | "Buy";
  rationale: string;
  savings: number;
}

/** Cost + lead-time + capacity heuristic for each BOM line's sourcing decision. */
export function makeBuyAdvice(s: PlmState, avgVendorLead = 21): MakeBuyAdvice[] {
  const out: MakeBuyAdvice[] = [];
  const seen = new Set<string>();
  for (const n of s.bom) {
    if (seen.has(n.itemCode)) continue;
    seen.add(n.itemCode);
    const item = s.items.find((i) => i.code === n.itemCode);
    if (!item) continue;
    const current = n.procurement ?? item.make_buy;
    const hasChildren = s.bom.some((c) => c.parentId === n.id);
    const buyCost = Math.round(item.stdCost * 1.08);
    const makeCost = Math.round(item.stdCost * (hasChildren ? 0.92 : 1.18));
    let recommended: "Make" | "Buy" = current;
    let rationale = "Current sourcing is optimal on cost and lead time.";
    if (!hasChildren && current === "Make" && makeCost > buyCost) {
      recommended = "Buy";
      rationale = `No sub-structure and in-house cost is ₹${(makeCost - buyCost).toLocaleString("en-IN")} higher — buy from a qualified vendor (${avgVendorLead}-day lead).`;
    } else if (hasChildren && current === "Buy") {
      recommended = "Make";
      rationale = "Item has a multi-level structure already engineered in-house — making it protects IP and saves ~8%.";
    }
    out.push({
      itemCode: item.code,
      itemName: item.name,
      current,
      recommended,
      rationale,
      savings: recommended === current ? 0 : Math.abs(makeCost - buyCost),
    });
  }
  return out.filter((a) => a.recommended !== a.current).concat(out.filter((a) => a.recommended === a.current));
}

/* ------------------------------------------------------------------ */
/* Design risk                                                          */
/* ------------------------------------------------------------------ */

export interface DesignRisk {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  detail: string;
}

/** Risk register derived from document status, change load and review outcomes. */
export function designRisks(s: PlmState): DesignRisk[] {
  const out: DesignRisk[] = [];
  const stale = (s.designDocs ?? []).filter((d) => d.status === "Under Review" && ageDays(d.updatedAt) > 7);
  if (stale.length)
    out.push({
      id: "risk-docs",
      severity: "high",
      title: `${stale.length} design documents stuck in review`,
      detail: stale.map((d) => `${d.code} (${ageDays(d.updatedAt)}d)`).join(", "),
    });

  const failed = s.reviews.filter((r) => r.outcome === "Failed" || r.outcome === "Passed with Actions");
  if (failed.length)
    out.push({
      id: "risk-reviews",
      severity: "medium",
      title: `${failed.length} reviews closed with open actions`,
      detail: failed.map((r) => r.code).join(", "),
    });

  const untagged = s.bom.filter((b) => !b.parentId && !b.projectCode);
  if (untagged.length)
    out.push({
      id: "risk-untagged",
      severity: "medium",
      title: `${untagged.length} BOM structures are not tagged to a project`,
      detail: "Cost, procurement and inventory traceability cannot be established until a project is linked.",
    });

  const dupes = duplicateItems(s);
  if (dupes.length)
    out.push({
      id: "risk-dupes",
      severity: "low",
      title: `${dupes.length} potential duplicate item records`,
      detail: dupes.slice(0, 3).map((d) => `${d.aCode} ≈ ${d.bCode}`).join(", "),
    });

  return out;
}
