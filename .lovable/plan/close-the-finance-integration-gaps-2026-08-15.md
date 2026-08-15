# Close the Finance Integration Gaps

Four workstreams, sequenced so each builds on the previous. Finance currently has exactly one cross-module link — a manual "Sync ERP postings" button on the Period Close page (`src/lib/finance/store.ts:917`) — and none of its data leaves the browser.

## Phase 1 — Event-driven posting engine

Replace the single manual pull with a posting engine that reacts to upstream events.

- New `src/lib/finance/postings.ts` exposing `postEvent(event)` for a typed union: `grn.invoiced`, `payroll.released`, `project.created`, `so.approved`, `travel.approved`, `asset.received`.
- Each handler is idempotent (keyed on the source document code, same guard style the current sync uses) so replays never double-post.
- Call sites fire the event at the moment of the business action: procurement GRN invoice capture, payroll run release, project provisioning in `src/lib/crm/workflow.ts`, workforce travel approval.
- Keep `syncOperationalPostings()` as a "catch-up / reconcile" action that replays anything missed — it becomes the safety net, not the primary path.
- Replace the heuristic 52/24/12/12 project-cost split with a real roll-up from the postings each event creates (material from AP bills, labour from payroll, subcontract from service bills).

## Phase 2 — Sales-to-cash automation

- On Order Acceptance approval, generate a **billing plan** from project milestones (`prj_milestones.billing` already carries the amount).
- Each milestone marked complete raises a draft AR invoice pre-filled with customer, project code, value, GST and payment terms from the CRM quotation/OA.
- Add advance/mobilisation invoicing on OA approval where the payment terms specify it.
- Store `sourceOaCode` / `sourceMilestoneId` on `ARInvoice` and render clickable drill-back links from the AR list to the originating CRM document; do the same for AP bills back to the GRN/PO.
- CRM's existing finance validation gate stays where it is, but its outcome now also unlocks the billing plan.

## Phase 3 — Cloud persistence for Finance and the remaining modules

- New tables: `fin_*` (accounts, journals, journal_lines, ar_invoices, ap_bills, project_costs, tax_ledgers, bank_accounts, bank_txns, cost_centres, budgets, fixed_assets, close_tasks), plus `proc_*`, `inv_*`, `wf_*`, `gst_*`.
- Same pattern already proven for CRM/Projects/Engineering: `owner_id uuid` per-user sandbox, RLS scoped to `auth.uid()`, GRANTs to `authenticated` and `service_role`, `updated_at` trigger, `extra jsonb` for unmapped fields.
- Add `replace()` to the finance, procurement, inventory, workforce and GST stores and register them in `src/lib/cloud/register.ts`.
- One-time migration of existing localStorage snapshots on first hydration, matching the CRM migration behaviour.
- Delivered in two migrations: finance first (so the postings from Phases 1-2 persist), then the rest.

## Phase 4 — GST reconciliation with the ledger

- Make the GST module the single source of truth for filings; Finance's `taxLedgers` becomes a derived view of GST return periods rather than a parallel hand-maintained list.
- Derive output tax from AR invoices and input tax from AP bills, so GSTR-1/3B figures tie back to the ledger.
- Filing a return posts the settlement journal (GST payable / input credit / cash) automatically.
- ITC reconciliation lines gain a link to the originating AP bill, and mismatches surface as a Period Close blocker.

## Technical notes

- Everything stays inside the existing store + `useSyncExternalStore` pattern; no new state library.
- Posting handlers live in a dedicated module so they can be unit-tested and so the Finance store keeps its current shape.
- Event dispatch is synchronous in-process (no queue) — appropriate for this client-side ERP; the reconcile action covers any gap.
- Cloud schema work follows `src/lib/cloud/schema.projects.ts` as the template.
- No changes to the AI Copilot/Insights layers; they read the same store and will automatically reflect richer data.
