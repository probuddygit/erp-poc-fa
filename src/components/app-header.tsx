import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, LogOut, Moon, Search, Settings, Sun, User as UserIcon, Command as CommandIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession, ROLE_LABELS } from "@/hooks/use-session";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";

const labelMap: Record<string, string> = {
  "": "Dashboard",
  crm: "CRM",
  projects: "Projects",
  engineering: "Engineering",
  procurement: "Procurement",
  inventory: "Inventory",
  manufacturing: "Manufacturing",
  quality: "Quality",
  finance: "Finance",
  hr: "Workforce & Administration",
  reports: "Reports",
  administration: "Administration",
  "ai-assistant": "AI Assistant",
  profile: "Profile",
  settings: "Settings",
  masters: "Master Data",
  new: "New",
  edit: "Edit",
  customers: "Customers",
  leads: "Leads",
  opportunities: "Opportunities",
  rfqs: "RFQs",
  proposals: "Proposals",
  quotations: "Quotations",
  oas: "Order Acceptance",
};

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  };
  return { theme, toggle };
}

const SEARCH_TARGETS: Array<{ group: string; label: string; to: string; keywords?: string }> = [
  { group: "Navigation", label: "Dashboard", to: "/" },
  { group: "Navigation", label: "AI Assistant", to: "/ai-assistant", keywords: "copilot ask ai" },
  { group: "CRM", label: "CRM Overview", to: "/crm" },
  { group: "CRM", label: "Leads", to: "/crm/leads" },
  { group: "CRM", label: "Opportunities", to: "/crm/opportunities" },
  { group: "CRM", label: "Quotations", to: "/crm/quotations" },
  { group: "CRM", label: "Order Acceptance", to: "/crm/oas" },
  { group: "Projects", label: "Project Portfolio", to: "/projects" },
  { group: "Engineering", label: "Engineering / PLM", to: "/engineering" },
  { group: "Procurement", label: "Purchase Requisitions", to: "/procurement/pr" },
  { group: "Procurement", label: "Purchase Orders", to: "/procurement/po" },
  { group: "Procurement", label: "GRN & Invoices", to: "/procurement/grn" },
  { group: "Inventory", label: "Stock Position", to: "/inventory/stock" },
  { group: "Inventory", label: "Inventory Overview", to: "/inventory" },
  { group: "Quality", label: "Quality Overview", to: "/quality" },
  { group: "Finance", label: "Finance Overview", to: "/finance" },
  { group: "Finance", label: "GST & Compliance", to: "/gst" },
  { group: "HR", label: "Employees", to: "/hr/employees" },
  { group: "HR", label: "Attendance & Leave", to: "/hr/attendance" },
  { group: "HR", label: "Timesheets", to: "/hr/timesheets", keywords: "hours project task" },
  { group: "HR", label: "Skills & Training", to: "/hr/skills" },
  { group: "HR", label: "Payroll", to: "/hr/payroll", keywords: "payslip salary" },
  { group: "HR", label: "Performance Reviews", to: "/hr/reviews" },
  { group: "Workforce", label: "Recruitment & Onboarding", to: "/hr/recruitment", keywords: "mrf candidate offer" },
  { group: "Workforce", label: "Performance Management", to: "/hr/performance", keywords: "kpi appraisal" },
  { group: "Workforce", label: "Learning & Development", to: "/hr/learning", keywords: "training competency" },
  { group: "Workforce", label: "Employee Engagement", to: "/hr/engagement", keywords: "survey grievance rewards" },
  { group: "Workforce", label: "Payroll & Compensation", to: "/hr/compensation", keywords: "ctc salary structure" },
  { group: "Workforce", label: "Administration & Facility", to: "/hr/administration", keywords: "canteen transport security" },
  { group: "Workforce", label: "Travel & Expense", to: "/hr/travel", keywords: "ticket hotel claim" },
  { group: "Workforce", label: "Safety (EHS)", to: "/hr/safety", keywords: "incident ppe hazard" },
  { group: "Workforce", label: "Compliance Management", to: "/hr/compliance", keywords: "statutory pf esic" },
  { group: "Workforce", label: "Document Management", to: "/hr/documents", keywords: "repository governance" },
  { group: "Workforce", label: "Contract Labour", to: "/hr/contract-labour", keywords: "contractor bill" },
  { group: "Workforce", label: "Workforce Analytics", to: "/hr/analytics", keywords: "dashboard kpi" },
  { group: "Workforce", label: "Workforce AI Copilot", to: "/hr/copilot", keywords: "ai assistant" },
  { group: "Master Data", label: "Master Data Home", to: "/masters" },
  { group: "Master Data", label: "Customers", to: "/masters/customers" },
  { group: "Master Data", label: "Suppliers", to: "/masters/suppliers" },
  { group: "Master Data", label: "Items", to: "/masters/items" },
  { group: "Reports", label: "Reports", to: "/reports" },
  { group: "Administration", label: "Administration", to: "/administration" },
  { group: "Account", label: "Profile", to: "/profile" },
  { group: "Account", label: "Settings", to: "/settings" },
];

