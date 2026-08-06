import { createFileRoute } from "@tanstack/react-router";
import { MasterForm } from "@/components/mdm/master-form";
import { findMaster } from "@/lib/mdm/registry";

export const Route = createFileRoute("/_authenticated/masters/$master/new")({
  head: ({ params }) => ({ meta: [{ title: `New ${params.master} · Master Data` }] }),
  component: NewPage,
});

function NewPage() {
  const { master } = Route.useParams();
  const def = findMaster(master);
  if (!def) return <div className="p-6 text-sm text-muted-foreground">Master not found.</div>;
  return <MasterForm def={def} mode="create" />;
}
