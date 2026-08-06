// Builds the grounded FACTS snapshot handed to the LLM.
// Everything here is read straight from the live ERP stores — the model is never
// allowed to answer outside this payload.
import { projectsStore } from "@/lib/projects/store";
import { crm } from "@/lib/crm/store";
import { plmStore } from "@/lib/plm/store";
import { procurement } from "@/lib/procurement/store";
import { inventory } from "@/lib/inventory/store";
import { quality } from "@/lib/quality/store";
import { finance } from "@/lib/finance/store";
import { hr } from "@/lib/hr/store";
import { mdmStore } from "@/lib/mdm/store";
import { MASTERS } from "@/lib/mdm/registry";
import { forecastBundle } from "./forecast";

const take = <T>(rows: T[], n = 12) => rows.slice(0, n);

export function buildFacts() {
  const p = projectsStore.get();
  const c = crm.get();
  const plm = plmStore.get();
  const proc = procurement.get();
  const inv = inventory.get();
  const q = quality.get();
  const fin = finance.get();
  const people = hr.get();

  return {
    company: "Faith Automation (Body-in-White & industrial automation)",
    currency: "INR",
    generatedAt: new Date().toISOString(),

    projects: {
      total: p.projects.length,
      active: p.projects.filter((x) => x.status !== "closed").length,
      orderBook: p.projects.filter((x) => x.status !== "closed").reduce((a, x) => a + x.value, 0),
      budget: p.projects.reduce((a, x) => a + x.budget, 0),
      spent: p.projects.reduce((a, x) => a + x.spent, 0),
      rag: {
        green: p.projects.filter((x) => x.rag === "green").length,
        amber: p.projects.filter((x) => x.rag === "amber").length,
        red: p.projects.filter((x) => x.rag === "red").length,
      },
      list: take(
        p.projects.map((x) => ({
          code: x.code,
          name: x.name,
          customer: x.customerName,
          status: x.status,
          rag: x.rag,
          progressPct: x.progress,
          value: x.value,
          budget: x.budget,
          spent: x.spent,
          start: x.startDate,
          end: x.endDate,
          manager: x.manager,
        })),
        20,
      ),
      openRisks: take(
        p.risks
          .filter((r) => r.status !== "closed")
          .map((r) => ({
            project: r.projectId,
            title: r.title,
            probability: r.probability,
            impact: r.impact,
            category: r.category,
          })),
      ),
      openIssues: take(
        p.issues
          .filter((i) => i.status !== "resolved")
          .map((i) => ({ project: i.projectId, title: i.title, severity: i.severity })),
      ),
      milestonesAtRisk: take(
        p.milestones
          .filter((m) => m.status === "at-risk" || m.status === "missed")
          .map((m) => ({ name: m.name, due: m.due, status: m.status })),
      ),
    },

    crm: {
      customers: c.customers.length,
      leads: c.leads.length,
      openOpportunities: c.opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost")
        .length,
      pipelineValue: c.opportunities.reduce((a, o) => a + o.value, 0),
      opportunities: take(
        c.opportunities.map((o) => ({
          code: o.code,
          name: o.name,
          customer: o.customerName,
          stage: o.stage,
          value: o.value,
          probabilityPct: o.probability,
          expectedClose: o.expectedClose,
          owner: o.owner,
        })),
        15,
      ),
      rfqs: take(
        c.rfqs.map((r) => ({
          code: r.code,
          customer: r.customerName,
          title: r.title,
          due: r.dueDate,
          status: r.status,
          owner: r.owner,
        })),
      ),
      quotations: take(
        c.quotations.map((x) => ({
          code: x.code,
          customer: x.customerName,
          value: x.value,
          status: x.status,
        })),
      ),
      orderAcknowledgements: take(
        c.oas.map((x) => ({
          code: x.code,
          customer: x.customerName,
          value: x.value,
          status: x.status,
          po: x.poNumber,
        })),
      ),
    },

    engineering: {
      bomNodes: plm.bom.length,
      drawings: plm.drawings.length,
      openEcns: plm.ecns.filter((e) => e.status === "draft" || e.status === "pending").length,
      openEcrs: plm.ecrs.filter((e) => e.status === "draft" || e.status === "under-review").length,
      pendingReviews: plm.reviews.filter((r) => r.outcome === "Pending").length,
      ecnList: take(plm.ecns.map((e) => ({ code: e.code, title: e.title, status: e.status }))),
    },

    procurement: {
      vendors: proc.vendors.length,
      openRequisitions: proc.requisitions.filter(
        (r) => r.status !== "converted" && r.status !== "rejected",
      ).length,
      openRfqs: proc.rfqs.filter((r) => r.status !== "awarded" && r.status !== "cancelled").length,
      poValueOpen: proc.pos.filter((x) => x.status !== "closed").reduce((a, x) => a + x.amount, 0),
      pos: take(
        proc.pos.map((x) => ({
          code: x.code,
          vendor: x.vendorName,
          project: x.projectCode,
          status: x.status,
          amount: x.amount,
          received: x.received,
          invoiced: x.invoiced,
          promised: x.promisedDate,
        })),
        15,
      ),
      grns: take(
        proc.grns.map((g) => ({
          code: g.code,
          po: g.poCode,
          vendor: g.vendorName,
          status: g.status,
          match: g.invoiceMatch,
          amount: g.amount,
        })),
      ),
    },

    inventory: {
      items: inv.items.length,
      stores: inv.stores.length,
      stockValue: Math.round(inv.stock.reduce((a, s) => a + s.value, 0)),
      belowReorder: inv.items.filter((i) => i.onHand - i.allocated < i.reorder).length,
      openTransfers: inv.transfers.filter(
        (t) => t.status !== "received" && t.status !== "cancelled",
      ).length,
      expiringBatches: inv.batches.filter((b) => b.status === "expiring" || b.status === "expired")
        .length,
      lowStock: take(
        inv.items
          .filter((i) => i.onHand - i.allocated < i.reorder)
          .map((i) => ({
            code: i.code,
            description: i.description,
            available: i.onHand - i.allocated,
            reorder: i.reorder,
            uom: i.uom,
          })),
      ),
    },

    quality: {
      inspections: q.inspections.length,
      failedInspections: q.inspections.filter((i) => i.status === "failed").length,
      openNcrs: q.ncrs.filter((n) => n.status !== "closed").length,
      openCapas: q.capas.filter((c2) => c2.status !== "closed").length,
      gaugesOverdue: q.gauges.filter((g) => g.status === "overdue").length,
      ncrs: take(
        q.ncrs.map((n) => ({
          code: n.code,
          item: n.itemCode,
          defect: n.defect,
          severity: n.severity,
          status: n.status,
          vendor: n.vendorName,
          cost: n.costImpact,
        })),
      ),
      supplierScores: take(
        q.suppliers.map((s) => ({
          vendor: s.vendorName,
          ppm: s.ppm,
          otdPct: s.otdPct,
          grade: s.grade,
          score: s.score,
        })),
      ),
    },

    finance: {
      arOutstanding: Math.round(
        fin.arInvoices
          .filter((i) => i.status !== "paid")
          .reduce((a, i) => a + (i.amount + i.gst - i.received), 0),
      ),
      apOutstanding: Math.round(
        fin.apBills
          .filter((b) => b.status !== "paid")
          .reduce((a, b) => a + (b.amount + b.gst - b.paid), 0),
      ),
      overdueArCount: fin.arInvoices.filter((i) => i.status === "overdue").length,
      arInvoices: take(
        fin.arInvoices.map((i) => ({
          code: i.code,
          customer: i.customerName,
          amount: i.amount,
          due: i.dueAt,
          status: i.status,
        })),
      ),
      apBills: take(
        fin.apBills.map((b) => ({
          code: b.code,
          vendor: b.vendorName,
          amount: b.amount,
          due: b.dueAt,
          status: b.status,
          match: b.matchStatus,
        })),
      ),
      projectCosting: take(
        fin.projectCosts.map((pc) => ({
          project: pc.projectCode,
          contractValue: pc.contractValue,
          billed: pc.billed,
          collected: pc.collected,
          wip: pc.wip,
          percentComplete: pc.percentComplete,
          forecastCost: pc.forecastCost,
          status: pc.status,
        })),
      ),
      taxLedgers: take(
        fin.taxLedgers.map((t) => ({
          period: t.period,
          type: t.type,
          netPayable: t.netPayable,
          status: t.status,
        })),
      ),
    },

    hr: {
      headcount: people.employees.filter((e) => e.status === "active").length,
      onLeaveToday: people.leaves.filter((l) => l.status === "approved").length,
      pendingLeaves: people.leaves.filter((l) => l.status === "pending").length,
      openTimesheets: people.timesheets.filter((t) => t.status === "submitted").length,
      byDepartment: Object.entries(
        people.employees.reduce<Record<string, number>>((acc, e) => {
          acc[e.department] = (acc[e.department] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([department, count]) => ({ department, count })),
    },

    masterData: MASTERS.map((m) => ({
      master: m.name,
      key: m.key,
      records: mdmStore.list(m.key).length,
    })),

    forecasts: forecastBundle(),
  };
}

export function buildFactsJson() {
  try {
    return JSON.stringify(buildFacts());
  } catch {
    return "{}";
  }
}
