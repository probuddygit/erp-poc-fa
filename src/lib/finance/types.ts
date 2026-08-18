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
  /** Cost dimensions used by project accounting and allocation. */
  department?: string;
  costCentreCode?: string;
  expenseCategory?: string;
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
  /** Cost dimensions — inherited from the source document where available. */
  department?: string;
  costCentreCode?: string;
  expenseCategory?: string;
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
  /** Derived: contract value x % complete. */
  earnedValue?: number;
  /** Derived: forecast cost - incurred cost. */
  costToComplete?: number;
  /** Derived: earned value - billed, when positive (WIP asset). */
  unbilledRevenue?: number;
  /** Derived: billed - earned value, when positive (advance / liability). */
  overBilling?: number;
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

/* ============================================================
   Project accounting — WIP, allocation, closure
   ============================================================ */

export type WipMethod = "poc-cost" | "poc-progress" | "completed-contract";

export interface WipEntry {
  id: string;
  /** YYYY-MM accounting period. */
  period: string;
  projectCode: string;
  projectName: string;
  department?: string;
  method: WipMethod;
  contractValue: number;
  costIncurred: number;
  revenueRecognised: number;
  percentComplete: number;
  pcSource: "system" | "manual";
  opening: number;
  additions: number;
  released: number;
  closing: number;
  status: "draft" | "posted";
  journalCode?: string;
  computedAt: string;
}

export interface PercentCompleteAudit {
  id: string;
  projectCode: string;
  fromPct: number;
  toPct: number;
  source: "system" | "manual";
  by: string;
  at: string;
  reason?: string;
}

export type AllocationMethod =
  | "direct"
  | "department"
  | "percentage"
  | "man-hour"
  | "quantity"
  | "cost-centre";

export interface AllocationTarget {
  projectCode: string;
  /** Share of the pooled cost, in percent. */
  pct: number;
}

export interface AllocationRule {
  id: string;
  code: string;
  name: string;
  method: AllocationMethod;
  /** Pool being allocated — expense account and/or cost centre. */
  accountCode?: string;
  costCentreCode?: string;
  department?: string;
  expenseCategory?: string;
  targets: AllocationTarget[];
  active: boolean;
  notes?: string;
}

export interface AllocationRun {
  id: string;
  ruleCode: string;
  period: string;
  amount: number;
  lines: Array<{ projectCode: string; amount: number }>;
  journalCode?: string;
  at: string;
  by: string;
}

export interface ClosureCheck {
  key: string;
  label: string;
  status: "pass" | "blocker" | "warning";
  detail: string;
  count: number;
  value?: number;
}

export interface ProjectAdjustment {
  id: string;
  projectCode: string;
  reason: string;
  amount: number;
  accountCode: string;
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  approver?: string;
  decidedAt?: string;
}

export interface ProjectClosure {
  id: string;
  projectCode: string;
  projectName: string;
  status: "open" | "closure-requested" | "closed";
  requestedBy?: string;
  requestedAt?: string;
  closedBy?: string;
  closedAt?: string;
  checks: ClosureCheck[];
  snapshot?: {
    contractValue: number;
    billed: number;
    collected: number;
    costIncurred: number;
    wip: number;
    unbilledRevenue: number;
    margin: number;
    marginPct: number;
  };
  adjustments: ProjectAdjustment[];
  notes?: string;
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
  wipEntries: WipEntry[];
  pcAudits: PercentCompleteAudit[];
  allocationRules: AllocationRule[];
  allocationRuns: AllocationRun[];
  closures: ProjectClosure[];
}


