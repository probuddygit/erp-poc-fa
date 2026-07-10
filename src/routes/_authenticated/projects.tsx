import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects · Faith Automation ERP" }] }),
  component: () => (
    <ModulePlaceholder
      icon={FolderKanban}
      title="Project Management"
      description="Plan, execute, and monitor BIW and automation projects end-to-end with WBS, milestones, resources, and financials."
      capabilities={[
        "Project Charter & Setup",
        "Work Breakdown Structure (WBS)",
        "Gantt & Milestone Planning",
        "Resource Loading & Utilization",
        "Project Financials & EVM",
        "Risk & Issue Register",
      ]}
    />
  ),
});
