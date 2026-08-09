import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/administration")({
  head: () => ({ meta: [{ title: "Administration · Faith Automation ERP" }] }),
  component: AdminLayout,
});

const tabs: { to: string; label: string; exact?: boolean; section?: string }[] = [
  { to: "/administration", label: "Overview", exact: true },
  { to: "/administration/$section", label: "Company & Branches", section: "company" },
  { to: "/administration/$section", label: "Users & Roles", section: "users" },
  { to: "/administration/$section", label: "Permission Matrix", section: "permissions" },
  { to: "/administration/$section", label: "Approval Workflows", section: "workflows" },
  { to: "/administration/$section", label: "Numbering Series", section: "numbering" },
  { to: "/administration/$section", label: "Master Data Governance", section: "governance" },
  { to: "/administration/$section", label: "Notifications", section: "notifications" },
  { to: "/administration/$section", label: "Templates", section: "templates" },
  { to: "/administration/$section", label: "Business Rules", section: "rules" },
  { to: "/administration/$section", label: "AI Configuration", section: "ai" },
  { to: "/administration/$section", label: "Integrations", section: "integrations" },
  { to: "/administration/$section", label: "Security", section: "security" },
  { to: "/administration/$section", label: "System Config", section: "system" },
  { to: "/administration/$section", label: "Audit & Health", section: "audit" },

];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (t: { to: string; exact?: boolean; section?: string }) => {
    const path = t.section ? `/administration/${t.section}` : t.to;
    return t.exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">Administration</h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Configure · Govern</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Company setup, users &amp; roles, approval workflows, numbering series, master data governance and audit trail.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/ai-assistant" search={{ q: "Summarise system setup, users, roles and pending approvals" }}>
              <Sparkles className="h-4 w-4 text-primary" /> Ask AI about setup
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
