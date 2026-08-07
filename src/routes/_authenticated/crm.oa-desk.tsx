import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtINR } from "@/components/crm/shared";
import { useCrm } from "@/lib/crm/store";
import { approveOAAndProvision } from "@/lib/crm/workflow";
import { financeReviewFor, runFinanceChecks, saveFinanceReview, useRevenue } from "@/lib/crm/revenue";

export const Route = createFileRoute("/_authenticated/crm/oa-desk")({
  head: () => ({
    meta: [
      { title: "Order Acceptance Desk · Faith Automation ERP" },
      {
        name: "description",
        content:
          "Finance validation and bulk approval of Order Acceptances, with automatic sales order and project provisioning.",
      },
      { property: "og:title", content: "Order Acceptance Desk" },
      { property: "og:description", content: "Finance-gated, bulk Order Acceptance processing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OaDeskPage,
});

function OaDeskPage() {
  return <div className="p-8">probe ok</div>;
}
