import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Download,
  Upload,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCrm, upsertRecord, deleteRecord, nextCode } from "@/lib/crm/store";
import { StatusBadge, fmtCompact, fmtDate, fmtINR, relDate } from "@/components/crm/shared";
import type { EntityKind } from "@/lib/crm/types";
import { cn } from "@/lib/utils";
import { RecordDialog, ConfirmDialog } from "@/components/record-dialog";
import { CRM_SCHEMAS } from "@/lib/crm/schemas";
import { useCrmOptions } from "@/lib/crm/options";
import {
  findDuplicateLeads,
  leadScore,
  opportunityHealth,
  quotationTotals,
  type DealHealth,
  type QuotationTotals,
} from "@/lib/crm/workflow";


const VALID: EntityKind[] = [
  "customers",
  "leads",
  "opportunities",
  "rfqs",
  "proposals",
  "quotations",
  "oas",
  "salesOrders",
];

const TITLES: Record<EntityKind, { title: string; sub: string; codePrefix: string }> = {
  customers: { title: "Customers", sub: "OEM, Tier-1, Tier-2 and EPC accounts", codePrefix: "CUS" },
  leads: { title: "Leads", sub: "Unqualified inbound and outbound demand", codePrefix: "LEAD" },
  opportunities: { title: "Opportunities", sub: "Qualified pipeline with pipeline stage", codePrefix: "OPP" },
  rfqs: { title: "RFQs", sub: "Requests for quotation from customers", codePrefix: "RFQ" },
  proposals: { title: "Proposals", sub: "Technical + commercial proposals", codePrefix: "PRP" },
  quotations: { title: "Quotations", sub: "Priced offers issued to customers", codePrefix: "QUO" },
  oas: { title: "Order Acceptance", sub: "Confirmed orders — auto-provision Projects on approval", codePrefix: "OA" },
  salesOrders: { title: "Sales Orders", sub: "Released orders in execution against projects", codePrefix: "SO" },
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

function exportCSV(rows: Array<Record<string, unknown>>, name: string) {
  if (!rows.length) {
    toast.info("Nothing to export");
    return;
  }
  const cols = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function EntityList() {
  const { entity } = Route.useParams();
  const kind = entity as EntityKind;
  const meta = TITLES[kind];
  const rows = useCrm((s) => s[kind] as unknown as Array<Record<string, unknown>>);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "kanban">(
    kind === "opportunities" ? "kanban" : "table",
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | undefined>();
  const [deleteId, setDeleteId] = useState<string | undefined>();
  const crmOptions = useCrmOptions();


  const [signal, setSignal] = useState<"all" | "hot" | "risk" | "dupes">("all");

  interface RowSignal {
    score?: number;
    dupes?: string[];
    health?: DealHealth;
    totals?: QuotationTotals;
    warn?: string;
  }

  const derived = useMemo(() => {
    const map = new Map<string, RowSignal>();
    if (kind === "leads")
      rows.forEach((r) =>
        map.set(r.id as string, {
          score: leadScore(r),
          dupes: findDuplicateLeads(r).map((d) => d.code),
        }),
      );
    if (kind === "opportunities")
      rows.forEach((r) => map.set(r.id as string, { health: opportunityHealth(r) }));
    if (kind === "quotations")
      rows.forEach((r) => {
        const discount = Number(r.discountPct ?? 0);
        const margin = Number(r.marginPct ?? 22);
        map.set(r.id as string, {
          totals: quotationTotals(r),
          warn:
            discount > 10
              ? `Discount ${discount}% — needs Sales Head approval`
              : margin < 15
                ? `Margin ${margin}% — below the 15% floor`
                : undefined,
        });
      });
    return map;
  }, [rows, kind]);

  const hasSignals = kind === "leads" || kind === "opportunities";

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let out = rows;
    if (t)
      out = out.filter((r) =>
        Object.values(r).some((v) => String(v).toLowerCase().includes(t)),
      );
    if (signal !== "all" && hasSignals) {
      out = out.filter((r) => {
        const d = derived.get(r.id as string);
        if (signal === "hot")
          return kind === "leads" ? (d?.score ?? 0) >= 60 : d?.health?.rag === "green";
        if (signal === "risk")
          return kind === "leads" ? (d?.score ?? 0) < 40 : d?.health?.rag === "red" || d?.health?.stalled;
        return (d?.dupes?.length ?? 0) > 0;
      });
    }
    return out;
  }, [rows, q, signal, derived, kind, hasSignals]);


  const openNew = () => {
    const suggested = nextCode(
      meta.codePrefix,
      rows.map((r) => (r.code as string) ?? ""),
    );
    setEditing({ code: suggested, status: "new", stage: "new", owner: "You" });
    setFormOpen(true);
  };
  const openEdit = (r: Record<string, unknown>) => {
    setEditing(r);
    setFormOpen(true);
  };

  const handleSubmit = (values: Record<string, unknown>) => {
    const payload = { ...(editing ?? {}), ...values };
    if (kind === "leads") {
      const dupes = findDuplicateLeads(payload);
      if (dupes.length && !payload.id) {
        toast.warning(`Possible duplicate of ${dupes.map((d) => d.code).join(", ")}`);
      }
      payload.score = leadScore(payload);
    }
    upsertRecord(kind, payload);
    setFormOpen(false);
    toast.success(editing?.id ? "Updated" : "Created");
  };


  const handleDelete = () => {
    if (!deleteId) return;
    deleteRecord(kind, deleteId);
    toast.success("Deleted");
    setDeleteId(undefined);
  };

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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("Use MDM › Import for CSV bulk load")}
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => exportCSV(filtered, meta.title)}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openNew}>
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
                    <div
                      key={o.id as string}
                      className="group relative rounded-lg bg-background p-3 shadow-sm ring-1 ring-border transition-shadow hover:shadow-md"
                    >
                      <Link
                        to="/crm/$entity/$id"
                        params={{ entity: "opportunities", id: o.id as string }}
                        className="block"
                      >
                        <div className="pr-6 text-sm font-medium leading-tight">{o.name as string}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{o.customerName as string}</div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="font-mono font-semibold">{fmtCompact(o.value as number)}</span>
                          <Badge variant="outline" className="h-4 border-primary/30 px-1.5 text-[10px] text-primary">
                            {o.probability as number}%
                          </Badge>
                        </div>
                      </Link>
                      <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <RowMenu onEdit={() => openEdit(o)} onDelete={() => setDeleteId(o.id as string)} />
                      </div>
                    </div>
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
                  <TableHead className="w-10" />
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <RowMenu
                          onEdit={() => openEdit(r)}
                          onDelete={() => setDeleteId(id)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16 text-center text-sm text-muted-foreground">
                      No records match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <RecordDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing?.id ? `Edit ${meta.title.replace(/s$/, "")}` : `New ${meta.title.replace(/s$/, "")}`}
        description="All fields marked * are required."
        fields={CRM_SCHEMAS[kind]}
        initial={editing}
        dynamicOptions={crmOptions}

        onSubmit={handleSubmit}
        submitLabel={editing?.id ? "Save changes" : "Create"}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(v) => !v && setDeleteId(undefined)}
        title={`Delete ${meta.title.replace(/s$/, "").toLowerCase()}?`}
        message="This will also remove related activities, notes, emails, documents and approvals."
        onConfirm={handleDelete}
      />
    </div>
  );
}

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
