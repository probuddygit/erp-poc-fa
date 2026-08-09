import type { QualityDocument } from "@/lib/quality/documents";
import type { ARInvoice, APBill, Journal, TaxLedger, BankAccount, BankTxn, ProjectCost, FinancialLine } from "./types";

const inr = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;
const d = (v?: string) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function arInvoiceDocument(i: ARInvoice): QualityDocument {
  const net = i.amount + i.gst - i.tds;
  return {
    kind: "Tax Invoice",
    docNo: i.code,
    title: `${i.customerName}${i.projectCode ? ` — ${i.projectCode}` : ""}`,
    meta: [
      { label: "Customer", value: i.customerName },
      { label: "Project", value: i.projectCode ?? "—" },
      { label: "Issued", value: d(i.issuedAt) },
      { label: "Due", value: d(i.dueAt) },
      { label: "Status", value: i.status.toUpperCase() },
      { label: "e-Invoice IRN", value: i.eInvoiceIRN ?? "—" },
      { label: "e-Way Bill", value: i.ewayBillNo ?? "—" },
    ],
    table: {
      columns: ["Particulars", "Amount"],
      rows: [
        ["Taxable value", inr(i.amount)],
        ["GST", inr(i.gst)],
        ["Less: TDS", `(${inr(i.tds)})`],
        ["Invoice total", inr(net)],
        ["Received", inr(i.received)],
        ["Balance due", inr(Math.max(0, net - i.received))],
      ],
    },
    filename: `${i.code}.html`,
  };
}

export function apBillDocument(b: APBill): QualityDocument {
  const net = b.amount + b.gst - b.tds;
  return {
    kind: "Vendor Bill",
    docNo: b.code,
    title: b.vendorName,
    meta: [
      { label: "Vendor", value: b.vendorName },
      { label: "PO / GRN", value: `${b.poCode ?? "—"} / ${b.grnCode ?? "—"}` },
      { label: "Received", value: d(b.receivedAt) },
      { label: "Due", value: d(b.dueAt) },
      { label: "3-Way Match", value: b.matchStatus },
      { label: "Status", value: b.status.toUpperCase() },
    ],
    table: {
      columns: ["Particulars", "Amount"],
      rows: [
        ["Taxable value", inr(b.amount)],
        ["GST (ITC)", inr(b.gst)],
        ["Less: TDS", `(${inr(b.tds)})`],
        ["Bill total", inr(net)],
        ["Paid", inr(b.paid)],
        ["Balance payable", inr(Math.max(0, net - b.paid))],
      ],
    },
    filename: `${b.code}.html`,
  };
}

export function journalDocument(j: Journal): QualityDocument {
  return {
    kind: "Journal Voucher",
    docNo: j.code,
    title: j.narration,
    meta: [
      { label: "Date", value: d(j.date) },
      { label: "Reference", value: j.reference },
      { label: "Source", value: j.source },
      { label: "Status", value: j.status.toUpperCase() },
      { label: "Created By", value: j.createdBy },
    ],
    table: {
      columns: ["Account", "Project", "Memo", "Debit", "Credit"],
      rows: j.lines.map((l) => [
        l.accountCode,
        l.projectCode ?? "—",
        l.memo ?? "—",
        l.debit ? inr(l.debit) : "—",
        l.credit ? inr(l.credit) : "—",
      ]),
    },
    filename: `${j.code}.html`,
  };
}

export function taxDocument(t: TaxLedger): QualityDocument {
  return {
    kind: "Tax Return Summary",
    docNo: `${t.type} · ${t.period}`,
    title: `${t.type} for ${t.period}`,
    meta: [
      { label: "Period", value: t.period },
      { label: "Return", value: t.type },
      { label: "Filed On", value: d(t.filedAt) },
      { label: "Status", value: t.status.toUpperCase() },
      { label: "Reference", value: t.reference ?? "—" },
    ],
    table: {
      columns: ["Particulars", "Amount"],
      rows: [
        ["Output tax", inr(t.outputTax)],
        ["Input tax credit", inr(t.inputTax)],
        ["Net payable", inr(t.netPayable)],
      ],
    },
    filename: `${t.type}-${t.period.replace(/\s/g, "-")}.html`,
  };
}

