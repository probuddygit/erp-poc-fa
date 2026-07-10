import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

const statusStyles: Record<string, string> = {
  new: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  qualified: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  disqualified: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  proposal: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  negotiation: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  lost: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  received: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "in-review": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  responded: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  closed: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  prospect: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  inactive: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-0 font-medium capitalize",
        statusStyles[status] ?? "bg-slate-100 text-slate-700",
      )}
    >
      {status.replace("-", " ")}
    </Badge>
  );
}
