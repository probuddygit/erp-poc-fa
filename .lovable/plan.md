# Finance AI Copilot

Add a dedicated **AI Copilot** tab to the Finance module — five specialised finance assistants plus an in-page chat grounded in live ledger data. Today Finance only has the "AI Insights" tab (cash forecast, anomalies, narrative, recommendation panel); there is no conversational copilot or specialist grouping like the Workforce module has.

## What the user gets

A new "AI Copilot" tab in the Finance navigation with:

1. **Five specialist copilots**, each a card with a short description, live deterministic recommendations (from the existing finance intelligence engine) and one-click suggested prompts:
   - **Cash Copilot** — 13-week cash risk, collection priorities, payment deferrals, runway.
   - **Receivables Copilot** — ageing, overdue chasing, top exposures, DSO improvement.
   - **Payables & Match Copilot** — 3-way match exceptions, duplicate/price variance bills, early-payment discounts.
   - **Controls & Audit Copilot** — anomaly detection, unposted journals, unreconciled bank items, period-close blockers.
   - **Margin & Budget Copilot** — project/customer profitability, budget overruns, EBITDA and margin drivers.

2. **Ask Finance chat** — an inline chat box on the same page that answers questions against the live ERP snapshot (same grounded model path the Buddy widget and AI Assistant already use), with finance-specific starter prompts and copy-to-clipboard on answers.

3. Suggested prompts open either the inline chat or the full AI Assistant page, pre-filled.

Every recommendation stays traceable: figures come from the existing deterministic finance engine, and the chat is told to answer only from the live data snapshot.

## Technical notes

- New `src/components/finance/copilot-section.tsx`, modelled on `src/components/workforce/copilot-section.tsx` (specialist cards + `AiCopilotPanel`) with an added chat panel following the `POST /api/chat` pattern in `src/components/ai/buddy-widget.tsx` (`buildFactsJson()` facts + short history).
- Reuse existing generators in `src/lib/finance/intelligence.ts` (`financeActions`, `detectAnomalies`, `reconciliationSuggestions`, `budgetVariances`, `cashForecast`, `workingCapital`, `ageing`, `profitability`, `financeKpis`). Add small grouping helpers there only where a specialist needs a filtered action list (e.g. `cashActions`, `arActions`, `apActions`, `controlActions`, `marginActions`) built from existing computations — no new business rules or data model changes.
- Register the tab in `src/routes/_authenticated/finance.tsx` (`{ section: "copilot", label: "AI Copilot" }`) and render it in `src/routes/_authenticated/finance.$section.tsx`.
- No database, schema, or cloud-sync changes. Existing "AI Insights" tab stays as-is.
