import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFinance } from "@/lib/finance/store";
import {
  buildClosureChecks, closeProject, closureFor, closureSummary, decideAdjustment,
  refreshClosureChecks, reopenProject, requestAdjustment, requestClosure,
} from "@/lib/finance/closure";
import { projectBalanceSheet, projectPnl } from "@/lib/finance/project-pnl";
import { FinToolbar, FinSearch } from "@/components/finance/shared";
import { fmtCompact, fmtINR } from "@/components/projects/shared";
import type { ClosureCheck } from "@/lib/finance/types";
import { CheckCircle2, AlertTriangle, Ban, Lock, Unlock, RefreshCw, FilePlus2 } from "lucide-react";

export function ProjectClosureSection() {
  const s = useFinance((x) => x);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(s.projectCosts[0]?.projectCode ?? null);
  const [adj, setAdj] = useState(false);
  const [form, setForm] = useState({ reason: "", amount: "", accountCode: "6300" });

  const projects = s.projectCosts.filter((c) => `${c.projectCode} ${c.projectName} ${c.customer}`.toLowerCase().includes(q.toLowerCase()));
  const code = selected ?? projects[0]?.projectCode ?? null;
  const closure = code ? closureFor(s, code) : undefined;
  const checks = useMemo(() => (code ? (closure?.checks?.length ? closure.checks : buildClosureChecks(code)) : []), [code, closure]);
  const pnl = code ? projectPnl(s, code) : null;
  const bs = code ? projectBalanceSheet(s, code) : null;
  const summary = closureSummary(s);
  const blockers = checks.filter((c) => c.status === "blocker");

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <FinToolbar>
        <FinSearch q={q} setQ={setQ} placeholder="Search project to close…" />
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" disabled={!code} onClick={() => { if (code) { refreshClosureChecks(code); toast.success("Closure checklist refreshed"); } }}>
            <RefreshCw className="h-4 w-4" /> Re-run checks
          </Button>
        </div>
      </FinToolbar>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Projects" value={String(summary.total)} />
        <Tile label="Closure requested" value={String(summary.requested)} />
        <Tile label="Closed" value={String(summary.closed)} tone="good" />
        <Tile label="Pending adjustments" value={String(summary.pendingAdj)} tone={summary.pendingAdj ? "bad" : "good"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Projects</CardTitle></CardHeader>
          <CardContent className="max-h-[520px] overflow-y-auto p-0">
            <ul className="divide-y">
              {projects.map((p) => {
                const cl = closureFor(s, p.projectCode);
                return (
                  <li key={p.projectCode}>
                    <button
                      onClick={() => setSelected(p.projectCode)}
                      className={`w-full px-3 py-2.5 text-left hover:bg-muted/40 ${code === p.projectCode ? "bg-muted/60" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{p.projectName}</span>
                        <Badge variant="outline" className="text-[9px] uppercase">{cl?.status ?? "open"}</Badge>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">{p.projectCode} · {fmtCompact(p.contractValue)}</div>
                    </button>
                  </li>
                );
              })}
              {!projects.length && <li className="p-6 text-center text-sm text-muted-foreground">No projects match.</li>}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {code && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="font-display text-base">{pnl?.projectName ?? code} — closure checklist</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {blockers.length ? `${blockers.length} blocker(s) must be cleared` : "All mandatory checks passed"}
                    {closure?.closedAt && ` · closed ${new Date(closure.closedAt).toLocaleDateString("en-IN")} by ${closure.closedBy}`}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {closure?.status !== "closed" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => { requestClosure(code, "Project Manager"); toast.success("Closure requested — checklist snapshot saved"); }}>
                        <FilePlus2 className="h-4 w-4" /> Request closure
                      </Button>
                      <Button size="sm" className="gap-2" onClick={() => {
                        const r = closeProject(code, "Finance Controller");
                        if (r.closed) toast.success("Project financially closed — postings are now blocked");
                        else toast.error(`${r.blockers.length} blocker(s) — clear them or force close`);
                      }}>
                        <Lock className="h-4 w-4" /> Close project
                      </Button>
                      {blockers.length > 0 && (
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => { closeProject(code, "Finance Controller", true); toast.warning("Force closed with blockers — recorded in the snapshot"); }}>
                          <AlertTriangle className="h-4 w-4" /> Force close
                        </Button>
                      )}
                    </>
                  )}
                  {closure?.status === "closed" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => setAdj(true)}>
                        <FilePlus2 className="h-4 w-4" /> Request adjustment
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => { reopenProject(code); toast.success("Project reopened for posting"); }}>
                        <Unlock className="h-4 w-4" /> Reopen
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {checks.map((c) => <CheckRow key={c.key} check={c} />)}
              </CardContent>
            </Card>
          )}

          {pnl && bs && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-display text-base">Closing position</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <Stat label="Contract value" value={fmtINR(pnl.contractValue)} />
                <Stat label="Revenue recognised" value={fmtINR(pnl.revenueRecognised)} />
                <Stat label="Total cost" value={fmtINR(pnl.totalCost)} />
                <Stat label="Net margin" value={`${fmtINR(pnl.netMargin)} · ${pnl.netMarginPct}%`} />
                <Stat label="Unbilled WIP" value={fmtINR(bs.unbilledWip)} />
                <Stat label="Net position" value={fmtINR(bs.netPosition)} />
              </CardContent>
            </Card>
          )}

          {closure?.adjustments?.length ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-display text-base">Post-closure adjustments</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {closure.adjustments.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{a.reason}</div>
                      <div className="text-xs text-muted-foreground">{fmtINR(a.amount)} · account {a.accountCode} · {a.requestedBy}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase">{a.status}</Badge>
                    {a.status === "pending" && code && (
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-xs" onClick={() => { decideAdjustment(code, a.id, true, "Finance Controller"); toast.success("Adjustment approved and posted"); }}>Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { decideAdjustment(code, a.id, false, "Finance Controller"); toast.success("Adjustment rejected"); }}>Reject</Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Dialog open={adj} onOpenChange={setAdj}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post-closure adjustment request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="adj-reason">Reason</label>
              <Input id="adj-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Late vendor bill for site commissioning" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="adj-amount">Amount (INR)</label>
              <Input id="adj-amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="adj-acc">Expense account</label>
              <Input id="adj-acc" value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdj(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!code) return;
              requestAdjustment(code, { reason: form.reason || "Post-closure adjustment", amount: Number(form.amount) || 0, accountCode: form.accountCode, requestedBy: "Project Manager" });
              toast.success("Adjustment submitted for approval");
              setAdj(false);
              setForm({ reason: "", amount: "", accountCode: "6300" });
            }}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckRow({ check }: { check: ClosureCheck }) {
  const Icon = check.status === "pass" ? CheckCircle2 : check.status === "warning" ? AlertTriangle : Ban;
  const tone = check.status === "pass" ? "text-emerald-500" : check.status === "warning" ? "text-amber-500" : "text-rose-500";
  return (
    <div className="flex items-start gap-3 rounded-md border p-3 text-sm">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
      <div className="flex-1">
        <div className="font-medium">{check.label}</div>
        <div className="text-xs text-muted-foreground">{check.detail}</div>
      </div>
      {check.value ? <div className="font-mono text-xs">{fmtINR(check.value)}</div> : null}
      <Badge variant="outline" className="text-[10px] uppercase">{check.status}</Badge>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-1.5 font-display text-2xl font-semibold tracking-tight ${tone === "bad" ? "text-rose-600 dark:text-rose-400" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
