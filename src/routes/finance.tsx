import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/finance")({
  head: () => ({ meta: [{ title: "Finance · Faith Automation ERP" }] }),
  component: () => (
    <ModulePlaceholder
      icon={Wallet}
      title="Finance & Accounting"
      description="Project accounting, GL, AR/AP, GST/e-invoicing, and financial reporting aligned to manufacturing operations."
      capabilities={[
        "Chart of Accounts & GL",
        "Accounts Receivable / Payable",
        "Project Costing & WIP",
        "GST, TDS & e-Invoicing",
        "Bank & Reconciliation",
        "Financial Statements",
      ]}
    />
  ),
});
