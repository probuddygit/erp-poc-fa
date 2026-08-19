/**
 * Manufacturing intelligence — deterministic, grounded recommendations for the
 * shop-floor copilot. Every action reads live store data and, where sensible,
 * can be applied in one click.
 */
import type { AiAction, AiMetric } from "@/components/ai/module-copilot";
import { mfg } from "./store";
import type { MfgState } from "./types";
import { capacityLoad, scheduleShop, applySchedule, orderShortages, importEngineeringDemand } from "./planning";
import { releaseOrder } from "./execution";
import { oeeByWorkCenter, downtimePareto, shopKpis } from "./oee";
import { upsertQuality } from "@/lib/quality/store";
import { plmStore } from "@/lib/plm/store";

const inr = (n: number) =>
  n >= 10_000_000 ? `₹${(n / 10_000_000).toFixed(2)} Cr` : n >= 100_000 ? `₹${(n / 100_000).toFixed(1)} L` : `₹${Math.round(n).toLocaleString("en-IN")}`;

export function manufacturingMetrics(s: MfgState): AiMetric[] {
  const k = shopKpis(s);
  const load = capacityLoad(s);
  const bottleneck = [...load].sort((a, b) => b.utilisationPct - a.utilisationPct)[0];
  return [
    { label: "Open orders", value: String(k.openOrders), sub: `${k.inProgress} running on the floor` },
    { label: "Late orders", value: String(k.late), sub: "past due date", warn: k.late > 0 },
    { label: "Avg OEE", value: `${k.avgOee}%`, sub: "last 7 days", good: k.avgOee >= 75, warn: k.avgOee < 60 },
    { label: "Scrap rate", value: `${k.scrapRate}%`, sub: "good vs scrap reported", warn: k.scrapRate > 3 },
    { label: "WIP value", value: inr(k.wipValue), sub: "material + conversion" },
    {
      label: "Bottleneck",
      value: bottleneck ? `${bottleneck.utilisationPct}%` : "—",
      sub: bottleneck?.name ?? "No load",
      warn: (bottleneck?.utilisationPct ?? 0) > 95,
    },
  ];
}

