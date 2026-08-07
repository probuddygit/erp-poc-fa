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
import { Badge } from "@/components/ui/badge";

const primaryNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Engineering", url: "/engineering", icon: Wrench },
  { title: "Procurement", url: "/procurement", icon: ShoppingCart },
  { title: "Inventory", url: "/inventory", icon: Boxes },
  { title: "Manufacturing", url: "/manufacturing", icon: Factory },
  { title: "Quality", url: "/quality", icon: ShieldCheck },
  { title: "Finance", url: "/finance", icon: Wallet },
  { title: "HR", url: "/hr", icon: UserCog },
  { title: "GST & Compliance", url: "/gst", icon: Receipt },
];

const secondaryNav = [
  { title: "Master Data", url: "/masters", icon: Database },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Administration", url: "/administration", icon: Settings },
  { title: "Demo Guide", url: "/demo", icon: Presentation },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/");

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
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/ai-assistant")} tooltip="AI Assistant">
                  <Link to="/ai-assistant" className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 shrink-0 text-sidebar-primary" />
                    <span className="truncate">AI Assistant</span>
                    {!collapsed && (
                      <Badge className="ml-auto h-4 border-0 bg-sidebar-primary/15 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-sidebar-primary">
                        Beta
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
