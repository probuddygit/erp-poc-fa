import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { RecordDialog } from "@/components/record-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trialBalance, accountLedger } from "@/lib/finance/intelligence";
import { RowActions, useCrud } from "@/components/crud-kit";
import { useQualityDoc } from "@/components/quality-doc-dialog";
import { exportCsv } from "@/lib/crud";
import { FINANCE_SCHEMAS } from "@/lib/finance/schemas";
import { useFinanceOptions } from "@/lib/finance/options";
import {
  arInvoiceDocument, apBillDocument, journalDocument, taxDocument,
  bankRecoDocument, projectCostDocument, statementDocument, trialBalanceDocument,
} from "@/lib/finance/documents";
import {
  useFinance, upsertFinance, deleteFinance, postJournal, voidJournal, reopenJournal,
  upsertJournalLine, removeJournalLine, sendInvoice, recordReceipt, voidInvoice,
  runThreeWayMatch, approveBill, holdBill, releaseBill, recordPayment,
  prepareTaxReturn, fileTaxReturn, matchTxn, unmatchTxn, autoMatchBank, confirmReco,
} from "@/lib/finance/store";
import type { AccountType, FinancialLine } from "@/lib/finance/types";
import { StatusPill, Progress, fmtCompact, fmtINR, shortDate } from "@/components/projects/shared";
import {
  Download, Plus, Search, CheckCircle2, Link2, Printer, Send, Wallet, FileCheck2,
  Ban, Undo2, ShieldCheck, PauseCircle, PlayCircle, Trash2, Pencil,
} from "lucide-react";

import { BudgetsSection } from "@/components/finance/budgets-section";
import { AssetsSection } from "@/components/finance/assets-section";
import { ProfitabilitySection } from "@/components/finance/profitability-section";
import { CloseSection } from "@/components/finance/close-section";
import { InsightsSection } from "@/components/finance/insights-section";
import { FinanceCopilotSection } from "@/components/finance/copilot-section";

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
    case "budgets": return <BudgetsSection />;
    case "assets": return <AssetsSection />;
    case "profitability": return <ProfitabilitySection />;
    case "close": return <CloseSection />;
    case "insights": return <InsightsSection />;
    case "copilot": return <FinanceCopilotSection />;
    default: return <div className="p-8 text-sm text-muted-foreground">Unknown section.</div>;
  }
}

/** Small helper for one-off action forms (receipt, payment, match…). */
function useActionForm() {
  const [st, setSt] = useState<{
    key: string; title: string; initial?: Record<string, unknown>;
    onSubmit: (v: Record<string, unknown>) => void;
  } | null>(null);
  const options = useFinanceOptions();
  const dialog = (
    <RecordDialog
      open={!!st}
      onOpenChange={(v) => !v && setSt(null)}
      title={st?.title ?? ""}
      fields={st ? (FINANCE_SCHEMAS[st.key] ?? []) : []}
      initial={st?.initial}
      dynamicOptions={options}
      onSubmit={(v) => { st?.onSubmit(v); setSt(null); }}
    />
  );
  return { open: setSt, dialog };
}

