import { createFileRoute } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/hr")({
  head: () => ({ meta: [{ title: "HR · Faith Automation ERP" }] }),
  component: () => (
    <ModulePlaceholder
      icon={UserCog}
      title="Human Resources"
      description="Employee lifecycle, attendance, timesheets, skills, and project-based resource allocation."
      capabilities={[
        "Employee Master & Org Chart",
        "Attendance & Leave",
        "Project Timesheets",
        "Skill Matrix & Training",
        "Payroll Integration",
        "Performance Reviews",
      ]}
    />
  ),
});