export function bankRecoDocument(b: BankAccount, txns: BankTxn[]): QualityDocument {
  return {
    kind: "Bank Reconciliation",
    docNo: b.code,
    title: `${b.bankName} — ${b.accountNo}`,
    meta: [
      { label: "Branch", value: b.branch },
      { label: "Currency", value: b.currency },
      { label: "Book balance", value: inr(b.bookBalance) },
      { label: "Statement balance", value: inr(b.statementBalance) },
      { label: "Difference", value: inr(b.bookBalance - b.statementBalance) },
      { label: "Unmatched items", value: String(b.unreconciledCount) },
      { label: "Last reconciled", value: d(b.lastRecoAt) },
    ],
    table: {
      columns: ["Date", "Narration", "Matched to", "Debit", "Credit", "Status"],
      rows: txns.map((t) => [
        d(t.date),
        t.narration,
        t.matchedRef ?? "—",
        t.direction === "debit" ? inr(t.amount) : "—",
        t.direction === "credit" ? inr(t.amount) : "—",
        t.status,
      ]),
    },
    filename: `reco-${b.code}.html`,
  };
}

export function projectCostDocument(p: ProjectCost): QualityDocument {
  const cost = p.materialCost + p.labourCost + p.overheadCost + p.subContractCost;
  return {
    kind: "Project Cost Sheet",
    docNo: p.projectCode,
    title: `${p.projectName} — ${p.customer}`,
    meta: [
      { label: "Contract value", value: inr(p.contractValue) },
      { label: "Billed", value: inr(p.billed) },
      { label: "Collected", value: inr(p.collected) },
      { label: "% Complete", value: `${p.percentComplete}%` },
      { label: "Status", value: p.status },
    ],
    table: {
      columns: ["Cost head", "Amount"],
      rows: [
        ["Material", inr(p.materialCost)],
        ["Labour", inr(p.labourCost)],
        ["Overhead", inr(p.overheadCost)],
        ["Sub-contract", inr(p.subContractCost)],
        ["Total incurred", inr(cost)],
        ["Committed", inr(p.committed)],
        ["WIP", inr(p.wip)],
        ["Forecast cost", inr(p.forecastCost)],
        ["Forecast margin", inr(p.contractValue - p.forecastCost)],
      ],
    },
    filename: `cost-${p.projectCode}.html`,
  };
}

