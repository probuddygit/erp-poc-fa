# Item Purchase Price History in RFQ → PO

Add a "Price history" button to the RFQ → PO workflow so a buyer can check, before awarding, when an item was last purchased and at what price.

## What the user sees

- A new **Price history** button on every RFQ card (next to "Compare bids"), and the same button inside the bid comparison view.
- Clicking it opens a popup with:
  - A searchable item picker at the top (item code / description), pre-filtered to items appearing on the RFQ's project POs when available.
  - Summary tiles for the selected item: last purchase price, lowest ever price, average price, number of purchases, and % change of the last price vs. the average.
  - A **Purchase history table**: PO code, PO date, vendor, project, quantity, UoM, rate, line amount, PO status, received qty. Sorted newest first.
  - A **Vendor summary** block: per-vendor last rate, best rate, total qty bought, average lead time and on-time %, pulled from the vendor master — so the buyer can compare a live bid against what each vendor historically charged.
  - Inline hint on each current RFQ bid: if the bid amount is above the historical average for the item, show a warning chip.
- Empty state when the item was never purchased before ("No prior purchase history — this is a first buy").

## Data source

Everything comes from existing procurement state; no schema change and no new tables:
- `pos[].lines[]` gives item code, description, qty, uom, rate, amount, received qty.
- `pos[]` header gives vendor, buyer, PO date, project, currency, status.
- `vendors[]` gives on-time %, quality %, lead time for the vendor summary.
- Item descriptions also draw on the inventory item master for the picker labels.

## Technical notes

- New helper `src/lib/procurement/price-history.ts`: `buildPriceHistory(pos, itemCode)` returning `{ rows, stats, byVendor }`, plus `listPurchasedItems(pos)` for the picker options.
- New component `src/components/procurement/price-history-dialog.tsx` using the existing `Dialog`, `ComboboxField`, `Badge`, and table styling used elsewhere in procurement (high-density, mono numerics, `fmtCompact` for currency).
- Wire into `RfqView` in `src/routes/_authenticated/procurement.$section.tsx` with a `priceHistoryFor` state; pass the RFQ's `projectCode` and its bids so the dialog can flag above-average bids.
- No changes to award logic, PO creation, or persistence.
