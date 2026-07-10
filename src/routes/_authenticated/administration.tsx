import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/administration")({
  head: () => ({ meta: [{ title: "Administration · Faith Automation ERP" }] }),
  component: () => (
    <ModulePlaceholder
      icon={Settings}
      title="Administration"
      description="Company setup, users and roles, approval workflows, numbering series, and system configuration."
      capabilities={[
        "Company & Branch Setup",
        "Users, Roles & Permissions",
        "Approval Workflow Designer",
        "Numbering Series & Templates",
        "Master Data Governance",
        "Audit Log & System Health",
      ]}
    />
  ),
});
