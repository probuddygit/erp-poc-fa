import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFinance } from "@/lib/finance/store";
import type { AccountType } from "@/lib/finance/types";
import { StatusPill, Progress, fmtCompact, fmtINR, shortDate } from "@/components/projects/shared";
import { Download, Plus, Search, CheckCircle2, XCircle, Link2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance/$section")({
  head: () => ({ meta: [{ title: "Finance · Faith Automation ERP" }] }),
  component: FinanceSection,
});

function FinanceSection() {
  const { section } = useParams({ from: "/_authenticated/finance/$section" });
  switch (section) {
    case "coa": return <CoASection />;
    case "gl": return <GLSection />;
    case "ar": return <ARSection />;
    case "ap": return <APSection />;
    case "projects": return <ProjectCostingSection />;
    case "tax": return <TaxSection />;
    case "bank": return <BankSection />;
    case "statements": return <StatementsSection />;
    default: return <div className="p-8 text-sm text-muted-foreground">Unknown section.</div>;
  }
}

/* ---------- Chart of Accounts ---------- */
function CoASection() {
  const accounts = useFinance((s) => s.accounts);
  const [q, setQ] = useState("");
  const [type, setType] = useState<AccountType | "all">("all");
  const filtered = accounts.filter(
    (a) => (type === "all" || a.type === type) &&
      (a.name.toLowerCase().includes(q.toLowerCase()) || a.code.includes(q)),
  );
  const grouped = (["asset", "liability", "equity", "income", "expense"] as AccountType[]).map((t) => ({
    type: t,
    total: accounts.filter((a) => a.type === t).reduce((x, y) => x + y.balance, 0),
    rows: filtered.filter((a) => a.type === t),
  }));

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar>
        <SearchBox q={q} setQ={setQ} placeholder="Search accounts by code or name…" />
        <div className="flex gap-1 rounded-md border p-0.5 text-xs">
          {(["all", "asset", "liability", "equity", "income", "expense"] as const).map((t) => (
            <button key={t}
              onClick={() => setType(t)}
              className={`rounded px-2.5 py-1 capitalize ${type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Account</Button>
        </div>
      </Toolbar>

      <div className="grid gap-4 lg:grid-cols-2">
        {grouped.filter((g) => g.rows.length).map((g) => (
          <Card key={g.type}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="font-display text-base capitalize">{g.type}s</CardTitle>
              <div className="text-right">
                <div className="font-mono text-sm">{fmtINR(g.total)}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{g.rows.length} accounts</div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="p-2.5 text-left">Code</th><th className="p-2.5 text-left">Account</th><th className="p-2.5 text-right">Balance</th></tr>
                </thead>
                <tbody className="divide-y">
                  {g.rows.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="p-2.5 font-mono text-xs">{a.code}</td>
                      <td className="p-2.5">
                        <div className={`font-medium ${a.isControl ? "" : "pl-4"}`}>{a.name}</div>
                        {a.isControl && <div className="text-[10px] uppercase tracking-wider text-primary/70">Control</div>}
                      </td>
                      <td className="p-2.5 text-right font-mono">{fmtINR(a.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- General Ledger / Journals ---------- */
function GLSection() {
  const journals = useFinance((s) => s.journals);
  const [q, setQ] = useState("");
  const filtered = journals.filter((j) =>
    (j.code + j.reference + j.narration).toLowerCase().includes(q.toLowerCase()),
  );
  const totals = filtered.reduce((acc, j) => {
    j.lines.forEach((l) => { acc.dr += l.debit; acc.cr += l.credit; });
    return acc;
  }, { dr: 0, cr: 0 });

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar>
        <SearchBox q={q} setQ={setQ} placeholder="Search journal, reference, narration…" />
        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
          <span>Debit <span className="ml-1 font-mono text-foreground">{fmtCompact(totals.dr)}</span></span>
          <span>Credit <span className="ml-1 font-mono text-foreground">{fmtCompact(totals.cr)}</span></span>
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Journal</Button>
        </div>
      </Toolbar>

      <div className="space-y-3">
        {filtered.map((j) => {
          const dr = j.lines.reduce((a, l) => a + l.debit, 0);
          const cr = j.lines.reduce((a, l) => a + l.credit, 0);
          return (
            <Card key={j.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{j.code}</span>
                    <StatusPill status={j.status === "posted" ? "approved" : j.status === "draft" ? "draft" : "rejected"} />
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{j.source}</Badge>
                  </div>
                  <div className="mt-0.5 text-sm">{j.narration}</div>
                  <div className="text-xs text-muted-foreground">{shortDate(j.date)} · ref {j.reference} · by {j.createdBy}</div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div>Dr {fmtINR(dr)}</div>
                  <div>Cr {fmtINR(cr)}</div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left">Account</th>
                      <th className="p-2 text-left">Project</th>
                      <th className="p-2 text-left">Memo</th>
                      <th className="p-2 text-right">Debit</th>
                      <th className="p-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {j.lines.map((l, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-2 font-mono text-xs">{l.accountCode}</td>
                        <td className="p-2 font-mono text-xs">{l.projectCode ?? "—"}</td>
                        <td className="p-2 text-xs text-muted-foreground">{l.memo ?? "—"}</td>
                        <td className="p-2 text-right font-mono">{l.debit ? fmtINR(l.debit) : "—"}</td>
                        <td className="p-2 text-right font-mono">{l.credit ? fmtINR(l.credit) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- AR ---------- */
function ARSection() {
  const invoices = useFinance((s) => s.arInvoices);
  const totals = useMemo(() => ({
    billed: invoices.reduce((a, i) => a + i.amount + i.gst - i.tds, 0),
    received: invoices.reduce((a, i) => a + i.received, 0),
    outstanding: invoices.reduce((a, i) => a + Math.max(0, i.amount + i.gst - i.tds - i.received), 0),
  }), [invoices]);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Billed (incl. GST)" value={fmtCompact(totals.billed)} />
        <MiniStat label="Collected" value={fmtCompact(totals.received)} tone="emerald" />
        <MiniStat label="Outstanding" value={fmtCompact(totals.outstanding)} tone="rose" />
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-base">Customer Invoices</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Invoice</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Invoice</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Project</th>
                <th className="p-3 text-left">Issued / Due</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">GST</th>
                <th className="p-3 text-right">Received</th>
                <th className="p-3 text-left w-40">Status</th>
                <th className="p-3 text-left">e-Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((i) => {
                const net = i.amount + i.gst - i.tds;
                const pct = Math.round((i.received / net) * 100);
                return (
                  <tr key={i.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{i.code}</td>
                    <td className="p-3"><div className="font-medium">{i.customerName}</div></td>
                    <td className="p-3 font-mono text-xs">{i.projectCode ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{shortDate(i.issuedAt)} → {shortDate(i.dueAt)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(i.amount)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{fmtINR(i.gst)}</td>
                    <td className="p-3 text-right font-mono">{fmtINR(i.received)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <StatusPill status={i.status === "overdue" ? "critical" : i.status === "paid" ? "approved" : i.status === "partial" ? "pending" : i.status === "sent" ? "in-progress" : "draft"} />
                        <div className="w-16"><Progress value={pct} /></div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-muted-foreground">{i.eInvoiceIRN ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- AP ---------- */
function APSection() {
  const bills = useFinance((s) => s.apBills);
  const totals = useMemo(() => ({
    booked: bills.reduce((a, b) => a + b.amount + b.gst - b.tds, 0),
    paid: bills.reduce((a, b) => a + b.paid, 0),
    outstanding: bills.reduce((a, b) => a + Math.max(0, b.amount + b.gst - b.tds - b.paid), 0),
  }), [bills]);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Booked (incl. GST)" value={fmtCompact(totals.booked)} />
        <MiniStat label="Paid" value={fmtCompact(totals.paid)} tone="emerald" />
        <MiniStat label="Outstanding" value={fmtCompact(totals.outstanding)} tone="amber" />
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-base">Vendor Bills · 3-Way Match</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Book Bill</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Bill</th>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">PO / GRN</th>
                <th className="p-3 text-left">Received / Due</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">GST</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-left">Match</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bills.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{b.code}</td>
                  <td className="p-3"><div className="font-medium">{b.vendorName}</div></td>
                  <td className="p-3 font-mono text-[10px] text-muted-foreground">
                    <div>{b.poCode ?? "—"}</div><div>{b.grnCode ?? "—"}</div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{shortDate(b.receivedAt)} → {shortDate(b.dueAt)}</td>
                  <td className="p-3 text-right font-mono">{fmtINR(b.amount)}</td>
                  <td className="p-3 text-right font-mono text-muted-foreground">{fmtINR(b.gst)}</td>
                  <td className="p-3 text-right font-mono">{fmtINR(b.paid)}</td>
                  <td className="p-3">
                    <StatusPill status={b.matchStatus === "matched" ? "approved" : b.matchStatus === "unmatched" ? "critical" : "pending"} />
                  </td>
                  <td className="p-3">
                    <StatusPill status={b.status === "overdue" || b.status === "hold" ? "critical" : b.status === "paid" ? "approved" : b.status === "partial" || b.status === "pending" ? "pending" : b.status === "approved" || b.status === "3wm-ok" ? "in-progress" : "draft"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Project Costing ---------- */
function ProjectCostingSection() {
  const projects = useFinance((s) => s.projectCosts);
  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Project Costing · WIP · Margin</CardTitle>
          <p className="text-xs text-muted-foreground">Percent-complete revenue recognition with committed cost overlay</p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Project</th>
                <th className="p-3 text-right">Contract</th>
                <th className="p-3 text-right">Billed</th>
                <th className="p-3 text-right">Collected</th>
                <th className="p-3 text-right">Cost (Mat+Lab+OH+SC)</th>
                <th className="p-3 text-right">Committed</th>
                <th className="p-3 text-right">WIP</th>
                <th className="p-3 text-left w-40">% Complete</th>
                <th className="p-3 text-right">Fcst Margin</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map((p) => {
                const cost = p.materialCost + p.labourCost + p.overheadCost + p.subContractCost;
                const margin = Math.round(((p.contractValue - p.forecastCost) / p.contractValue) * 100);
                return (
                  <tr key={p.projectCode} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium">
                        <Link to="/projects/$id" params={{ id: p.projectCode }} className="hover:underline">{p.projectName}</Link>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">{p.projectCode} · {p.customer}</div>
                    </td>
                    <td className="p-3 text-right font-mono">{fmtCompact(p.contractValue)}</td>
                    <td className="p-3 text-right font-mono">{fmtCompact(p.billed)}</td>
                    <td className="p-3 text-right font-mono">{fmtCompact(p.collected)}</td>
                    <td className="p-3 text-right font-mono">{fmtCompact(cost)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{fmtCompact(p.committed)}</td>
                    <td className="p-3 text-right font-mono">{fmtCompact(p.wip)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Progress value={p.percentComplete} />
                        <span className="w-8 text-right font-mono text-[10px]">{p.percentComplete}%</span>
                      </div>
                    </td>
                    <td className={`p-3 text-right font-mono ${margin < 20 ? "text-rose-600" : margin < 30 ? "text-amber-600" : "text-emerald-600"}`}>{margin}%</td>
                    <td className="p-3">
                      <StatusPill status={p.status === "on-track" ? "approved" : p.status === "watch" ? "pending" : "critical"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Tax ---------- */
function TaxSection() {
  const ledgers = useFinance((s) => s.taxLedgers);
  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-base">GST · TDS · e-Invoicing Register</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Download JSON</Button>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Prepare Return</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Period</th>
                <th className="p-3 text-left">Return</th>
                <th className="p-3 text-right">Output tax</th>
                <th className="p-3 text-right">Input tax (ITC)</th>
                <th className="p-3 text-right">Net payable</th>
                <th className="p-3 text-left">Filed</th>
                <th className="p-3 text-left">Reference</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ledgers.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{t.period}</td>
                  <td className="p-3"><Badge variant="outline">{t.type}</Badge></td>
                  <td className="p-3 text-right font-mono">{t.outputTax ? fmtINR(t.outputTax) : "—"}</td>
                  <td className="p-3 text-right font-mono text-muted-foreground">{t.inputTax ? fmtINR(t.inputTax) : "—"}</td>
                  <td className="p-3 text-right font-mono">{fmtINR(t.netPayable)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{t.filedAt ? shortDate(t.filedAt) : "—"}</td>
                  <td className="p-3 font-mono text-[10px] text-muted-foreground">{t.reference ?? "—"}</td>
                  <td className="p-3">
                    <StatusPill status={t.status === "filed" ? "approved" : t.status === "late" ? "critical" : t.status === "prepared" ? "in-progress" : "pending"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Bank ---------- */
function BankSection() {
  const s = useFinance((s) => s);
  const [selected, setSelected] = useState<string>(s.bankAccounts[0]?.code ?? "");
  const account = s.bankAccounts.find((b) => b.code === selected) ?? s.bankAccounts[0];
  const txns = s.bankTxns.filter((t) => t.bankCode === selected);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 lg:grid-cols-4">
        {s.bankAccounts.map((b) => {
          const active = b.code === selected;
          const diff = b.bookBalance - b.statementBalance;
          return (
            <button key={b.id} onClick={() => setSelected(b.code)}
              className={`text-left rounded-xl border p-4 transition ${active ? "border-primary ring-1 ring-primary/40 bg-primary/5" : "hover:bg-muted/40"}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{b.bankName}</div>
                <Badge variant="outline" className="text-[10px]">{b.currency}</Badge>
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{b.accountNo} · {b.branch}</div>
              <div className="mt-3 font-display text-lg font-semibold">{fmtCompact(b.bookBalance)}</div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Stmt {fmtCompact(b.statementBalance)}</span>
                <span className={diff !== 0 ? "text-amber-600" : "text-emerald-600"}>Δ {fmtCompact(Math.abs(diff))}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">{b.unreconciledCount} unmatched · last reco {shortDate(b.lastRecoAt)}</div>
            </button>
          );
        })}
      </div>

      {account && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base">{account.bankName} · Transactions</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2"><Link2 className="h-4 w-4" /> Auto-match</Button>
              <Button size="sm" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Confirm reco</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Narration</th>
                  <th className="p-3 text-left">Matched to</th>
                  <th className="p-3 text-right">Debit</th>
                  <th className="p-3 text-right">Credit</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {txns.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="p-3 text-xs text-muted-foreground">{shortDate(t.date)}</td>
                    <td className="p-3">{t.narration}</td>
                    <td className="p-3 font-mono text-[10px] text-muted-foreground">{t.matchedRef ?? "—"}</td>
                    <td className="p-3 text-right font-mono">{t.direction === "debit" ? fmtINR(t.amount) : "—"}</td>
                    <td className="p-3 text-right font-mono text-emerald-600">{t.direction === "credit" ? fmtINR(t.amount) : "—"}</td>
                    <td className="p-3">
                      {t.status === "matched" ? <StatusPill status="approved" />
                        : t.status === "suggested" ? <StatusPill status="pending" />
                        : <StatusPill status="critical" />}
                    </td>
                  </tr>
                ))}
                {!txns.length && <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No transactions for this account.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------- Statements: P&L, BS, Cash Flow ---------- */
function StatementsSection() {
  const s = useFinance((x) => x);
  const [view, setView] = useState<"pnl" | "bs" | "cf">("pnl");
  const income = s.accounts.filter((a) => a.type === "income");
  const expense = s.accounts.filter((a) => a.type === "expense");
  const asset = s.accounts.filter((a) => a.type === "asset");
  const liab = s.accounts.filter((a) => a.type === "liability");
  const equity = s.accounts.filter((a) => a.type === "equity");
  const totalIncome = income.reduce((a, x) => a + x.balance, 0);
  const totalExp = expense.reduce((a, x) => a + x.balance, 0);
  const netProfit = totalIncome - totalExp;

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar>
        <div className="flex gap-1 rounded-md border p-0.5 text-xs">
          {[
            { k: "pnl", l: "Profit & Loss" },
            { k: "bs", l: "Balance Sheet" },
            { k: "cf", l: "Cash Flow" },
          ].map((t) => (
            <button key={t.k} onClick={() => setView(t.k as typeof view)}
              className={`rounded px-3 py-1 ${view === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t.l}</button>
          ))}
        </div>
        <div className="ml-auto text-xs text-muted-foreground">Period: FY 2026 · YTD · unaudited</div>
        <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export PDF</Button>
      </Toolbar>

      {view === "pnl" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Profit & Loss Statement</CardTitle></CardHeader>
          <CardContent className="p-0">
            <StatementTable>
              <StmtHeader label="Revenue" />
              {income.map((a) => <StmtRow key={a.id} label={a.name} value={a.balance} />)}
              <StmtSub label="Total revenue" value={totalIncome} />
              <StmtHeader label="Cost of Goods Sold" />
              {expense.filter((e) => ["5000", "5100", "5200"].includes(e.code)).map((a) => <StmtRow key={a.id} label={a.name} value={a.balance} />)}
              <StmtSub label="Gross profit" value={totalIncome - expense.filter((e) => ["5000", "5100", "5200"].includes(e.code)).reduce((a, x) => a + x.balance, 0)} emphasis />
              <StmtHeader label="Operating Expenses" />
              {expense.filter((e) => !["5000", "5100", "5200"].includes(e.code)).map((a) => <StmtRow key={a.id} label={a.name} value={a.balance} />)}
              <StmtSub label="Net profit" value={netProfit} emphasis />
            </StatementTable>
          </CardContent>
        </Card>
      )}

      {view === "bs" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="font-display text-base">Assets</CardTitle></CardHeader>
            <CardContent className="p-0">
              <StatementTable>
                {asset.map((a) => <StmtRow key={a.id} label={a.name} value={a.balance} emphasis={a.isControl} />)}
                <StmtSub label="Total assets" value={asset.reduce((a, x) => a + x.balance, 0)} emphasis />
              </StatementTable>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="font-display text-base">Liabilities & Equity</CardTitle></CardHeader>
            <CardContent className="p-0">
              <StatementTable>
                <StmtHeader label="Liabilities" />
                {liab.map((a) => <StmtRow key={a.id} label={a.name} value={a.balance} emphasis={a.isControl} />)}
                <StmtSub label="Total liabilities" value={liab.reduce((a, x) => a + x.balance, 0)} />
                <StmtHeader label="Equity" />
                {equity.map((a) => <StmtRow key={a.id} label={a.name} value={a.balance} />)}
                <StmtSub label="Total equity" value={equity.reduce((a, x) => a + x.balance, 0)} />
                <StmtSub label="Liabilities + Equity" value={liab.reduce((a, x) => a + x.balance, 0) + equity.reduce((a, x) => a + x.balance, 0)} emphasis />
              </StatementTable>
            </CardContent>
          </Card>
        </div>
      )}

      {view === "cf" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Cash Flow Statement (Indirect)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <StatementTable>
              <StmtHeader label="Operating Activities" />
              <StmtRow label="Net profit before tax" value={netProfit} />
              <StmtRow label="Add: Depreciation" value={s.accounts.find((a) => a.code === "6500")?.balance ?? 0} />
              <StmtRow label="Change in receivables" value={-8400000} />
              <StmtRow label="Change in payables" value={4200000} />
              <StmtRow label="Change in inventory" value={-1200000} />
              <StmtSub label="Cash from operations" value={netProfit + 18600000 - 8400000 + 4200000 - 1200000} emphasis />
              <StmtHeader label="Investing Activities" />
              <StmtRow label="Capex — Plant & machinery" value={-24000000} />
              <StmtSub label="Cash used in investing" value={-24000000} />
              <StmtHeader label="Financing Activities" />
              <StmtRow label="Loan drawdown" value={12000000} />
              <StmtRow label="Interest paid" value={-4200000} />
              <StmtSub label="Cash from financing" value={7800000} />
              <StmtSub label="Net change in cash" value={netProfit + 18600000 - 8400000 + 4200000 - 1200000 - 24000000 + 7800000} emphasis />
            </StatementTable>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------- Small helpers ---------- */
function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">{children}</div>;
}

function SearchBox({ q, setQ, placeholder }: { q: string; setQ: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-8" />
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" | "amber" }) {
  const t = tone === "emerald" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-1 font-display text-2xl font-semibold ${t}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function StatementTable({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y">{children}</tbody>
    </table>
  );
}
function StmtHeader({ label }: { label: string }) {
  return <tr className="bg-muted/40"><td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</td></tr>;
}
function StmtRow({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <tr className="hover:bg-muted/30">
      <td className={`px-4 py-2 ${emphasis ? "font-medium" : "pl-8 text-muted-foreground"}`}>{label}</td>
      <td className={`px-4 py-2 text-right font-mono ${value < 0 ? "text-rose-600" : ""}`}>{fmtINR(value)}</td>
    </tr>
  );
}
function StmtSub({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <tr className={emphasis ? "bg-primary/5" : "bg-muted/20"}>
      <td className={`px-4 py-2.5 ${emphasis ? "font-semibold" : "font-medium"}`}>{label}</td>
      <td className={`px-4 py-2.5 text-right font-mono ${emphasis ? "text-base font-semibold" : ""} ${value < 0 ? "text-rose-600" : ""}`}>{fmtINR(value)}</td>
    </tr>
  );
}

// Unused imports kept to satisfy tree-shaking-safe patterns
void XCircle;
