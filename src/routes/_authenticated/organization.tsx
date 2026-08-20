import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminStore, useAdmin } from "@/lib/admin/store";

export const Route = createFileRoute("/_authenticated/organization")({
  head: () => ({ meta: [{ title: "Organization Setup · Faith Automation ERP" }] }),
  component: OrganizationLayout,
});

const tabs = [
  { section: "company", label: "Company" },
  { section: "branches", label: "Branches" },
];

function CompanySwitcher() {
  const companies = useAdmin((s) => s.companies);
  const activeCompanyId = useAdmin((s) => s.activeCompanyId);
  const value = companies.some((c) => c.id === activeCompanyId) ? activeCompanyId : companies[0]?.id;

  return (
    <div className="flex items-center gap-2">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Active company</Label>
      <Select value={value} onValueChange={(v) => adminStore.setActiveCompany(v)}>
        <SelectTrigger className="h-9 w-[260px]"><SelectValue placeholder="Select company" /></SelectTrigger>
        <SelectContent>
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id} disabled={c.active === false}>
              <span className="font-mono text-xs">{c.code}</span> · {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function OrganizationLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight">Organization Setup</h1>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Legal · Structure</Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Company legal identity, statutory registrations and the branch / plant / warehouse network.
              </p>
            </div>
          </div>

          <nav className="mt-6 -mb-px flex gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const path = `/organization/${t.section}`;
              const active = pathname === path || pathname.startsWith(path + "/");
              return (
                <Link
                  key={t.section}
                  to="/organization/$section"
                  params={{ section: t.section }}
                  className={cn(
                    "relative whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
