import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Printer, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportCsv } from "@/lib/crud";
import { useFinance } from "@/lib/finance/store";
import { FinToolbar, SegTabs } from "@/components/finance/shared";
import { fmtINR, shortDate } from "@/components/projects/shared";
import {
  balanceSheet,
  cashFlow,
  dimensionOptions,
  generalLedger,
  ledgerTrialBalance,
  profitAndLoss,
  schedules,
  type StatementFilters,
} from "@/lib/finance/statements";

type View = "tb" | "pnl" | "bs" | "cf" | "gl" | "schedules";

const COMPANIES = ["Faith Automation Pvt Ltd"];
const BRANCHES = ["All branches", "Chennai — HO", "Coimbatore Plant", "Pune Office"];

export function StatementsSection() {
  const s = useFinance((x) => x);
  const [view, setView] = useState<View>("tb");
  const [f, setF] = useState<StatementFilters>({});
  const [branch, setBranch] = useState(BRANCHES[0]!);
  const [drill, setDrill] = useState<string | null>(null);
  const [txn, setTxn] = useState<string | null>(null);

  const dims = useMemo(() => dimensionOptions(s), [s]);
  const tb = useMemo(() => ledgerTrialBalance(s, f), [s, f]);
  const pnl = useMemo(() => profitAndLoss(s, f), [s, f]);
  const bs = useMemo(() => balanceSheet(s, f), [s, f]);
  const cf = useMemo(() => cashFlow(s, f), [s, f]);
  const sched = useMemo(() => schedules(s, f), [s, f]);
  const gl = useMemo(() => generalLedger(s, drill ?? undefined, f), [s, drill, f]);

  const block = view === "pnl" ? pnl : view === "bs" ? bs : view === "cf" ? cf : null;
  const journal = txn ? s.journals.find((j) => j.code === txn) : undefined;

  const setDim = (k: keyof StatementFilters, v: string) =>
    setF((prev) => ({ ...prev, [k]: v === "all" ? undefined : v }));

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <FinToolbar>
        <SegTabs
          value={view}
          onChange={setView}
          options={[
            { k: "tb" as View, l: "Trial Balance" },
            { k: "pnl" as View, l: "Profit & Loss" },
            { k: "bs" as View, l: "Balance Sheet" },
            { k: "cf" as View, l: "Cash Flow" },
            { k: "gl" as View, l: "General Ledger" },
            { k: "schedules" as View, l: "Schedules" },
          ]}
        />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              const rows =
                view === "tb" ? tb : view === "gl" ? gl : view === "schedules" ? sched : (block?.lines ?? []);
              exportCsv(`${view}-statement`, rows as unknown as Array<Record<string, unknown>>);
              toast.success("Exported");
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </FinToolbar>

      <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-3 lg:grid-cols-7">
        <Sel label="Company" value={f.company ?? COMPANIES[0]!} options={COMPANIES} onChange={(v) => setDim("company", v)} />
        <Sel label="Branch" value={branch} options={BRANCHES} onChange={setBranch} />
        <Sel label="Department" value={f.department ?? "all"} options={["all", ...dims.departments]} onChange={(v) => setDim("department", v)} />
        <Sel label="Project" value={f.projectCode ?? "all"} options={["all", ...dims.projects]} onChange={(v) => setDim("projectCode", v)} />
        <Sel label="Cost centre" value={f.costCentreCode ?? "all"} options={["all", ...dims.costCentres]} onChange={(v) => setDim("costCentreCode", v)} />
        <Sel label="Financial year" value={f.financialYear ?? "all"} options={["all", ...dims.financialYears]} onChange={(v) => setDim("financialYear", v)} />
        <Sel label="Period" value={f.period ?? "all"} options={["all", ...dims.periods]} onChange={(v) => setDim("period", v)} />
      </div>

      {view === "tb" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Trial Balance</CardTitle>
            <p className="text-xs text-muted-foreground">Click an account to drill through to the ledger, then to the source journal.</p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tb.map((r) => (
                  <TableRow
                    key={r.code}
                    className="cursor-pointer"
                    onClick={() => {
                      setDrill(r.code);
                      setView("gl");
                    }}
                  >
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="text-sm">{r.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.type}</Badge></TableCell>
                    <TableCell className="text-right text-xs">{r.lines}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{fmtINR(Math.round(r.debit))}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{fmtINR(Math.round(r.credit))}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtINR(Math.round(tb.reduce((a, r) => a + r.debit, 0)))}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtINR(Math.round(tb.reduce((a, r) => a + r.credit, 0)))}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {block && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">{block.title}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableBody>
                {block.lines.map((l, i) => (
                  <TableRow
                    key={`${l.code}-${i}`}
                    className={l.emphasis ? "bg-muted/40 font-semibold" : "cursor-pointer"}
                    onClick={() => {
                      if (!l.emphasis && /^\d{4}$/.test(l.code)) {
                        setDrill(l.code);
                        setView("gl");
                      }
                    }}
                  >
                    <TableCell className="w-32 text-[11px] uppercase tracking-wide text-muted-foreground">{l.group}</TableCell>
                    <TableCell className="text-sm">{l.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(Math.round(l.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {view === "gl" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="font-display text-base">
                General Ledger {drill ? `— ${drill}` : "— all accounts"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">Click a row to open the source journal.</p>
            </div>
            {drill && (
              <Button size="sm" variant="outline" onClick={() => setDrill(null)}>
                All accounts
              </Button>
            )}
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Journal</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Running</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {gl.slice(0, 300).map((r, i) => (
                  <TableRow key={`${r.journalCode}-${i}`} className="cursor-pointer" onClick={() => setTxn(r.journalCode)}>
                    <TableCell className="text-xs">{shortDate(r.date)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.journalCode}</TableCell>
                    <TableCell className="text-xs">{r.accountCode} · {r.accountName}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">{r.narration}</TableCell>
                    <TableCell className="text-xs">{r.projectCode ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{r.debit ? fmtINR(Math.round(r.debit)) : "—"}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{r.credit ? fmtINR(Math.round(r.credit)) : "—"}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{fmtINR(Math.round(r.running))}</TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
                {!gl.length && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      No posted entries for the selected dimensions.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {view === "schedules" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Schedules supporting the financial statements</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Caption</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sched.map((r) => (
                  <TableRow key={`${r.schedule}-${r.code}`} className="cursor-pointer" onClick={() => { setDrill(r.code); setView("gl"); }}>
                    <TableCell className="text-xs text-muted-foreground">{r.schedule}</TableCell>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="text-sm">{r.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(Math.round(r.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(journal)} onOpenChange={(o) => !o && setTxn(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Source transaction — {journal?.code}</DialogTitle>
          </DialogHeader>
          {journal && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Date: {shortDate(journal.date)}</div>
                <div>Source: {journal.source}</div>
                <div>Reference: {journal.reference}</div>
                <div>Posted by: {journal.createdBy}</div>
              </div>
              <p>{journal.narration}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journal.lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{l.accountCode}</TableCell>
                      <TableCell className="text-xs">{l.projectCode ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{l.debit ? fmtINR(l.debit) : "—"}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{l.credit ? fmtINR(l.credit) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Sel({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border bg-background px-2 text-xs normal-case text-foreground"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? "All" : o}
          </option>
        ))}
      </select>
    </label>
  );
}
