import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Wallet, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finance · Faith Automation ERP" }] }),
  component: FinanceLayout,
});

const tabs: { to: string; label: string; exact?: boolean; section?: string }[] = [
  { to: "/finance", label: "Dashboard", exact: true },
  { to: "/finance/$section", label: "Chart of Accounts", section: "coa" },
  { to: "/finance/$section", label: "General Ledger", section: "gl" },
  { to: "/finance/$section", label: "Receivables", section: "ar" },
  { to: "/finance/$section", label: "Payables", section: "ap" },
  { to: "/finance/$section", label: "Project Costing & WIP", section: "projects" },
  { to: "/finance/$section", label: "WIP & Revenue Recognition", section: "wip" },
  { to: "/finance/$section", label: "Expense Allocation", section: "allocation" },
  { to: "/finance/$section", label: "Project P&L / Balance Sheet", section: "project-pnl" },
  { to: "/finance/$section", label: "Project Closure", section: "project-closure" },
  { to: "/finance/$section", label: "GST · TDS · e-Invoicing", section: "tax" },
  { to: "/finance/$section", label: "TDS Automation", section: "tds" },
  { to: "/finance/$section", label: "Bank & Reconciliation", section: "bank" },
  { to: "/finance/$section", label: "Budgets & Cost Centres", section: "budgets" },
  { to: "/finance/$section", label: "Fixed Assets", section: "assets" },
  { to: "/finance/$section", label: "Profitability", section: "profitability" },
  { to: "/finance/$section", label: "Financial Statements", section: "statements" },
  { to: "/finance/$section", label: "Period Close", section: "close" },
  { to: "/finance/$section", label: "AI Insights", section: "insights" },
  { to: "/finance/$section", label: "AI Copilot", section: "copilot" },
];

function FinanceLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (t: { to: string; exact?: boolean; section?: string }) => {
    const path = t.section ? `/finance/${t.section}` : t.to;
    return t.exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">Finance & Accounting</h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Book · Bill · Reconcile</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Chart of accounts, receivables & payables, project costing & WIP, GST/TDS/e-invoicing, bank reconciliation and manufacturing-aligned financial statements.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/ai-assistant" search={{ q: "Summarise financial position, cash flow forecast and AR ageing" }}>
              <Sparkles className="h-4 w-4 text-primary" /> Ask AI about finance
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
