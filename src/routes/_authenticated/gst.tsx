import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Receipt, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/gst")({
  head: () => ({
    meta: [
      { title: "GST & Compliance · Faith Automation ERP" },
      { name: "description", content: "GSTR filing calendar, e-invoicing, e-way bills, ITC reconciliation and HSN summaries for Faith Automation." },
      { property: "og:title", content: "GST & Compliance · Faith Automation ERP" },
      { property: "og:description", content: "Returns, IRN generation, e-way bills and input tax credit reconciliation in one workspace." },
    ],
  }),
  component: GstLayout,
});

const tabs: { to: string; label: string; exact?: boolean; section?: string }[] = [
  { to: "/gst", label: "Dashboard", exact: true },
  { to: "/gst/$section", label: "Returns & Filing", section: "returns" },
  { to: "/gst/$section", label: "e-Invoicing (IRN)", section: "e-invoicing" },
  { to: "/gst/$section", label: "e-Way Bills", section: "e-way-bills" },
  { to: "/gst/$section", label: "ITC Reconciliation", section: "itc" },
  { to: "/gst/$section", label: "HSN Summary", section: "hsn" },
  { to: "/gst/$section", label: "Registrations", section: "registrations" },
];

function GstLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (t: { to: string; exact?: boolean; section?: string }) => {
    const path = t.section ? `/gst/${t.section}` : t.to;
    return t.exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 pb-0 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">GST & Compliance</h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">File · Reconcile · Report</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Multi-GSTIN filing calendar, IRP e-invoicing, e-way bill tracking, GSTR-2B input
                  tax credit reconciliation and HSN-wise outward supply summaries.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/ai-assistant" search={{ q: "Summarise my GST filing status and ITC reconciliation exceptions" }}>
              <Sparkles className="h-4 w-4 text-primary" /> Ask AI about compliance
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
