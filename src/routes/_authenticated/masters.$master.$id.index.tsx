import { createFileRoute } from "@tanstack/react-router";
import { MasterView } from "@/components/mdm/master-view";
import { findMaster } from "@/lib/mdm/registry";
import { useMasterRecord } from "@/lib/mdm/store";

export const Route = createFileRoute("/_authenticated/masters/$master/$id/")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} · Master Data` }] }),
  component: ViewPage,
});

function ViewPage() {
  const { master, id } = Route.useParams();
  const def = findMaster(master);
  const record = useMasterRecord(master, id);
  if (!def) return <div className="p-6 text-sm text-muted-foreground">Master not found.</div>;
  if (!record) {
    return <div className="p-6 text-sm text-muted-foreground">Record not found.</div>;
  }
  return <MasterView def={def} record={record} />;
}
