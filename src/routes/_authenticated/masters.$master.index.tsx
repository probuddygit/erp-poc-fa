import { createFileRoute } from "@tanstack/react-router";
import { MasterList } from "@/components/mdm/master-list";
import { findMaster } from "@/lib/mdm/registry";

export const Route = createFileRoute("/_authenticated/masters/$master/")({
  head: ({ params }) => ({
    meta: [{ title: `${params.master} · Master Data` }],
  }),
  component: ListPage,
});

function ListPage() {
  const { master } = Route.useParams();
  const def = findMaster(master);
  if (!def) return <div className="p-6 text-sm text-muted-foreground">Master not found.</div>;
  return <MasterList def={def} />;
}
