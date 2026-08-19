# Left Navigation Restructure

Reorganize the left sidebar into six labelled sections and split Company/Branches out of Administration, which becomes "Configurations".

## New sidebar structure

```text
Organization Setup
  Company
  Branches
Master Data
Configurations
Reports
Business Operations
  Dashboard
  CRM / Sales
  Projects
  Engineering
  Procurement
  Inventory
  Manufacturing
  Quality
  Finance
  Workforce & Admin
  GST & Compliance
AI Assistance
  AI Assistant (ProBuddy)
```

## What changes

1. **Organization Setup (new)** — a new area at `/organization/company` and `/organization/branches`. The existing "Company & Branches" screen in Administration is split into two focused pages: company profile / legal identity / GST registrations on one, branch & location list with full CRUD on the other. Same data store, same behaviour — just separated and moved.

2. **Configurations** — Administration is renamed to "Configurations" everywhere in the UI (sidebar, page header, breadcrumbs, page titles). Its tab strip drops "Company & Branches" and keeps Users & Roles, Permission Matrix, Approval Workflows, Numbering, Governance, Notifications, Templates, Business Rules, AI Configuration, Integrations, Security, System Config, Audit & Health.

3. **Master Data** and **Reports** get their own top-level sections in the sidebar (existing pages, no functional change).

4. **Business Operations** groups Dashboard plus all functional modules, unchanged in behaviour.

5. **AI Assistance** becomes its own section holding the ProBuddy AI Assistant entry (keeps the Beta badge).

## Technical notes

- Existing URLs stay valid. `/administration` keeps its path (only the label changes) so bookmarks, deep links and the many `Link to="/administration/..."` references across the app keep working. Visiting `/administration/company` redirects to `/organization/company`.
- New files: `src/routes/_authenticated/organization.tsx` (layout with Company/Branches tabs), `organization.index.tsx` (redirect to company), `organization.$section.tsx` (renders the two panels).
- The Company and Branches panels are extracted from `src/routes/_authenticated/administration.$section.tsx` into a shared component file so no logic is rewritten; `adminStore` remains the single source of truth.
- `src/components/app-sidebar.tsx` is restructured into six `SidebarGroup`s with the labels above; collapsed (icon) mode keeps working via tooltips.
- Header breadcrumb labels updated where "Administration" is hardcoded.
