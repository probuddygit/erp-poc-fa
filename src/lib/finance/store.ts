import { useSyncExternalStore } from "react";
import { makeCrud } from "@/lib/crud";
import type { FinanceState, ARInvoice, APBill, Journal } from "./types";

const KEY = "faith-erp:finance:v1";

function iso(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

function seed(): FinanceState {
  const accounts: FinanceState["accounts"] = [
    { id: "a1", code: "1000", name: "Current Assets", type: "asset", balance: 187500000, currency: "INR", isControl: true },
    { id: "a2", code: "1100", name: "Cash & Bank", type: "asset", parentCode: "1000", balance: 92400000, currency: "INR" },
    { id: "a3", code: "1200", name: "Accounts Receivable", type: "asset", parentCode: "1000", balance: 68200000, currency: "INR", isControl: true },
    { id: "a4", code: "1300", name: "Inventory (Raw + WIP + FG)", type: "asset", parentCode: "1000", balance: 26900000, currency: "INR" },
    { id: "a5", code: "1500", name: "Fixed Assets — Plant", type: "asset", balance: 214000000, currency: "INR" },
    { id: "a6", code: "2000", name: "Current Liabilities", type: "liability", balance: 74300000, currency: "INR", isControl: true },
    { id: "a7", code: "2100", name: "Accounts Payable", type: "liability", parentCode: "2000", balance: 41800000, currency: "INR", isControl: true },
    { id: "a8", code: "2200", name: "GST Payable", type: "liability", parentCode: "2000", balance: 8200000, currency: "INR" },
    { id: "a9", code: "2210", name: "TDS Payable", type: "liability", parentCode: "2000", balance: 1240000, currency: "INR" },
    { id: "a10", code: "2500", name: "Long-Term Borrowings", type: "liability", balance: 58000000, currency: "INR" },
    { id: "a11", code: "3000", name: "Share Capital", type: "equity", balance: 150000000, currency: "INR" },
    { id: "a12", code: "3100", name: "Retained Earnings", type: "equity", balance: 119200000, currency: "INR" },
    { id: "a13", code: "4000", name: "Project Revenue", type: "income", balance: 428600000, currency: "INR", isControl: true },
    { id: "a14", code: "4100", name: "Service & AMC Revenue", type: "income", balance: 32400000, currency: "INR" },
    { id: "a15", code: "5000", name: "Material Cost — Steel & Sheet", type: "expense", balance: 148900000, currency: "INR" },
    { id: "a16", code: "5100", name: "Bought-Out Automation", type: "expense", balance: 96400000, currency: "INR" },
    { id: "a17", code: "5200", name: "Sub-Contract & Fabrication", type: "expense", balance: 42800000, currency: "INR" },
    { id: "a18", code: "6100", name: "Salaries & Wages", type: "expense", balance: 58200000, currency: "INR" },
    { id: "a19", code: "6300", name: "Power, Fuel & Utilities", type: "expense", balance: 12400000, currency: "INR" },
    { id: "a20", code: "6500", name: "Depreciation", type: "expense", balance: 18600000, currency: "INR" },
  ];

  const journals: FinanceState["journals"] = [
    { id: "j1", code: "JV-24-0912", date: iso(-1), reference: "AR-INV-4407", narration: "Sales invoice — Hyundai BIW Cell 3 milestone 3", status: "posted", source: "AR", createdBy: "Finance Bot", lines: [
      { accountCode: "1200", debit: 24780000, credit: 0, projectCode: "PRJ-1021", memo: "AR — Hyundai" },
      { accountCode: "4000", debit: 0, credit: 21000000, projectCode: "PRJ-1021" },
      { accountCode: "2200", debit: 0, credit: 3780000, memo: "IGST 18%" },
    ]},
    { id: "j2", code: "JV-24-0913", date: iso(-1), reference: "AP-BILL-2201", narration: "Bill booking — Tata Steel EN31 plates", status: "posted", source: "AP", createdBy: "R. Deshpande", lines: [
      { accountCode: "5000", debit: 4260000, credit: 0, projectCode: "PRJ-1021" },
      { accountCode: "2200", debit: 767000, credit: 0, memo: "ITC 18%" },
      { accountCode: "2100", debit: 0, credit: 4985600, memo: "AP — Tata Steel" },
      { accountCode: "2210", debit: 0, credit: 41400, memo: "TDS 194Q" },
    ]},
    { id: "j3", code: "JV-24-0914", date: iso(-2), reference: "PAY-8801", narration: "Payment to Fanuc Automation", status: "posted", source: "bank", createdBy: "Bank Sync", lines: [
      { accountCode: "2100", debit: 3120000, credit: 0 },
      { accountCode: "1100", debit: 0, credit: 3120000, memo: "HDFC Curr A/c" },
    ]},
    { id: "j4", code: "JV-24-0915", date: iso(0), reference: "PAY-8802", narration: "Customer receipt — Mahindra AMC", status: "posted", source: "bank", createdBy: "Bank Sync", lines: [
      { accountCode: "1100", debit: 1440000, credit: 0 },
      { accountCode: "1200", debit: 0, credit: 1440000, projectCode: "PRJ-1017" },
    ]},
    { id: "j5", code: "JV-24-0916", date: iso(0), reference: "PAYROLL-SEP", narration: "Salary provision — September", status: "draft", source: "payroll", createdBy: "HR Sync", lines: [
      { accountCode: "6100", debit: 4820000, credit: 0 },
      { accountCode: "2100", debit: 0, credit: 4340000, memo: "Net payable" },
      { accountCode: "2210", debit: 0, credit: 480000, memo: "TDS 192" },
    ]},
    { id: "j6", code: "JV-24-0910", date: iso(-5), reference: "DEP-Q2", narration: "Quarterly depreciation — plant & machinery", status: "posted", source: "system", createdBy: "Auto", lines: [
      { accountCode: "6500", debit: 4650000, credit: 0 },
      { accountCode: "1500", debit: 0, credit: 4650000 },
    ]},
  ];

  const arInvoices: FinanceState["arInvoices"] = [
    { id: "ar1", code: "AR-INV-4405", customerName: "Hyundai Motor India", projectCode: "PRJ-1021", issuedAt: iso(-42), dueAt: iso(-12), amount: 18500000, gst: 3330000, tds: 185000, received: 21645000, status: "paid", eInvoiceIRN: "IRN-2024-4405", ewayBillNo: "EWB-771102" },
    { id: "ar2", code: "AR-INV-4406", customerName: "Tata Motors Passenger Vehicles", projectCode: "PRJ-1024", issuedAt: iso(-28), dueAt: iso(2), amount: 12400000, gst: 2232000, tds: 124000, received: 8000000, status: "partial", eInvoiceIRN: "IRN-2024-4406" },
    { id: "ar3", code: "AR-INV-4407", customerName: "Hyundai Motor India", projectCode: "PRJ-1021", issuedAt: iso(-1), dueAt: iso(29), amount: 21000000, gst: 3780000, tds: 210000, received: 0, status: "sent", eInvoiceIRN: "IRN-2024-4407" },
    { id: "ar4", code: "AR-INV-4402", customerName: "Ashok Leyland", projectCode: "PRJ-1015", issuedAt: iso(-75), dueAt: iso(-45), amount: 9200000, gst: 1656000, tds: 92000, received: 0, status: "overdue" },
    { id: "ar5", code: "AR-INV-4403", customerName: "Mahindra & Mahindra", projectCode: "PRJ-1017", issuedAt: iso(-14), dueAt: iso(16), amount: 4800000, gst: 864000, tds: 48000, received: 4800000, status: "paid" },
    { id: "ar6", code: "AR-INV-4408", customerName: "Bajaj Auto", projectCode: "PRJ-1032", issuedAt: iso(-3), dueAt: iso(27), amount: 6600000, gst: 1188000, tds: 66000, received: 0, status: "sent", eInvoiceIRN: "IRN-2024-4408" },
    { id: "ar7", code: "AR-INV-4404", customerName: "Force Motors", projectCode: "PRJ-1029", issuedAt: iso(-60), dueAt: iso(-30), amount: 3800000, gst: 684000, tds: 38000, received: 1000000, status: "overdue" },
  ];

  const apBills: FinanceState["apBills"] = [
    { id: "ap1", code: "AP-BILL-2201", vendorName: "Tata Steel Ltd", poCode: "PO-6601", grnCode: "GRN-8801", receivedAt: iso(-2), dueAt: iso(28), amount: 4260000, gst: 767000, tds: 41400, paid: 0, status: "3wm-ok", matchStatus: "matched" },
    { id: "ap2", code: "AP-BILL-2202", vendorName: "Fanuc Automation", poCode: "PO-6604", grnCode: "GRN-8802", receivedAt: iso(-5), dueAt: iso(25), amount: 3120000, gst: 561000, tds: 62400, paid: 3120000, status: "paid", matchStatus: "matched" },
    { id: "ap3", code: "AP-BILL-2203", vendorName: "Bosch Rexroth", poCode: "PO-6607", receivedAt: iso(-8), dueAt: iso(22), amount: 1840000, gst: 331000, tds: 18400, paid: 0, status: "pending", matchStatus: "qty-var" },
    { id: "ap4", code: "AP-BILL-2204", vendorName: "SRF Industrial Chemicals", poCode: "PO-6612", receivedAt: iso(-40), dueAt: iso(-10), amount: 620000, gst: 111600, tds: 6200, paid: 0, status: "hold", matchStatus: "price-var" },
    { id: "ap5", code: "AP-BILL-2205", vendorName: "KUKA Robotics", poCode: "PO-6620", grnCode: "GRN-8815", receivedAt: iso(-12), dueAt: iso(18), amount: 8600000, gst: 1548000, tds: 86000, paid: 4000000, status: "partial", matchStatus: "matched" },
    { id: "ap6", code: "AP-BILL-2206", vendorName: "Sundram Fasteners", poCode: "PO-6631", grnCode: "GRN-8822", receivedAt: iso(-3), dueAt: iso(27), amount: 340000, gst: 61200, tds: 3400, paid: 0, status: "approved", matchStatus: "matched" },
    { id: "ap7", code: "AP-BILL-2207", vendorName: "Air Liquide", receivedAt: iso(-50), dueAt: iso(-20), amount: 210000, gst: 37800, tds: 2100, paid: 0, status: "overdue", matchStatus: "unmatched" },
  ];

  const projectCosts: FinanceState["projectCosts"] = [
    { projectCode: "PRJ-1021", projectName: "Hyundai BIW Cell 3", customer: "Hyundai Motor India", contractValue: 148000000, billed: 62480000, collected: 46000000, materialCost: 41200000, labourCost: 8600000, overheadCost: 3200000, subContractCost: 4400000, committed: 9800000, wip: 5100000, percentComplete: 42, forecastCost: 108000000, status: "on-track" },
    { projectCode: "PRJ-1024", projectName: "Tata BIW Underbody Line", customer: "Tata Motors PV", contractValue: 92000000, billed: 44400000, collected: 32000000, materialCost: 26800000, labourCost: 5400000, overheadCost: 1900000, subContractCost: 3100000, committed: 6200000, wip: 3800000, percentComplete: 48, forecastCost: 68400000, status: "watch" },
    { projectCode: "PRJ-1017", projectName: "Mahindra AMC — Weld Cells", customer: "Mahindra & Mahindra", contractValue: 32000000, billed: 24000000, collected: 21600000, materialCost: 6800000, labourCost: 4800000, overheadCost: 1400000, subContractCost: 900000, committed: 400000, wip: 900000, percentComplete: 78, forecastCost: 18200000, status: "on-track" },
    { projectCode: "PRJ-1032", projectName: "Bajaj Robotic Weld Station", customer: "Bajaj Auto", contractValue: 54000000, billed: 6600000, collected: 0, materialCost: 8400000, labourCost: 2100000, overheadCost: 700000, subContractCost: 1800000, committed: 12400000, wip: 2100000, percentComplete: 14, forecastCost: 39200000, status: "on-track" },
    { projectCode: "PRJ-1015", projectName: "Ashok Leyland Chassis Fixture", customer: "Ashok Leyland", contractValue: 41000000, billed: 38400000, collected: 21000000, materialCost: 20200000, labourCost: 6100000, overheadCost: 2100000, subContractCost: 3900000, committed: 800000, wip: 1600000, percentComplete: 92, forecastCost: 34400000, status: "risk" },
    { projectCode: "PRJ-1029", projectName: "Force Motors Trim Line", customer: "Force Motors", contractValue: 18000000, billed: 12800000, collected: 4000000, materialCost: 8100000, labourCost: 2400000, overheadCost: 900000, subContractCost: 1600000, committed: 400000, wip: 1200000, percentComplete: 66, forecastCost: 15800000, status: "risk" },
  ];

  const taxLedgers: FinanceState["taxLedgers"] = [
    { id: "t1", period: "Sep 2026", type: "GSTR-1", outputTax: 18820000, inputTax: 0, netPayable: 18820000, status: "prepared" },
    { id: "t2", period: "Sep 2026", type: "GSTR-3B", outputTax: 18820000, inputTax: 10620000, netPayable: 8200000, status: "open" },
    { id: "t3", period: "Aug 2026", type: "GSTR-3B", outputTax: 16400000, inputTax: 9200000, netPayable: 7200000, status: "filed", filedAt: iso(-8), reference: "ARN-2408-3B-7788" },
    { id: "t4", period: "Sep 2026", type: "TDS-26Q", outputTax: 0, inputTax: 0, netPayable: 1240000, status: "open" },
    { id: "t5", period: "Aug 2026", type: "TDS-26Q", outputTax: 0, inputTax: 0, netPayable: 1180000, status: "filed", filedAt: iso(-9), reference: "TDS-Q2-2408" },
    { id: "t6", period: "Sep 2026", type: "e-Invoice", outputTax: 0, inputTax: 0, netPayable: 0, status: "prepared", reference: "42 IRNs generated" },
    { id: "t7", period: "Jul 2026", type: "GSTR-3B", outputTax: 14200000, inputTax: 8600000, netPayable: 5600000, status: "late", filedAt: iso(-32), reference: "Late fee ₹1,240" },
  ];

  const bankAccounts: FinanceState["bankAccounts"] = [
    { id: "b1", code: "HDFC-CA-01", bankName: "HDFC Bank", accountNo: "XXXXX4402", branch: "Pune – Hinjewadi", currency: "INR", bookBalance: 42600000, statementBalance: 42184000, lastRecoAt: iso(-1), unreconciledCount: 6, status: "active" },
    { id: "b2", code: "ICICI-CA-02", bankName: "ICICI Bank", accountNo: "XXXXX8811", branch: "Chakan MIDC", currency: "INR", bookBalance: 28900000, statementBalance: 28900000, lastRecoAt: iso(0), unreconciledCount: 0, status: "active" },
    { id: "b3", code: "SBI-EEFC-03", bankName: "SBI (EEFC)", accountNo: "XXXXX2201", branch: "Mumbai Fort", currency: "USD", bookBalance: 12800000, statementBalance: 12580000, lastRecoAt: iso(-4), unreconciledCount: 3, status: "active" },
    { id: "b4", code: "AXIS-CC-04", bankName: "Axis Bank", accountNo: "XXXXX1002", branch: "Pune – Baner", currency: "INR", bookBalance: 8100000, statementBalance: 7960000, lastRecoAt: iso(-2), unreconciledCount: 2, status: "active" },
  ];

  const bankTxns: FinanceState["bankTxns"] = [
    { id: "bt1", bankCode: "HDFC-CA-01", date: iso(0), narration: "NEFT Hyundai Motor India / AR-4405", amount: 21645000, direction: "credit", matchedRef: "AR-INV-4405", status: "matched" },
    { id: "bt2", bankCode: "HDFC-CA-01", date: iso(-1), narration: "RTGS Fanuc Automation / AP-2202", amount: 3120000, direction: "debit", matchedRef: "AP-BILL-2202", status: "matched" },
    { id: "bt3", bankCode: "HDFC-CA-01", date: iso(-1), narration: "GST challan Sep-3B advance", amount: 4000000, direction: "debit", status: "suggested" },
    { id: "bt4", bankCode: "HDFC-CA-01", date: iso(-2), narration: "IMPS FDR interest credit", amount: 184000, direction: "credit", status: "unmatched" },
    { id: "bt5", bankCode: "ICICI-CA-02", date: iso(-1), narration: "NEFT Mahindra AMC receipt", amount: 1440000, direction: "credit", matchedRef: "AR-INV-4403", status: "matched" },
    { id: "bt6", bankCode: "SBI-EEFC-03", date: iso(-3), narration: "SWIFT KUKA Robotics EUR remittance", amount: 4200000, direction: "debit", status: "unmatched" },
    { id: "bt7", bankCode: "AXIS-CC-04", date: iso(0), narration: "Bank charges — LC amendment", amount: 8400, direction: "debit", status: "unmatched" },
  ];

  const costCentres: FinanceState["costCentres"] = [
    { id: "cc1", code: "CC-ENG", name: "Engineering & Design", type: "department", owner: "A. Kulkarni", budget: 48000000, actual: 41200000, status: "active" },
    { id: "cc2", code: "CC-PROD", name: "Production — Chakan Plant", type: "plant", owner: "S. Rane", budget: 126000000, actual: 118400000, status: "active" },
    { id: "cc3", code: "CC-PROC", name: "Supply Chain & Procurement", type: "department", owner: "R. Deshpande", budget: 32000000, actual: 34600000, status: "active" },
    { id: "cc4", code: "CC-QLTY", name: "Quality Assurance", type: "department", owner: "M. Iyer", budget: 18000000, actual: 15900000, status: "active" },
    { id: "cc5", code: "CC-SALES", name: "Revenue & Key Accounts", type: "business-unit", owner: "P. Nair", budget: 26000000, actual: 27800000, status: "active" },
    { id: "cc6", code: "CC-CORP", name: "Corporate & Admin", type: "department", owner: "V. Shah", budget: 22000000, actual: 19100000, status: "active" },
  ];

  const budgets: FinanceState["budgets"] = [
    { id: "bg1", code: "BUD-2026-001", fiscalYear: "FY2026", costCentreCode: "CC-ENG", accountCode: "6100", category: "Manpower", annualBudget: 28000000, ytdBudget: 18600000, ytdActual: 19400000, committed: 1200000, status: "approved", owner: "A. Kulkarni" },
    { id: "bg2", code: "BUD-2026-002", fiscalYear: "FY2026", costCentreCode: "CC-PROD", accountCode: "5000", category: "Direct Material", annualBudget: 168000000, ytdBudget: 112000000, ytdActual: 121400000, committed: 8600000, status: "approved", owner: "S. Rane" },
    { id: "bg3", code: "BUD-2026-003", fiscalYear: "FY2026", costCentreCode: "CC-PROD", accountCode: "6300", category: "Power & Utilities", annualBudget: 18000000, ytdBudget: 12000000, ytdActual: 10800000, committed: 400000, status: "approved", owner: "S. Rane" },
    { id: "bg4", code: "BUD-2026-004", fiscalYear: "FY2026", costCentreCode: "CC-PROC", accountCode: "5100", category: "Bought-Out Automation", annualBudget: 96000000, ytdBudget: 64000000, ytdActual: 71200000, committed: 12400000, status: "approved", owner: "R. Deshpande" },
    { id: "bg5", code: "BUD-2026-005", fiscalYear: "FY2026", costCentreCode: "CC-QLTY", accountCode: "6100", category: "Quality Manpower", annualBudget: 12000000, ytdBudget: 8000000, ytdActual: 7100000, committed: 200000, status: "approved", owner: "M. Iyer" },
    { id: "bg6", code: "BUD-2026-006", fiscalYear: "FY2026", costCentreCode: "CC-SALES", accountCode: "6100", category: "Sales & Travel", annualBudget: 14000000, ytdBudget: 9300000, ytdActual: 10600000, committed: 600000, status: "submitted", owner: "P. Nair" },
    { id: "bg7", code: "BUD-2026-007", fiscalYear: "FY2026", costCentreCode: "CC-CORP", accountCode: "6500", category: "Depreciation", annualBudget: 24000000, ytdBudget: 16000000, ytdActual: 15400000, committed: 0, status: "approved", owner: "V. Shah" },
    { id: "bg8", code: "BUD-2026-008", fiscalYear: "FY2026", costCentreCode: "CC-ENG", accountCode: "5200", category: "Design Sub-contract", annualBudget: 21000000, ytdBudget: 14000000, ytdActual: 12200000, committed: 3100000, status: "draft", owner: "A. Kulkarni" },
  ];

  const fixedAssets: FinanceState["fixedAssets"] = [
    { id: "fa1", code: "FA-0001", name: "Fanuc R-2000iC Robot Cell", category: "plant-machinery", costCentreCode: "CC-PROD", projectCode: "PRJ-1021", acquiredAt: iso(-820), cost: 28400000, salvage: 1400000, usefulLifeYears: 10, accumulatedDepreciation: 6060000, method: "SLM", location: "Chakan Bay 2", status: "active" },
    { id: "fa2", code: "FA-0002", name: "Amada 6kW Fibre Laser", category: "plant-machinery", costCentreCode: "CC-PROD", acquiredAt: iso(-1240), cost: 41800000, salvage: 2200000, usefulLifeYears: 12, accumulatedDepreciation: 11200000, method: "SLM", location: "Chakan Bay 1", status: "active" },
    { id: "fa3", code: "FA-0003", name: "CMM Zeiss Contura", category: "plant-machinery", costCentreCode: "CC-QLTY", acquiredAt: iso(-560), cost: 9600000, salvage: 480000, usefulLifeYears: 10, accumulatedDepreciation: 1400000, method: "SLM", location: "Metrology Lab", status: "active" },
    { id: "fa4", code: "FA-0004", name: "Welding Fixture Set — BIW", category: "tooling", costCentreCode: "CC-PROD", projectCode: "PRJ-1024", acquiredAt: iso(-300), cost: 6200000, salvage: 0, usefulLifeYears: 5, accumulatedDepreciation: 1020000, method: "WDV", location: "Chakan Bay 3", status: "under-maintenance" },
    { id: "fa5", code: "FA-0005", name: "Engineering Workstations (12)", category: "it-equipment", costCentreCode: "CC-ENG", acquiredAt: iso(-420), cost: 3400000, salvage: 200000, usefulLifeYears: 4, accumulatedDepreciation: 920000, method: "SLM", location: "Pune Design Centre", status: "active" },
    { id: "fa6", code: "FA-0006", name: "Tata Ace Delivery Van", category: "vehicles", costCentreCode: "CC-PROC", acquiredAt: iso(-1600), cost: 980000, salvage: 100000, usefulLifeYears: 8, accumulatedDepreciation: 480000, method: "WDV", location: "Chakan Stores", status: "active" },
    { id: "fa7", code: "FA-0007", name: "Legacy CNC VMC (retired)", category: "plant-machinery", costCentreCode: "CC-PROD", acquiredAt: iso(-3200), cost: 7400000, salvage: 300000, usefulLifeYears: 10, accumulatedDepreciation: 7100000, method: "SLM", location: "Disposed", status: "disposed", disposedAt: iso(-45), disposalValue: 420000 },
  ];

  const period = new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const closeTasks: FinanceState["closeTasks"] = [
    { id: "ct1", period, sequence: 1, title: "Post all pending AR invoices & revenue recognition", area: "AR", owner: "Finance Bot", dueAt: iso(2), status: "in-progress", automated: true },
    { id: "ct2", period, sequence: 2, title: "Complete 3-way match on open vendor bills", area: "AP", owner: "R. Deshpande", dueAt: iso(2), status: "pending", automated: true },
    { id: "ct3", period, sequence: 3, title: "Bank reconciliation for all active accounts", area: "Bank", owner: "Finance Bot", dueAt: iso(3), status: "pending", automated: true },
    { id: "ct4", period, sequence: 4, title: "Payroll journal posting & TDS provisioning", area: "Payroll", owner: "HR Sync", dueAt: iso(3), status: "pending", automated: true },
    { id: "ct5", period, sequence: 5, title: "Inventory & WIP valuation cut-off", area: "Inventory", owner: "S. Rane", dueAt: iso(4), status: "pending", automated: false },
    { id: "ct6", period, sequence: 6, title: "Depreciation run for fixed asset register", area: "Assets", owner: "Finance Bot", dueAt: iso(4), status: "pending", automated: true },
    { id: "ct7", period, sequence: 7, title: "GST output vs input reconciliation (GSTR-3B)", area: "Tax", owner: "V. Shah", dueAt: iso(5), status: "pending", automated: false },
    { id: "ct8", period, sequence: 8, title: "Trial balance review & unbalanced journal clearance", area: "GL", owner: "V. Shah", dueAt: iso(6), status: "pending", automated: true },
    { id: "ct9", period, sequence: 9, title: "Management reporting pack & variance commentary", area: "Reporting", owner: "Finance Bot", dueAt: iso(7), status: "pending", automated: true },
  ];

  return {
    accounts, journals, arInvoices, apBills, projectCosts, taxLedgers, bankAccounts, bankTxns,
    costCentres, budgets, fixedAssets, closeTasks,
  };

}

function load(): FinanceState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as FinanceState;
  } catch {
    return seed();
  }
}

