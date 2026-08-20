import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, BarChart3, Building2, Database, LayoutDashboard, Settings, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Home · Faith Automation ERP" },
      {
        name: "description",
        content:
          "Faith Automation ERP home: jump straight to Organization Setup, Master Data, Configurations, Reports, Business Operations or AI Assistance.",
      },
      { property: "og:title", content: "Home · Faith Automation ERP" },
      {
        property: "og:description",
        content: "Single launchpad for organization setup, master data, configurations, reports, operations and AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomeLauncher,
});

type Tile = {
  title: string;
  description: string;
  icon: typeof Building2;
  to: string;
  params?: Record<string, string>;
  accent: string;
};

const TILES: Tile[] = [
  {
    title: "Organization Setup",
    description: "Company profile, legal identity, GST registrations and branch network.",
    icon: Building2,
    to: "/organization/$section",
    params: { section: "company" },
    accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    title: "Master Data",
    description: "Governed masters — customers, vendors, employees, assets and more.",
    icon: Database,
    to: "/masters",
    accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    title: "Configurations",
    description: "Users & roles, permissions, approval workflows, numbering and policies.",
    icon: Settings,
    to: "/administration",
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    title: "Reports",
    description: "Cross-module data explorer, drill-down analytics and scheduled exports.",
    icon: BarChart3,
    to: "/reports",
    accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Business Operations",
    description: "Command centre for CRM, projects, engineering, supply chain and finance.",
    icon: LayoutDashboard,
    to: "/dashboard",
    accent: "bg-primary/10 text-primary",
  },
  {
    title: "AI Assistance",
    description: "ProBuddy copilots grounded in your live ERP data across every module.",
    icon: Sparkles,
    to: "/ai-assistant",
    accent: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  },
];

function HomeLauncher() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Faith Automation ERP</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Where would you like to start?</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pick an area to jump straight in. Everything stays one click away from the left navigation.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.title}
              to={t.to}
              params={t.params as never}
              className="group focus-visible:outline-none"
            >
              <Card className="h-full border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated group-focus-visible:border-primary">
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="flex items-start justify-between">
                    <div className={`grid h-16 w-16 place-items-center rounded-2xl ${t.accent}`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <ArrowUpRight className="h-5 w-5 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-display text-lg font-semibold tracking-tight">{t.title}</h2>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
