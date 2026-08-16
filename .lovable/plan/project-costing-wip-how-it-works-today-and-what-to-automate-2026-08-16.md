# Project Costing & WIP — how it works today, and what to automate

## How it works today (verified in code)

- Each project gets a cost sheet row (`projectCosts`) either from the seeded demo data or when a project is created (`project.created` event opens a ledger with all costs at zero and `% complete` copied once from the project).
- Costs are recomputed in `recomputeProjectCosts`:
  - Material / sub-contract / overhead come from AP bills tagged with the project (bill gross amount, cost type set from vendor category).
  - Labour and other costs come from posted journal lines that carry a project code.
  - Billed and collected come from AR invoices tagged with the project.
  - WIP = total incurred cost − billed. Forecast cost = incurred ÷ % complete. Status is a margin band (risk < 15%, watch < 25%).
- Recompute only runs while finance postings happen (GRN invoiced, milestone achieved, project created, or the manual "Sync ERP postings").

## Gaps this creates

1. **Committed cost is never calculated** — the "Committed" column only shows seeded numbers. Open purchase orders and requisitions are invisible, so cost-to-complete understates exposure.
2. **% Complete is frozen** at the value captured when the ledger opened; later progress from the WBS never flows in, so forecast cost and margin drift.
3. **Labour cost needs manual journals** — timesheets booked in Workforce never reach the project ledger.
4. **Seeded values are sticky** — a computed value of zero never overwrites a seeded figure, so demo rows can mask real data.
5. **No revenue recognition** — WIP is a raw cost-minus-billed number; there is no earned value (contract value × % complete) or unbilled-revenue / over-billing split.
6. **No refresh trigger** on project progress updates, PO approvals, or timesheet approvals — the sheet only moves when a finance event fires.

## Proposed automation

### 1. Committed cost from live procurement
Roll up approved/open POs (and approved PRs not yet ordered) for each project, minus what has already been received into an AP bill, into `committed`. Recomputed on every PO/GRN change.

### 2. Live % complete from the project plan
Pull `progress` from the Projects module (weighted WBS roll-up already maintained there) on every recompute, rather than a one-time copy.

### 3. Labour cost from timesheets
Convert approved timesheet hours × a role/standard cost rate into a posted labour journal per project per period (idempotent by period key), so labour flows in without manual entry.

### 4. Earned-value / WIP split
Add derived measures to the cost sheet:
- Earned value = contract value × % complete
- Unbilled revenue (WIP asset) = earned value − billed, when positive
- Advance / over-billing (liability) = billed − earned value, when positive
- Cost to complete = forecast cost − incurred; EAC and CPI/SPI-style margin outlook.
Keep the existing cost-based WIP column and add the earned-value view alongside it.

### 5. Event-driven refresh
Fire the recompute from: project progress or milestone updates, PO approval, GRN, AP bill edits, AR invoice raise/receipt, timesheet approval. Same idempotent event bus already used by the posting engine.

### 6. Overwrite semantics fixed
Once a project has any real transaction, computed values replace seeded ones (including zeros), so the sheet is trustworthy after go-live. Seed rows without transactions stay as demo data.

### 7. Cost sheet UI additions
On the Finance → Project Costing table: committed and cost-to-complete columns, earned value vs billed, a margin trend/variance-vs-budget indicator, and a per-project drill-down listing the AP bills, journals and AR invoices that make up each cost bucket.

## Technical notes

- All logic stays in `src/lib/finance/store.ts` (`recomputeProjectCosts`) plus `src/lib/finance/postings.ts` for new event handlers (`po.approved`, `timesheet.approved`, `project.progress`).
- Cross-module reads use the existing dynamic-import pattern in `postings.ts` to avoid import cycles.
- New derived fields (`earnedValue`, `costToComplete`, `unbilledRevenue`, `overBilling`) added to `ProjectCost` in `src/lib/finance/types.ts`.
- UI changes limited to the Project Costing section of `src/routes/_authenticated/finance.$section.tsx`.
