import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Zap, AlertTriangle, PackageCheck, Boxes, ArrowRight, GitBranch, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlm } from "@/lib/plm/store";
import { bomAvailability, runBomSourcing, generateMbomFromEbom, traceBom, type SourcingResult } from "@/lib/plm/mrp";
import { makeBuyAdvice } from "@/lib/plm/intelligence";
import { fmtINR, fmtQty } from "@/lib/plm/format";

/**
 * Material availability + sourcing automation for one BOM structure.
 * Buy shortages raise a Purchase Requisition; Make lines create Work Orders
 * and reserve inventory — with the full traceability chain rendered below.
 */
export function BomSourcingPanel({ rootId, kind }: { rootId: string; kind: "EBOM" | "MBOM" }) {
  const s = usePlm((st) => st);
  const [result, setResult] = useState<SourcingResult | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  const rows = useMemo(() => bomAvailability(s, rootId), [s, rootId]);
  const root = s.bom.find((n) => n.id === rootId);
  const advice = useMemo(() => makeBuyAdvice(s).filter((a) => rows.some((r) => r.itemCode === a.itemCode) && a.recommended !== a.current), [s, rows]);
  const trace = useMemo(() => (showTrace ? traceBom(rootId) : []), [showTrace, rootId, s]);

  const shortages = rows.filter((r) => r.shortage > 0);
  const buyShort = shortages.filter((r) => r.sourcing === "Buy");
  const makeLines = rows.filter((r) => r.sourcing === "Make");
  const demandValue = rows.reduce((a, r) => a + r.extendedCost, 0);

  const run = () => {
    const res = runBomSourcing(rootId);
    setResult(res);
    toast.success("Sourcing run complete", {
      description: [res.prCode ? `PR ${res.prCode} raised` : null, res.workOrders.length ? `${res.workOrders.length} work order(s) created` : null]
        .filter(Boolean)
        .join(" · ") || "Everything already covered by stock or open orders",
    });
  };

  const toMbom = () => {
    const res = generateMbomFromEbom(rootId);
    if ("error" in res) toast.error(res.error);
    else toast.success(`MBOM generated with ${res.nodes} lines`, { description: "Scrap allowance applied to consumed material per manufacturing rules." });
  };

  return (
    <div className="space-y-3">
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-primary" />Material availability & sourcing automation
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Nets project demand against on-hand stock, reservations and open purchase orders, then raises PRs for Buy shortages and work orders for Make items.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {kind === "EBOM" && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={toMbom}>
                <GitBranch className="h-3.5 w-3.5" />Generate MBOM
              </Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={run}>
              <Zap className="h-3.5 w-3.5" />Run sourcing
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["Demand value", fmtINR(demandValue)],
              ["Buy shortages", String(buyShort.length)],
              ["Make items", String(makeLines.length)],
              ["Project", root?.projectCode ?? "Not tagged"],
              ["Shortage value", fmtINR(shortages.reduce((a, r) => a + r.shortage * r.stdCost, 0))],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border bg-background p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                <div className="mt-0.5 font-display text-sm font-semibold">{v}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Item</th><th className="p-2 text-left">Sourcing</th>
                  <th className="p-2 text-right">Required</th><th className="p-2 text-right">On hand</th>
                  <th className="p-2 text-right">Reserved</th><th className="p-2 text-right">Open PO</th>
                  <th className="p-2 text-right">Shortage</th><th className="p-2 text-right">Lead</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.nodeId} className={r.shortage > 0 ? "bg-rose-500/[0.04]" : ""}>
                    <td className="p-2">
                      <div className="font-medium">{r.itemName}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {r.itemCode}{!r.inItemMaster && <span className="ml-1 text-amber-600">· not in item master</span>}
                      </div>
                    </td>
                    <td className="p-2"><Badge variant={r.sourcing === "Buy" ? "outline" : "secondary"} className="text-[10px]">{r.sourcing}</Badge></td>
                    <td className="p-2 text-right font-mono">{fmtQty(r.extendedQty)} {r.uom}</td>
                    <td className="p-2 text-right font-mono">{fmtQty(r.onHand)}</td>
                    <td className="p-2 text-right font-mono">{fmtQty(r.reserved)}</td>
                    <td className="p-2 text-right font-mono">{fmtQty(r.openPo)}</td>
                    <td className={`p-2 text-right font-mono ${r.shortage > 0 ? "font-semibold text-rose-600" : ""}`}>{fmtQty(r.shortage)}</td>
                    <td className="p-2 text-right font-mono">{r.leadTimeDays}d</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No components on this structure yet.</td></tr>}
              </tbody>
            </table>
          </div>

          {result && (
            <div className="space-y-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3 text-xs">
              <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300">
                <PackageCheck className="h-4 w-4" />Automation results
              </div>
              {result.prCode && <div>Purchase Requisition <span className="font-mono">{result.prCode}</span> raised for {result.prLines} shortage line(s) — {fmtINR(result.prValue)} routed for approval.</div>}
              {result.workOrders.length > 0 && <div>Work orders created: <span className="font-mono">{result.workOrders.join(", ")}</span> · {fmtINR(result.reservedValue)} material reserved.</div>}
              {result.skipped.length > 0 && (
                <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {result.skipped.length} item(s) are not in the inventory item master — create them to enable stock netting: {result.skipped.slice(0, 4).join(", ")}
                </div>
              )}
              {result.notifications.map((n) => <div key={n} className="text-muted-foreground">• {n}</div>)}
            </div>
          )}

          {advice.length > 0 && (
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5 text-primary" />Copilot: Make vs Buy</div>
              <div className="mt-2 space-y-1.5 text-xs">
                {advice.slice(0, 4).map((a) => (
                  <div key={a.itemCode} className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px]">{a.itemCode}</Badge>
                    <span>
                      <span className="font-medium">{a.current} <ArrowRight className="inline h-3 w-3" /> {a.recommended}</span> — {a.rationale}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setShowTrace((v) => !v)}>
            <Boxes className="h-3.5 w-3.5" />{showTrace ? "Hide" : "Show"} end-to-end traceability
          </Button>

          {showTrace && (
            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground">
                  <tr><th className="p-2 text-left">Stage</th><th className="p-2 text-left">Reference</th><th className="p-2 text-left">Detail</th><th className="p-2 text-left">Status</th><th className="p-2 text-right">Value</th></tr>
                </thead>
                <tbody className="divide-y">
                  {trace.map((t, i) => (
                    <tr key={`${t.stage}-${t.reference}-${i}`}>
                      <td className="p-2"><Badge variant="secondary" className="text-[10px]">{t.stage}</Badge></td>
                      <td className="p-2 font-mono">{t.reference}</td>
                      <td className="p-2">{t.detail}</td>
                      <td className="p-2 text-muted-foreground">{t.status ?? "—"}</td>
                      <td className="p-2 text-right font-mono">{t.value ? fmtINR(t.value) : "—"}</td>
                    </tr>
                  ))}
                  {!trace.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Tag this BOM to a project to build the traceability chain.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
