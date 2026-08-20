# Project-Specific Item Master + Launcher Home Page

Two changes: Item Master becomes a project-scoped screen inside Projects, and a new icon-tile home page becomes the first screen after login.

## 1. Item Master moves under Projects

- Remove the Item Master card and its "Item Coding" section from the Master Data landing page, and drop the sidebar/Master Data entry point.
- Add an **Items** tab on the project detail screen (`/projects/<project>`), sitting alongside Overview, WBS, Budget, Docs, etc.
- Inside that tab the same functionality is reused — create/edit item, auto code preview, AI validation, duplicate detection, standard rate/HSN, delete, reallocate — but the project scope is fixed to the open project instead of being a dropdown:
  - New items are always created against that project code (field shown read-only).
  - The list shows only that project's items (plus reallocation to another project, which stays available).
  - The global "all items / common items" view is gone; every item belongs to a project.
- Item-code configuration (prefix/sequence settings) stays available from the same tab, in a settings dialog, since it is a global coding rule.
- The old `/masters/item-master` URL keeps working by redirecting to `/projects` so existing bookmarks and demo links don't break.

## 2. New home page after login

- `/` becomes the **Home launcher**: a clean full-width grid of six large icon tiles —
  Organization Setup, Master Data, Configurations, Reports, Business Operations, AI Assistance —
  each with an icon, title and one-line description, linking to its area.
  - Organization Setup → `/organization/company`
  - Master Data → `/masters`
  - Configurations → `/administration`
  - Reports → `/reports`
  - Business Operations → `/dashboard` (Executive Command Center, gateway to all modules)
  - AI Assistance → `/ai-assistant`
- The existing Executive Command Center dashboard moves from `/` to `/dashboard`, unchanged.
- Sidebar: a **Home** entry is added at the top; the Business Operations "Dashboard" entry now points to `/dashboard`. Logo/brand click goes to Home.
- After sign-in the user lands on `/`, which is now the launcher.

## Technical notes

- New route `src/routes/_authenticated/home-tiles` content is placed directly in `src/routes/_authenticated/index.tsx`; the current dashboard body moves to a new `src/routes/_authenticated/dashboard.tsx` with its own head metadata.
- Item Master UI from `masters.item-master.tsx` is extracted into `src/components/projects/item-master-panel.tsx` taking a `projectCode` prop; `masters.item-master.tsx` becomes a redirect route.
- `itemsForProject`, `upsertItem`, `validateItem`, `reallocateItem` in `src/lib/crm/revenue.ts` are reused as-is; only the create path is changed to always stamp the active project code.
- Any `Link to="/masters/item-master"` references (Master Data index, demo flows if present) are updated or removed.
