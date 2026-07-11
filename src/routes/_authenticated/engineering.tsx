import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Wrench, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/engineering")({
  head: () => ({ meta: [{ title: "Engineering & PLM · Faith Automation ERP" }] }),
  component: EngineeringLayout,
});

const tabs: { to: string; label: string; exact?: boolean; section?: string }[] = [
  { to: "/engineering", label: "Dashboard", exact: true },
  { to: "/engineering/$section", label: "Item Master", section: "items" },
  { to: "/engineering/$section", label: "Part Master", section: "parts" },
  { to: "/engineering/$section", label: "Drawings", section: "drawings" },
  { to: "/engineering/$section", label: "EBOM", section: "ebom" },
  { to: "/engineering/$section", label: "MBOM", section: "mbom" },
  { to: "/engineering/$section", label: "ECN", section: "ecns" },
  { to: "/engineering/$section", label: "ECR", section: "ecrs" },
  { to: "/engineering/$section", label: "Design Reviews", section: "reviews" },
];

function EngineeringLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (t: { to: string; exact?: boolean; section?: string }) => {
    const path = t.section ? `/engineering/${t.section}` : t.to;
    return t.exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">Engineering & PLM</h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Design · BOM · Change</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Item & Part master, drawing vault, multi-level EBOM/MBOM, revision control, ECN/ECR workflows and design reviews — the single source of truth for engineering.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Ask AI about BOM
            </Button>
          </div>

          <nav className="mt-6 -mb-px flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "relative whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(t.to, t.exact)
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
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
