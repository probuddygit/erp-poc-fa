import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BarChart3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports · Faith Automation ERP" }] }),
  component: ReportsLayout,
});

const tabs: { to: string; label: string; exact?: boolean; section?: string }[] = [
  { to: "/reports", label: "Dashboard", exact: true },
  { to: "/reports/$section", label: "Saved Reports", section: "library" },
  { to: "/reports/$section", label: "Data Explorer", section: "explorer" },
  { to: "/reports/$section", label: "Report Builder", section: "builder" },

  { to: "/reports/$section", label: "Scheduled Delivery", section: "schedules" },
  { to: "/reports/$section", label: "Run History", section: "runs" },
  { to: "/reports/$section", label: "AI Narratives", section: "narratives" },
];

function ReportsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (t: { to: string; exact?: boolean; section?: string }) => {
    const path = t.section ? `/reports/${t.section}` : t.to;
    return t.exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">Reports &amp; Analytics</h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Insight · Delivery</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Cross-module dashboards, saved reports, ad-hoc query builder, scheduled distribution and AI-generated narratives.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/ai-assistant" search={{ q: "Build me an executive summary report across all modules" }}>
              <Sparkles className="h-4 w-4 text-primary" /> Ask AI for a report
              </Link>
            </Button>
          </div>

          <nav className="mt-6 -mb-px flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <Link
                key={t.label}
                to={t.to}
                params={t.section ? { section: t.section } : undefined}
                className={cn(
                  "relative whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(t) ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
