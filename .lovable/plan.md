# Inventory & Item Master Enhancements

Three connected enhancements: project-owned inventory with controlled project-to-project reallocation (including cost and budget movement), AI vision validation of part numbers on procurement documents, and a project-aware Item Master.

## 1. Project-specific Item Master

Items become project-owned, with reallocation instead of duplication.

- Add `projectCode` (optional; blank = Common/shared catalogue) and `allocation` history to the item master record.
- Item Master screen gets a project selector on the create/edit form, a project filter and a "Project" column on the list, and duplicate detection scoped to the same project + Common.
- Item pickers in quotations, sales orders, requisitions and inventory transactions show items for the active document's project plus Common items; other projects' items are hidden unless the user toggles "show all".
- A "Reallocate item" action moves an unconsumed item (and its unreserved stock) to another project, recording who/when/why.

## 2. Project-to-project inventory transfer with cost and budget adjustment

- Extend the inventory transfer record with `fromProject` and `toProject`, plus computed transfer value (qty x standard/valued rate).
- New transfer type "project reallocation" in the Transfers section: pick item, source project stock row, quantity, destination project, and mandatory reason. Available quantity is limited to stock not already consumed/issued on the source project.
- On receipt of the transfer, the stock row's project tag moves with the quantity and item on-hand/allocated figures are recalculated.
- Finance impact is automatic: a journal entry credits the source project's WIP/material cost and debits the destination project's, and both project budgets/committed costs are adjusted by the transfer value. The transfer detail shows the resulting journal reference.
- Validation blocks reallocation when the source project is closed, the destination project is closed, or the quantity is reserved against an open work order.

## 3. OCR / vision part-number validation

- Upload a PDF or image of a purchase order, vendor invoice or GRN from the relevant record.
- The document is sent to an AI vision model, which extracts line-level part numbers, descriptions, quantities and rates.
- Each extracted part number is matched against the Item Master (exact, normalised, and fuzzy match) and against the linked PO/GRN lines.
- A results panel shows per-line status: matched, unknown part number, quantity mismatch, or price variance, with a confidence score and the option to accept a suggested item code or create the item in the master.
- Accepted results write back to the GRN/invoice lines; the extraction run is stored as an audit record on the document.

## Technical notes

- Types/state: extend `src/lib/inventory/types.ts` (`Transfer`, `StockRow`), `src/lib/inventory/store.ts` (`applyMovement`, `setTransferStatus`) and `ItemMaster` in `src/lib/crm/revenue.ts`; option builders in `src/lib/inventory/options.ts` and `src/lib/crm/options.ts` gain project scoping.
- New `src/lib/inventory/reallocation.ts` holds validation + cost-transfer computation; it emits a finance event handled in `src/lib/finance/postings.ts` (`emitFinanceEvent`) so the journal follows the existing posting path, and updates project budget/committed figures through `src/lib/projects/store.ts`.
- New server route `src/routes/api/ocr-validate.ts` posts the uploaded file (base64 data URL) to the Lovable AI Gateway with a vision-capable chat model, requesting strict JSON line extraction; client helper `src/lib/procurement/ocr.ts` performs matching against the item master. Gateway 402/429 responses are surfaced as clear messages, not silent failures.
- UI: new `src/components/inventory/reallocate-dialog.tsx`, `src/components/procurement/ocr-validate-dialog.tsx`, plus edits to the inventory transfers section, procurement PO/GRN sections and `src/routes/_authenticated/masters.item-master.tsx`.
- Cloud persistence: the new fields are added to the existing sync schema so records round-trip to the database like current inventory and CRM data.
