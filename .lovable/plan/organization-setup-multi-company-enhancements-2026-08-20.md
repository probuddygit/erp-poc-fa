# Organization Setup — Multi-Company Enhancements

Today Org Setup shows a single hard-coded company profile (edit only) and a flat Branch list. The plan turns it into a proper multi-company org structure with an active-company context.

## 1. Companies list + Add Company (core ask)

- Replace the single "Company profile" card with a **Companies** table: Code, Legal name, Short name, GSTIN, PAN, CIN, Currency, FY start, Branches count, Status (active/inactive).
- **+ New Company** button opens the same field dialog used elsewhere, with validation:
  - Company code required, uppercase, unique (duplicate code blocked with an inline error).
  - GSTIN / PAN / CIN format checks (soft warnings, not blockers).
  - Optional: registered address, state, contact email/phone, website.
- Row actions: View profile, Edit, Activate/Deactivate, Delete (blocked when branches exist), Export/Print.
- Clicking a company opens the detail profile card (the current tile layout) plus its branches.

## 2. Active company switcher

- A company selector in the Org Setup header sets the **active company**, persisted locally.
- Branches, and any new record stamped with `companyId`, filter by the active company.
- Deleting/deactivating the active company falls back to the first active one.

## 3. Branch enhancements

- Branch form gains a **Company** dropdown (defaults to active company) so branches always belong to a real company.
- Extra fields: address, pincode, GST state code, cost-centre code, plant/warehouse flag, in-charge/manager.
- Branch code uniqueness within a company; state derived hint for GSTIN prefix mismatch.
- Grouped view: branches grouped by type (HQ / Plant / Warehouse / Sales Office) with headcount rollup tiles.

## 4. Suggested extras (say which you want)

- **Departments / Cost Centres** tab — the org units used across Finance and HR.
- **Fiscal Year & Periods** tab — FY calendar with open/closed period flags feeding Finance close.
- **Org Chart** tab — a simple company → branch → department tree view.
- **Statutory registrations** tab — GSTIN per state, PF/ESI/TAN numbers with validity dates.
- **Company branding** — logo upload, used on printed PO/Invoice/Quotation headers.
- **Completeness score** — a small AI-style card flagging missing statutory fields per company.

## Technical notes

- `src/lib/admin/store.ts`: add `active`/address fields to `Company`, an `activeCompanyId` in state, and `addCompany` / `deleteCompany` / `setActiveCompany` actions alongside the existing `saveCompany`; keep the localStorage seed shape backward-compatible.
- `src/components/admin/org-sections.tsx`: `CompanyPanel` becomes an `AdminCrudTable` over `companies` plus a detail card; `BranchesPanel` gains the company select and active-company filter.
- `src/routes/_authenticated/organization.tsx`: add the company switcher to the header; add new tabs only for the extras you pick.
- No database changes — Org Setup runs on the local admin store like the rest of Configurations.
