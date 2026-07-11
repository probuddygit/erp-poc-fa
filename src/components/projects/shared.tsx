import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RAG } from "@/lib/projects/types";

export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const fmtCompact = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${n}`;
};

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const RAG_STYLES: Record<RAG, string> = {
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/30",
  red: "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30",
};

export function RagBadge({ rag, className }: { rag: RAG; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize",
        RAG_STYLES[rag],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          rag === "green" ? "bg-emerald-500" : rag === "amber" ? "bg-amber-500" : "bg-rose-500",
        )}
      />
      {rag}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  planning: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "on-hold": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  closed: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  "not-started": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  blocked: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  upcoming: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "at-risk": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  achieved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  missed: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  open: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  mitigated: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-0 font-medium capitalize", STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700")}
    >
      {status.replace("-", " ")}
    </Badge>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const tone = v >= 75 ? "bg-emerald-500" : v >= 40 ? "bg-primary" : "bg-amber-500";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${v}%` }} />
    </div>
  );
}
