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
  hr: "Human Resources",
  reports: "Reports",
  administration: "Administration",
  "ai-assistant": "AI Assistant",
  profile: "Profile",
  settings: "Settings",
  masters: "Master Data",
  new: "New",
  edit: "Edit",
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

export function AppHeader() {
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
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Search projects, parts, POs…</span>
          <kbd className="ml-auto inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]">
            <CommandIcon className="h-3 w-3" />K
          </kbd>
        </Button>
        <Button variant="ghost" size="icon" className="sm:hidden">
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
