# Sales Order Closure, HSN & Tax, TDS Automation, Financial Statements

Four connected blocks across CRM (sales orders), Finance and the tax layer. Today: sales orders have only `open → in-execution → delivered → closed` statuses with no closure validation; line items carry a `taxPct` but no HSN/SAC or CGST/SGST/IGST split; TDS is a flat hard-coded percentage on AP bills (0.1% / 1%) with no rules, ledger or reports; and Financial Statements are single-company, YTD only, with several cash-flow lines hard-coded and drill-down available on Trial Balance only.

## 6. Sales Order Closure

- Closure panel on the Sales Order record with a validation snapshot: ordered qty, delivered qty, invoiced qty, pending qty, returns, open commitments (open POs/PRs and reserved stock tagged to the SO project), customer balance (open AR net of receipts), pending billing (order value less invoiced).
- Each check shows pass / warning / blocker with a count, value and link to the offending records.
- Three actions — **Close**, **Short Close**, **Cancel** — each requiring a mandatory reason (and, for short close, the short-closed quantity/value). Blockers must be acknowledged with a justification before a Close is allowed; Cancel is refused once anything is invoiced.
- Statuses extended to `short-closed`; closure writes an audit entry (action, reason, user, timestamp, snapshot) into the SO activity timeline and a dedicated closure record, plus a printable Sales Order Closure report.
- After closure the SO is read-only for line edits and further billing; downstream milestone billing skips closed/short-closed orders.

## 7. HSN & Tax Information

- HSN/SAC resolved from the Item/Service master (CRM item master, with the Inventory HSN catalogue as fallback) and stored on each line item together with the GST rate.
- Line items gain HSN/SAC, taxable value, GST rate, and computed CGST/SGST/IGST and cess. Place-of-supply vs. company state decides intra-state (CGST+SGST) vs. inter-state (IGST); cess applies where the HSN carries one.
- Document totals show a tax summary block and an HSN-wise summary table on Sales Order and Customer Invoice printouts.
- Validation before document generation: any line without a valid HSN/SAC or GST rate blocks Generate/Print with a clear list of offending lines.
- The same HSN/tax breakdown flows into the AR invoice created from milestone billing so GST reporting stays consistent.

## 8. TDS Automation

- **Rules engine**: configurable TDS rules with vendor type, expense category, transaction type, section (194C/194J/194I/194Q/192 etc.), rate, threshold (per transaction and cumulative FY), financial year, rounding rule (nearest rupee / 10 / none) and effective dates. Managed from a new Tax Configuration view with list, add, edit, activate/deactivate.
- On supplier invoice entry the engine picks the best-matching active rule, checks FY-cumulative payments to that vendor against the threshold, computes and rounds TDS, and shows the deduction on the bill with the section and rule applied (overridable with a reason).
- Posting: TDS payable journal lines (Dr Expense / Cr Vendor / Cr TDS Payable) generated with the bill, keyed by section.
- **TDS ledger**: per vendor / section / period rows showing gross, TDS deducted, deposited, balance payable, with drill-down to the source bills.
- **Reports**: section-wise summary, vendor-wise deduction register, threshold-breach watchlist, and Form 16A / 26Q-style certificate data export (CSV + printable certificate per vendor per quarter).

## 9. Financial Statements

- Statements engine reworked to compute from posted journal lines rather than account snapshot balances, so filters actually change the numbers.
- Filter bar shared by all statements: Company, Branch, Department, Project, Cost Centre, Financial Year, Accounting Period (single period or range), with comparative previous-period/previous-year columns.
- Statements: Trial Balance, Profit & Loss, Balance Sheet, Cash Flow (indirect method computed from movements, replacing today's hard-coded lines), General Ledger (account-wise with opening/movement/closing), plus supporting schedules (receivables, payables, fixed assets, inventory, loans, taxes including GST and TDS).
- Drill-down chain on every statement: statement line → account ledger → source transaction (AR invoice, AP bill, journal, payroll or project posting) opening the existing document preview.
- Export CSV and print for every view and schedule.

## Technical notes

- CRM: `SalesOrder` gains closure fields and `short-closed` status in `src/lib/crm/lifecycle.ts` / `types.ts`; validation + actions in a new `src/lib/crm/so-closure.ts`, UI in a closure panel on the sales-order detail view, report via `src/lib/crm/documents.ts`.
- Tax: `LineItem` in `src/lib/crm/revenue.ts` gains `hsn`, `gstRate`, `cessRate`; a new `src/lib/tax/gst-calc.ts` computes the CGST/SGST/IGST/cess split and HSN summary used by CRM documents and AR invoices.
- TDS: `src/lib/finance/tds.ts` (rules engine, threshold tracking, rounding, ledger and certificate data), `TdsRule` / `TdsEntry` types in `src/lib/finance/types.ts`, new `tdsRules` / `tdsEntries` collections in `FinanceState`; `postings.ts` replaces its hard-coded TDS percentages with engine calls.
- Statements: new `src/lib/finance/statements.ts` builds ledger-derived Trial Balance, P&L, Balance Sheet, Cash Flow, GL and schedules with a shared `StatementFilter`; the existing `StatementsSection` in `finance.$section.tsx` is rewritten against it, keeping the current print/export helpers.
- New Finance tabs: **TDS** (rules, ledger, reports) and **General Ledger & Schedules**; existing Financial Statements tab gains the filter bar and drill-down.
- Data stays in the existing browser-persisted per-user Finance/CRM stores — no schema migration in this phase.

## Suggested build order

1. HSN & tax split on line items, validation and document totals.
2. TDS rules engine, bill integration, ledger and reports.
3. Financial statements engine with dimension filters and drill-down.
4. Sales Order closure validation, actions and audit trail.
