import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/procurement")({
  head: () => ({ meta: [{ title: "Procurement · Faith Automation ERP" }] }),
  component: () => (
    <ModulePlaceholder
      icon={ShoppingCart}
      title="Procurement & Supply Chain"
      description="Source, negotiate, and buy raw material, bought-outs, and services with full audit and approvals."
      capabilities={[
        "Vendor Master & Qualification",
        "RFQ to PO Workflow",
        "Purchase Requisition Approvals",
        "Purchase Orders & Amendments",
        "Goods Receipt & Invoice Matching",
        "Spend Analytics",
      ]}
    />
  ),
});
