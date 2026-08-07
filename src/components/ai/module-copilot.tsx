import { Sparkles, TrendingDown, TrendingUp, Wand2, CheckCircle2, ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Severity = "high" | "medium" | "low";

/** A grounded, deterministic recommendation produced by a module intelligence engine. */
export interface AiAction {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  impact?: string;
  cta?: string;
  /** Applies the recommendation to the store. Returns a toast message. */
  run?: () => string;
}

export interface AiMetric {
  label: string;
  value: string;
  sub?: string;
  good?: boolean;
  warn?: boolean;
}

const SEV: Record<Severity, string> = {
  high: "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/30",
  medium: "bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-500/30",
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/30",
};

export function AiMetricStrip({ items }: { items: AiMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{it.label}</div>
            {it.warn ? (
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            ) : it.good ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : null}
          </div>
          <div
            className={cn(
              "mt-1.5 font-display text-xl font-semibold tracking-tight",
              it.warn ? "text-rose-600 dark:text-rose-400" : it.good ? "text-emerald-600 dark:text-emerald-400" : "",
            )}
          >
            {it.value}
          </div>
          {it.sub && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export function AiCopilotPanel({
  title,
  subtitle,
  actions,
  askQuery,
  className,
}: {
  title: string;
  subtitle?: string;
  actions: AiAction[];
  askQuery?: string;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Sparkles className="h-4 w-4 text-primary" /> {title}
          </CardTitle>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{actions.length}</Badge>
          {askQuery && (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/ai-assistant" search={{ q: askQuery }}>
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Ask AI
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((a) => (
          <div key={a.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                      SEV[a.severity],
                    )}
                  >
                    <ShieldAlert className="h-3 w-3" /> {a.severity}
                  </span>
                  <span className="truncate text-sm font-medium">{a.title}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                {a.impact && <p className="mt-0.5 text-[11px] font-medium text-primary">{a.impact}</p>}
              </div>
              {a.run && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0 gap-1.5"
                  onClick={() => toast.success(a.run!())}
                >
                  <Wand2 className="h-3.5 w-3.5" /> {a.cta ?? "Apply"}
                </Button>
              )}
            </div>
          </div>
        ))}
        {!actions.length && (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No issues detected — everything is on track.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
