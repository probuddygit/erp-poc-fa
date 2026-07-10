import { createFileRoute, notFound } from "@tanstack/react-router";
import { MasterList } from "@/components/mdm/master-list";
import { findMaster } from "@/lib/mdm/registry";

export const Route = createFileRoute("/_authenticated/masters/$master/")({
  head: ({ params }) => ({
    meta: [{ title: `${params.master} · Master Data` }],
  }),
  loader: ({ params }) => {
    const def = findMaster(params.master);
    if (!def) throw notFound();
    return { def };
  },
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{String(error)}</div>,
  notFoundComponent: () => <div className="p-6 text-sm text-muted-foreground">Master not found.</div>,
  component: ListPage,
});

function ListPage() {
  const { def } = Route.useLoaderData();
  return <MasterList def={def} />;
}
