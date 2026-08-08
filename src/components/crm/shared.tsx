import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TONE_BADGE, statusLabel, statusTone } from "@/lib/crm/lifecycle";


export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export const fmtCompact = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${n}`;
};

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const relDate = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (Math.abs(d) < 1) return "today";
  const n = Math.round(d);
  if (n > 0) return `${n}d ago`;
  return `in ${-n}d`;
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-0 font-medium", TONE_BADGE[statusTone(status)], className)}
    >
      {statusLabel(status)}
    </Badge>
  );
}
