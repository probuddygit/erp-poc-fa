# Import BOM (Excel) for EBOM

Add an **Import BOM** action to the EBOM screen in Engineering that lets users build complete multi-level BOMs from an Excel workbook, with validation, preview, controlled overwrite, and an import audit trail.

## User flow

1. On Engineering → EBOM, a new **Import BOM** button opens a dialog.
2. **Download Excel template** — a formatted .xlsx with the correct columns and a filled sample multi-level structure plus an instructions sheet.
3. **Upload .xlsx / .xls** (drag-drop or browse). Only Excel is accepted; CSV is rejected with a clear message.
4. **Validation & preview screen** shows:
   - Summary counters: total rows, valid, warnings, errors.
   - The parsed BOM rendered as an indented tree exactly as it will be created.
   - A row-by-row issue list (row number, column, message) with severity colouring.
   - Import is blocked while errors exist; warnings can be accepted.
   - User fixes the file and re-uploads in place — no need to close the dialog.
5. **Conflict handling** — if the Top Assembly already exists in EBOM, the user must explicitly choose:
   - Cancel (default; nothing is imported)
   - Replace structure under the existing top assembly
   - Create as a new revision (bump Rev, keep the old structure intact)
6. **Submit** creates the multi-level EBOM with full Project / Top Assembly / Item / Rev / Qty / UoM / Sourcing and parent-child links, identical in shape to manually created BOMs, then records an audit entry.

## Excel template columns

| Column | Rule |
|---|---|
| Level | Integer, 0 = Top Assembly. Exactly one level-0 row per sheet. Cannot jump more than one level down from the previous row. |
| Parent Item Code | Blank for level 0; must match a preceding row's item code at level-1 |
| Item Code | Mandatory, non-blank, warns if unknown to Item Master |
| Item Name | Mandatory |
| Quantity | Mandatory, numeric, > 0 |
| UoM | Mandatory, one of EA / KG / MTR / SET / LOT |
| Rev | Mandatory, one of A–E |
| Sourcing | Make or Buy (Top assembly defaults Make) |
| Ref Des | Optional |
| Project Code | Optional on rows; taken from Top Assembly row and inherited by children |

## Validations

- Mandatory fields present; numeric quantity; UoM / Rev / Sourcing against the same option lists the EBOM form uses.
- Exactly one Top Assembly; hierarchy contiguous and resolvable; no orphan parents.
- No circular parent references and no duplicate item code under the same parent (duplicate lines rejected).
- Warnings (non-blocking): item code not found in Item Master, project code not found, Buy item marked with children.

## Import history / audit trail

A new **Import History** panel below the BOM tree (and in the dialog) lists each import: file name, user, date/time, project, top assembly, action taken (new / replace / new revision), total records, imported, rejected, and expandable validation errors. Entries are retained in the PLM store alongside the rest of the engineering data.

## Technical notes

- Parsing uses the `xlsx` package already in the project (client-side only).
- New files: `src/lib/plm/bom-import.ts` (template generation, sheet parsing, validation, tree building, commit helper) and `src/components/engineering/bom-import-dialog.tsx` (upload → preview → conflict → submit UI).
- Commit path reuses `upsertPlm("bom", …)` so cloud sync, `rootId`/`parentId` wiring, and existing BOM business rules apply unchanged; parents are created before children so ids resolve.
- Import history added as a `bomImports` collection in `src/lib/plm/types.ts` + `store.ts`, with the existing forward-compatible migration guard so current saved data keeps working.
- `engineering.$section.tsx` gets the Import BOM button and history panel in `BomView`, enabled for EBOM.
