# Finance Module — Demo Script

Six workflows, all backed by what is already implemented. Suggested runtime: 25-30 minutes.

## 1. Order to Cash (5 min)
Path: CRM Order Acceptance -> Project auto-created -> Finance > AR

- Approve an Order Acceptance in CRM; show the project provisioned automatically.
- Open Finance > AR: milestone billing plan generated from the order value.
- Raise a milestone invoice; show the auto journal (Debit Receivables / Credit Revenue) appearing in Finance > GL with no manual entry.
- Show HSN/SAC and CGST-SGST-IGST split computed automatically from Item Master.

## 2. Procure to Pay with 3-way match (5 min)
Path: Procurement PO -> GRN -> Finance > AP

- Show an open PO, then post the GRN; the GRN event posts the material accrual journal.
- Open the vendor invoice in AP: the 3-way match (PO / GRN / Invoice) validates quantity and rate.
- Demo the AI part-number validator on the toolbar: upload the vendor invoice PDF, the vision extraction returns line items, and the matcher flags near-matches, rate variance over 10%, and HSN mismatches.
- Show TDS auto-deduction on the payable via the TDS rules engine, with the statutory ledger entry.

## 3. Project Costing, WIP and Revenue Recognition (5 min)
Path: Finance > Projects, Finance > WIP

- Project costing build-up drill-down: material, labour, committed costs rolled up from open POs/PRs.
- Approve a timesheet in Workforce; show the idempotent weekly labour journal appear against the project.
- Finance > WIP: run the period WIP calculation with Percentage of Completion (cost-to-cost); show opening / additions / released / closing and the auto-generated WIP journal.
- Show the Projects to Finance reconciliation view.

## 4. Expense Allocation and Project P&L (4 min)
Path: Finance > Allocation, Finance > Project P&L

- Show an allocation rule (for example admin overhead by man-hours) and run the allocation cycle.
- Open Project P&L: revenue, direct costs (material, labour, travel), allocated overheads, gross and net margin.
- Switch to the Project Balance Sheet: receivables, advances, unbilled WIP, accruals.

## 5. Statements and Drill-through (4 min)
Path: Finance > Statements

- Generate Trial Balance, P&L, Balance Sheet, and Cash Flow with dimension filters (project, FY, period).
- Drill from a P&L line to the GL account, then to the source transaction (invoice / GRN / timesheet journal).

## 6. AI Copilot and Closure (5 min)
Path: Finance > Copilot, Finance > Project Closure

- Finance Copilot: run the Cash, Receivables and Margin assistants; show the 13-week cash forecast and collection-risk narrative grounded in live ledger data.
- Ask Finance chat: a free-form question answered from the live facts payload.
- Project Closure wizard: run the validation checklist (open POs, open AR, WIP balance, stock on hand); show a blocked closure, resolve one item, then close and demonstrate the posting guard rejecting a new entry against the closed project.

## Pre-demo checklist
- Seed or verify one project with: an approved OA, an open PO with GRN, an approved timesheet week, one issued invoice, and one vendor bill.
- Keep a sample vendor invoice PDF ready for the OCR validator.
- Keep a second project deliberately "not closable" so the closure guard demo works.
