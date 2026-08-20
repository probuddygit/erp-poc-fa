import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Wrench,
  ShoppingCart,
  Boxes,
  Factory,
  ShieldCheck,
  Wallet,
  UserCog,
  BarChart3,
  Settings,
  Sparkles,
  Zap,
  Database,
  Receipt,
  Presentation,
  Building2,
  MapPin,
  ChevronDown,
  Home,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; params?: Record<string, string> };

const organizationNav: NavItem[] = [
  { title: "Company", url: "/organization/$section", icon: Building2, params: { section: "company" } },
  { title: "Branches", url: "/organization/$section", icon: MapPin, params: { section: "branches" } },
];

const masterDataNav: NavItem[] = [
  { title: "Master Data", url: "/masters", icon: Database },
];

const configurationsNav: NavItem[] = [
  { title: "Configurations", url: "/administration", icon: Settings },
];

const reportsNav: NavItem[] = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const homeNav: NavItem[] = [
  { title: "Home", url: "/", icon: Home },
];

const businessNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "CRM / Sales", url: "/crm", icon: Users },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Engineering", url: "/engineering", icon: Wrench },
  { title: "Procurement", url: "/procurement", icon: ShoppingCart },
  { title: "Inventory", url: "/inventory", icon: Boxes },
  { title: "Manufacturing", url: "/manufacturing", icon: Factory },
  { title: "Quality", url: "/quality", icon: ShieldCheck },
  { title: "Finance", url: "/finance", icon: Wallet },
  { title: "Workforce & Admin", url: "/hr", icon: UserCog },
  { title: "GST & Compliance", url: "/gst", icon: Receipt },
  { title: "Demo Guide", url: "/demo", icon: Presentation },
];

const STORAGE_KEY = "faith-erp:sidebar-groups";

const SECTIONS = {
  home: { label: "Home", items: homeNav },
  organization: { label: "Organization Setup", items: organizationNav },
  masters: { label: "Master Data", items: masterDataNav },
  configurations: { label: "Configurations", items: configurationsNav },
  reports: { label: "Reports", items: reportsNav },
  business: { label: "Business Operations", items: businessNav },
} as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/");

  const resolveUrl = (item: NavItem) =>
    item.params ? item.url.replace(/\$(\w+)/g, (_m, k: string) => item.params![k] ?? "") : item.url;

  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOpen(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  const setSection = (key: string, value: boolean) => {
    setOpen((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const isOpen = (key: string, hasActive: boolean) => {
    if (collapsed) return true;
    if (hasActive) return true;
    return open[key] ?? true;
  };

  const renderSection = (key: string, label: string, hasActive: boolean, body: ReactNode) => (
    <Collapsible
      key={key}
      open={isOpen(key, hasActive)}
      onOpenChange={(v) => setSection(key, v)}
      className="group/collapsible"
    >
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground/80">
            <span className="truncate">{label}</span>
            <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90" />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>{body}</SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );

  const renderGroup = (key: string, label: string, items: NavItem[]) => {
    const hasActive = items.some((item) => isActive(resolveUrl(item)));
    return renderSection(
      key,
      label,
      hasActive,
      <SidebarMenu>
        {items.map((item) => {
          const resolved = resolveUrl(item);
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(resolved)} tooltip={item.title}>
                <Link to={item.url} params={item.params as never} className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>,
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-sm font-semibold text-sidebar-foreground">
                Faith Automation
              </div>
              <div className="truncate text-[11px] text-sidebar-foreground/60">
                BIW Manufacturing ERP
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {Object.entries(SECTIONS).map(([key, s]) => renderGroup(key, s.label, s.items as unknown as NavItem[]))}

        {renderSection(
          "ai",
          "AI Assistance",
          isActive("/ai-assistant"),
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/ai-assistant")} tooltip="AI Assistant">
                <Link to="/ai-assistant" className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 shrink-0 text-sidebar-primary" />
                  <span className="truncate">ProBuddy AI</span>
                  {!collapsed && (
                    <Badge className="ml-auto h-4 border-0 bg-sidebar-primary/15 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-sidebar-primary">
                      Beta
                    </Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>,
        )}
      </SidebarContent>



      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed ? (
          <div className="px-2 py-1.5 text-[10px] text-sidebar-foreground/50">
            Built by ProBuddy Software · v0.1
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
