import { useMemo, useState } from "react";
import { Plus, Trash2, Wand2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComboboxField } from "@/components/combobox-field";
import { fmtINR } from "@/components/crm/shared";
import {
  docTotals,
  lineAmount,
  removeLine,
  syncDocValue,
  upsertLine,
  useRevenue,
  type LineDocKind,
} from "@/lib/crm/revenue";
import {
  HSN_CATALOGUE,
  hsnInfo,
  isInterState,
  summariseTax,
  validateTaxLines,
} from "@/lib/tax/gst-calc";

/** Line-item grid used on Quotations, Order Acceptance and Sales Orders. */
export function LineItemsPanel({
  kind,
  docId,
  readOnly = false,
  customerRegion,
}: {
  kind: LineDocKind;
  docId: string;
  readOnly?: boolean;
  /** Customer state / region — decides the CGST+SGST vs IGST split. */
  customerRegion?: string;
}) {
  const allLines = useRevenue((s) => s.lines);
  const items = useRevenue((s) => s.items);
  const [draftItem, setDraftItem] = useState("");
  const interState = isInterState(customerRegion);

  const options = useMemo(
    () =>
      items.map((i) => ({
        value: i.code,
        label: `${i.code} — ${i.description}`,
        hint: `${i.category} · ₹${i.rate.toLocaleString("en-IN")}`,
      })),
    [items],
  );

  const lines = useMemo(
    () => allLines.filter((l) => l.docKind === kind && l.docId === docId),
    [allLines, kind, docId],
  );
  const totals = docTotals(lines);

  const addFromMaster = (code: string) => {
    const item = items.find((i) => i.code === code);
    if (!item) {
      toast.error("Pick an item from the master — create it under Master Data › Item Master first.");
      return;
    }
    const info = hsnInfo(item.hsn);
    upsertLine({
      docKind: kind,
      docId,
      itemCode: item.code,
      description: item.description,
      category: item.category,
      uom: item.uom,
      qty: 1,
      rate: item.rate,
      discountPct: 0,
      taxPct: info?.gst ?? 18,
      hsn: item.hsn,
      gstRate: info?.gst ?? 18,
      cessRate: info?.cess,
    });
    setDraftItem("");
    if (!item.hsn) toast.warning(`${item.code} has no HSN/SAC on the item master — set it before generating documents.`);
    else toast.success(`${item.code} added · HSN ${item.hsn}`);
  };

  const taxLines = useMemo(
    () =>
      lines.map((l) => ({
        itemCode: l.itemCode,
        description: l.description,
        uom: l.uom,
        qty: Number(l.qty || 0),
        hsn: l.hsn,
        gstRate: l.gstRate,
        cessRate: l.cessRate,
        taxPct: l.taxPct,
        taxable: lineAmount(l),
      })),
    [lines],
  );
  const tax = useMemo(() => summariseTax(taxLines, interState), [taxLines, interState]);
  const taxIssues = useMemo(() => validateTaxLines(taxLines), [taxLines]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Line items</CardTitle>
          <p className="text-xs text-muted-foreground">
            {totals.count} line(s) · net {fmtINR(Math.round(totals.net))} · with tax {fmtINR(Math.round(totals.gross))}
          </p>
        </div>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              const t = syncDocValue(kind, docId);
              toast.success(`Document value synced to ${fmtINR(Math.round(t.net))}`);
            }}
          >
            <RefreshCw className="h-4 w-4" /> Sync value
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-64 flex-1">
              <ComboboxField
                value={draftItem}
                options={options}
                allowCustom={false}
                placeholder="Search the item master…"
                onChange={(v) => setDraftItem(v)}
              />
            </div>
            <Button size="sm" className="gap-2" onClick={() => addFromMaster(draftItem)}>
              <Plus className="h-4 w-4" /> Add line
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() =>
                upsertLine({ docKind: kind, docId, description: "New scope line", category: "General" })
              }
            >
              <Wand2 className="h-4 w-4" /> Blank line
            </Button>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-28">Category</TableHead>
                <TableHead className="w-20 text-right">Qty</TableHead>
                <TableHead className="w-20">UOM</TableHead>
                <TableHead className="w-32 text-right">Rate</TableHead>
                <TableHead className="w-20 text-right">Disc %</TableHead>
                <TableHead className="w-20 text-right">Tax %</TableHead>
                <TableHead className="w-32 text-right">Amount</TableHead>
                {!readOnly && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.itemCode || "—"}</TableCell>
                  <TableCell>
                    {readOnly ? (
                      l.description
                    ) : (
                      <Input
                        className="h-8"
                        value={l.description}
                        onChange={(e) => upsertLine({ ...l, description: e.target.value })}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {l.category}
                    </Badge>
                  </TableCell>
                  <NumCell value={l.qty} readOnly={readOnly} onChange={(v) => upsertLine({ ...l, qty: v })} />
                  <TableCell className="text-xs text-muted-foreground">{l.uom}</TableCell>
                  <NumCell value={l.rate} readOnly={readOnly} onChange={(v) => upsertLine({ ...l, rate: v })} />
                  <NumCell
                    value={l.discountPct}
                    readOnly={readOnly}
                    onChange={(v) => upsertLine({ ...l, discountPct: v })}
                  />
                  <NumCell value={l.taxPct} readOnly={readOnly} onChange={(v) => upsertLine({ ...l, taxPct: v })} />

                  <TableCell className="text-right font-medium tabular-nums">
                    {fmtINR(Math.round(lineAmount(l)))}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeLine(l.id)}>
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!lines.length && (
                <TableRow>
                  <TableCell colSpan={readOnly ? 9 : 10} className="py-8 text-center text-sm text-muted-foreground">
                    No line items yet — add them from the item master to drive pricing, budgets and procurement.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {Boolean(totals.count) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(totals.byCategory).map(([cat, amt]) => (
              <span key={cat} className="rounded-md bg-muted px-2 py-1 text-xs">
                {cat}: <strong>{fmtINR(Math.round(amt))}</strong>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NumCell({
  value,
  readOnly,
  onChange,
}: {
  value: number;
  readOnly: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <TableCell className="text-right">
      {readOnly ? (
        <span className="tabular-nums">{value}</span>
      ) : (
        <Input
          type="number"
          className="h-8 text-right"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
    </TableCell>
  );
}
