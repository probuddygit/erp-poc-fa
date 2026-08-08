import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { syncLifecycleChain } from "@/lib/crm/workflow";


export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({ meta: [{ title: "Revenue Lifecycle · Faith Automation ERP" }] }),
  component: CrmLayout,
});

const tabs = [
  { to: "/crm", label: "Dashboard", exact: true },
  { to: "/crm/customers", label: "Customers" },
  { to: "/crm/leads", label: "Leads" },
  { to: "/crm/opportunities", label: "Opportunities" },
  { to: "/crm/rfqs", label: "RFQs" },
  { to: "/crm/proposals", label: "Proposals" },
  { to: "/crm/quotations", label: "Quotations" },
  { to: "/crm/oas", label: "Order Acceptance" },
  { to: "/crm/salesOrders", label: "Sales Orders" },
  { to: "/crm/import", label: "PO Import" },
  { to: "/crm/registers", label: "Registers" },
  { to: "/crm/analytics", label: "Analytics" },
];


function CrmLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const synced = useRef(false);
  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    const created = syncLifecycleChain();
    if (created.length)
      toast.success(`Lifecycle automation created ${created.length} document(s): ${created.join(", ")}`);
  }, []);
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");


  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">
                    Revenue Lifecycle
                  </h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    Sales · CRM
                  </Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  End-to-end capture from Lead → Opportunity → RFQ → Proposal → Quotation → Order Acceptance,
                  with automatic Project provisioning on OA approval.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/ai-assistant" search={{ q: "What is my sales pipeline outlook and weighted forecast?" }}>
              <Sparkles className="h-4 w-4 text-primary" />
              Ask AI about pipeline
              </Link>
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
