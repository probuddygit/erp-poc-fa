# Bring GST, Reports, Workflow and Master Data from "ERP for SME"

Port four capability areas from the ERP for SME project into Faith Automation ERP, adapted to this project's routing, "Navy Trust" design tokens, and local store pattern. Code is copied and rewritten — the two apps stay independent.

## What exists here today vs. what comes over

| Area | Faith ERP today | After the port |
| --- | --- | --- |
| GST | Only GST/TDS registers inside Finance | Full GST module: HSN, rates, tax rules, GSTR-1, GSTR-3B, e-Invoice, e-Way Bill, configuration, GST reports |
| Reports | Saved reports, schedules, run logs, AI narratives | Adds a 11-category report catalogue (~100 report definitions) with category browse and a report viewer page |
| Workflow | A single approval-workflow list under Administration | Dedicated Workflow area: visual designer, approval rules, conditional routing, escalation, notifications, templates, history |
| Master Data | MDM framework with 5 masters | Adds the SME masters missing here (UoM, Tax/GST rates, HSN, payment terms, currencies, item categories, warehouses/bins, cost centres, ledger groups) using the existing metadata-driven framework |

## Scope by module

### 1. GST (new module)
- New nav entry `GST` with sub-sections at `/gst/<section>`: Overview, HSN Codes, GST Rates, Tax Rules, GSTR-1, GSTR-3B, e-Invoice, e-Way Bill, Reports, Configuration.
- Local store `src/lib/gst/` (types + seeded store, same pattern as `src/lib/finance/store.ts`) with Faith Automation-realistic BIW data — HSN 8479/7326, IGST/CGST-SGST splits, Maharashtra intra-state defaults.
- Filing screens show period selector, summary tiles (taxable value, CGST/SGST/IGST, ITC), table breakdown, and a "Generate JSON" action stub.
- CRUD on HSN, rates and tax rules through the existing `RecordDialog`.

### 2. Reports (extend existing)
- Add a report catalogue layer: categories (Sales, Finance, Inventory, Purchase, CRM, GST, Management, Operational, Custom, Saved, AI Insights) re-mapped to Faith's modules (Projects, Engineering, Manufacturing added).
- New routes: category browse and `/reports/catalog/$reportId` viewer that renders a table/chart/statement shell with filters, export and favourite toggle.
- Existing schedules, run logs and AI narratives stay and link into the catalogue.

### 3. Workflow (new area under Administration)
- New section group `Workflow` with: Designer (drag-and-drop canvas with node palette — Start, Condition, Approval, Notify, Delay, Webhook, Update, AI, Email), Approval Rules, Conditional Routing, Escalation, Notifications, Templates, History.
- Local store `src/lib/workflow/` holding node palette, canvas nodes/edges, rules and run history.
- The existing Administration approval-workflow list becomes a link into the new Approval Rules screen so there is one source of truth.

### 4. Master Data (extend existing MDM)
- Add new `MasterDef` entries to `src/lib/mdm/registry.ts` — no framework changes needed, so each new master automatically gets list, create, edit, view, approvals, timeline, attachments and CSV import.
- New masters: Unit of Measure, HSN Codes, GST Rates, Payment Terms, Currencies, Item Categories, Warehouses, Storage Bins, Cost Centres, Ledger Groups, Departments, Designations.
- Add filters/searchable flags consistent with existing masters; group them on the masters index by domain (Commercial, Compliance, Inventory, Organisation).

## Technical notes
- Data stays in the existing localStorage-backed store pattern (`useSyncExternalStore`), matching every other Faith module. No Supabase tables are added in this pass; the stores are written storage-agnostic so a Cloud-backed adapter can replace them later.
- Routes follow this project's convention: `src/routes/_authenticated/gst.tsx` + `gst.index.tsx` + `gst.$section.tsx`, same for workflow, mirroring how `finance` and `quality` are structured.
- The SME source uses its own `features/` layout and multi-tenant helpers; those are dropped. Only the domain data shapes, screen layouts and UX patterns are carried over, re-skinned to Faith's tokens (no hardcoded colour utilities).
- Sidebar and breadcrumb entries updated in `src/components/app-sidebar.tsx`.

## Suggested sequencing
1. Master Data additions (smallest, highest reuse)
2. GST module
3. Workflow area
4. Reports catalogue

Say the word if you want a subset or a different order — each of the four is independently shippable.
