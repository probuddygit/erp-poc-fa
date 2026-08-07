import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComboboxField } from "@/components/combobox-field";
import { fmtINR } from "@/components/crm/shared";
import { useCrm } from "@/lib/crm/store";
import { traceChain } from "@/lib/crm/revenue";

export const Route = createFileRoute("/_authenticated/crm/registers")({
  head: () => ({
    meta: [
      { title: "Sales Registers & Traceability · Faith Automation ERP" },
      {
        name: "description",
        content:
          "Enquiry, RFQ, proposal and sales order registers with end-to-end traceability from lead to project closure.",
      },
      { property: "og:title", content: "Sales Registers & Traceability" },
      { property: "og:description", content: "Registers and lead-to-closure lineage for the revenue lifecycle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegistersPage,
});

interface Row {
  id: string;
  code: string;
  title: string;
  customerName: string;
  value?: number;
  status?: string;
  owner?: string;
  createdAt?: string;
}

function RegisterTable({ entity, rows }: { entity: string; rows: Row[] }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) =>
    `${r.code} ${r.title} ${r.customerName} ${r.status ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search register…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Raised</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">
                  <Link to="/crm/$entity/$id" params={{ entity, id: r.id }} className="hover:underline">
                    {r.code}
                  </Link>
                </TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.customerName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.owner ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{r.value ? fmtINR(r.value) : "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {r.status ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No records in this register yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RegistersPage() {
  const s = useCrm((st) => st);
  const [traceId, setTraceId] = useState("");

  const chain = useMemo(() => (traceId ? traceChain(traceId) : []), [traceId, s]);

  const map = (rows: Array<Record<string, unknown>>): Row[] =>
    rows.map((r) => ({
      id: String(r.id),
      code: String(r.code ?? ""),
      title: String(r.title ?? r.name ?? ""),
      customerName: String(r.customerName ?? ""),
      value: typeof r.value === "number" ? r.value : typeof r.estValue === "number" ? r.estValue : undefined,
      status: r.status as string | undefined,
      owner: r.owner as string | undefined,
      createdAt: r.createdAt as string | undefined,
    }));

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales registers</CardTitle>
          <p className="text-xs text-muted-foreground">
            One searchable ledger per lifecycle stage — every row links back to the source record.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="leads">
            <TabsList className="flex-wrap">
              <TabsTrigger value="leads">Enquiries ({s.leads.length})</TabsTrigger>
              <TabsTrigger value="rfqs">RFQs ({s.rfqs.length})</TabsTrigger>
              <TabsTrigger value="proposals">Proposals ({s.proposals.length})</TabsTrigger>
              <TabsTrigger value="quotations">Quotations ({s.quotations.length})</TabsTrigger>
              <TabsTrigger value="oas">Order acceptance ({s.oas.length})</TabsTrigger>
              <TabsTrigger value="salesOrders">Sales orders ({s.salesOrders.length})</TabsTrigger>
            </TabsList>
            {(
              [
                ["leads", s.leads],
                ["rfqs", s.rfqs],
                ["proposals", s.proposals],
                ["quotations", s.quotations],
                ["oas", s.oas],
                ["salesOrders", s.salesOrders],
              ] as const
            ).map(([key, rows]) => (
              <TabsContent key={key} value={key} className="pt-4">
                <RegisterTable entity={key} rows={map(rows as unknown as Array<Record<string, unknown>>)} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">End-to-end traceability</CardTitle>
          <p className="text-xs text-muted-foreground">
            Pick an order to see the full chain from lead through project execution.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md">
            <ComboboxField
              value={traceId}
              allowCustom={false}
              placeholder="Select an Order Acceptance…"
              options={s.oas.map((o) => ({ value: o.id, label: `${o.code} — ${o.title}`, hint: o.customerName }))}
              onChange={setTraceId}
            />
          </div>
          {Boolean(chain.length) && (
            <div className="flex flex-wrap items-center gap-2">
              {chain.map((n, i) => (
                <div key={`${n.kind}-${n.id}`} className="flex items-center gap-2">
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{n.label}</p>
                    <p className="font-mono text-xs font-medium">{n.code}</p>
                    {n.value ? <p className="text-xs text-muted-foreground">{fmtINR(n.value)}</p> : null}
                    {n.status ? (
                      <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                        {n.status}
                      </Badge>
                    ) : null}
                  </div>
                  {i < chain.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              ))}
            </div>
          )}
          {traceId && !chain.length && (
            <p className="text-sm text-muted-foreground">No lineage recorded for this order yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
