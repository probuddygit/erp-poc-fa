import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { advanceLifecycle, approveOAAndProvision } from "@/lib/crm/workflow";
import { runFinanceChecks, saveFinanceReview, useRevenue } from "@/lib/crm/revenue";

/** Finance gate shown on an Order Acceptance before it can be approved. */
export function FinanceReviewPanel({ oaId }: { oaId: string }) {
  const reviews = useRevenue((s) => s.financeReviews);
  const [remarks, setRemarks] = useState("");
  const checks = useMemo(() => runFinanceChecks(oaId), [oaId, reviews]);
  const review = reviews.find((r) => r.oaId === oaId);
  const failed = checks.filter((c) => !c.ok);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Finance validation</CardTitle>
          <p className="text-xs text-muted-foreground">
            {failed.length ? `${failed.length} issue(s) to clear before approval` : "All checks passed"}
          </p>
        </div>
        {review && (
          <Badge variant={review.status === "cleared" ? "default" : "outline"} className="capitalize">
            {review.status} · {new Date(review.at).toLocaleDateString("en-IN")}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-start gap-2 rounded-md border p-2 text-sm">
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              )}
              <div>
                <p className="font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <Textarea
          rows={2}
          placeholder="Finance remarks…"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              saveFinanceReview(oaId, failed.length ? "held" : "cleared", remarks);
              if (!failed.length) advanceLifecycle("oas", oaId, "Finance");
              toast.success(
                failed.length
                  ? "Order held by finance"
                  : "Finance validation cleared — sent for management approval",
              );
            }}
          >
            <ShieldCheck className="h-4 w-4" /> Record finance decision
          </Button>

          <Button
            className="gap-2"
            disabled={Boolean(failed.length)}
            onClick={() => {
              const res = approveOAAndProvision(oaId);
              toast.success(
                res ? `Approved — project ${res.projectCode} provisioned` : "Could not approve this order",
              );
            }}
          >
            <Rocket className="h-4 w-4" /> Approve &amp; provision project
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
