# Make the AI document validation demo-ready

Today "Validate PO copy" (Procurement → Purchase Orders) and "Validate invoice / GRN" (Procurement → GRN) both open the AI validation dialog, but they only work if the presenter happens to have a suitable PO/invoice file on their laptop. There is no sample document shipped with the app, so the feature is hard to demo live.

This plan adds ready-made sample documents and a scripted demo path so the feature can be shown in under two minutes.

## What gets added

1. **Three sample documents, bundled with the app** (served from the app's public folder, openable and printable in the browser):
   - `Sample-PO-clean.pdf` — a purchase order whose part numbers, rates and HSN codes all match the item master. Shows the happy path: every line comes back as an exact match.
   - `Sample-Vendor-Invoice-variances.pdf` — a vendor tax invoice deliberately seeded with: one mistyped part number (near match), one part number that does not exist in the item master (unmatched), one line priced ~18% above the master rate (rate variance), and one wrong HSN code.
   - `Sample-GRN.pdf` — a goods receipt note with a short-supplied quantity against the PO.

   All three are built from the same seeded item master used elsewhere in the app (`FA-MEC-0001`, `FA-ROB-0002`, `FA-CTL-0003`, …) so the match results are predictable every time.

2. **A "Sample documents" strip inside the validation dialog** — small download links for the relevant sample(s) for that document kind, so the presenter can grab the file without leaving the screen.

3. **Demo Guide steps** — a new act in the Procurement/Lead-to-Cash demo script under Demo Guide, with the exact click path and the line to say at each step:
   - Open Procurement → Purchase Orders → Validate PO copy → pick project scope → upload the clean PO → "every part number reconciles against the project's item master."
   - Open Procurement → GRN → Validate invoice / GRN → upload the variance invoice → walk the Exact / Near / Unmatched counters and the findings column → "the buyer sees the rate deviation and the unknown part before the GRN is posted."

## How to run the demo (once this ships)

1. Procurement → Purchase Orders → **Validate PO copy**.
2. Choose the project (e.g. the BIW line project) so validation is scoped to that project's item master.
3. Download and upload `Sample-PO-clean.pdf`. Result: all lines green/exact.
4. Procurement → GRN → **Validate invoice / GRN**, upload `Sample-Vendor-Invoice-variances.pdf`.
5. Talk through the four summary tiles, the total-mismatch banner and the per-line findings.
6. Optional contrast: switch the project selector to "All items" and re-validate to show how project scoping changes what counts as an unmatched part.

## Technical notes

- Sample PDFs are generated as static assets and placed alongside the existing `public/invoices/` sample; no new dependency, no backend change.
- The dialog change is presentation-only: a small links row above the upload control, driven by the existing `kind` prop.
- Extraction still runs through the existing `/api/ocr-extract` route (vision model via the AI gateway); no changes to the endpoint or to the matching logic in `src/lib/procurement/ocr.ts`.
- Demo steps are added to `src/lib/demo/flows.ts` and appear automatically in the Demo Guide and the demo pill.