function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const groups = Array.from(new Set(SEARCH_TARGETS.map((t) => t.group)));

  const go = (to: string) => {
    onOpenChange(false);
    router.navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search modules, records and settings…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((g) => (
          <CommandGroup key={g} heading={g}>
            {SEARCH_TARGETS.filter((t) => t.group === g).map((t) => (
              <CommandItem
                key={t.to + t.label}
                value={`${t.label} ${t.group} ${t.keywords ?? ""}`}
                onSelect={() => go(t.to)}
              >
                <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>{t.label}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{t.to}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export function AppHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const { user, profile, primaryRole } = useSession();
  const router = useRouter();
  const qc = useQueryClient();

  const displayName =
    profile?.full_name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "User");
  const initials =
    displayName
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
  const roleLabel = primaryRole ? ROLE_LABELS[primaryRole] : "Faith Automation";

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out");
    router.navigate({ to: "/auth", replace: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const segments = pathname.split("/").filter(Boolean);
  const crumbs =
    segments.length === 0
      ? [{ label: "Dashboard", href: "/", last: true }]
      : [
          { label: "Home", href: "/", last: false },
          ...segments.map((seg, i) => ({
            label: labelMap[seg] ?? seg,
            href: "/" + segments.slice(0, i + 1).join("/"),
            last: i === segments.length - 1,
          })),
        ];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-4">
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-5" />

      <Breadcrumb className="hidden md:block">
        <BreadcrumbList>
          {crumbs.map((c, i) => (
            <BreadcrumbItem key={c.href}>
              {c.last ? (
                <BreadcrumbPage className="font-medium">{c.label}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link to={c.href}>{c.label}</Link>
                  </BreadcrumbLink>
                  {i < crumbs.length - 1 && <BreadcrumbSeparator />}
                </>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="hidden h-9 min-w-64 justify-start gap-2 text-muted-foreground sm:flex"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Search projects, parts, POs…</span>
          <kbd className="ml-auto inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]">
            <CommandIcon className="h-3 w-3" />K
          </kbd>
        </Button>
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <ScrollArea className="mt-4 h-[calc(100vh-6rem)] pr-4">
              <div className="space-y-3">
                {[
                  { t: "PO-1042 approved", d: "Procurement · 2m ago", tone: "success" },
                  { t: "QC hold on Weld-Cell 3", d: "Quality · 18m ago", tone: "destructive" },
                  { t: "New RFQ from Tata Motors", d: "CRM · 1h ago", tone: "info" },
                  { t: "Design review scheduled", d: "Engineering · 3h ago", tone: "muted" },
                ].map((n) => (
                  <div key={n.t} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          "h-2 w-2 rounded-full " +
                          (n.tone === "success"
                            ? "bg-success"
                            : n.tone === "destructive"
                              ? "bg-destructive"
                              : n.tone === "info"
                                ? "bg-info"
                                : "bg-muted-foreground")
                        }
                      />
                      <div className="text-sm font-medium">{n.t}</div>
                    </div>
                    <div className="mt-1 pl-4 text-xs text-muted-foreground">{n.d}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 pl-1.5 pr-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight sm:block">
                <div className="text-xs font-semibold">{displayName}</div>
                <div className="text-[10px] text-muted-foreground">{roleLabel}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-semibold">{displayName}</div>
              <div className="truncate text-[11px] font-normal text-muted-foreground">
                {user?.email}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="gap-2">
                <UserIcon className="h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="gap-2">
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function TenantBadge() {
  return (
    <Badge variant="outline" className="gap-1.5 border-accent/40 bg-accent/10 text-accent-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      Single Tenant
    </Badge>
  );
}
