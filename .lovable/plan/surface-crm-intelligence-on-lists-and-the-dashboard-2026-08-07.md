# Surface CRM intelligence on lists and the dashboard

The scoring, deal-health, duplicate and pricing logic already exists in `src/lib/crm/workflow.ts`, but is only rendered inside individual record detail pages. This plan brings those signals into the CRM list views and the CRM dashboard, without changing the existing logic, layout language or data model.

## List views (`/crm/<entity>`)

Add signal columns and inline chips to the existing table (and to the opportunity Kanban cards):

- **Leads** — a "Score" column showing the 0-100 lead score as a value plus a slim bar, colour-coded (>=60 strong, 40-59 medium, <40 weak). Sortable by score. Rows with likely duplicates get a small "Duplicate" badge next to the title, with a tooltip listing the matching lead codes.
- **Opportunities** — a "Health" column with the RAG chip and score, plus a "Weighted" column showing weighted revenue. Rows that are stalled get a "Stalled" badge. Kanban cards get the same RAG dot and weighted value.
- **Quotations** — a "Grand total" column from the pricing engine (base - discount + freight + GST), and a warning chip when discount > 10% or margin < 15%.
- A filter control on leads/opportunities to quickly show only high-score, at-risk/stalled, or duplicate-flagged rows.

## CRM dashboard (`/crm`)

Add three widgets alongside the existing KPI cards and charts, in the same card style:

- **Deal health breakdown** — count and value of open opportunities split green / amber / red, each clickable through to the filtered opportunity list.
- **Stalled deals** — a compact list of the worst-health opportunities with stage age, silence days and the top risk reason, linking to the record.
- **Lead quality** — score distribution across open leads (hot / warm / cold) plus a count of detected duplicate leads, linking to the leads list.

## Technical notes

- No changes to `src/lib/crm/workflow.ts` beyond, if needed, exporting a small helper to score a whole collection once per render (scores are computed per row today, so list rendering will memoise the derived values with `useMemo` over the store slice to avoid recomputing on every keystroke).
- All new UI uses existing primitives: `Table`, `Badge`, `StatusBadge`, `Card`, and the shared formatters in `src/components/crm/shared.tsx`. Colours come from semantic tokens, no hardcoded hex.
- Columns stay entity-specific through the existing per-kind column configuration in `src/routes/_authenticated/crm.$entity.tsx`; other entities are unaffected.
- Existing CSV export continues to export raw records; derived columns are display-only.
