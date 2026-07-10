import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/crm")({
  head: () => ({ meta: [{ title: "CRM · Faith Automation ERP" }] }),
  component: () => (
    <ModulePlaceholder
      icon={Users}
      title="Customer Relationship Management"
      description="Manage OEM accounts, RFQs, opportunities, quotations, and customer contracts across the sales lifecycle."
      capabilities={[
        "Accounts & Contacts (OEM / Tier-1)",
        "Leads, RFQs & Opportunities",
        "Quotation Builder with Costing",
        "Sales Pipeline Kanban",
        "Contracts & MSA Repository",
        "Customer Portal & Communication Log",
      ]}
    />
  ),
});
