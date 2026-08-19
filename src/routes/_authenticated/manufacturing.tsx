import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Factory, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/manufacturing")({
  head: () => ({ meta: [{ title: "Manufacturing & Shop Floor · Faith Automation ERP" }] }),
  component: ManufacturingLayout,
});

const tabs: { to: string; label: string; exact?: boolean; section?: string }[] = [
  { to: "/manufacturing", label: "Command Center", exact: true },
  { to: "/manufacturing/$section", label: "Production Plan", section: "plan" },
  { to: "/manufacturing/$section", label: "Manufacturing Orders", section: "orders" },
  { to: "/manufacturing/$section", label: "Routings & Work Centers", section: "routings" },
  { to: "/manufacturing/$section", label: "Shop Floor Terminal", section: "terminal" },
  { to: "/manufacturing/$section", label: "OEE & Downtime", section: "oee" },
  { to: "/manufacturing/$section", label: "Sub-contracting", section: "jobwork" },
];

function ManufacturingLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (t: { to: string; exact?: boolean; section?: string }) => {
    const path = t.section ? `/manufacturing/${t.section}` : t.to;
    return t.exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 pb-0 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Factory className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">Manufacturing & Shop Floor</h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Plan · Execute · Improve</Badge>
                </div>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  Finite-capacity planning, manufacturing orders exploded from routings, shop-floor execution with back-flushing,
                  live OEE and sub-contracting — wired end-to-end into Engineering, Inventory, Quality, Projects and Finance.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/ai-assistant" search={{ q: "Give me a shop floor status: bottlenecks, late orders and OEE" }}>
                <Sparkles className="h-4 w-4 text-primary" /> Ask AI about the floor
              </Link>
            </Button>
          </div>

          <nav className="-mb-px mt-6 flex gap-1 overflow-x-auto">
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
