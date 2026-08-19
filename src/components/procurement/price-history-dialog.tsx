import { useMemo, useState } from "react";
import { History, TrendingDown, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ComboboxField, type ComboOption } from "@/components/combobox-field";
import { useProcurement } from "@/lib/procurement/store";
import { useInventory } from "@/lib/inventory/store";
import { buildPriceHistory, listPurchasedItems } from "@/lib/procurement/price-history";
import { fmtCompact, shortDate } from "@/components/projects/shared";
import type { Rfq } from "@/lib/procurement/types";

const inr = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-base font-semibold tabular-nums ${tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-destructive" : ""}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Popup showing when an item was last purchased and at what price, to inform vendor selection. */
export function PriceHistoryDialog({
  open,
  onOpenChange,
  rfq,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rfq: Rfq | null;
}) {
  const pos = useProcurement((s) => s.pos);
  const vendors = useProcurement((s) => s.vendors);
  const invItems = useInventory((s) => s.items);
  const [itemCode, setItemCode] = useState("");

  const purchased = useMemo(() => listPurchasedItems(pos), [pos]);

  const options = useMemo<ComboOption[]>(() => {
    const proj = rfq?.projectCode;
    const seen = new Set<string>();
    const rank = (p: string[]) => (proj && p.includes(proj) ? 0 : 1);
    const base = [...purchased].sort((a, b) => rank(a.projects) - rank(b.projects) || a.code.localeCompare(b.code));
    const opts: ComboOption[] = base.map((i) => {
      seen.add(i.code);
      return {
        value: i.code,
        label: `${i.code} — ${i.description || "Item"}`,
        hint: `${i.count} PO line${i.count === 1 ? "" : "s"}${proj && i.projects.includes(proj) ? " · this project" : ""}`,
      };
    });
    for (const it of invItems) {
      if (seen.has(it.code)) continue;
      opts.push({ value: it.code, label: `${it.code} — ${it.description}`, hint: "no purchase history" });
    }
    return opts;
  }, [purchased, invItems, rfq?.projectCode]);

  const history = useMemo(() => buildPriceHistory(pos, itemCode, vendors), [pos, itemCode, vendors]);
  const { rows, stats, byVendor } = history;

  const bids = rfq?.bids ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-base">
            <History className="h-4 w-4" />
            Item purchase price history
          </DialogTitle>
          <DialogDescription>
            Check when an item was last bought and at what rate before awarding {rfq?.code ?? "this RFQ"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="ph-item">Item</label>
          <ComboboxField
            id="ph-item"
            value={itemCode}
            options={options}
            allowCustom={false}
            placeholder="Search item code or description…"
            emptyText="No items found."
            onChange={(v) => setItemCode(v)}
          />
        </div>

        {!itemCode ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
            Pick an item to see its purchase history across all purchase orders.
          </div>
        ) : !stats ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
            No prior purchase history for <span className="font-mono">{itemCode}</span> — this is a first buy.
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-auto pr-1">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Tile label="Last price" value={inr(stats.lastRate)} hint={shortDate(stats.lastDate)} />
              <Tile label="Lowest ever" value={inr(stats.minRate)} tone="good" />
              <Tile label="Average" value={inr(stats.avgRate)} hint={`Highest ${inr(stats.maxRate)}`} />
              <Tile label="Purchases" value={String(stats.count)} hint={`${stats.totalQty.toLocaleString("en-IN")} qty bought`} />
              <Tile
                label="Last vs avg"
                value={`${stats.lastVsAvgPct >= 0 ? "+" : ""}${stats.lastVsAvgPct.toFixed(1)}%`}
                tone={stats.lastVsAvgPct > 0 ? "bad" : "good"}
                hint={stats.lastVsAvgPct > 0 ? "paying above average" : "below average"}
              />
            </div>

            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purchase history</div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left">PO</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Vendor</th>
                      <th className="p-2 text-left">Project</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-right">Received</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r) => (
                      <tr key={r.key} className="hover:bg-muted/30">
                        <td className="p-2 font-mono text-xs">{r.poCode}</td>
                        <td className="p-2 text-xs">{shortDate(r.poDate)}</td>
                        <td className="p-2 text-xs font-medium">{r.vendorName}</td>
                        <td className="p-2 text-xs text-muted-foreground">{r.projectCode || "—"}</td>
                        <td className="p-2 text-right font-mono text-xs">{r.qty.toLocaleString("en-IN")} {r.uom}</td>
                        <td className={`p-2 text-right font-mono text-xs ${r.rate === stats.minRate ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}`}>{inr(r.rate)}</td>
                        <td className="p-2 text-right font-mono text-xs">{fmtCompact(r.amount)}</td>
                        <td className="p-2 text-right font-mono text-xs">{r.receivedQty.toLocaleString("en-IN")}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px] capitalize">{r.status.replace(/-/g, " ")}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor summary</div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left">Vendor</th>
                      <th className="p-2 text-right">Orders</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Last rate</th>
                      <th className="p-2 text-right">Best rate</th>
                      <th className="p-2 text-right">Avg rate</th>
                      <th className="p-2 text-right">OTD</th>
                      <th className="p-2 text-right">Quality</th>
                      <th className="p-2 text-right">Lead</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {byVendor.map((v) => (
                      <tr key={v.vendorId} className="hover:bg-muted/30">
                        <td className="p-2 text-xs font-medium">
                          {v.vendorName}
                          {bids.some((b) => b.vendorId === v.vendorId) && (
                            <Badge variant="secondary" className="ml-1.5 text-[9px]">bidding now</Badge>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono text-xs">{v.orders}</td>
                        <td className="p-2 text-right font-mono text-xs">{v.totalQty.toLocaleString("en-IN")}</td>
                        <td className="p-2 text-right font-mono text-xs">{inr(v.lastRate)}</td>
                        <td className="p-2 text-right font-mono text-xs font-semibold">{inr(v.bestRate)}</td>
                        <td className="p-2 text-right font-mono text-xs">{inr(v.avgRate)}</td>
                        <td className="p-2 text-right font-mono text-xs">{v.onTimePct != null ? `${v.onTimePct}%` : "—"}</td>
                        <td className="p-2 text-right font-mono text-xs">{v.qualityPct != null ? `${v.qualityPct}%` : "—"}</td>
                        <td className="p-2 text-right font-mono text-xs">{v.leadTimeDays != null ? `${v.leadTimeDays}d` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!!bids.length && (
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live bids on {rfq?.code}</div>
                <div className="flex flex-wrap gap-2">
                  {bids.map((b) => {
                    const avgLine = rows.reduce((s, r) => s + r.amount, 0) / rows.length;
                    const above = b.amount > avgLine;
                    return (
                      <div key={b.vendorId} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs">
                        <span className="font-medium">{b.vendorName}</span>
                        <span className="font-mono">{fmtCompact(b.amount)}</span>
                        <Badge
                          variant="outline"
                          className={`gap-1 text-[10px] ${above ? "border-amber-500/40 text-amber-600 dark:text-amber-400" : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"}`}
                        >
                          {above ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {above ? "above" : "below"} historical avg {fmtCompact(avgLine)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