export function manufacturingActions(s: MfgState): AiAction[] {
  const actions: AiAction[] = [];
  const today = new Date().toISOString().slice(0, 10);

  /* 1 — uncovered engineering demand */
  const uncovered = (plmStore.get().workOrders ?? []).filter(
    (w) => w.status !== "cancelled" && w.status !== "completed" && !s.orders.some((o) => o.sourceWoCode === w.code),
  );
  if (uncovered.length) {
    actions.push({
      id: "import-demand",
      title: `${uncovered.length} engineering work order(s) not yet on the shop plan`,
      detail: `MBOM automation created ${uncovered.map((w) => w.code).slice(0, 4).join(", ")} but they have no manufacturing order, routing or capacity booked.`,
      severity: "high",
      impact: "Closes the Engineering → Manufacturing handover gap",
      cta: "Pull into plan",
      run: () => {
        const r = importEngineeringDemand();
        return `${r.created.length} manufacturing order(s) created from Engineering demand.`;
      },
    });
  }

  /* 2 — schedule risk */
  const plan = scheduleShop(s);
  const lateOrders = new Set(plan.filter((p) => p.late).map((p) => p.orderCode));
  if (lateOrders.size) {
    actions.push({
      id: "reschedule",
      title: `${lateOrders.size} order(s) will miss the due date at current capacity`,
      detail: `Finite-capacity simulation shows ${[...lateOrders].slice(0, 4).join(", ")} finishing after their promise date. Re-sequencing by priority and due date recovers the earliest ones.`,
      severity: "high",
      impact: "Protects project delivery milestones",
      cta: "Apply optimised schedule",
      run: () => {
        const r = applySchedule("Manufacturing Copilot");
        return `Schedule applied to ${r.updated} order(s); ${r.late} still at risk and need capacity or scope action.`;
      },
    });
  }

  /* 3 — bottleneck */
  const load = capacityLoad(s);
  const hot = load.filter((l) => l.utilisationPct > 95).sort((a, b) => b.utilisationPct - a.utilisationPct)[0];
  if (hot) {
    actions.push({
      id: `bottleneck-${hot.workCenterCode}`,
      title: `${hot.name} is loaded to ${hot.utilisationPct}% of capacity`,
      detail: `${hot.loadHrs} h of work against ${hot.capacityHrs} h available across ${hot.orders} order(s). Adding a shift or sub-contracting the paint/finishing content relieves the queue.`,
      severity: hot.utilisationPct > 120 ? "high" : "medium",
      impact: `${Math.max(0, hot.loadHrs - hot.capacityHrs)} h over capacity`,
    });
  }

  /* 4 — material shortages blocking release */
  const blocked = s.orders
    .filter((o) => o.status === "planned" || o.status === "released")
    .map((o) => ({ order: o, gaps: orderShortages(o) }))
    .filter((x) => x.gaps.length);
  if (blocked.length) {
    const first = blocked[0];
    actions.push({
      id: "shortage",
      title: `${blocked.length} order(s) blocked by material shortage`,
      detail: `${first.order.code} (${first.order.itemName}) is short on ${first.gaps.length} line(s) worth ${inr(first.gaps.reduce((a, g) => a + g.value, 0))}. Releasing raises a purchase requisition automatically for the Buy lines.`,
      severity: "high",
      impact: "Prevents shop-floor idle time",
      cta: `Release ${first.order.code}`,
      run: () => releaseOrder(first.order.id).message,
    });
  }

  /* 5 — downtime root cause */
  const pareto = downtimePareto(s);
  if (pareto.length && pareto[0].sharePct >= 25) {
    const top = pareto[0];
    actions.push({
      id: "downtime",
      title: `${top.reason} drives ${top.sharePct}% of all downtime`,
      detail: `${top.mins} minutes lost across ${top.events} event(s) in the last fortnight. Raising a CAPA assigns the root-cause investigation and links corrective actions back to the shop floor.`,
      severity: top.sharePct > 40 ? "high" : "medium",
      impact: `${Math.round(top.mins / 60)} h of capacity recoverable`,
      cta: "Raise CAPA",
      run: () => {
        const code = `CAPA-${Math.floor(700 + Math.random() * 200)}`;
        upsertQuality("capas", {
          code,
          title: `Reduce downtime — ${top.reason}`,
          owner: "Production Head",
          team: ["Production", "Maintenance"],
          openedAt: new Date().toISOString(),
          targetClose: new Date(Date.now() + 21 * 86_400_000).toISOString(),
          stage: "D1",
          status: "open",
          effectivenessPct: 0,
          rootCause: `${top.reason} accounts for ${top.sharePct}% of shop downtime`,
          correctiveAction: "Standardise changeover kit and pre-stage material at the cell.",
        });
        return `${code} raised in Quality for ${top.reason}.`;
      },
    });
  }

  /* 6 — quality / scrap early warning */
  const oee = oeeByWorkCenter(s);
  const worstQuality = [...oee].filter((o) => o.goodQty + o.scrapQty > 0).sort((a, b) => a.quality - b.quality)[0];
  if (worstQuality && worstQuality.quality < 95) {
    actions.push({
      id: `scrap-${worstQuality.workCenterCode}`,
      title: `Scrap rising at ${worstQuality.name}`,
      detail: `Quality rate is ${worstQuality.quality}% (${worstQuality.scrapQty} scrap vs ${worstQuality.goodQty} good). In-process inspection at this operation should be tightened before the next release.`,
      severity: worstQuality.quality < 90 ? "high" : "medium",
      impact: "Reduces rework and project cost leakage",
    });
  }

  /* 7 — OEE below target */
  const belowTarget = oee.filter((o) => o.oee > 0 && o.oee < o.target - 10);
  if (belowTarget.length) {
    actions.push({
      id: "oee-gap",
      title: `${belowTarget.length} work center(s) running more than 10 points below OEE target`,
      detail: belowTarget
        .map((o) => `${o.name}: ${o.oee}% vs ${o.target}% target (A ${o.availability}% · P ${o.performance}% · Q ${o.quality}%)`)
        .join(" · "),
      severity: "medium",
      impact: "Throughput upside without capital spend",
    });
  }

  /* 8 — job work overdue */
  const overdueJw = s.jobWork.filter((j) => j.status !== "received" && j.status !== "closed" && j.dueAt < today);
  if (overdueJw.length) {
    actions.push({
      id: "jobwork",
      title: `${overdueJw.length} job-work consignment(s) overdue from vendors`,
      detail: overdueJw.map((j) => `${j.code} · ${j.vendor} · ${j.qty - j.returnedQty} pending`).join(" · "),
      severity: "medium",
      impact: "Material lying outside the plant delays assembly",
    });
  }

  /* 9 — completed orders awaiting close */
  const toClose = s.orders.filter((o) => o.status === "completed");
  if (toClose.length) {
    actions.push({
      id: "close",
      title: `${toClose.length} completed order(s) ready to close out`,
      detail: "Finished goods have been received and the conversion cost is posted. Closing releases residual reservations and freezes the order cost for project P&L.",
      severity: "low",
      impact: inr(toClose.reduce((a, o) => a + o.materialCost + o.labourCost, 0)),
      cta: "Close orders",
      run: () => {
        mfg.update((st) => {
          st.orders.forEach((o) => {
            if (o.status === "completed") o.status = "closed";
          });
        });
        return `${toClose.length} order(s) closed and frozen for costing.`;
      },
    });
  }

  return actions;
}
