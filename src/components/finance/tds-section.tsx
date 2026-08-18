import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, RefreshCw, RotateCcw, Power, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportCsv } from "@/lib/crud";
import { FinToolbar, FinSearch, SegTabs } from "@/components/finance/shared";
import { fmtINR, shortDate } from "@/components/projects/shared";
import { certificateData } from "@/lib/finance/tds";
import {
  deriveLedger,
  evaluateAllBills,
  syncTdsToBills,
  tdsRules,
  useTdsRules,
} from "@/lib/finance/tds-store";

type View = "rules" | "deductions" | "ledger" | "certificates";

export function TdsSection() {
  const rules = useTdsRules();
  const [view, setView] = useState<View>("rules");
  const [q, setQ] = useState("");

  const evals = useMemo(() => evaluateAllBills(rules), [rules]);
  const ledger = useMemo(() => deriveLedger(rules), [rules]);
  const certs = useMemo(() => certificateData(ledger), [ledger]);

  const totalTds = ledger.reduce((t, e) => t + e.tds, 0);
  const applicable = evals.filter((e) => e.result.applicable);
  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <FinToolbar>
        <FinSearch q={q} setQ={setQ} placeholder="Search vendor, section, bill…" />
        <SegTabs
          value={view}
          onChange={setView}
          options={[
            { k: "rules" as View, l: "Rules engine" },
            { k: "deductions" as View, l: "Bill evaluation" },
            { k: "ledger" as View, l: "TDS ledger" },
            { k: "certificates" as View, l: "Certificates · 26Q" },
          ]}
        />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              const n = syncTdsToBills(rules);
              toast.success(n ? `${n} supplier invoice(s) updated with computed TDS` : "All supplier invoices already in sync");
            }}
          >
            <RefreshCw className="h-4 w-4" /> Apply TDS to supplier invoices
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              exportCsv("tds-ledger", ledger as unknown as Array<Record<string, unknown>>);
              toast.success("TDS ledger exported");
            }}
          >
            <Download className="h-4 w-4" /> Export ledger
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => { tdsRules.reset(); toast.success("Rules restored to statutory defaults"); }}>
            <RotateCcw className="h-4 w-4" /> Reset rules
          </Button>
        </div>
      </FinToolbar>

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Active rules" value={String(rules.filter((r) => r.active).length)} />
        <Kpi label="Deductible bills" value={String(applicable.length)} />
        <Kpi label="TDS deducted" value={fmtINR(Math.round(totalTds))} />
        <Kpi label="Certificates due" value={String(certs.length)} />
      </div>

      {view === "rules" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">TDS rules — section, threshold, rate, rounding</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Nature</TableHead>
                  <TableHead>Vendor types</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead className="text-right">Single</TableHead>
                  <TableHead className="text-right">Annual</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">No PAN</TableHead>
                  <TableHead>Rounding</TableHead>
                  <TableHead>FY</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules
                  .filter((r) => match(`${r.section} ${r.name} ${r.code}`))
                  .map((r) => (
                    <TableRow key={r.id} className={r.active ? "" : "opacity-50"}>
                      <TableCell className="font-mono text-xs">{r.section}</TableCell>
                      <TableCell className="text-sm">{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.vendorTypes.join(", ")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.transactionTypes.join(", ")}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtINR(r.singleThreshold)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtINR(r.annualThreshold)}</TableCell>
                      <TableCell className="text-right text-xs">{r.ratePct}%</TableCell>
                      <TableCell className="text-right text-xs">{r.noPanRatePct}%</TableCell>
                      <TableCell className="text-xs">{r.rounding}</TableCell>
                      <TableCell className="text-xs">{r.financialYear}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() => {
                            tdsRules.upsert({ ...r, active: !r.active });
                            toast.success(`${r.section} ${r.active ? "disabled" : "enabled"}`);
                          }}
                        >
                          <Power className="h-3.5 w-3.5" /> {r.active ? "On" : "Off"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {view === "deductions" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Supplier invoice evaluation</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">TDS</TableHead>
                  <TableHead>Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evals
                  .filter((e) => match(`${e.billCode} ${e.vendorName} ${e.result.section ?? ""}`))
                  .map((e) => (
                    <TableRow key={e.billId}>
                      <TableCell className="font-mono text-xs">{e.billCode}</TableCell>
                      <TableCell className="text-sm">{e.vendorName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.projectCode ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtINR(Math.round(e.base))}</TableCell>
                      <TableCell className="text-xs">{e.result.section ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs">{e.result.ratePct}%</TableCell>
                      <TableCell className="text-right text-xs font-medium tabular-nums">
                        {fmtINR(Math.round(e.result.tds))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.result.applicable ? "default" : "secondary"} className="text-[10px]">
                          {e.result.reason}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {view === "ledger" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">TDS ledger</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>FY · Qtr</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">TDS</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger
                  .filter((e) => match(`${e.vendorName} ${e.section} ${e.reference}`))
                  .map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{shortDate(e.date)}</TableCell>
                      <TableCell className="text-sm">{e.vendorName}</TableCell>
                      <TableCell className="font-mono text-xs">{e.reference}</TableCell>
                      <TableCell className="text-xs">{e.section}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.financialYear} · {e.quarter}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtINR(Math.round(e.base))}</TableCell>
                      <TableCell className="text-right text-xs">{e.ratePct}%</TableCell>
                      <TableCell className="text-right text-xs font-medium tabular-nums">{fmtINR(e.tds)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{e.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {view === "certificates" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Form 16A / 26Q reporting data</CardTitle>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}>
              <FileText className="h-4 w-4" /> Print
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate no.</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PAN</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>FY · Qtr</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">TDS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certs
                  .filter((c) => match(`${c.vendorName} ${c.section} ${c.certificateNo}`))
                  .map((c) => (
                    <TableRow key={c.certificateNo}>
                      <TableCell className="font-mono text-xs">{c.certificateNo}</TableCell>
                      <TableCell className="text-sm">{c.vendorName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.vendorPan ?? "Not on file"}</TableCell>
                      <TableCell className="text-xs">{c.section}</TableCell>
                      <TableCell className="text-xs">{c.financialYear} · {c.quarter}</TableCell>
                      <TableCell className="text-right text-xs">{c.entries}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtINR(Math.round(c.base))}</TableCell>
                      <TableCell className="text-right text-xs font-medium tabular-nums">{fmtINR(Math.round(c.tds))}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