export function statementDocument(title: string, lines: FinancialLine[]): QualityDocument {
  return {
    kind: "Financial Statement",
    docNo: title,
    title: `${title} · FY 2026 YTD (unaudited)`,
    meta: [
      { label: "Entity", value: "Faith Automation Pvt. Ltd." },
      { label: "Period", value: "FY 2026 · Year to date" },
      { label: "Basis", value: "Accrual · unaudited" },
    ],
    table: {
      columns: ["Particulars", "Amount"],
      rows: lines.map((l) => [l.label, inr(l.amount)]),
    },
    filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`,
  };
}

export function budgetDocument(rows: Array<{ code: string; costCentre: string; category: string; annualBudget: number; ytdBudget: number; ytdActual: number; variance: number; projectedYear: number }>): QualityDocument {
  return {
    kind: "Budget vs Actual",
    docNo: `BUD-${new Date().toISOString().slice(0, 7)}`,
    title: "Budget vs Actual — FY2026 year to date",
    meta: [
      { label: "Entity", value: "Faith Automation Pvt. Ltd." },
      { label: "Lines", value: String(rows.length) },
      { label: "Total budget", value: inr(rows.reduce((a, r) => a + r.annualBudget, 0)) },
      { label: "YTD actual", value: inr(rows.reduce((a, r) => a + r.ytdActual, 0)) },
    ],
    table: {
      columns: ["Code", "Cost centre", "Category", "Annual", "YTD budget", "YTD actual", "Variance", "Projected"],
      rows: rows.map((r) => [r.code, r.costCentre, r.category, inr(r.annualBudget), inr(r.ytdBudget), inr(r.ytdActual), inr(r.variance), inr(r.projectedYear)]),
    },
    filename: "budget-vs-actual.html",
  };
}

export function assetRegisterDocument(rows: Array<{ code: string; name: string; category: string; location: string; cost: number; accumulatedDepreciation: number; status: string }>): QualityDocument {
  return {
    kind: "Fixed Asset Register",
    docNo: `FAR-${new Date().toISOString().slice(0, 7)}`,
    title: "Fixed asset register — gross block, depreciation and net block",
    meta: [
      { label: "Assets", value: String(rows.length) },
      { label: "Gross block", value: inr(rows.reduce((a, r) => a + r.cost, 0)) },
      { label: "Accumulated depreciation", value: inr(rows.reduce((a, r) => a + r.accumulatedDepreciation, 0)) },
      { label: "Net block", value: inr(rows.reduce((a, r) => a + r.cost - r.accumulatedDepreciation, 0)) },
    ],
    table: {
      columns: ["Code", "Asset", "Category", "Location", "Cost", "Acc. depreciation", "Net block", "Status"],
      rows: rows.map((r) => [r.code, r.name, r.category, r.location, inr(r.cost), inr(r.accumulatedDepreciation), inr(r.cost - r.accumulatedDepreciation), r.status]),
    },
    filename: "fixed-asset-register.html",
  };
}

export function profitabilityDocument(dimension: string, rows: Array<{ label: string; revenue: number; cost: number; margin: number; marginPct: number }>): QualityDocument {
  return {
    kind: "Profitability Analysis",
    docNo: `PROF-${dimension.toUpperCase()}`,
    title: `Profitability by ${dimension}`,
    meta: [
      { label: "Dimension", value: dimension },
      { label: "Revenue", value: inr(rows.reduce((a, r) => a + r.revenue, 0)) },
      { label: "Cost", value: inr(rows.reduce((a, r) => a + r.cost, 0)) },
      { label: "Margin", value: inr(rows.reduce((a, r) => a + r.margin, 0)) },
    ],
    table: {
      columns: ["Name", "Revenue", "Cost", "Margin", "Margin %"],
      rows: rows.map((r) => [r.label, inr(r.revenue), inr(r.cost), inr(r.margin), `${r.marginPct.toFixed(1)}%`]),
    },
    filename: `profitability-${dimension}.html`,
  };
}

export function closeChecklistDocument(period: string, rows: Array<{ sequence: number; title: string; area: string; owner: string; status: string }>): QualityDocument {
  return {
    kind: "Period Close Checklist",
    docNo: `CLOSE-${period}`,
    title: `Financial close checklist — ${period}`,
    meta: [
      { label: "Period", value: period },
      { label: "Tasks", value: String(rows.length) },
      { label: "Completed", value: String(rows.filter((r) => r.status === "done").length) },
      { label: "Blocked", value: String(rows.filter((r) => r.status === "blocked").length) },
    ],
    table: {
      columns: ["#", "Task", "Area", "Owner", "Status"],
      rows: rows.map((r) => [String(r.sequence), r.title, r.area, r.owner, r.status]),
    },
    filename: `close-checklist-${period.replace(/\s+/g, "-").toLowerCase()}.html`,
  };
}

export function trialBalanceDocument(rows: Array<{ code: string; name: string; debit: number; credit: number }>): QualityDocument {
  return {
    kind: "Trial Balance",
    docNo: `TB-${new Date().toISOString().slice(0, 10)}`,
    title: "Trial balance — FY2026 year to date",
    meta: [
      { label: "Accounts", value: String(rows.length) },
      { label: "Total debit", value: inr(rows.reduce((a, r) => a + r.debit, 0)) },
      { label: "Total credit", value: inr(rows.reduce((a, r) => a + r.credit, 0)) },
    ],
    table: {
      columns: ["Code", "Account", "Debit", "Credit"],
      rows: rows.map((r) => [r.code, r.name, r.debit ? inr(r.debit) : "—", r.credit ? inr(r.credit) : "—"]),
    },
    filename: "trial-balance.html",
  };
}
