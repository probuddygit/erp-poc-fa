import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Database, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MASTERS } from "@/lib/mdm/registry";

export const Route = createFileRoute("/_authenticated/masters/")({
  head: () => ({ meta: [{ title: "Master Data · Faith Automation ERP" }] }),
  component: MastersIndex,
});

function MastersIndex() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Layers className="h-3.5 w-3.5" /> Framework
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Master Data Management</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every master inherits the same architecture — list, create, edit, view, approvals,
          activity, attachments, search, filters, bulk upload, import and export — driven by a
          shared metadata registry.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MASTERS.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.key}
              to="/masters/$master"
              params={{ master: m.key }}
              className="group"
            >
              <Card className="h-full border-border/60 transition-all hover:border-primary/40 hover:shadow-elevated">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`grid h-11 w-11 place-items-center rounded-xl ${m.accentClass ?? "bg-primary/10 text-primary"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <CardTitle className="pt-2 text-base">{m.pluralName}</CardTitle>
                  <CardDescription className="line-clamp-2">{m.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-1.5 pt-0">
                  <Badge variant="outline" className="text-[10px]">
                    <Database className="mr-1 h-3 w-3" /> {m.fields.length} fields
                  </Badge>
                  {m.requiresApproval && (
                    <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning text-[10px]">
                      {m.approvalSteps?.length ?? 1}-step approval
                    </Badge>
                  )}
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {m.codePrefix}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
