export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  balance: number;
  currency: "INR";
  isControl?: boolean;
}

export interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  projectCode?: string;
  memo?: string;
}

export interface Journal {
  id: string;
  code: string;
  date: string;
  reference: string;
  narration: string;
  status: "draft" | "posted" | "void";
  source: "manual" | "AR" | "AP" | "bank" | "payroll" | "system";
  lines: JournalLine[];
  createdBy: string;
}

export interface ARInvoice {
  id: string;
  code: string;
  customerName: string;
  projectCode?: string;
  issuedAt: string;
  dueAt: string;
  amount: number;
  gst: number;
  tds: number;
  received: number;
  status: "draft" | "sent" | "partial" | "paid" | "overdue" | "void";
  eInvoiceIRN?: string;
  ewayBillNo?: string;
  /** Traceability back to the revenue lifecycle document that raised this bill. */
  sourceOaCode?: string;
  sourceOaId?: string;
  sourceMilestoneId?: string;
  billingKind?: "advance" | "milestone" | "manual";
}

export interface APBill {
  id: string;
  code: string;
  vendorName: string;
  poCode?: string;
  grnCode?: string;
  projectCode?: string;
  costType?: "material" | "subcontract" | "overhead" | "capex";
  receivedAt: string;
  dueAt: string;
  amount: number;
  gst: number;
  tds: number;
  paid: number;
  status: "pending" | "3wm-ok" | "approved" | "partial" | "paid" | "hold" | "overdue";
  matchStatus: "matched" | "price-var" | "qty-var" | "unmatched";
}


export interface ProjectCost {
  projectCode: string;
  projectName: string;
  customer: string;
  contractValue: number;
  billed: number;
  collected: number;
  materialCost: number;
  labourCost: number;
  overheadCost: number;
  subContractCost: number;
  committed: number;
  wip: number;
  percentComplete: number;
  forecastCost: number;
  status: "on-track" | "watch" | "risk";
}

export interface TaxLedger {
  id: string;
  period: string;
  type: "GSTR-1" | "GSTR-3B" | "TDS-26Q" | "TDS-24Q" | "e-Invoice";
  outputTax: number;
  inputTax: number;
  netPayable: number;
  filedAt?: string;
  status: "open" | "prepared" | "filed" | "late";
  reference?: string;
}

export interface BankAccount {
  id: string;
  code: string;
  bankName: string;
  accountNo: string;
  branch: string;
  currency: "INR" | "USD" | "EUR";
  bookBalance: number;
  statementBalance: number;
  lastRecoAt: string;
  unreconciledCount: number;
  status: "active" | "dormant";
}

export interface BankTxn {
  id: string;
  bankCode: string;
  date: string;
  narration: string;
  amount: number;
  direction: "credit" | "debit";
  matchedRef?: string;
  status: "matched" | "unmatched" | "suggested";
}

export interface FinancialLine {
  code: string;
  label: string;
  amount: number;
  cyPct?: number;
  py?: number;
  group?: string;
  indent?: number;
  emphasis?: boolean;
}

export interface CostCentre {
  id: string;
  code: string;
  name: string;
  type: "department" | "plant" | "business-unit" | "project-pool";
  owner: string;
  budget: number;
  actual: number;
  status: "active" | "inactive";
}

export interface BudgetLine {
  id: string;
  code: string;
  fiscalYear: string;
  costCentreCode: string;
  accountCode: string;
  category: string;
  annualBudget: number;
  ytdBudget: number;
  ytdActual: number;
  committed: number;
  status: "draft" | "submitted" | "approved" | "rejected" | "locked";
  owner: string;
  notes?: string;
}

export interface FixedAsset {
  id: string;
  code: string;
  name: string;
  category: "plant-machinery" | "tooling" | "it-equipment" | "vehicles" | "furniture" | "building";
  costCentreCode?: string;
  projectCode?: string;
  acquiredAt: string;
  cost: number;
  salvage: number;
  usefulLifeYears: number;
  accumulatedDepreciation: number;
  method: "SLM" | "WDV";
  location: string;
  status: "active" | "under-maintenance" | "disposed";
  disposedAt?: string;
  disposalValue?: number;
}

export interface CloseTask {
  id: string;
  period: string;
  sequence: number;
  title: string;
  area: "AR" | "AP" | "GL" | "Bank" | "Tax" | "Payroll" | "Inventory" | "Assets" | "Reporting";
  owner: string;
  dueAt: string;
  status: "pending" | "in-progress" | "done" | "blocked";
  automated: boolean;
  note?: string;
}

export interface FinancialLine {
  code: string;
  label: string;
  amount: number;
  cyPct?: number;
  py?: number;
  group?: string;
  indent?: number;
  emphasis?: boolean;
}

export interface FinanceState {
  accounts: Account[];
  journals: Journal[];
  arInvoices: ARInvoice[];
  apBills: APBill[];
  projectCosts: ProjectCost[];
  taxLedgers: TaxLedger[];
  bankAccounts: BankAccount[];
  bankTxns: BankTxn[];
  costCentres: CostCentre[];
  budgets: BudgetLine[];
  fixedAssets: FixedAsset[];
  closeTasks: CloseTask[];
}

