import { createFileRoute, notFound } from "@tanstack/react-router";
import { MasterForm } from "@/components/mdm/master-form";
import { findMaster } from "@/lib/mdm/registry";

export const Route = createFileRoute("/_authenticated/masters/$master/new")({
  head: ({ params }) => ({ meta: [{ title: `New ${params.master} · Master Data` }] }),
  loader: ({ params }) => {
    const def = findMaster(params.master);
    if (!def) throw notFound();
    return { def };
  },
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{String(error)}</div>,
  notFoundComponent: () => <div className="p-6 text-sm text-muted-foreground">Master not found.</div>,
  component: NewPage,
});

function NewPage() {
  const { def } = Route.useLoaderData();
  return <MasterForm def={def} mode="create" />;
}
