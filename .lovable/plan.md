# Move ERP business data into the cloud database

Today only sign-in data (profiles, roles) lives in the cloud. Every business module — CRM, Projects, Engineering, Procurement, Inventory, Quality, Finance, GST, Workforce, Masters, Reports, Admin — keeps its data in the browser. That means data is lost when the browser is cleared, is invisible on another device, and can't be reported on.

This plan moves all of it into real database tables, one table per business entity, with each signed-in user getting their own private sandbox of data.

## Decisions locked in

- **Real relational tables** — every entity (lead, project, purchase order, invoice, employee…) gets its own table with proper columns.
- **Per-user sandbox** — every row is owned by the user who created it; nobody can see anyone else's rows.
- **Migrate on first load** — whatever is currently in your browser is pushed to the cloud once, then the cloud becomes the source of truth.

## Scope

Around 100 entities across 13 modules:

| Module | Entities (approx.) |
| --- | --- |
| CRM / Revenue Lifecycle | 14 |
| Projects | 10 |
| Engineering (PLM) | 10 |
| Procurement | 10 |
| Inventory | 7 |
| Quality | 6 |
| Finance | 13 |
| GST & Compliance | 6 |
| Workforce & Administration | ~25 |
| Master Data, Reports, Admin | ~10 |

## Approach — phased, module by module

Each phase is independently shippable; the app keeps working throughout because modules not yet migrated keep using the current browser storage.

**Phase 0 — Foundation**
- One shared sync layer: each module's store hydrates from the cloud at sign-in, renders instantly from an in-memory cache, and writes changes back to the cloud in the background (optimistic, so the UI stays fast).
- A one-time migration that uploads existing browser data per user, then marks that browser as migrated.
- Seed data for a brand-new user is created in the cloud on first sign-in, so demos still start populated.
- Demo reset now clears the user's cloud rows and re-seeds.

**Phase 1 — Revenue Lifecycle (CRM)** — customers, leads, opportunities, RFQs, proposals, quotations, order acceptances, sales orders, activities, notes, documents, approvals. Lifecycle automation (lead → project) runs against cloud data.

**Phase 2 — Projects & Engineering** — projects, WBS, milestones, risks, issues, change requests, documents, team, budget; items, parts, drawings, BOM, ECR/ECN, reviews, work orders.

**Phase 3 — Procurement & Inventory** — vendors, requisitions, RFQs and bids, purchase orders and lines, GRNs; items, stores, bins, stock, batches, transfers, cycle counts.

**Phase 4 — Quality, Finance & GST** — inspections, checklists, NCR, CAPA, gauges, supplier scores; chart of accounts, journals and lines, AR/AP, project costs, budgets, cost centres, fixed assets, bank accounts and transactions, period close; GST registrations, returns, e-invoices, e-way bills, ITC.

**Phase 5 — Workforce & Administration, Master Data, Reports, Admin** — the ~25 workforce collections plus master records, saved reports, workflows, audit log.

**Phase 6 — Cleanup** — remove browser-storage fallbacks, confirm every screen reads and writes cloud data, run a security check on all new tables.

## Technical notes

- Every table: `id uuid`, `owner_id uuid not null default auth.uid()` referencing the auth user, domain columns, `created_at`, `updated_at` with trigger.
- Row-level security on all tables, a single owner-scoped policy per table (`owner_id = auth.uid()`), plus explicit grants to `authenticated` and `service_role`. No anonymous access.
- Line-item collections (PO lines, journal lines, BOM nodes, WBS nodes) become child tables with foreign keys and cascade delete, replacing today's nested arrays.
- Reads and writes go through TanStack `createServerFn` handlers using the authenticated Supabase client, so RLS applies as the signed-in user. Existing store hooks (`useSyncExternalStore`) keep their current shape, so screens and automation logic stay largely untouched.
- Cross-module automation (OA → Project, GRN → journal, inspection → NCR) moves to run after the cloud write confirms, keeping traceability intact.
- Enum-like fields (statuses, stages) stay as text with check constraints so the 33-status lifecycle can evolve without migrations.

## Trade-offs

- This is a large change: roughly 100 tables and a rewrite of every store's persistence layer. Expect it to run across several build sessions, one phase at a time.
- Screens will do network reads instead of instant local reads; the caching layer keeps this imperceptible, but there is a brief hydration on first load after sign-in.
- Because data is per-user, two demo accounts will not see each other's records. Switching to org-wide sharing later is a policy change, not a re-architecture.
