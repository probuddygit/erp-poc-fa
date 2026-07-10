import type { ApprovalStatus } from "@/lib/mdm/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAP: Record<ApprovalStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-transparent" },
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30" },
  approved: { label: "Approved", className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function StatusBadge({ status, className }: { status: ApprovalStatus; className?: string }) {
  const cfg = MAP[status];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", cfg.className, className)}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {cfg.label}
    </Badge>
  );
}
