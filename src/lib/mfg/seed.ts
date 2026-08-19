import type { MfgState, MoOperation, MfgOrder, TimeLog, DowntimeLog } from "./types";

const DAY = 86_400_000;
const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const day = (d: number) => iso(d).slice(0, 10);

/** Deterministic pseudo-random so the demo numbers are stable across reloads. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

export function seed(): MfgState {
  const rand = rng(20260819);

  const workCenters: MfgState["workCenters"] = [
    { id: "wc1", code: "WC-WELD", name: "Robotic Weld Cell", type: "Weld", location: "Bay 1", shifts: 2, capacityHrsPerShift: 8, hourlyRate: 1850, oeeTarget: 85, active: true },
    { id: "wc2", code: "WC-MACH", name: "CNC Machining", type: "Machining", location: "Bay 2", shifts: 3, capacityHrsPerShift: 8, hourlyRate: 2400, oeeTarget: 80, active: true },
    { id: "wc3", code: "WC-ASSY", name: "Fixture Assembly", type: "Assembly", location: "Bay 3", shifts: 2, capacityHrsPerShift: 8, hourlyRate: 1200, oeeTarget: 88, active: true },
    { id: "wc4", code: "WC-PAINT", name: "Paint & Finishing", type: "Paint", location: "Bay 4", shifts: 1, capacityHrsPerShift: 8, hourlyRate: 950, oeeTarget: 75, active: true },
  ];

  const routingDefs = [
    { code: "RT-BIW-100", itemCode: "ASM-BIW-100", itemName: "BIW Framing Station Assembly" },
    { code: "RT-GRP-220", itemCode: "SUB-GRP-220", itemName: "Gripper Sub-assembly" },
    { code: "RT-FIX-310", itemCode: "SUB-FIX-310", itemName: "Weld Fixture Base" },
  ];

  const routings: MfgState["routings"] = routingDefs.map((r, i) => ({
    id: `rt${i + 1}`,
    code: r.code,
    itemCode: r.itemCode,
    itemName: r.itemName,
    rev: "A",
    active: true,
    createdAt: iso(-60),
  }));

  const opTemplate = [
    { name: "Cutting & Prep", wc: "WC-MACH", setup: 45, run: 26, insp: false, sub: false },
    { name: "Robotic Welding", wc: "WC-WELD", setup: 60, run: 38, insp: true, sub: false },
    { name: "Machining / Boring", wc: "WC-MACH", setup: 35, run: 22, insp: false, sub: false },
    { name: "Assembly & Fitment", wc: "WC-ASSY", setup: 30, run: 45, insp: true, sub: false },
    { name: "Paint & Finish", wc: "WC-PAINT", setup: 25, run: 18, insp: false, sub: false },
  ];

  const routingOps: MfgState["routingOps"] = [];
  routings.forEach((r, ri) => {
    opTemplate.slice(0, ri === 0 ? 5 : 4).forEach((o, oi) => {
      routingOps.push({
        id: `rop${ri + 1}-${oi + 1}`,
        routingCode: r.code,
        seq: (oi + 1) * 10,
        name: o.name,
        workCenterCode: o.wc,
        setupMins: o.setup,
        runMinsPerUnit: o.run,
        inspection: o.insp,
        subcontract: o.sub,
      });
    });
  });

  const orderDefs = [
    { code: "MO-24-0101", routing: "RT-BIW-100", qty: 4, project: "PRJ-1021", due: 6, status: "in-progress" as const, priority: "High" as const },
    { code: "MO-24-0102", routing: "RT-GRP-220", qty: 12, project: "PRJ-1021", due: 3, status: "in-progress" as const, priority: "Critical" as const },
    { code: "MO-24-0103", routing: "RT-FIX-310", qty: 8, project: "PRJ-1024", due: 11, status: "released" as const, priority: "Normal" as const },
    { code: "MO-24-0104", routing: "RT-BIW-100", qty: 2, project: "PRJ-1024", due: 18, status: "planned" as const, priority: "Normal" as const },
    { code: "MO-24-0105", routing: "RT-GRP-220", qty: 20, project: "PRJ-1026", due: 24, status: "planned" as const, priority: "Low" as const },
    { code: "MO-24-0098", routing: "RT-FIX-310", qty: 6, project: "PRJ-1021", due: -4, status: "completed" as const, priority: "Normal" as const },
  ];

  const orders: MfgOrder[] = [];
  const operations: MoOperation[] = [];
  const timeLogs: TimeLog[] = [];
  const downtime: DowntimeLog[] = [];

  orderDefs.forEach((d, oi) => {
    const routing = routings.find((r) => r.code === d.routing)!;
    const ops = routingOps.filter((o) => o.routingCode === d.routing).sort((a, b) => a.seq - b.seq);
    const totalMins = ops.reduce((a, o) => a + o.setupMins + o.runMinsPerUnit * d.qty, 0);
    const orderId = `mo${oi + 1}`;
    const progressed = d.status === "completed" ? ops.length : d.status === "in-progress" ? Math.max(1, Math.round(ops.length * 0.5)) : 0;

    let good = 0;
    let scrap = 0;
    let labour = 0;

    ops.forEach((o, i) => {
      const planned = o.setupMins + o.runMinsPerUnit * d.qty;
      const done = i < progressed;
      const running = d.status === "in-progress" && i === progressed;
      const actual = done ? Math.round(planned * (0.92 + rand() * 0.28)) : running ? Math.round(planned * 0.4) : 0;
      const scrapHere = done && rand() > 0.6 ? 1 : 0;
      const goodHere = done ? d.qty - scrapHere : running ? Math.floor(d.qty * 0.4) : 0;
      const wc = workCenters.find((w) => w.code === o.workCenterCode)!;
      labour += (actual / 60) * wc.hourlyRate;
      if (done) {
        good = goodHere;
        scrap += scrapHere;
      }

      const opId = `${orderId}-op${i + 1}`;
      operations.push({
        id: opId,
        orderId,
        seq: o.seq,
        name: o.name,
        workCenterCode: o.workCenterCode,
        plannedMins: planned,
        actualMins: actual,
        goodQty: goodHere,
        scrapQty: scrapHere,
        status: done ? "done" : running ? "running" : "pending",
        inspection: o.inspection,
        subcontract: o.subcontract,
        operator: done || running ? ["A. Kamble", "S. Rane", "M. Iqbal", "P. Naik"][i % 4] : undefined,
        startedAt: done || running ? iso(-(6 - i)) : undefined,
        completedAt: done ? iso(-(5 - i)) : undefined,
      });

      if (actual > 0) {
        timeLogs.push({
          id: `${opId}-tl`,
          orderId,
          operationId: opId,
          workCenterCode: o.workCenterCode,
          operator: ["A. Kamble", "S. Rane", "M. Iqbal", "P. Naik"][i % 4],
          at: iso(-(6 - i)),
          mins: actual,
          goodQty: goodHere,
          scrapQty: scrapHere,
          reworkQty: done && rand() > 0.8 ? 1 : 0,
          note: undefined,
        });
      }

      if (done && rand() > 0.55) {
        downtime.push({
          id: `${opId}-dt`,
          workCenterCode: o.workCenterCode,
          orderId,
          reason: ["Material shortage", "Tool change", "Breakdown", "Setup / changeover", "Quality hold"][Math.floor(rand() * 5)],
          mins: 20 + Math.round(rand() * 70),
          at: iso(-(5 - i)),
        });
      }
    });

    const materialCost = Math.round(d.qty * (180000 + rand() * 90000));
    orders.push({
      id: orderId,
      code: d.code,
      itemCode: routing.itemCode,
      itemName: routing.itemName,
      qty: d.qty,
      uom: "EA",
      projectCode: d.project,
      routingCode: d.routing,
      priority: d.priority,
      status: d.status,
      plannedStart: day(-6 + oi),
      plannedEnd: day(d.due - 1),
      dueDate: day(d.due),
      goodQty: d.status === "completed" ? d.qty - scrap : good,
      scrapQty: scrap,
      reworkQty: 0,
      materialCost: d.status === "planned" ? 0 : materialCost,
      labourCost: Math.round(labour),
      reservedValue: d.status === "planned" ? 0 : Math.round(materialCost * 0.85),
      source: oi < 3 ? "engineering" : "manual",
      createdAt: iso(-20 + oi),
    });

    void totalMins;
  });

  const jobWork: MfgState["jobWork"] = [
    {
      id: "jw1", code: "JW-24-011", vendor: "Precision Heat Treat Pvt Ltd", orderCode: "MO-24-0101",
      itemCode: "SUB-FIX-310", itemName: "Weld Fixture Base", qty: 8, returnedQty: 5,
      issuedValue: 480000, jobRate: 2200, projectCode: "PRJ-1021", issuedAt: day(-9), dueAt: day(2), status: "partial",
    },
    {
      id: "jw2", code: "JW-24-012", vendor: "Shakti Powder Coating", orderCode: "MO-24-0103",
      itemCode: "SUB-GRP-220", itemName: "Gripper Sub-assembly", qty: 12, returnedQty: 0,
      issuedValue: 260000, jobRate: 850, projectCode: "PRJ-1024", issuedAt: day(-3), dueAt: day(5), status: "issued",
    },
  ];

  return { workCenters, routings, routingOps, orders, operations, timeLogs, downtime, jobWork, planRuns: [] };
}
