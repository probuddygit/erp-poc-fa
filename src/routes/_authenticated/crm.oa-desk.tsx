import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtINR } from "@/components/crm/shared";
import { useCrm } from "@/lib/crm/store";
import { approveOAAndProvision } from "@/lib/crm/workflow";
import { financeReviewFor, runFinanceChecks, saveFinanceReview, useRevenue } from "@/lib/crm/revenue";

export const Route = createFileRoute("/_authenticated/crm/oa-desk")({
  head: () => ({
    meta: [
      { title: "Order Acceptance Desk · Faith Automation ERP" },
      {
        name: "description",
        content:
          "Finance validation and bulk approval of Order Acceptances, with automatic sales order and project provisioning.",
      },
      { property: "og:title", content: "Order Acceptance Desk" },
      { property: "og:description", content: "Finance-gated, bulk Order Acceptance processing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OaDeskPage,
});

function OaDeskPage() {
  const oas = useCrm((s) => s.oas.filter((o) => o.status !== "cancelled" && o.status !== "approved"));
  const reviews = useRevenue((s) => s.financeReviews);
  const [selected, setSelected] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");

  const rows = useMemo(
    () =>
      oas.map((o) => {
        const checks = runFinanceChecks(o.id);
        const failed = checks.filter((c) => !c.ok);
        return { oa: o, checks, failed, review: reviews.find((r) => r.oaId === o.id) ?? financeReviewFor(o.id) };
      }),
    [oas, reviews],
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const bulkValidate = () => {
    selected.forEach((id) => {
      const failed = runFinanceChecks(id).filter((c) => !c.ok);
      saveFinanceReview(id, failed.length ? "held" : "cleared", remarks || (failed[0]?.detail ?? "Auto validation"));
    });
    toast.success(`${selected.length} order(s) validated by finance`);
  };

  const bulkApprove = () => {
    let done = 0;
    let blocked = 0;
    selected.forEach((id) => {
      const failed = runFinanceChecks(id).filter((c) => !c.ok);
      if (failed.length) {
        blocked += 1;
        return;
      }
      approveOAAndProvision(id);
      done += 1;
    });
    setSelected([]);
    toast.success(`${done} order(s) approved and projects provisioned${blocked ? ` · ${blocked} blocked by finance` : ""}`);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Order Acceptance desk</CardTitle>
            <p className="text-xs text-muted-foreground">
              {rows.length} order(s) awaiting finance validation and approval. Approval raises the sales order and
              auto-plans the project.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" disabled={!selected.length} onClick={bulkValidate}>
              <ShieldCheck className="h-4 w-4" /> Validate ({selected.length})
            </Button>
            <Button className="gap-2" disabled={!selected.length} onClick={bulkApprove}>
              <Rocket className="h-4 w-4" /> Approve &amp; provision
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={2}
            placeholder="Finance remarks applied to the selected orders…"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Finance checks</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ oa, checks, failed, review }) => (
                  <TableRow key={oa.id}>
                    <TableCell>
                      <Checkbox checked={selected.includes(oa.id)} onCheckedChange={() => toggle(oa.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{oa.code}</div>
                      <div className="text-xs text-muted-foreground">{oa.title}</div>
                    </TableCell>
                    <TableCell>{oa.customerName}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtINR(oa.value)}</TableCell>
                    <TableCell className="text-xs">{oa.poNumber || "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {checks.map((c) => (
                          <div key={c.label} className="flex items-start gap-1.5 text-xs">
                            {c.ok ? (
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            ) : (
                              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                            )}
                            <span className={c.ok ? "text-muted-foreground" : ""}>{c.detail}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={failed.length ? "outline" : "default"}>
                        {review ? review.status : failed.length ? `${failed.length} issue(s)` : "ready"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No pending order acceptances — everything is approved.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
