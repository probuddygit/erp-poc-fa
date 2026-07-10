import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/quality")({
  head: () => ({ meta: [{ title: "Quality · Faith Automation ERP" }] }),
  component: () => (
    <ModulePlaceholder
      icon={ShieldCheck}
      title="Quality Management"
      description="Inspection plans, incoming/in-process/final QC, non-conformance, CAPA, and calibration."
      capabilities={[
        "Inspection Plans & Checklists",
        "Incoming / In-Process / Final QC",
        "Non-Conformance (NCR)",
        "CAPA & 8D Workflows",
        "Gauge & Instrument Calibration",
        "Supplier Quality Scorecards",
      ]}
    />
  ),
});
