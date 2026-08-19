# Collapsible Sidebar Sections

Make each left-nav section header (Organization Setup, Master Data, Configurations, Reports, Business Operations, AI Assistance) click-to-expand/collapse.

## Behaviour

- Each section label becomes a clickable row with a chevron that rotates when open.
- Clicking toggles that section's items open/closed; other sections are unaffected (multiple can stay open).
- A section containing the active route starts expanded; on navigation the matching section auto-opens.
- Default on first load: all sections expanded.
- Open/closed state persists across page reloads (stored locally per user).
- When the sidebar is in icon (collapsed) mode, section toggling is bypassed and all icons remain visible with tooltips, as today.

## Technical notes

- `src/components/app-sidebar.tsx` only. Wrap each `SidebarGroup` in the existing shadcn `Collapsible` (`@/components/ui/collapsible`), using `CollapsibleTrigger` on `SidebarGroupLabel` and `CollapsibleContent` around `SidebarGroupContent`.
- Track open sections in a `Record<string, boolean>` state initialised from `localStorage` (key like `faith-erp:sidebar-groups`) inside an effect to avoid hydration mismatch.
- Add a `ChevronDown` icon from lucide-react with `transition-transform` on the label row.
- No route, data, or business-logic changes.
