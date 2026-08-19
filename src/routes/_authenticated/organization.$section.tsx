import { createFileRoute, notFound } from "@tanstack/react-router";
import { CompanyPanel, BranchesPanel } from "@/components/admin/org-sections";

const SECTIONS = ["company", "branches"] as const;
type Section = typeof SECTIONS[number];

const LABELS: Record<Section, string> = { company: "Company", branches: "Branches" };

export const Route = createFileRoute("/_authenticated/organization/$section")({
  head: ({ params }) => ({
    meta: [{ title: `${LABELS[params.section as Section] ?? "Organization"} · Organization Setup` }],
  }),
  beforeLoad: ({ params }) => { if (!SECTIONS.includes(params.section as Section)) throw notFound(); },
  component: OrgSectionPage,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">Section not found.</div>,
});

function OrgSectionPage() {
  const { section } = Route.useParams();
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {section === "company" && <CompanyPanel />}
      {section === "branches" && <BranchesPanel />}
    </div>
  );
}
