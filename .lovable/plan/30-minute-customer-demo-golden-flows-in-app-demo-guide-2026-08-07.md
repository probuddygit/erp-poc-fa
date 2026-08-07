# 30-minute customer demo: golden flows + in-app Demo Guide

Two deliverables: a scripted set of end-to-end flows that show the platform's differentiators, and a `/demo` page inside the ERP that presents those flows as clickable steps which deep-link straight into each screen — so the presenter never has to hunt for a tab mid-demo.

## The demo narrative (30 min)

**Act 1 — Command Center (3 min)**
Open `/`. Lead with the dashboard-first story: portfolio KPIs, OEE and departmental load heatmaps, alerts. Message: one screen answers "how is the business doing right now".

**Act 2 — Golden thread: Lead to Cash (12 min)**
The single most impressive flow, because every step feeds the next automatically.
1. `/crm/leads` — show AI lead score, duplicate detection badge, then convert a hot lead.
2. `/crm/opportunities` — deal-health RAG, stalled-deal signal, weighted pipeline.
3. `/crm/quotations` — pricing engine computing discount, freight and GST live; print/email the quotation.
4. `/crm/order-acceptance` — approve the OA. **The hero moment:** a project is auto-created with a full 3-level WBS, milestones and budget generated from the BIW/Robot-Cell template.
5. `/projects` then the new project — show the generated plan, EVM (SPI/CPI), health score and the Project Copilot's next-best actions.

**Act 3 — Execution spine (8 min)**
Follow the same project downstream so the customer sees one thread, not disconnected modules.
- `/engineering` — EBOM/MBOM, design-maturity score, ECN where-used impact.
- `/procurement/requisitions` → `/procurement/orders` → `/procurement/grn` — raise a PR from the AI suggestion, show vendor scorecard and predicted lead time, receive goods, open the tax invoice with 3-way match.
- `/inventory` — project-tagged stock, ABC class, stock-out forecast, one-click replenishment.
- `/quality` — an inspection failure raising an NCR, then a CAPA with 8D traceability.

**Act 4 — Money and compliance (4 min)**
`/finance` — three-way-matched vendor invoice posting to double-entry, cash-flow forecast. `/gst` — GSTR summary and e-Way Bill.

**Act 5 — AI Assistant close (3 min)**
`/ai-assistant` — ask cross-module questions ("Which projects will slip this month and why?", "Top 5 vendors by delivery risk"). Emphasise the answers are grounded in real ERP records, not invented. Finish on `/reports` with a scheduled executive narrative.

Backup talking points if time runs short: skip Act 4, and mention Administration (approval-workflow designer, numbering series, RBAC) verbally.

## In-app Demo Guide page (`/demo`)

A new authenticated route, styled like the existing module pages:
- Header with total runtime, a **Reset demo data** button and a **Start demo** button.
- Five act cards in order. Each card lists its steps: step title, the one-line thing to say, and a "Go" link that navigates to the exact route (and entity tab) for that step.
- A checkbox per step so the presenter can track progress; progress is kept in local storage and cleared by reset.
- A compact "talk track" line per act in muted text, plus an estimated minute badge.
- Sidebar entry "Demo Guide" so it is reachable in one click, and a keyboard-free flow: after clicking Go, a small floating pill offers "Back to guide / Next step".

## Reset demo data

A single action that calls the existing `reset()` on every module store (CRM, projects, PLM, procurement, inventory, quality, finance, GST, HR, MDM, admin, reports), clears demo-guide progress, and toasts confirmation. This restores the seeded dataset so the same flow can be run back-to-back for multiple customers. Reset also appears in Administration so it is available outside the guide.

## Technical notes

- New files: `src/routes/_authenticated/demo.tsx` (route + guide UI) and `src/lib/demo/flows.ts` (the flow/step data: label, script line, route, params, minutes).
- New helper `src/lib/demo/reset.ts` calling each store's existing `reset()`; every module store already exposes one, so no store logic changes are needed.
- Steps navigate with `<Link to=... params=...>` against existing routes only — no new module screens, no changes to any business logic or intelligence engine.
- Floating "next step" pill lives in the guide's own component and is shown via local storage state on the target route through a small shared component mounted in `_authenticated/route.tsx`.
- Uses existing primitives (Card, Badge, Button, Checkbox) and semantic tokens; sidebar gets one new nav item.
