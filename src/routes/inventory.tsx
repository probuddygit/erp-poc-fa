import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory · Faith Automation ERP" }] }),
  component: () => (
    <ModulePlaceholder
      icon={Boxes}
      title="Inventory & Warehousing"
      description="Track stock across stores, project-tagged inventory, batch/serial control, and cycle counts."
      capabilities={[
        "Item Master & UoM",
        "Multi-Store & Bin Locations",
        "Project-Tagged Inventory",
        "Batch, Serial & Lot Tracking",
        "Stock Transfers & Adjustments",
        "Cycle Count & Reconciliation",
      ]}
    />
  ),
});
