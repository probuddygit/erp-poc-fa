import { createFileRoute } from "@tanstack/react-router";
import { Factory } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/manufacturing")({
  head: () => ({ meta: [{ title: "Manufacturing · Faith Automation ERP" }] }),
  component: () => (
    <ModulePlaceholder
      icon={Factory}
      title="Manufacturing & Shop Floor"
      description="Work orders, routing, shop floor execution, and real-time OEE for weld, assembly, and machining cells."
      capabilities={[
        "Manufacturing BOM (MBOM)",
        "Routings & Work Centers",
        "Work Order Execution",
        "Shop Floor Terminal (SFT)",
        "OEE & Downtime Tracking",
        "Sub-contracting & Job Work",
      ]}
    />
  ),
});
