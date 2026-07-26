import { useSyncExternalStore } from "react";
import type { FinanceState } from "./types";

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

  return { accounts, journals, arInvoices, apBills, projectCosts, taxLedgers, bankAccounts, bankTxns };
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
