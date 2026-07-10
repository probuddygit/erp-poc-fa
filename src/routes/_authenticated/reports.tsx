import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports · Faith Automation ERP" }] }),
  component: () => (
    <ModulePlaceholder
      icon={BarChart3}
      title="Reports & Analytics"
      description="Cross-module dashboards, saved reports, ad-hoc query builder, and scheduled distribution."
      capabilities={[
        "Executive Dashboards",
        "Operational KPI Reports",
        "Ad-hoc Query Builder",
        "Scheduled Report Delivery",
        "Export to Excel / PDF / CSV",
        "AI-Generated Narratives",
      ]}
    />
  ),
});