let state: FinanceState = load();
const listeners = new Set<() => void>();

function save() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const finance = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  update(mut: (s: FinanceState) => void) { mut(state); state = { ...state }; save(); },
  reset() { state = seed(); save(); },
};

export function useFinance<T>(sel: (s: FinanceState) => T): T {
  return useSyncExternalStore(finance.subscribe, () => sel(state), () => sel(state));
}

/* ============================================================
   CRUD + workflow engine
   ============================================================ */

const fCrud = makeCrud<FinanceState & Record<string, unknown>>(
  finance as unknown as { update(mut: (s: FinanceState & Record<string, unknown>) => void): void },
);

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function nextCode(prefix: string, existing: string[], pad = 4) {
  const max = existing.reduce((m, c) => {
    const n = Number((c.match(/(\d+)\s*$/) ?? [])[1]);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(pad, "0")}`;
}

function arStatusFor(inv: ARInvoice): ARInvoice["status"] {
  if (inv.status === "void" || inv.status === "draft") return inv.status;
  const net = inv.amount + inv.gst - inv.tds;
  if (inv.received >= net && net > 0) return "paid";
  if (inv.received > 0) return "partial";
  if (new Date(inv.dueAt).getTime() < Date.now()) return "overdue";
  return "sent";
}

function apStatusFor(bill: APBill): APBill["status"] {
  if (bill.status === "hold") return "hold";
  const net = bill.amount + bill.gst - bill.tds;
  if (bill.paid >= net && net > 0) return "paid";
  if (bill.paid > 0) return "partial";
  if (new Date(bill.dueAt).getTime() < Date.now()) return "overdue";
  if (bill.status === "approved") return "approved";
  return bill.matchStatus === "matched" ? "3wm-ok" : "pending";
}

/** Debit increases assets & expenses; credit increases liabilities, equity & income. */
function applyJournal(s: FinanceState, j: Journal, sign: 1 | -1) {
  for (const line of j.lines) {
    const acc = s.accounts.find((a) => a.code === line.accountCode);
    if (!acc) continue;
    const debitPositive = acc.type === "asset" || acc.type === "expense";
    const delta = (line.debit - line.credit) * (debitPositive ? 1 : -1);
    acc.balance += delta * sign;
  }
}

function recomputeBank(s: FinanceState, bankCode: string) {
  const acc = s.bankAccounts.find((b) => b.code === bankCode);
  if (!acc) return;
  acc.unreconciledCount = s.bankTxns.filter((t) => t.bankCode === bankCode && t.status !== "matched").length;
}

/** Create or update any finance collection, applying numbering + derived status. */
export function upsertFinance(key: string, record: Record<string, unknown>): string {
  const s = finance.get();
  const rec: Record<string, unknown> = { ...record };

  if (key === "journals") {
    if (!rec.code) rec.code = nextCode("JV-", s.journals.map((j) => j.code));
    if (!rec.lines) rec.lines = (record.lines as unknown[]) ?? [];
    if (!rec.status) rec.status = "draft";
    if (!rec.date) rec.date = new Date().toISOString();
  }

  if (key === "arInvoices") {
    if (!rec.code) rec.code = nextCode("AR-INV-", s.arInvoices.map((i) => i.code));
    ["amount", "gst", "tds", "received"].forEach((f) => (rec[f] = num(rec[f])));
    if (!rec.gst) rec.gst = Math.round(num(rec.amount) * 0.18);
    if (!rec.tds) rec.tds = Math.round(num(rec.amount) * 0.01);
    rec.status = arStatusFor({ ...(rec as unknown as ARInvoice) });
  }

  if (key === "apBills") {
    if (!rec.code) rec.code = nextCode("AP-BILL-", s.apBills.map((b) => b.code));
    ["amount", "gst", "tds", "paid"].forEach((f) => (rec[f] = num(rec[f])));
    if (!rec.gst) rec.gst = Math.round(num(rec.amount) * 0.18);
    if (!rec.matchStatus) rec.matchStatus = rec.grnCode && rec.poCode ? "matched" : "unmatched";
    rec.status = apStatusFor({ ...(rec as unknown as APBill) });
  }

  if (key === "accounts") {
    rec.balance = num(rec.balance);
    rec.currency = "INR";
    rec.isControl = rec.isControl === "yes" || rec.isControl === true;
  }

  if (key === "bankAccounts") {
    ["bookBalance", "statementBalance"].forEach((f) => (rec[f] = num(rec[f])));
    if (!rec.lastRecoAt) rec.lastRecoAt = new Date().toISOString();
    if (rec.unreconciledCount === undefined) rec.unreconciledCount = 0;
  }

  if (key === "bankTxns") {
    rec.amount = num(rec.amount);
    if (!rec.status) rec.status = rec.matchedRef ? "matched" : "unmatched";
  }

  if (key === "projectCosts") {
    [
      "contractValue", "billed", "collected", "materialCost", "labourCost", "overheadCost",
      "subContractCost", "committed", "wip", "percentComplete", "forecastCost",
    ].forEach((f) => (rec[f] = num(rec[f])));
    const margin = num(rec.contractValue)
      ? ((num(rec.contractValue) - num(rec.forecastCost)) / num(rec.contractValue)) * 100
      : 0;
    rec.status = margin < 15 ? "risk" : margin < 25 ? "watch" : "on-track";
    if (!rec.id) {
      const existing = s.projectCosts.find((p) => p.projectCode === rec.projectCode);
      if (existing) rec.id = (existing as unknown as { id?: string }).id;
    }
  }

  if (key === "taxLedgers") {
    ["outputTax", "inputTax", "netPayable"].forEach((f) => (rec[f] = num(rec[f])));
    if (!rec.netPayable) rec.netPayable = Math.max(0, num(rec.outputTax) - num(rec.inputTax));
  }

  const id = fCrud.upsert(key as string, rec);
  if (key === "bankTxns") finance.update((st) => recomputeBank(st, String(rec.bankCode)));
  return id;
}

export const deleteFinance = (key: string, id: string) => {
  fCrud.remove(key as string, id);
};

/* ---------- General ledger ---------- */

export function postJournal(id: string) {
  finance.update((s) => {
    const j = s.journals.find((x) => x.id === id);
    if (!j || j.status === "posted") return;
    applyJournal(s, j, 1);
    j.status = "posted";
  });
}

export function voidJournal(id: string) {
  finance.update((s) => {
    const j = s.journals.find((x) => x.id === id);
    if (!j || j.status === "void") return;
    if (j.status === "posted") applyJournal(s, j, -1);
    j.status = "void";
  });
}

export function reopenJournal(id: string) {
  finance.update((s) => {
    const j = s.journals.find((x) => x.id === id);
    if (!j) return;
    if (j.status === "posted") applyJournal(s, j, -1);
    j.status = "draft";
  });
}

export function upsertJournalLine(journalId: string, line: Record<string, unknown>, index?: number) {
  finance.update((s) => {
    const j = s.journals.find((x) => x.id === journalId);
    if (!j) return;
    const next = {
      accountCode: String(line.accountCode ?? ""),
      debit: num(line.debit),
      credit: num(line.credit),
      projectCode: (line.projectCode as string) || undefined,
      memo: (line.memo as string) || undefined,
    };
    if (typeof index === "number" && j.lines[index]) j.lines[index] = next;
    else j.lines = [...j.lines, next];
  });
}

export function removeJournalLine(journalId: string, index: number) {
  finance.update((s) => {
    const j = s.journals.find((x) => x.id === journalId);
    if (!j) return;
    j.lines = j.lines.filter((_, i) => i !== index);
  });
}

/* ---------- Receivables ---------- */

export function sendInvoice(id: string) {
  finance.update((s) => {
    const inv = s.arInvoices.find((x) => x.id === id);
    if (!inv) return;
    inv.status = "sent";
    if (!inv.eInvoiceIRN) inv.eInvoiceIRN = `IRN-${new Date().getFullYear()}-${inv.code.replace(/\D/g, "").slice(-4)}`;
  });
  createJournalFor("AR", id);
}

export function recordReceipt(id: string, payload: { amount: number; date: string; bankCode: string; ref?: string }) {
  finance.update((s) => {
    const inv = s.arInvoices.find((x) => x.id === id);
    if (!inv) return;
    inv.received = Math.min(inv.amount + inv.gst - inv.tds, inv.received + num(payload.amount));
    inv.status = arStatusFor(inv);

    const bank = s.bankAccounts.find((b) => b.code === payload.bankCode);
    if (bank) bank.bookBalance += num(payload.amount);

    s.bankTxns = [
      {
        id: crypto.randomUUID(),
        bankCode: payload.bankCode,
        date: payload.date || new Date().toISOString(),
        narration: `Receipt ${inv.customerName} / ${inv.code}${payload.ref ? ` / ${payload.ref}` : ""}`,
        amount: num(payload.amount),
        direction: "credit",
        matchedRef: inv.code,
        status: "matched",
      },
      ...s.bankTxns,
    ];

    s.journals = [
      {
        id: crypto.randomUUID(),
        code: nextCode("JV-", s.journals.map((j) => j.code)),
        date: payload.date || new Date().toISOString(),
        reference: inv.code,
        narration: `Customer receipt — ${inv.customerName}`,
        status: "posted",
        source: "bank",
        createdBy: "Finance",
        lines: [
          { accountCode: "1100", debit: num(payload.amount), credit: 0, memo: payload.bankCode },
          { accountCode: "1200", debit: 0, credit: num(payload.amount), projectCode: inv.projectCode },
        ],
      },
      ...s.journals,
    ];

    const cost = s.projectCosts.find((p) => p.projectCode === inv.projectCode);
    if (cost) cost.collected += num(payload.amount);
    recomputeBank(s, payload.bankCode);
  });
}

export function voidInvoice(id: string) {
  finance.update((s) => {
    const inv = s.arInvoices.find((x) => x.id === id);
    if (inv) inv.status = "void";
  });
}

/* ---------- Payables ---------- */

export function runThreeWayMatch(id: string) {
  finance.update((s) => {
    const b = s.apBills.find((x) => x.id === id);
    if (!b) return;
    b.matchStatus = b.poCode && b.grnCode ? "matched" : b.poCode ? "qty-var" : "unmatched";
    b.status = apStatusFor(b);
  });
}

export function approveBill(id: string) {
  finance.update((s) => {
    const b = s.apBills.find((x) => x.id === id);
    if (!b) return;
    b.status = "approved";
  });
  createJournalFor("AP", id);
}

export function holdBill(id: string) {
  finance.update((s) => {
    const b = s.apBills.find((x) => x.id === id);
    if (b) b.status = "hold";
  });
}

export function releaseBill(id: string) {
  finance.update((s) => {
    const b = s.apBills.find((x) => x.id === id);
    if (!b) return;
    b.status = "pending";
    b.status = apStatusFor(b);
  });
}

export function recordPayment(id: string, payload: { amount: number; date: string; bankCode: string; ref?: string }) {
  finance.update((s) => {
    const b = s.apBills.find((x) => x.id === id);
    if (!b) return;
    b.paid = Math.min(b.amount + b.gst - b.tds, b.paid + num(payload.amount));
    b.status = apStatusFor(b);

    const bank = s.bankAccounts.find((x) => x.code === payload.bankCode);
    if (bank) bank.bookBalance -= num(payload.amount);

    s.bankTxns = [
      {
        id: crypto.randomUUID(),
        bankCode: payload.bankCode,
        date: payload.date || new Date().toISOString(),
        narration: `Payment ${b.vendorName} / ${b.code}${payload.ref ? ` / ${payload.ref}` : ""}`,
        amount: num(payload.amount),
        direction: "debit",
        matchedRef: b.code,
        status: "matched",
      },
      ...s.bankTxns,
    ];

    s.journals = [
      {
        id: crypto.randomUUID(),
        code: nextCode("JV-", s.journals.map((j) => j.code)),
        date: payload.date || new Date().toISOString(),
        reference: b.code,
        narration: `Vendor payment — ${b.vendorName}`,
        status: "posted",
        source: "bank",
        createdBy: "Finance",
        lines: [
          { accountCode: "2100", debit: num(payload.amount), credit: 0 },
          { accountCode: "1100", debit: 0, credit: num(payload.amount), memo: payload.bankCode },
        ],
      },
      ...s.journals,
    ];
    recomputeBank(s, payload.bankCode);
  });
}

/** Auto-create the accounting entry behind an AR invoice or AP bill. */
export function createJournalFor(kind: "AR" | "AP", docId: string) {
  finance.update((s) => {
    if (kind === "AR") {
      const inv = s.arInvoices.find((x) => x.id === docId);
      if (!inv || s.journals.some((j) => j.reference === inv.code && j.source === "AR")) return;
      s.journals = [
        {
          id: crypto.randomUUID(),
          code: nextCode("JV-", s.journals.map((j) => j.code)),
          date: inv.issuedAt,
          reference: inv.code,
          narration: `Sales invoice — ${inv.customerName}`,
          status: "posted",
          source: "AR",
          createdBy: "Finance",
          lines: [
            { accountCode: "1200", debit: inv.amount + inv.gst - inv.tds, credit: 0, projectCode: inv.projectCode, memo: `AR — ${inv.customerName}` },
            { accountCode: "4000", debit: 0, credit: inv.amount, projectCode: inv.projectCode },
            { accountCode: "2200", debit: 0, credit: inv.gst, memo: "Output GST" },
          ],
        },
        ...s.journals,
      ];
      const cost = s.projectCosts.find((p) => p.projectCode === inv.projectCode);
      if (cost) cost.billed += inv.amount;
    } else {
      const b = s.apBills.find((x) => x.id === docId);
      if (!b || s.journals.some((j) => j.reference === b.code && j.source === "AP")) return;
      s.journals = [
        {
          id: crypto.randomUUID(),
          code: nextCode("JV-", s.journals.map((j) => j.code)),
          date: b.receivedAt,
          reference: b.code,
          narration: `Bill booking — ${b.vendorName}`,
          status: "posted",
          source: "AP",
          createdBy: "Finance",
          lines: [
            { accountCode: "5000", debit: b.amount, credit: 0 },
            { accountCode: "2200", debit: b.gst, credit: 0, memo: "Input GST" },
            { accountCode: "2100", debit: 0, credit: b.amount + b.gst - b.tds, memo: `AP — ${b.vendorName}` },
            { accountCode: "2210", debit: 0, credit: b.tds, memo: "TDS payable" },
          ],
        },
        ...s.journals,
      ];
    }
  });
}

/* ---------- Tax ---------- */

export function prepareTaxReturn(id: string) {
  finance.update((s) => {
    const t = s.taxLedgers.find((x) => x.id === id);
    if (!t) return;
    t.status = "prepared";
    t.netPayable = Math.max(0, t.outputTax - t.inputTax);
  });
}

export function fileTaxReturn(id: string) {
  finance.update((s) => {
    const t = s.taxLedgers.find((x) => x.id === id);
    if (!t) return;
    const overdue = t.status === "late";
    t.status = overdue ? "late" : "filed";
    t.filedAt = new Date().toISOString();
    t.reference = `ARN-${t.type.replace(/\W/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;
  });
}

/* ---------- Bank ---------- */

export function matchTxn(id: string, ref: string) {
  finance.update((s) => {
    const t = s.bankTxns.find((x) => x.id === id);
    if (!t) return;
    t.matchedRef = ref;
    t.status = "matched";
    recomputeBank(s, t.bankCode);
  });
}

export function unmatchTxn(id: string) {
  finance.update((s) => {
    const t = s.bankTxns.find((x) => x.id === id);
    if (!t) return;
    t.matchedRef = undefined;
    t.status = "unmatched";
    recomputeBank(s, t.bankCode);
  });
}

/** Suggest / apply matches by scanning narrations for AR / AP document codes. */
export function autoMatchBank(bankCode: string): number {
  let matched = 0;
  finance.update((s) => {
    const codes = [...s.arInvoices.map((i) => i.code), ...s.apBills.map((b) => b.code)];
    for (const t of s.bankTxns) {
      if (t.bankCode !== bankCode || t.status === "matched") continue;
      const hit = codes.find((c) => t.narration.toUpperCase().includes(c.toUpperCase()))
        ?? codes.find((c) => t.narration.replace(/\W/g, "").toUpperCase().includes(c.replace(/\W/g, "").toUpperCase()));
      if (hit) {
        t.matchedRef = hit;
        t.status = "matched";
        matched += 1;
      }
    }
    recomputeBank(s, bankCode);
  });
  return matched;
}

export function confirmReco(bankCode: string) {
  finance.update((s) => {
    const b = s.bankAccounts.find((x) => x.code === bankCode);
    if (!b) return;
    b.statementBalance = b.bookBalance;
    b.lastRecoAt = new Date().toISOString();
    b.unreconciledCount = s.bankTxns.filter((t) => t.bankCode === bankCode && t.status !== "matched").length;
  });
}

