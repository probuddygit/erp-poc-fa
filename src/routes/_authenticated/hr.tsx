import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  UserCog, Sparkles, LayoutDashboard, Users, CalendarClock, Clock3, GraduationCap, Wallet, Target,
  UserPlus, TrendingUp, BookOpen, HeartHandshake, BadgeIndianRupee, Building2, Plane, HardHat,
  ShieldCheck, FolderKanban, HardHat as HatIcon, Wrench, BarChart3, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/hr")({
  head: () => ({
    meta: [
      { title: "Workforce & Administration · Faith Automation ERP" },
      { name: "description", content: "AI-native workforce suite: recruitment, performance, learning, payroll, administration, safety, compliance and analytics." },
    ],
  }),
  component: WorkforceLayout,
});

interface NavItem { label: string; section?: string; icon: typeof Users }

const CORE: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Core HR — Employees", section: "employees", icon: Users },
  { label: "Attendance & Leave", section: "attendance", icon: CalendarClock },
  { label: "Project Timesheets", section: "timesheets", icon: Clock3 },
  { label: "Skill Matrix & Training", section: "skills", icon: GraduationCap },
  { label: "Payroll Operations", section: "payroll", icon: Wallet },
  { label: "Performance Reviews", section: "reviews", icon: Target },
];

const SUITE: NavItem[] = [
  { label: "Recruitment & Onboarding", section: "recruitment", icon: UserPlus },
  { label: "Performance Management", section: "performance", icon: TrendingUp },
  { label: "Learning & Development", section: "learning", icon: BookOpen },
  { label: "Employee Engagement", section: "engagement", icon: HeartHandshake },
  { label: "Payroll & Compensation", section: "compensation", icon: BadgeIndianRupee },
  { label: "Administration & Facility", section: "administration", icon: Building2 },
  { label: "Travel & Expense", section: "travel", icon: Plane },
  { label: "Safety (EHS)", section: "safety", icon: HardHat },
  { label: "Compliance Management", section: "compliance", icon: ShieldCheck },
  { label: "Document Management", section: "documents", icon: FolderKanban },
  { label: "Contract Labour", section: "contract-labour", icon: Wrench },
  { label: "Analytics & Dashboards", section: "analytics", icon: BarChart3 },
  { label: "AI Copilot", section: "copilot", icon: Bot },
];

function WorkforceLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (i: NavItem) => (i.section ? pathname === `/hr/${i.section}` : pathname === "/hr");

  const NavGroup = ({ label, items }: { label: string; items: NavItem[] }) => (
    <div className="space-y-1">
      <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {items.map((i) => (
        <Link
          key={i.label}
          to={i.section ? "/hr/$section" : "/hr"}
          params={i.section ? { section: i.section } : undefined}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
            isActive(i) ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <i.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{i.label}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-6 lg:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <UserCog className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight">Workforce & Administration</h1>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">AI-Native Suite</Badge>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Recruitment → Onboarding → HR → Performance → Training → Payroll → Administration → Safety → Compliance → Analytics,
                with data flowing seamlessly across every stage.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link to="/ai-assistant" search={{ q: "Give me a workforce overview: headcount, hiring, safety, compliance and administration spend" }}>
              <Sparkles className="h-4 w-4 text-primary" /> Ask AI about people
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b bg-muted/20 p-3 lg:w-64 lg:border-b-0 lg:border-r">
          <div className="space-y-4 lg:sticky lg:top-4">
            <NavGroup label="Core HR" items={CORE} />
            <NavGroup label="Workforce Suite" items={SUITE} />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
