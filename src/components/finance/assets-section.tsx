import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RowActions, useCrud } from "@/components/crud-kit";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RecordDialog } from "@/components/record-dialog";
import { useQualityDoc } from "@/components/quality-doc-dialog";
import { exportCsv } from "@/lib/crud";
import { FINANCE_SCHEMAS } from "@/lib/finance/schemas";
import { useFinanceOptions } from "@/lib/finance/options";
import { assetRegisterDocument } from "@/lib/finance/documents";
import {
  useFinance, upsertFinance, deleteFinance, runDepreciation, disposeAsset, assetNbv, assetAnnualDepreciation,
} from "@/lib/finance/store";
import { assetSummary } from "@/lib/finance/intelligence";
import { fmtCompact, fmtINR, shortDate } from "@/components/projects/shared";
import { FinToolbar, FinSearch } from "@/components/finance/shared";
import { Download, Plus, Printer, CalendarClock, PackageX, Boxes } from "lucide-react";

const COLORS = ["hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(271 76% 53%)", "hsl(199 89% 48%)", "hsl(0 84% 60%)"];

export function AssetsSection() {
  const assets = useFinance((s) => s.fixedAssets);
  const state = useFinance((s) => s);
  const options = useFinanceOptions();
  const crud = useCrud(FINANCE_SCHEMAS, upsertFinance, deleteFinance, options);
  const doc = useQualityDoc();
  const [q, setQ] = useState("");
  const [dispose, setDispose] = useState<string | null>(null);

  const summary = useMemo(() => assetSummary(state), [state]);
  const filtered = assets.filter((a) => `${a.code} ${a.name} ${a.category} ${a.location} ${a.status}`.toLowerCase().includes(q.toLowerCase()));

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    assets.filter((a) => a.status !== "disposed").forEach((a) => m.set(a.category, (m.get(a.category) ?? 0) + assetNbv(a)));
    return Array.from(m, ([name, value]) => ({ name, value: Math.round(value / 100000) }));
  }, [assets]);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <FinToolbar>
        <FinSearch q={q} setQ={setQ} placeholder="Search asset, category, location…" />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => {
            const r = runDepreciation(1);
            toast.success(r.assets ? `Depreciation posted for ${r.assets} asset(s) — ${fmtCompact(r.amount)}` : "No assets pending depreciation");
          }}>
            <CalendarClock className="h-4 w-4" /> Run depreciation
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => { exportCsv("fixed-assets", filtered as unknown as Array<Record<string, unknown>>); toast.success("Asset register exported"); }}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => doc.show(assetRegisterDocument(filtered))}>
            <Printer className="h-4 w-4" /> Print register
          </Button>
          <Button size="sm" className="gap-2" onClick={() => crud.openNew("fixedAssets", "New Fixed Asset", { method: "SLM", status: "active", accumulatedDepreciation: 0, salvage: 0, acquiredAt: new Date().toISOString().slice(0, 10) })}>
            <Plus className="h-4 w-4" /> New Asset
          </Button>
        </div>
      </FinToolbar>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Mini label="Active assets" value={String(summary.count)} />
        <Mini label="Gross block" value={fmtCompact(summary.gross)} />
        <Mini label="Accumulated depreciation" value={fmtCompact(summary.accumulated)} />
        <Mini label="Net block" value={fmtCompact(summary.netBlock)} />
        <Mini label="Monthly charge" value={fmtCompact(summary.monthlyCharge)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Asset</th>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-right">Cost</th>
                  <th className="p-3 text-right">Acc. dep.</th>
                  <th className="p-3 text-right">Net block</th>
                  <th className="p-3 text-right">Annual charge</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium">{a.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{a.code} · {a.category} · {a.method} · acquired {shortDate(a.acquiredAt)}</div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {a.location}
                      {a.projectCode && <div className="font-mono text-[10px]">{a.projectCode}</div>}
                    </td>
                    <td className="p-3 text-right font-mono text-xs">{fmtINR(a.cost)}</td>
                    <td className="p-3 text-right font-mono text-xs">{fmtINR(a.accumulatedDepreciation)}</td>
                    <td className="p-3 text-right font-mono text-xs font-semibold">{fmtINR(assetNbv(a))}</td>
                    <td className="p-3 text-right font-mono text-xs">{fmtINR(Math.round(assetAnnualDepreciation(a)))}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-[10px] uppercase ${a.status === "disposed" ? "border-muted-foreground/30 text-muted-foreground" : a.status === "under-maintenance" ? "border-amber-500/40 text-amber-600" : "border-emerald-500/40 text-emerald-600"}`}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="p-1">
                      <RowActions
                        onEdit={() => crud.openEdit("fixedAssets", { ...a }, `Edit ${a.code}`)}
                        onDelete={() => crud.askDelete("fixedAssets", a.id, `${a.code} — ${a.name}`)}
                        extra={a.status !== "disposed" ? <DropdownMenuItem onClick={() => setDispose(a.id)}><PackageX className="mr-2 h-4 w-4" /> Dispose</DropdownMenuItem> : undefined}
                      />
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground"><Boxes className="mx-auto mb-2 h-5 w-5" />No assets match this search.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Net block by category</CardTitle>
            <p className="text-xs text-muted-foreground">₹ Lakh</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {byCategory.map((r, i) => (
                <div key={r.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="ml-auto font-mono">₹{r.value}L</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <RecordDialog
        open={!!dispose}
        onOpenChange={(v) => !v && setDispose(null)}
        title="Dispose asset"
        fields={FINANCE_SCHEMAS["disposeAsset"] ?? []}
        onSubmit={(values) => {
          if (!dispose) return;
          disposeAsset(dispose, Number(values["proceeds"] ?? 0));
          toast.success("Asset disposed — gain/loss journal posted");
          setDispose(null);
        }}
      />
      {crud.dialogs}
      {doc.dialog}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1.5 font-display text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
