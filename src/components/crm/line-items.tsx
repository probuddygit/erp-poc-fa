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
  itemsForProject,
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
  projectCode,
}: {
  kind: LineDocKind;
  docId: string;
  readOnly?: boolean;
  /** Customer state / region — decides the CGST+SGST vs IGST split. */
  customerRegion?: string;
  /** When set, only this project's items plus the common catalogue are pickable. */
  projectCode?: string;
}) {
  const allLines = useRevenue((s) => s.lines);
  const allItems = useRevenue((s) => s.items);
  const items = useMemo(() => itemsForProject(allItems, projectCode), [allItems, projectCode]);
  const [draftItem, setDraftItem] = useState("");
  const interState = isInterState(customerRegion);

  const options = useMemo(
    () =>
      items.map((i) => ({
        value: i.code,
        label: `${i.code} — ${i.description}`,
        hint: `${i.category} · ₹${i.rate.toLocaleString("en-IN")}${i.projectCode ? ` · ${i.projectCode}` : " · Common"}`,
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
      toast.error("Pick an item from the master — create it on the project's Items tab first.");
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
                <TableHead className="w-28">HSN / SAC</TableHead>
                <TableHead className="w-20 text-right">Qty</TableHead>
                <TableHead className="w-20">UOM</TableHead>
                <TableHead className="w-32 text-right">Rate</TableHead>
                <TableHead className="w-20 text-right">Disc %</TableHead>
                <TableHead className="w-28 text-right">Taxable</TableHead>
                <TableHead className="w-16 text-right">GST %</TableHead>
                <TableHead className="w-40 text-right">{interState ? "IGST" : "CGST + SGST"}</TableHead>
                <TableHead className="w-32 text-right">Line total</TableHead>
                {!readOnly && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => {
                const t = tax.rows[i]!;
                return (
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
                    <Badge variant="outline" className="mt-1 text-[10px]">{l.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      <span className="font-mono text-xs">{l.hsn || "—"}</span>
                    ) : (
                      <ComboboxField
                        value={l.hsn ?? ""}
                        options={HSN_CATALOGUE.map((h) => ({
                          value: h.hsn,
                          label: h.hsn,
                          hint: `${h.description} · ${h.gst}%`,
                        }))}
                        allowCustom
                        placeholder="HSN/SAC"
                        onChange={(v) => {
                          const info = hsnInfo(v);
                          upsertLine({ ...l, hsn: v, gstRate: info?.gst ?? l.gstRate, cessRate: info?.cess ?? l.cessRate });
                        }}
                      />
                    )}
                  </TableCell>
                  <NumCell value={l.qty} readOnly={readOnly} onChange={(v) => upsertLine({ ...l, qty: v })} />
                  <TableCell className="text-xs text-muted-foreground">{l.uom}</TableCell>
                  <NumCell value={l.rate} readOnly={readOnly} onChange={(v) => upsertLine({ ...l, rate: v })} />
                  <NumCell
                    value={l.discountPct}
                    readOnly={readOnly}
                    onChange={(v) => upsertLine({ ...l, discountPct: v })}
                  />
                  <TableCell className="text-right tabular-nums">{fmtINR(Math.round(t.taxable))}</TableCell>
                  <NumCell
                    value={l.gstRate ?? l.taxPct}
                    readOnly={readOnly}
                    onChange={(v) => upsertLine({ ...l, gstRate: v, taxPct: v })}
                  />
                  <TableCell className="text-right font-mono text-xs">
                    {interState
                      ? fmtINR(Math.round(t.igst))
                      : `${fmtINR(Math.round(t.cgst))} + ${fmtINR(Math.round(t.sgst))}`}
                    {t.cess > 0 && <div className="text-[10px] text-muted-foreground">Cess {fmtINR(Math.round(t.cess))}</div>}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {fmtINR(Math.round(t.total))}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeLine(l.id)}>
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
                );
              })}
              {!lines.length && (
                <TableRow>
                  <TableCell colSpan={readOnly ? 11 : 12} className="py-8 text-center text-sm text-muted-foreground">
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

        {Boolean(taxIssues.length) && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
            <div className="font-medium text-amber-700 dark:text-amber-400">
              {taxIssues.length} line(s) block document generation
            </div>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {taxIssues.map((i) => (
                <li key={`${i.index}-${i.problem}`}>
                  <span className="font-mono">{i.label}</span> — {i.problem}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Boolean(totals.count) && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-3 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">Tax summary</span>
                <Badge variant="outline" className="text-[10px]">
                  {interState ? "Inter-state · IGST" : "Intra-state · CGST + SGST"}
                </Badge>
              </div>
              <dl className="space-y-1 text-xs">
                <Row label="Taxable value" value={tax.taxable} />
                {interState ? (
                  <Row label="IGST" value={tax.igst} />
                ) : (
                  <>
                    <Row label="CGST" value={tax.cgst} />
                    <Row label="SGST" value={tax.sgst} />
                  </>
                )}
                {tax.cess > 0 && <Row label="Cess" value={tax.cess} />}
                <Row label="Total tax" value={tax.totalTax} />
                <Row label="Grand total" value={tax.grandTotal} strong />
              </dl>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">HSN/SAC</TableHead>
                    <TableHead className="w-16 text-right">Qty</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="w-14 text-right">Rate</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tax.hsnRows.map((h) => (
                    <TableRow key={`${h.hsn}-${h.rate}`}>
                      <TableCell className="font-mono text-xs">{h.hsn}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{h.qty}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtINR(Math.round(h.taxable))}</TableCell>
                      <TableCell className="text-right text-xs">{h.rate}%</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {fmtINR(Math.round(h.cgst + h.sgst + h.igst + h.cess))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "border-t pt-1 font-semibold" : ""}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{fmtINR(Math.round(value))}</dd>
    </div>
  );
}
