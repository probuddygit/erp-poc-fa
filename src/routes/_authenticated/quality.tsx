import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/quality")({
  head: () => ({ meta: [{ title: "Quality · Faith Automation ERP" }] }),
  component: QualityLayout,
});

const tabs: { to: string; label: string; exact?: boolean; section?: string }[] = [
  { to: "/quality", label: "Dashboard", exact: true },
  { to: "/quality/$section", label: "Inspection Plans", section: "plans" },
  { to: "/quality/$section", label: "Inspections (IQC · IPQC · FQC)", section: "inspections" },
  { to: "/quality/$section", label: "Non-Conformance", section: "ncr" },
  { to: "/quality/$section", label: "CAPA & 8D", section: "capa" },
  { to: "/quality/$section", label: "Calibration", section: "calibration" },
  { to: "/quality/$section", label: "Supplier Quality", section: "suppliers" },
];

function QualityLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (t: { to: string; exact?: boolean; section?: string }) => {
    const path = t.section ? `/quality/${t.section}` : t.to;
    return t.exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">Quality Management</h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Inspect · Contain · Improve</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Inspection plans and checklists, incoming / in-process / final QC, non-conformance and CAPA workflows, gauge calibration and supplier quality scorecards.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/ai-assistant" search={{ q: "How is quality performing? Show NCR, CAPA and defect PPM trend" }}>
              <Sparkles className="h-4 w-4 text-primary" /> Ask AI about quality
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
