/** OEE, downtime Pareto and shop-floor throughput analytics. */
import type { MfgState } from "./types";

export interface OeeLine {
  workCenterCode: string;
  name: string;
  target: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  runMins: number;
  downMins: number;
  goodQty: number;
  scrapQty: number;
}

const pct = (n: number) => Math.max(0, Math.min(100, Math.round(n * 1000) / 10));

export function oeeByWorkCenter(s: MfgState, days = 7): OeeLine[] {
  const since = Date.now() - days * 86_400_000;

  return s.workCenters.filter((w) => w.active).map((w) => {
    const logs = s.timeLogs.filter((t) => t.workCenterCode === w.code && new Date(t.at).getTime() >= since);
    const down = s.downtime.filter((d) => d.workCenterCode === w.code && new Date(d.at).getTime() >= since);
    const runMins = logs.reduce((a, t) => a + t.mins, 0);
    const downMins = down.reduce((a, d) => a + d.mins, 0);
    const plannedMins = runMins + downMins || 1;

    const opsPlanned = logs.reduce((a, t) => {
      const op = s.operations.find((o) => o.id === t.operationId);
      const order = s.orders.find((o) => o.id === t.orderId);
      if (!op || !order || !order.qty) return a;
      return a + (op.plannedMins / order.qty) * (t.goodQty + t.scrapQty);
    }, 0);

    const good = logs.reduce((a, t) => a + t.goodQty, 0);
    const scrap = logs.reduce((a, t) => a + t.scrapQty, 0);

    const availability = pct(runMins / plannedMins);
    const performance = runMins ? pct(Math.min(1, opsPlanned / runMins)) : 0;
    const quality = good + scrap ? pct(good / (good + scrap)) : 0;

    return {
      workCenterCode: w.code,
      name: w.name,
      target: w.oeeTarget,
      availability,
      performance,
      quality,
      oee: Math.round((availability * performance * quality) / 10000),
      runMins,
      downMins,
      goodQty: good,
      scrapQty: scrap,
    };
  });
}

export interface DowntimePareto {
  reason: string;
  mins: number;
  events: number;
  sharePct: number;
}

export function downtimePareto(s: MfgState, days = 14): DowntimePareto[] {
  const since = Date.now() - days * 86_400_000;
  const rows = s.downtime.filter((d) => new Date(d.at).getTime() >= since);
  const total = rows.reduce((a, d) => a + d.mins, 0) || 1;
  const map = new Map<string, { mins: number; events: number }>();
  rows.forEach((d) => {
    const cur = map.get(d.reason) ?? { mins: 0, events: 0 };
    map.set(d.reason, { mins: cur.mins + d.mins, events: cur.events + 1 });
  });
  return [...map.entries()]
    .map(([reason, v]) => ({ reason, mins: v.mins, events: v.events, sharePct: Math.round((v.mins / total) * 100) }))
    .sort((a, b) => b.mins - a.mins);
}

export interface ThroughputPoint {
  day: string;
  good: number;
  scrap: number;
  hours: number;
}

export function throughputTrend(s: MfgState, days = 7): ThroughputPoint[] {
  const out: ThroughputPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const logs = s.timeLogs.filter((t) => t.at.slice(0, 10) === key);
    out.push({
      day: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      good: logs.reduce((a, t) => a + t.goodQty, 0),
      scrap: logs.reduce((a, t) => a + t.scrapQty, 0),
      hours: Math.round((logs.reduce((a, t) => a + t.mins, 0) / 60) * 10) / 10,
    });
  }
  return out;
}

export function shopKpis(s: MfgState) {
  const open = s.orders.filter((o) => ["planned", "released", "in-progress"].includes(o.status));
  const oee = oeeByWorkCenter(s);
  const avgOee = oee.length ? Math.round(oee.reduce((a, o) => a + o.oee, 0) / oee.length) : 0;
  const good = s.timeLogs.reduce((a, t) => a + t.goodQty, 0);
  const scrap = s.timeLogs.reduce((a, t) => a + t.scrapQty, 0);
  const today = new Date().toISOString().slice(0, 10);
  return {
    openOrders: open.length,
    inProgress: s.orders.filter((o) => o.status === "in-progress").length,
    late: open.filter((o) => o.dueDate < today).length,
    avgOee,
    scrapRate: good + scrap ? Math.round((scrap / (good + scrap)) * 1000) / 10 : 0,
    wipValue: open.reduce((a, o) => a + o.materialCost + o.labourCost, 0),
    labourHrs: Math.round(s.timeLogs.reduce((a, t) => a + t.mins, 0) / 60),
    jobWorkOpen: s.jobWork.filter((j) => j.status !== "received" && j.status !== "closed").length,
  };
}
