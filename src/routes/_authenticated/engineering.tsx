import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/engineering")({
  head: () => ({ meta: [{ title: "Engineering · Faith Automation ERP" }] }),
  component: () => (
    <ModulePlaceholder
      icon={Wrench}
      title="Engineering & Design"
      description="Manage CAD/BOM, design releases, ECN/ECR workflows, simulation data, and engineering deliverables."
      capabilities={[
        "CAD Vault Integration",
        "Engineering BOM (EBOM)",
        "Design Release Workflow",
        "ECN / ECR Management",
        "Drawing & Document Control",
        "Simulation & Validation Records",
      ]}
    />
  ),
});
