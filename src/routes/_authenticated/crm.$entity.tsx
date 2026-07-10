import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Download, Upload, LayoutGrid, List as ListIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCrm } from "@/lib/crm/store";
import { StatusBadge, fmtCompact, fmtDate, fmtINR, relDate } from "@/components/crm/shared";
import type { EntityKind } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const VALID: EntityKind[] = [
  "customers",
  "leads",
  "opportunities",
  "rfqs",
  "proposals",
  "quotations",
  "oas",
];

const TITLES: Record<EntityKind, { title: string; sub: string; codePrefix: string }> = {
  customers: { title: "Customers", sub: "OEM, Tier-1, Tier-2 and EPC accounts", codePrefix: "CUS" },
  leads: { title: "Leads", sub: "Unqualified inbound and outbound demand", codePrefix: "LEAD" },
  opportunities: { title: "Opportunities", sub: "Qualified pipeline with pipeline stage", codePrefix: "OPP" },
  rfqs: { title: "RFQs", sub: "Requests for quotation from customers", codePrefix: "RFQ" },
  proposals: { title: "Proposals", sub: "Technical + commercial proposals", codePrefix: "PRP" },
  quotations: { title: "Quotations", sub: "Priced offers issued to customers", codePrefix: "QUO" },
  oas: { title: "Order Acceptance", sub: "Confirmed orders — auto-provision Projects on approval", codePrefix: "OA" },
};

const KANBAN_STAGES: Array<{ key: string; label: string; color: string }> = [
  { key: "new", label: "New", color: "border-slate-400" },
  { key: "qualified", label: "Qualified", color: "border-indigo-500" },
  { key: "proposal", label: "Proposal", color: "border-amber-500" },
  { key: "negotiation", label: "Negotiation", color: "border-purple-500" },
  { key: "won", label: "Won", color: "border-emerald-500" },
  { key: "lost", label: "Lost", color: "border-rose-500" },
];

export const Route = createFileRoute("/_authenticated/crm/$entity")({
  beforeLoad: ({ params }) => {
    if (!VALID.includes(params.entity as EntityKind)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [{ title: `${TITLES[params.entity as EntityKind].title} · CRM · Faith Automation` }],
  }),
  component: EntityList,
});

function EntityList() {
  const { entity } = Route.useParams();
  const kind = entity as EntityKind;
  const meta = TITLES[kind];
  const rows = useCrm((s) => s[kind] as Array<Record<string, unknown>>);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "kanban">(
    kind === "opportunities" ? "kanban" : "table",
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(t)),
    );
  }, [rows, q]);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{meta.title}</h2>
          <p className="text-sm text-muted-foreground">{meta.sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 w-56 pl-8"
            />
          </div>
          {kind === "opportunities" && (
            <div className="flex rounded-md border p-0.5">
              <Button
                variant={view === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 gap-1.5 px-2"
                onClick={() => setView("kanban")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
              </Button>
              <Button
                variant={view === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 gap-1.5 px-2"
                onClick={() => setView("table")}
              >
                <ListIcon className="h-3.5 w-3.5" />
                Table
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </div>

      {kind === "opportunities" && view === "kanban" ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {KANBAN_STAGES.map((col) => {
            const items = (filtered as Array<Record<string, unknown>>).filter(
              (r) => r.stage === col.key,
            );
            const total = items.reduce((s, r) => s + (r.value as number), 0);
            return (
              <div key={col.key} className="flex flex-col rounded-xl bg-muted/40 p-3">
                <div className={cn("mb-2 flex items-center justify-between border-l-2 pl-2", col.color)}>
                  <div>
                    <div className="text-sm font-semibold">{col.label}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {items.length} · {fmtCompact(total)}
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {items.map((o) => (
                    <Link
                      key={o.id as string}
                      to="/crm/$entity/$id"
                      params={{ entity: "opportunities", id: o.id as string }}
                      className="block rounded-lg bg-background p-3 shadow-sm ring-1 ring-border transition-shadow hover:shadow-md"
                    >
                      <div className="text-sm font-medium leading-tight">{o.name as string}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{o.customerName as string}</div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold">{fmtCompact(o.value as number)}</span>
                        <Badge variant="outline" className="h-4 border-primary/30 px-1.5 text-[10px] text-primary">
                          {o.probability as number}%
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Code</TableHead>
                  <TableHead>{kind === "customers" ? "Name" : "Title"}</TableHead>
                  {kind !== "customers" && <TableHead>Customer</TableHead>}
                  {"value" in (rows[0] ?? {}) && <TableHead className="text-right">Value</TableHead>}
                  {"estValue" in (rows[0] ?? {}) && <TableHead className="text-right">Est. Value</TableHead>}
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const id = r.id as string;
                  return (
                    <TableRow
                      key={id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({ to: "/crm/$entity/$id", params: { entity: kind, id } })
                      }
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.code as string}
                      </TableCell>
                      <TableCell className="font-medium">
                        {(r.name as string) ?? (r.title as string)}
                      </TableCell>
                      {kind !== "customers" && (
                        <TableCell className="text-sm text-muted-foreground">
                          {r.customerName as string}
                        </TableCell>
                      )}
                      {"value" in r && (
                        <TableCell className="text-right font-mono">
                          {fmtINR(r.value as number)}
                        </TableCell>
                      )}
                      {"estValue" in r && (
                        <TableCell className="text-right font-mono">
                          {fmtINR(r.estValue as number)}
                        </TableCell>
                      )}
                      <TableCell className="text-sm">{(r.owner as string) ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={(r.status as string) ?? (r.stage as string)} />
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {r.createdAt ? relDate(r.createdAt as string) : "—"}
                        <div className="text-[10px]">
                          {r.createdAt ? fmtDate(r.createdAt as string) : ""}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                      No records match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
