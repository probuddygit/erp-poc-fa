import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Lock, History } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtINR } from "@/components/crm/shared";
import { useCrm } from "@/lib/crm/store";
import {
  canPerform,
  closureHistory,
  evaluateSoClosure,
  performSoClosure,
  type ClosureAction,
} from "@/lib/crm/so-closure";

const ACTION_LABEL: Record<ClosureAction, string> = {
  close: "Close",
  "short-close": "Short Close",
  cancel: "Cancel",
};

export function SoClosurePanel({ soId }: { soId: string }) {
  const so = useCrm((s) => s.salesOrders.find((r) => r.id === soId));
  const lines = useCrm((s) => s.salesOrders.length); // re-render on store change
  const [action, setAction] = useState<ClosureAction | null>(null);
  const [reason, setReason] = useState("");
  const [tick, setTick] = useState(0);

  const summary = useMemo(() => (so ? evaluateSoClosure(so) : null), [so, lines, tick]);
  const history = useMemo(() => closureHistory(soId), [soId, tick]);

  if (!so || !summary) return null;
  const terminal = so.status === "closed" || so.status === "cancelled";

  const submit = () => {
    if (!action) return;
    const res = performSoClosure(soId, action, reason);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`${so.code} ${ACTION_LABEL[action].toLowerCase()}d — audit entry recorded`);
    setAction(null);
    setReason("");
    setTick((t) => t + 1);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Sales Order Closure</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Validation across delivery, invoicing, returns, commitments and customer balance.
          </p>
        </div>
        <Badge variant={terminal ? "secondary" : summary.blockers ? "destructive" : "default"}>
          {terminal ? so.status : summary.blockers ? `${summary.blockers} blocker(s)` : "Ready to close"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Ordered qty" value={summary.orderedQty} />
          <Stat label="Delivered qty" value={summary.deliveredQty} />
          <Stat label="Invoiced qty" value={summary.invoicedQty} />
          <Stat label="Pending qty" value={summary.pendingQty} />
          <Stat label="Order value" money value={summary.orderValue} />
          <Stat label="Invoiced" money value={summary.invoicedValue} />
          <Stat label="Customer balance" money value={summary.customerBalance} />
          <Stat label="Pending billing" money value={summary.pendingBilling} />
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-44">Check</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.checks.map((c) => (
                <TableRow key={c.key}>
                  <TableCell>
                    {c.status === "pass" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : c.status === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{c.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!terminal && (
          <div className="flex flex-wrap gap-2">
            {(["close", "short-close", "cancel"] as ClosureAction[]).map((a) => {
              const gate = canPerform(a, summary);
              return (
                <Button
                  key={a}
                  size="sm"
                  variant={a === "cancel" ? "destructive" : a === "close" ? "default" : "outline"}
                  disabled={!gate.ok}
                  title={gate.error}
                  onClick={() => {
                    setAction(a);
                    setReason("");
                  }}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" /> {ACTION_LABEL[a]}
                </Button>
              );
            })}
          </div>
        )}

        {Boolean(history.length) && (
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4" /> Audit trail
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {history.map((h) => (
                <li key={h.id}>
                  <span className="font-medium text-foreground">{ACTION_LABEL[h.action]}</span> by {h.by} ·{" "}
                  {new Date(h.at).toLocaleString("en-IN")} — {h.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <Dialog open={Boolean(action)} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action ? ACTION_LABEL[action] : ""} {so.code}</DialogTitle>
            <DialogDescription>
              A reason is mandatory and is stored in the audit trail with your name and timestamp.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={reason}
            placeholder="Reason for this decision…"
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Back
            </Button>
            <Button disabled={!reason.trim()} onClick={submit}>
              Confirm {action ? ACTION_LABEL[action] : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Stat({ label, value, money }: { label: string; value: number; money?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums">
        {money ? fmtINR(Math.round(value)) : value.toLocaleString("en-IN")}
      </div>
    </div>
  );
}