/* ---------- Chart of Accounts ---------- */
function CoASection() {
  const accounts = useFinance((s) => s.accounts);
  const options = useFinanceOptions();
  const crud = useCrud(FINANCE_SCHEMAS, upsertFinance, deleteFinance, options);
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
          <Button size="sm" variant="outline" className="gap-2" onClick={() => { exportCsv("chart-of-accounts", filtered as unknown as Array<Record<string, unknown>>); toast.success("Chart of accounts exported"); }}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => crud.openNew("accounts", "New Account", { type: "expense", balance: 0, isControl: "no" })}>
            <Plus className="h-4 w-4" /> New Account
          </Button>
        </div>
      </Toolbar>

      <div className="grid gap-4 lg:grid-cols-2">
        {grouped.filter((g) => g.rows.length).map((g) => (
          <Card key={g.type}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-display text-base capitalize">{g.type}s</CardTitle>
              <div className="text-right">
                <div className="font-mono text-sm">{fmtINR(g.total)}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{g.rows.length} accounts</div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="p-2.5 text-left">Code</th><th className="p-2.5 text-left">Account</th><th className="p-2.5 text-right">Balance</th><th className="w-10" /></tr>
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
                      <td className="p-1">
                        <RowActions
                          onEdit={() => crud.openEdit("accounts", { ...a, isControl: a.isControl ? "yes" : "no" }, `Edit ${a.code}`)}
                          onDelete={() => crud.askDelete("accounts", a.id, `${a.code} — ${a.name}`)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
      {crud.dialogs}
    </div>
  );
}

/* ---------- General Ledger / Journals ---------- */
function GLSection() {
  const journals = useFinance((s) => s.journals);
  const options = useFinanceOptions();
  const crud = useCrud(FINANCE_SCHEMAS, upsertFinance, deleteFinance, options);
  const action = useActionForm();
  const doc = useQualityDoc();
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
          <Button size="sm" variant="outline" className="gap-2" onClick={() => { exportCsv("journals", filtered as unknown as Array<Record<string, unknown>>); toast.success("Journals exported"); }}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => crud.openNew("journals", "New Journal Voucher", { source: "manual", status: "draft", createdBy: "Finance", date: new Date().toISOString().slice(0, 10), lines: [] })}>
            <Plus className="h-4 w-4" /> New Journal
          </Button>
        </div>
      </Toolbar>

      <div className="space-y-3">
        {filtered.map((j) => {
          const dr = j.lines.reduce((a, l) => a + l.debit, 0);
          const cr = j.lines.reduce((a, l) => a + l.credit, 0);
          const balanced = dr === cr && dr > 0;
          return (
            <Card key={j.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{j.code}</span>
                    <StatusPill status={j.status === "posted" ? "approved" : j.status === "draft" ? "draft" : "rejected"} />
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{j.source}</Badge>
                    {!balanced && <Badge variant="outline" className="border-destructive/40 text-[10px] text-destructive">Unbalanced</Badge>}
                  </div>
                  <div className="mt-0.5 text-sm">{j.narration}</div>
                  <div className="text-xs text-muted-foreground">{shortDate(j.date)} · ref {j.reference} · by {j.createdBy}</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right font-mono text-xs">
                    <div>Dr {fmtINR(dr)}</div>
                    <div>Cr {fmtINR(cr)}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {j.status === "draft" && (
                      <Button size="sm" className="h-7 gap-1.5 text-xs" disabled={!balanced}
                        onClick={() => { postJournal(j.id); toast.success(`${j.code} posted to ledger`); }}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Post
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => doc.show(journalDocument(j))}>
                      <Printer className="h-3.5 w-3.5" /> Print
                    </Button>
                    <RowActions
                      onEdit={() => crud.openEdit("journals", { ...j, date: j.date.slice(0, 10) }, `Edit ${j.code}`)}
                      onDelete={() => crud.askDelete("journals", j.id, j.code)}
                      extra={
                        <>
                          <DropdownMenuItem onClick={() => action.open({
                            key: "journalLines", title: `Add line — ${j.code}`, initial: { debit: 0, credit: 0 },
                            onSubmit: (v) => { upsertJournalLine(j.id, v); toast.success("Line added"); },
                          })}>
                            <Plus className="mr-2 h-4 w-4" /> Add line
                          </DropdownMenuItem>
                          {j.status === "posted" && (
                            <DropdownMenuItem onClick={() => { reopenJournal(j.id); toast.success(`${j.code} reopened as draft`); }}>
                              <Undo2 className="mr-2 h-4 w-4" /> Unpost
                            </DropdownMenuItem>
                          )}
                          {j.status !== "void" && (
                            <DropdownMenuItem onClick={() => { voidJournal(j.id); toast.success(`${j.code} voided`); }}>
                              <Ban className="mr-2 h-4 w-4" /> Void
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                        </>
                      }
                    />
                  </div>
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
                      <th className="w-16" />
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
                        <td className="p-1">
                          {j.status === "draft" && (
                            <div className="flex justify-end gap-0.5">
                              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit line"
                                onClick={() => action.open({
                                  key: "journalLines", title: `Edit line — ${j.code}`, initial: { ...l },
                                  onSubmit: (v) => { upsertJournalLine(j.id, v, i); toast.success("Line updated"); },
                                })}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Delete line"
                                onClick={() => { removeJournalLine(j.id, i); toast.success("Line removed"); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!j.lines.length && (
                      <tr><td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">No lines yet — use the row menu to add one.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
        {!filtered.length && <EmptyState label="No journals match your search." />}
      </div>
      {crud.dialogs}
      {action.dialog}
      {doc.dialog}
    </div>
  );
}

/* ---------- AR ---------- */
function ARSection() {
  const invoices = useFinance((s) => s.arInvoices);
  const options = useFinanceOptions();
  const crud = useCrud(FINANCE_SCHEMAS, upsertFinance, deleteFinance, options);
  const action = useActionForm();
  const doc = useQualityDoc();
  const [q, setQ] = useState("");
  const rows = invoices.filter((i) => (i.code + i.customerName + (i.projectCode ?? "")).toLowerCase().includes(q.toLowerCase()));
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-display text-base">Customer Invoices</CardTitle>
          <div className="flex items-center gap-2">
            <SearchBox q={q} setQ={setQ} placeholder="Search invoice, customer…" compact />
            <Button size="sm" variant="outline" className="gap-2" onClick={() => { exportCsv("ar-invoices", rows as unknown as Array<Record<string, unknown>>); toast.success("Invoices exported"); }}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-2" onClick={() => crud.openNew("arInvoices", "New Customer Invoice", {
              status: "draft", received: 0, issuedAt: new Date().toISOString().slice(0, 10),
              dueAt: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
            })}>
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
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
                <th className="w-40 p-3 text-left">Status</th>
                <th className="p-3 text-left">e-Invoice</th>
                <th className="w-24 p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((i) => {
                const net = i.amount + i.gst - i.tds;
                const pct = net ? Math.round((i.received / net) * 100) : 0;
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
                    <td className="p-1">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Print invoice" onClick={() => doc.show(arInvoiceDocument(i))}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <RowActions
                          onEdit={() => crud.openEdit("arInvoices", { ...i, issuedAt: i.issuedAt.slice(0, 10), dueAt: i.dueAt.slice(0, 10) }, `Edit ${i.code}`)}
                          onDelete={() => crud.askDelete("arInvoices", i.id, i.code)}
                          extra={
                            <>
                              {i.status === "draft" && (
                                <DropdownMenuItem onClick={() => { sendInvoice(i.id); toast.success(`${i.code} sent · IRN generated · GL posted`); }}>
                                  <Send className="mr-2 h-4 w-4" /> Submit & send
                                </DropdownMenuItem>
                              )}
                              {i.status !== "paid" && i.status !== "void" && (
                                <DropdownMenuItem onClick={() => action.open({
                                  key: "receipts", title: `Record receipt — ${i.code}`,
                                  initial: { receiptAmount: Math.max(0, net - i.received), receiptDate: new Date().toISOString().slice(0, 10) },
                                  onSubmit: (v) => {
                                    recordReceipt(i.id, {
                                      amount: Number(v.receiptAmount ?? 0),
                                      date: String(v.receiptDate ?? ""),
                                      bankCode: String(v.bankCode ?? ""),
                                      ref: v.receiptRef ? String(v.receiptRef) : undefined,
                                    });
                                    toast.success("Receipt recorded · bank & ledger updated");
                                  },
                                })}>
                                  <Wallet className="mr-2 h-4 w-4" /> Record receipt
                                </DropdownMenuItem>
                              )}
                              {i.status !== "void" && (
                                <DropdownMenuItem onClick={() => { voidInvoice(i.id); toast.success(`${i.code} voided`); }}>
                                  <Ban className="mr-2 h-4 w-4" /> Void invoice
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                            </>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={10}><EmptyState label="No invoices found." /></td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {crud.dialogs}
      {action.dialog}
      {doc.dialog}
    </div>
  );
}

/* ---------- AP ---------- */
function APSection() {
  const bills = useFinance((s) => s.apBills);
  const options = useFinanceOptions();
  const crud = useCrud(FINANCE_SCHEMAS, upsertFinance, deleteFinance, options);
  const action = useActionForm();
  const doc = useQualityDoc();
  const [q, setQ] = useState("");
  const rows = bills.filter((b) => (b.code + b.vendorName + (b.poCode ?? "")).toLowerCase().includes(q.toLowerCase()));
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-display text-base">Vendor Bills · 3-Way Match</CardTitle>
          <div className="flex items-center gap-2">
            <SearchBox q={q} setQ={setQ} placeholder="Search bill, vendor, PO…" compact />
            <Button size="sm" variant="outline" className="gap-2" onClick={() => { exportCsv("ap-bills", rows as unknown as Array<Record<string, unknown>>); toast.success("Bills exported"); }}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-2" onClick={() => crud.openNew("apBills", "Book Vendor Bill", {
              status: "pending", paid: 0, matchStatus: "unmatched",
              receivedAt: new Date().toISOString().slice(0, 10),
              dueAt: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
            })}>
              <Plus className="h-4 w-4" /> Book Bill
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
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
                <th className="w-24 p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((b) => {
                const net = b.amount + b.gst - b.tds;
                return (
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
                      <StatusPill status={b.status === "overdue" || b.status === "hold" ? "critical" : b.status === "paid" ? "approved" : b.status === "partial" || b.status === "pending" ? "pending" : "in-progress"} />
                    </td>
                    <td className="p-1">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Print bill" onClick={() => doc.show(apBillDocument(b))}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <RowActions
                          onEdit={() => crud.openEdit("apBills", { ...b, receivedAt: b.receivedAt.slice(0, 10), dueAt: b.dueAt.slice(0, 10) }, `Edit ${b.code}`)}
                          onDelete={() => crud.askDelete("apBills", b.id, b.code)}
                          extra={
                            <>
                              <DropdownMenuItem onClick={() => { runThreeWayMatch(b.id); toast.success("3-way match re-run"); }}>
                                <Link2 className="mr-2 h-4 w-4" /> Run 3-way match
                              </DropdownMenuItem>
                              {b.status !== "approved" && b.status !== "paid" && (
                                <DropdownMenuItem onClick={() => { approveBill(b.id); toast.success(`${b.code} approved · GL posted`); }}>
                                  <ShieldCheck className="mr-2 h-4 w-4" /> Approve
                                </DropdownMenuItem>
                              )}
                              {b.status !== "paid" && (
                                <DropdownMenuItem onClick={() => action.open({
                                  key: "payments", title: `Record payment — ${b.code}`,
                                  initial: { payAmount: Math.max(0, net - b.paid), payDate: new Date().toISOString().slice(0, 10) },
                                  onSubmit: (v) => {
                                    recordPayment(b.id, {
                                      amount: Number(v.payAmount ?? 0),
                                      date: String(v.payDate ?? ""),
                                      bankCode: String(v.bankCode ?? ""),
                                      ref: v.payRef ? String(v.payRef) : undefined,
                                    });
                                    toast.success("Payment recorded · bank & ledger updated");
                                  },
                                })}>
                                  <Wallet className="mr-2 h-4 w-4" /> Record payment
                                </DropdownMenuItem>
                              )}
                              {b.status === "hold" ? (
                                <DropdownMenuItem onClick={() => { releaseBill(b.id); toast.success("Bill released"); }}>
                                  <PlayCircle className="mr-2 h-4 w-4" /> Release hold
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => { holdBill(b.id); toast.success("Bill put on hold"); }}>
                                  <PauseCircle className="mr-2 h-4 w-4" /> Put on hold
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                            </>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={10}><EmptyState label="No bills found." /></td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {crud.dialogs}
      {action.dialog}
      {doc.dialog}
    </div>
  );
}

/* ---------- Project Costing ---------- */
function ProjectCostingSection() {
  const projects = useFinance((s) => s.projectCosts);
  const options = useFinanceOptions();
  const crud = useCrud(FINANCE_SCHEMAS, upsertFinance, deleteFinance, options);
  const doc = useQualityDoc();

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="font-display text-base">Project Costing · WIP · Margin</CardTitle>
            <p className="text-xs text-muted-foreground">Percent-complete revenue recognition with committed cost overlay</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => { exportCsv("project-costing", projects as unknown as Array<Record<string, unknown>>); toast.success("Cost sheet exported"); }}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-2" onClick={() => crud.openNew("projectCosts", "New Project Cost Sheet", { percentComplete: 0 })}>
              <Plus className="h-4 w-4" /> Add Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
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
                <th className="w-40 p-3 text-left">% Complete</th>
                <th className="p-3 text-right">Fcst Margin</th>
                <th className="p-3 text-left">Status</th>
                <th className="w-24 p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map((p) => {
                const cost = p.materialCost + p.labourCost + p.overheadCost + p.subContractCost;
                const margin = p.contractValue ? Math.round(((p.contractValue - p.forecastCost) / p.contractValue) * 100) : 0;
                const rec = p as unknown as { id?: string };
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
                    <td className="p-1">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Print cost sheet" onClick={() => doc.show(projectCostDocument(p))}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <RowActions
                          onEdit={() => crud.openEdit("projectCosts", { ...p }, `Edit ${p.projectCode}`)}
                          onDelete={() => rec.id ? crud.askDelete("projectCosts", rec.id, p.projectCode) : toast.error("Seeded row — edit instead")}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {crud.dialogs}
      {doc.dialog}
    </div>
  );
}

/* ---------- Tax ---------- */
function TaxSection() {
  const ledgers = useFinance((s) => s.taxLedgers);
  const options = useFinanceOptions();
  const crud = useCrud(FINANCE_SCHEMAS, upsertFinance, deleteFinance, options);
  const doc = useQualityDoc();

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-display text-base">GST · TDS · e-Invoicing Register</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => { exportCsv("tax-register", ledgers as unknown as Array<Record<string, unknown>>); toast.success("Register exported"); }}>
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button size="sm" className="gap-2" onClick={() => crud.openNew("taxLedgers", "Prepare Return", { status: "open", outputTax: 0, inputTax: 0, netPayable: 0 })}>
              <Plus className="h-4 w-4" /> Prepare Return
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
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
                <th className="w-40 p-3" />
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
                  <td className="p-1">
                    <div className="flex items-center justify-end gap-1">
                      {t.status === "open" && (
                        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => { prepareTaxReturn(t.id); toast.success(`${t.type} ${t.period} prepared`); }}>
                          <FileCheck2 className="h-3.5 w-3.5" /> Prepare
                        </Button>
                      )}
                      {t.status !== "filed" && (
                        <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => { fileTaxReturn(t.id); toast.success(`${t.type} ${t.period} filed`); }}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> File
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Print return" onClick={() => doc.show(taxDocument(t))}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <RowActions
                        onEdit={() => crud.openEdit("taxLedgers", { ...t }, `Edit ${t.type} ${t.period}`)}
                        onDelete={() => crud.askDelete("taxLedgers", t.id, `${t.type} ${t.period}`)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {crud.dialogs}
      {doc.dialog}
    </div>
  );
}

/* ---------- Bank ---------- */
function BankSection() {
  const s = useFinance((x) => x);
  const options = useFinanceOptions();
  const crud = useCrud(FINANCE_SCHEMAS, upsertFinance, deleteFinance, options);
  const action = useActionForm();
  const doc = useQualityDoc();
  const [selected, setSelected] = useState<string>(s.bankAccounts[0]?.code ?? "");
  const account = s.bankAccounts.find((b) => b.code === selected) ?? s.bankAccounts[0];
  const txns = s.bankTxns.filter((t) => t.bankCode === (account?.code ?? selected));

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold tracking-tight">Bank & Reconciliation</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => crud.openNew("bankTxns", "Add Bank Transaction", { bankCode: account?.code, direction: "credit", status: "unmatched", date: new Date().toISOString().slice(0, 10) })}>
            <Plus className="h-4 w-4" /> Add Transaction
          </Button>
          <Button size="sm" className="gap-2" onClick={() => crud.openNew("bankAccounts", "New Bank Account", { currency: "INR", status: "active", bookBalance: 0, statementBalance: 0 })}>
            <Plus className="h-4 w-4" /> New Bank Account
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {s.bankAccounts.map((b) => {
          const active = b.code === (account?.code ?? selected);
          const diff = b.bookBalance - b.statementBalance;
          return (
            <div key={b.id}
              className={`rounded-xl border p-4 text-left transition ${active ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "hover:bg-muted/40"}`}>
              <button className="w-full text-left" onClick={() => setSelected(b.code)}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{b.bankName}</div>
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
              <div className="mt-2 flex justify-end">
                <RowActions
                  onEdit={() => crud.openEdit("bankAccounts", { ...b }, `Edit ${b.code}`)}
                  onDelete={() => crud.askDelete("bankAccounts", b.id, `${b.bankName} ${b.accountNo}`)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {account && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-display text-base">{account.bankName} · Transactions</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => doc.show(bankRecoDocument(account, txns))}>
                <Printer className="h-4 w-4" /> Reco statement
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => {
                const n = autoMatchBank(account.code);
                n ? toast.success(`${n} transaction(s) auto-matched`) : toast.info("No further matches found");
              }}>
                <Link2 className="h-4 w-4" /> Auto-match
              </Button>
              <Button size="sm" className="gap-2" onClick={() => { confirmReco(account.code); toast.success("Reconciliation confirmed"); }}>
                <CheckCircle2 className="h-4 w-4" /> Confirm reco
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Narration</th>
                  <th className="p-3 text-left">Matched to</th>
                  <th className="p-3 text-right">Debit</th>
                  <th className="p-3 text-right">Credit</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="w-24 p-3" />
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
                    <td className="p-1">
                      <div className="flex items-center justify-end gap-1">
                        {t.status !== "matched" ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => action.open({
                            key: "matchTxn", title: "Match transaction", initial: {},
                            onSubmit: (v) => { matchTxn(t.id, String(v.matchedRef ?? "")); toast.success("Transaction matched"); },
                          })}>Match</Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { unmatchTxn(t.id); toast.success("Match removed"); }}>Unmatch</Button>
                        )}
                        <RowActions
                          onEdit={() => crud.openEdit("bankTxns", { ...t, date: t.date.slice(0, 10) }, "Edit transaction")}
                          onDelete={() => crud.askDelete("bankTxns", t.id, t.narration)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {!txns.length && <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No transactions for this account.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      {crud.dialogs}
      {action.dialog}
      {doc.dialog}
    </div>
  );
}

/* ---------- Statements: P&L, BS, Cash Flow ---------- */
function StatementsSection() {
  const s = useFinance((x) => x);
  const doc = useQualityDoc();
  const [view, setView] = useState<"pnl" | "bs" | "cf" | "tb">("pnl");
  const [drill, setDrill] = useState<string | null>(null);
  const tb = trialBalance(s);
  const ledger = drill ? accountLedger(s, drill) : [];
  const income = s.accounts.filter((a) => a.type === "income");
  const expense = s.accounts.filter((a) => a.type === "expense");
  const asset = s.accounts.filter((a) => a.type === "asset");
  const liab = s.accounts.filter((a) => a.type === "liability");
  const equity = s.accounts.filter((a) => a.type === "equity");
  const totalIncome = income.reduce((a, x) => a + x.balance, 0);
  const totalExp = expense.reduce((a, x) => a + x.balance, 0);
  const cogs = expense.filter((e) => ["5000", "5100", "5200"].includes(e.code));
  const netProfit = totalIncome - totalExp;
  const cashOps = netProfit + 18600000 - 8400000 + 4200000 - 1200000;

  const statementLines = (): { title: string; lines: FinancialLine[] } => {
    const line = (label: string, amount: number): FinancialLine => ({ code: label, label, amount });
    if (view === "pnl") {
      return {
        title: "Profit & Loss",
        lines: [
          ...income.map((a) => line(a.name, a.balance)),
          line("Total revenue", totalIncome),
          ...cogs.map((a) => line(a.name, a.balance)),
          line("Gross profit", totalIncome - cogs.reduce((a, x) => a + x.balance, 0)),
          ...expense.filter((e) => !cogs.includes(e)).map((a) => line(a.name, a.balance)),
          line("Net profit", netProfit),
        ],
      };
    }
    if (view === "bs") {
      return {
        title: "Balance Sheet",
        lines: [
          ...asset.map((a) => line(a.name, a.balance)),
          line("Total assets", asset.reduce((a, x) => a + x.balance, 0)),
          ...liab.map((a) => line(a.name, a.balance)),
          line("Total liabilities", liab.reduce((a, x) => a + x.balance, 0)),
          ...equity.map((a) => line(a.name, a.balance)),
          line("Total equity", equity.reduce((a, x) => a + x.balance, 0)),
        ],
      };
    }
    return {
      title: "Cash Flow",
      lines: [
        line("Net profit before tax", netProfit),
        line("Add: Depreciation", s.accounts.find((a) => a.code === "6500")?.balance ?? 0),
        line("Change in receivables", -8400000),
        line("Change in payables", 4200000),
        line("Change in inventory", -1200000),
        line("Cash from operations", cashOps),
        line("Capex — Plant & machinery", -24000000),
        line("Loan drawdown", 12000000),
        line("Interest paid", -4200000),
        line("Net change in cash", cashOps - 24000000 + 7800000),
      ],
    };
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <Toolbar>
        <div className="flex gap-1 rounded-md border p-0.5 text-xs">
          {[
            { k: "pnl", l: "Profit & Loss" },
            { k: "bs", l: "Balance Sheet" },
            { k: "cf", l: "Cash Flow" },
            { k: "tb", l: "Trial Balance" },
          ].map((t) => (
            <button key={t.k} onClick={() => setView(t.k as typeof view)}
              className={`rounded px-3 py-1 ${view === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t.l}</button>
          ))}
        </div>
        <div className="ml-auto text-xs text-muted-foreground">Period: FY 2026 · YTD · unaudited</div>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => { if (view === "tb") { exportCsv("Trial Balance", tb as unknown as Array<Record<string, unknown>>); toast.success("Trial balance exported"); return; } const st = statementLines(); exportCsv(st.title, st.lines as unknown as Array<Record<string, unknown>>); toast.success(`${st.title} exported`); }}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Button size="sm" className="gap-2" onClick={() => { if (view === "tb") { doc.show(trialBalanceDocument(tb)); return; } const st = statementLines(); doc.show(statementDocument(st.title, st.lines)); }}>
          <Printer className="h-4 w-4" /> Print
        </Button>
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
              {cogs.map((a) => <StmtRow key={a.id} label={a.name} value={a.balance} />)}
              <StmtSub label="Gross profit" value={totalIncome - cogs.reduce((a, x) => a + x.balance, 0)} emphasis />
              <StmtHeader label="Operating Expenses" />
              {expense.filter((e) => !cogs.includes(e)).map((a) => <StmtRow key={a.id} label={a.name} value={a.balance} />)}
              <StmtSub label="Net profit" value={netProfit} emphasis />
            </StatementTable>
          </CardContent>
        </Card>
      )}

      {view === "tb" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Trial Balance — FY 2026 YTD</CardTitle>
            <p className="text-xs text-muted-foreground">Click any account to drill through to its posted ledger entries</p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Account</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-right">Debit</th>
                  <th className="p-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tb.map((r) => (
                  <tr key={r.code} className="cursor-pointer hover:bg-muted/30" onClick={() => setDrill(r.code)}>
                    <td className="p-3 font-mono text-xs">{r.code}</td>
                    <td className="p-3">{r.name}</td>
                    <td className="p-3 text-xs uppercase text-muted-foreground">{r.type}</td>
                    <td className="p-3 text-right font-mono text-xs">{r.debit ? fmtINR(r.debit) : "—"}</td>
                    <td className="p-3 text-right font-mono text-xs">{r.credit ? fmtINR(r.credit) : "—"}</td>
                  </tr>
                ))}
                <tr className="bg-muted/40 font-semibold">
                  <td className="p-3" colSpan={3}>Total</td>
                  <td className="p-3 text-right font-mono text-xs">{fmtINR(tb.reduce((a, r) => a + r.debit, 0))}</td>
                  <td className="p-3 text-right font-mono text-xs">{fmtINR(tb.reduce((a, r) => a + r.credit, 0))}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!drill} onOpenChange={(v) => !v && setDrill(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              Ledger — {drill} · {s.accounts.find((a) => a.code === drill)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Journal</th>
                  <th className="p-2 text-left">Narration</th>
                  <th className="p-2 text-right">Debit</th>
                  <th className="p-2 text-right">Credit</th>
                  <th className="p-2 text-right">Running</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ledger.map((l, i) => (
                  <tr key={i}>
                    <td className="p-2 text-xs">{shortDate(l.date)}</td>
                    <td className="p-2 font-mono text-[10px]">{l.journalCode}</td>
                    <td className="p-2 text-xs">{l.narration}{l.projectCode ? ` · ${l.projectCode}` : ""}</td>
                    <td className="p-2 text-right font-mono text-xs">{l.debit ? fmtINR(l.debit) : "—"}</td>
                    <td className="p-2 text-right font-mono text-xs">{l.credit ? fmtINR(l.credit) : "—"}</td>
                    <td className="p-2 text-right font-mono text-xs">{fmtINR(l.running)}</td>
                  </tr>
                ))}
                {!ledger.length && <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">No posted entries for this account.</td></tr>}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

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
              <StmtSub label="Cash from operations" value={cashOps} emphasis />
              <StmtHeader label="Investing Activities" />
              <StmtRow label="Capex — Plant & machinery" value={-24000000} />
              <StmtSub label="Cash used in investing" value={-24000000} />
              <StmtHeader label="Financing Activities" />
              <StmtRow label="Loan drawdown" value={12000000} />
              <StmtRow label="Interest paid" value={-4200000} />
              <StmtSub label="Cash from financing" value={7800000} />
              <StmtSub label="Net change in cash" value={cashOps - 24000000 + 7800000} emphasis />
            </StatementTable>
          </CardContent>
        </Card>
      )}
      {doc.dialog}
    </div>
  );
}

/* ---------- Small helpers ---------- */
function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">{children}</div>;
}

function SearchBox({ q, setQ, placeholder, compact }: { q: string; setQ: (v: string) => void; placeholder: string; compact?: boolean }) {
  return (
    <div className={`relative w-full ${compact ? "max-w-[220px]" : "max-w-sm"}`}>
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className={`pl-8 ${compact ? "h-8 text-xs" : ""}`} />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="p-10 text-center text-sm text-muted-foreground">{label}</div>;
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
