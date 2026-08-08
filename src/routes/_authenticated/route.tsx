import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { useEffect } from "react";
import { ensureMasterSeeds } from "@/lib/mdm/seed";
import { DemoPill } from "@/components/demo/demo-pill";
import { BuddyWidget } from "@/components/ai/buddy-widget";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  useEffect(() => {
    ensureMasterSeeds();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <AppHeader />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </SidebarInset>
      <DemoPill />
      <BuddyWidget />

    </SidebarProvider>
  );
}
