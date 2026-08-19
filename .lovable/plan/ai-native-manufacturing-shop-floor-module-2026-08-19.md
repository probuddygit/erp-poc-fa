# AI-Native Manufacturing & Shop Floor Module

Manufacturing is currently a placeholder page. This builds it into a full, working module — MBOM-driven work orders, routings, shop-floor execution, OEE, subcontracting — wired to Engineering, Inventory, Quality, Procurement, Projects and Finance, with a Manufacturing Copilot on top.

## Sections (route `/manufacturing/$section`)

1. **Production Plan** — demand from approved Sales Orders / project milestones exploded through the MBOM into a bucketed plan; capacity load per work center; "Firm plan" converts planned orders into work orders.
2. **Work Orders** — full lifecycle (planned → released → in-progress → completed / cancelled) with material availability check, reservation, operation list and progress. Reuses and extends the existing work-order data already created by the Engineering MBOM automation, so nothing is duplicated.
3. **Routings & Work Centers** — operation sequences (setup/run time, rate, machine, subcontract flag), work-center master with capacity/shift/hourly cost.
4. **Shop Floor Terminal** — high-density operator screen: pick a work order operation, clock start/pause/finish, report good/scrap/rework quantity, log downtime reason. Every posting updates WIP, material consumption and OEE instantly.
5. **OEE & Downtime** — availability × performance × quality per work center and shift, Pareto of downtime reasons, trend strip.
6. **Subcontracting / Job Work** — issue material to a vendor against a job-work order, track expected return, receive finished quantity back with a quality check.

## Cross-module integration

| Direction | Flow |
|---|---|
| Engineering → Mfg | MBOM explosion and existing `runBomSourcing` work orders feed the plan; routings attach to BOM items; released ECNs flag affected open work orders. |
| Sales/Projects → Mfg | SO/OA and project milestones create demand; work orders carry `projectCode` so shop output rolls into project costing. |
| Procurement → Mfg | Buy shortages on a work order raise a Purchase Requisition; open PO dates drive the material-availability date on the plan. |
| Inventory → Mfg | Reserve on release, backflush/issue components on operation completion, receive finished goods into stock at the reporting step; project-scoped stock respected. |
| Quality → Mfg | In-process inspection triggered at flagged operations; scrap/rework reporting raises an NCR; open NCRs block work-order completion. |
| Mfg → Finance | Emits finance events for WIP: material issue, labour/overhead absorption at work-center rate, scrap loss and finished-goods receipt, so project WIP and P&L stay accurate. |
| Mfg → Projects | Actual production cost and % complete post back to project costing / EVM. |

## AI-native capabilities

- **Manufacturing Copilot** (same `ModuleCopilot` pattern as Finance/GST): grounded, deterministic recommendations — resequence orders to clear a bottleneck, split a work order, expedite a shortage, pre-empt a due-date miss.
- **Schedule optimiser** — finite-capacity sequencing across work centers with a one-click "Apply schedule".
- **Delay & shortage prediction** — flags work orders that will miss their promise date based on remaining operations, capacity load and material ETA.
- **Downtime root-cause clustering** — groups downtime logs into causes with a suggested corrective action, linked to CAPA.
- **Scrap/quality early warning** — rising scrap rate per item/work center with the likely operation named.
- **Buddy AI facts** — manufacturing KPIs added to `buildFactsJson()` so the global assistant can answer shop-floor questions.

## Technical notes

- New store `src/lib/mfg/{types,store,schemas,options,seed}.ts` following the existing localStorage + cloud-sync store pattern (`registerCloudStore` via `src/lib/cloud/register.ts`), with collections: `workCenters`, `routings`, `productionOrders` (extending the existing PLM `workOrders`), `operations`, `timeLogs`, `downtime`, `scrap`, `jobWork`, `planRuns`.
- Engines: `src/lib/mfg/planning.ts` (MRP/CRP explosion, finite scheduling), `src/lib/mfg/execution.ts` (clock-in/out, backflush, FG receipt), `src/lib/mfg/oee.ts`, `src/lib/mfg/intelligence.ts` (copilot actions/metrics).
- Finance coupling stays cycle-free by calling `fireFinanceEvent` from `src/lib/finance/emit.ts`; new event variants (`mfg.issued`, `mfg.completed`, `mfg.scrapped`) added to `FinanceEvent` and handled in `postings.ts`.
- Routes: replace `src/routes/_authenticated/manufacturing.tsx` placeholder with `manufacturing.tsx` (layout + tabs), `manufacturing.index.tsx` (overview + copilot) and `manufacturing.$section.tsx`; sidebar entry updated with sub-items and breadcrumbs.
- Existing PLM `WorkOrder` records are read and enriched rather than replaced, so Engineering's "Run sourcing" automation keeps working unchanged.
- Seed data: 4 work centers (Weld, Machining, Assembly, Paint), routings for existing MBOM items, a week of shift/time/downtime logs so OEE and copilot outputs are non-empty on first open.
