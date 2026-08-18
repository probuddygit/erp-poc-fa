# Finance — Project Accounting, WIP, Project P&L, Closure

Today Finance already rolls up project cost, billing, % complete, earned value and a cost-based WIP number (incurred − billed) on the "Project Costing & WIP" tab, and can post journals from Procurement, Payroll, Projects and CRM. What's missing is a *period-based* WIP ledger with journals, allocation rules for non-project expenses, a real project P&L / balance sheet, and a controlled financial closure. This plan adds those four blocks.

## 1. WIP engine and period ledger

- New WIP ledger record per project × accounting period holding: contract value, cost incurred, revenue recognised, % complete, WIP opening, additions, released, closing, method, source of % complete, status (draft/posted).
- Configurable methodology per project: **Percentage of Completion (cost-to-cost)**, **POC on approved progress**, or **Completed Contract**. Default: POC on approved progress.
- % complete sourced from Project Systems (weighted WBS progress, already streamed in). Finance can override with a *manually approved* value — every change writes an audit entry (old %, new %, source, user, timestamp, reason).
- WIP journal generation per period: Dr WIP / Cr WIP Accrued Revenue for additions, reverse on release when a milestone invoice is raised. Idempotent by period + project, posted only on user action.
- WIP maintained and filterable by project, project code, department and period.
- **Reconciliation view**: Projects module figures (progress, milestone value, budget) vs Finance figures (cost incurred, revenue recognised, WIP closing), with variance flags and drill-through.

## 2. Project-wise expense allocation

- Every cost document (AP bill, journal line, employee expense, travel, inventory issue, asset depreciation, bank/finance charge) carries project code, department, cost centre and expense category; missing values are flagged in an "Unallocated cost" queue.
- Non-project spend routes to a Corporate/Department cost centre.
- Allocation rule engine with configurable methods: direct project, department, fixed percentage split, man-hour driven, quantity driven, cost-centre driven. Rules are listed, editable and can be run for a period to generate allocation journals with full trace back to the source document.

## 3. Project P&L (profitability engine)

- Consolidated per-project statement: revenue (sales orders, customer invoices, milestone billing, recognised revenue) vs costs (procurement, inventory consumption, man-hours, travel, expenses, subcontract, assets/depreciation, bank & finance charges, allocated overheads).
- Views: all / ongoing / completed projects; gross margin, net margin, budget vs actual, forecast vs actual.
- Each line drills down to the underlying bills, journals and invoices (reusing the existing cost build-up dialog pattern). Print + CSV export.

## 4. Project balance sheet

- Project-level balances: receivables, customer advances, payables, inventory held for project, WIP, unbilled revenue, project assets, accrued costs, other.
- Drill-down from every balance to the source transactions; export and print.

## 5. Project financial closure

- Closure wizard with a validation checklist: open sales orders, open POs, pending GRNs, pending supplier invoices, receivables, payables, advances, WIP, unbilled revenue, pending expenses, open commitments, inventory, open change orders. Each check shows pass/blocker with a link to the offending records.
- Only Admin / Finance roles may close (role check on the action).
- After closure: new financial transactions against the project are blocked at the posting layer; adjustment entries are possible only via an approval request that records requester, approver and reason.
- Closure Report with a frozen financial snapshot (contract value, billed, collected, cost, WIP, margin), closure date, user and approvals — stored in history and printable.

## Technical notes

- Types extended in `src/lib/finance/types.ts`: `WipEntry`, `PercentCompleteAudit`, `AllocationRule`, `AllocationRun`, `ProjectClosure`, plus project/department/cost-centre/category fields on cost records.
- WIP + allocation + closure logic lives in new modules `src/lib/finance/wip.ts`, `src/lib/finance/allocation.ts`, `src/lib/finance/closure.ts`; the profitability/balance-sheet aggregation extends `src/lib/finance/intelligence.ts`. `recomputeProjectCosts` in `store.ts` keeps ownership of cost roll-up and feeds the WIP engine rather than duplicating it.
- Posting guard added in `store.ts`/`postings.ts` so closed projects reject new journals, bills and invoices unless flagged as an approved adjustment.
- New Finance tabs in `src/routes/_authenticated/finance.tsx` + `finance.$section.tsx`: **Project P&L**, **Project Balance Sheet**, **Project Closure**; WIP ledger, reconciliation and % complete audit are added as sub-views on the existing "Project Costing & WIP" tab. Allocation rules sit under "Budgets & Cost Centres".
- Data stays in the existing Finance store (browser-persisted, per-user), consistent with the rest of the Finance module; no schema migration in this phase.

## Suggested build order

1. WIP engine + period ledger + % complete audit + reconciliation.
2. Expense allocation (fields, unallocated queue, rule engine).
3. Project P&L and Project Balance Sheet with drill-down.
4. Project closure workflow, guards and closure report.
