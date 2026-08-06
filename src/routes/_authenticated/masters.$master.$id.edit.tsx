import { createFileRoute } from "@tanstack/react-router";
import { MasterForm } from "@/components/mdm/master-form";
import { findMaster } from "@/lib/mdm/registry";
import { useMasterRecord } from "@/lib/mdm/store";

export const Route = createFileRoute("/_authenticated/masters/$master/$id/edit")({
  head: ({ params }) => ({ meta: [{ title: `Edit ${params.id} · Master Data` }] }),
  component: EditPage,
});

function EditPage() {
  const { master, id } = Route.useParams();
  const def = findMaster(master);
  const record = useMasterRecord(master, id);
  if (!def) return <div className="p-6 text-sm text-muted-foreground">Master not found.</div>;
  if (!record) {
    return <div className="p-6 text-sm text-muted-foreground">Record not found.</div>;
  }
  return <MasterForm def={def} mode="edit" record={record} />;
}
