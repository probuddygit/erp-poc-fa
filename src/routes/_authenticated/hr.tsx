import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { UserCog, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/hr")({
  head: () => ({ meta: [{ title: "HR · Faith Automation ERP" }] }),
  component: HRLayout,
});

const tabs: { to: string; label: string; exact?: boolean; section?: string }[] = [
  { to: "/hr", label: "Dashboard", exact: true },
  { to: "/hr/$section", label: "Employees", section: "employees" },
  { to: "/hr/$section", label: "Attendance & Leave", section: "attendance" },
  { to: "/hr/$section", label: "Project Timesheets", section: "timesheets" },
  { to: "/hr/$section", label: "Skill Matrix & Training", section: "skills" },
  { to: "/hr/$section", label: "Payroll", section: "payroll" },
  { to: "/hr/$section", label: "Performance Reviews", section: "reviews" },
];

function HRLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (t: { to: string; exact?: boolean; section?: string }) => {
    const path = t.section ? `/hr/${t.section}` : t.to;
    return t.exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <UserCog className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">Human Resources</h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Hire · Grow · Pay</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Employee lifecycle, attendance & leave, project timesheets, skills & training, payroll integration and performance reviews.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/ai-assistant" search={{ q: "Give me a workforce overview: headcount, attendance and utilisation" }}>
              <Sparkles className="h-4 w-4 text-primary" /> Ask AI about people
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
                  isActive(t)
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
