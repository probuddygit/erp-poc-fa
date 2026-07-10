import { createFileRoute, notFound } from "@tanstack/react-router";
import { MasterView } from "@/components/mdm/master-view";
import { findMaster } from "@/lib/mdm/registry";
import { useMasterRecord } from "@/lib/mdm/store";

export const Route = createFileRoute("/_authenticated/masters/$master/$id/")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} · Master Data` }] }),
  loader: ({ params }) => {
    const def = findMaster(params.master);
    if (!def) throw notFound();
    return { def, id: params.id };
  },
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{String(error)}</div>,
  notFoundComponent: () => <div className="p-6 text-sm text-muted-foreground">Not found.</div>,
  component: ViewPage,
});

function ViewPage() {
  const { def, id } = Route.useLoaderData();
  const record = useMasterRecord(def.key, id);
  if (!record) {
    return <div className="p-6 text-sm text-muted-foreground">Record not found.</div>;
  }
  return <MasterView def={def} record={record} />;
}
