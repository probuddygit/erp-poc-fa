import { Check, Clock, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMasterApprovals } from "@/lib/mdm/store";
import type { MasterDef, MasterRecord } from "@/lib/mdm/types";

interface ApprovalHistoryProps {
  def: MasterDef;
  record: MasterRecord;
  onDecide?: (stepIndex: number, decision: "approved" | "rejected") => void;
}

export function ApprovalHistory({ def, record, onDecide }: ApprovalHistoryProps) {
  const steps = useMasterApprovals(def.key, record.id);

  if (!def.requiresApproval) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          This master doesn't require approvals.
        </CardContent>
      </Card>
    );
  }

  if (record.status === "draft") {
    return (
      <Card className="border-border/60">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Not submitted for approval yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          Approval Timeline
          <Badge variant="outline">{def.approvalSteps?.length ?? steps.length} steps</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-4 pl-6">
          <span className="absolute left-2 top-2 bottom-2 w-px bg-border" aria-hidden />
          {steps.map((s, i) => {
            const Icon = s.status === "approved" ? Check : s.status === "rejected" ? X : Clock;
            const tone =
              s.status === "approved"
                ? "bg-success text-success-foreground"
                : s.status === "rejected"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-warning text-warning-foreground";
            const isCurrent =
              s.status === "pending" && steps.slice(0, i).every((p) => p.status === "approved");
            return (
              <li key={s.id} className="relative">
                <span className={cn("absolute -left-6 top-0.5 grid h-5 w-5 place-items-center rounded-full", tone)}>
                  <Icon className="h-3 w-3" strokeWidth={3} />
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{s.step}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.status === "pending" ? "Waiting" : `${s.status} · ${new Date(s.ts).toLocaleString()}`}
                      {s.actor && ` · ${s.actor}`}
                    </div>
                    {s.comment && (
                      <div className="mt-1 rounded-md border bg-muted/40 px-2 py-1 text-xs italic">"{s.comment}"</div>
                    )}
                  </div>
                  {isCurrent && onDecide && (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => onDecide(i, "rejected")}>
                        <X className="h-3 w-3" /> Reject
                      </Button>
                      <Button size="sm" className="h-7 gap-1" onClick={() => onDecide(i, "approved")}>
                        <Check className="h-3 w-3" /> Approve
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
