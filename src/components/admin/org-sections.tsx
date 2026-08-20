import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2, MapPin, Pencil, Printer, Plus, Search, MoreHorizontal, Trash2, Eye, CheckCircle2, Power, AlertTriangle,
} from "lucide-react";
import { adminStore, useAdmin, type Company } from "@/lib/admin/store";
import { RecordDialog, ConfirmDialog, type FieldSpec } from "@/components/record-dialog";
import { printRows } from "@/lib/reports/export";
import { AdminCrudTable, type Row } from "@/components/admin/crud-table";

const COMPANY_FIELDS: FieldSpec[] = [
  { name: "legalName", label: "Legal name", type: "text", required: true, colSpan: 2 },
  { name: "name", label: "Short name", type: "text", required: true },
  { name: "code", label: "Company code", type: "text", required: true, placeholder: "e.g. FAITH" },
  { name: "gstin", label: "GSTIN", type: "text" },
  { name: "pan", label: "PAN", type: "text" },
  { name: "cin", label: "CIN", type: "text" },
  { name: "tan", label: "TAN", type: "text" },
  { name: "currency", label: "Base currency", type: "select", options: ["INR", "USD", "EUR"] },
  { name: "fyStart", label: "FY start (MM-DD)", type: "text", placeholder: "04-01" },
  { name: "address", label: "Registered address", type: "textarea", colSpan: 2 },
  { name: "city", label: "City", type: "text" },
  { name: "state", label: "State", type: "text" },
  { name: "pincode", label: "PIN code", type: "text" },
  { name: "email", label: "Contact email", type: "email" },
  { name: "phone", label: "Contact phone", type: "text" },
  { name: "website", label: "Website", type: "text" },
];

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const CIN_RE = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

/** Soft (non-blocking) statutory format warnings for a company. */
function statutoryWarnings(c: Partial<Company>): string[] {
  const w: string[] = [];
  if (c.gstin && !GSTIN_RE.test(String(c.gstin).toUpperCase())) w.push("GSTIN format looks invalid");
  if (c.pan && !PAN_RE.test(String(c.pan).toUpperCase())) w.push("PAN format looks invalid");
  if (c.cin && !CIN_RE.test(String(c.cin).toUpperCase())) w.push("CIN format looks invalid");
  if (c.gstin && c.pan && String(c.gstin).slice(2, 12).toUpperCase() !== String(c.pan).toUpperCase()) {
    w.push("GSTIN does not embed the PAN");
  }
  return w;
}

export function CompanyPanel() {
  const companies = useAdmin((s) => s.companies);
  const activeCompanyId = useAdmin((s) => s.activeCompanyId);
  const branches = useAdmin((s) => s.branches);

  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: "new" | "edit"; record?: Company } | null>(null);
  const [del, setDel] = useState<Company | null>(null);

  const detail = companies.find((c) => c.id === (selectedId ?? activeCompanyId)) ?? companies[0];
  const list = useMemo(
    () => companies.filter((c) =>
      q === "" || [c.code, c.name, c.legalName, c.gstin, c.city, c.state].some((v) => String(v ?? "").toLowerCase().includes(q.toLowerCase()))),
    [companies, q],
  );
  const branchCount = (id: string) => branches.filter((b) => b.companyId === id).length;
  const warnings = detail ? statutoryWarnings(detail) : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" /> Companies
              <Badge variant="secondary" className="text-[10px]">{companies.length}</Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies…" className="h-8 w-56 pl-9" />
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => printRows("Companies", companies as unknown as Row[])}>
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setDialog({ mode: "new" })}>
                <Plus className="h-3.5 w-3.5" /> New company
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Legal name</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Branches</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  data-state={c.id === detail?.id ? "selected" : undefined}
                  onClick={() => setSelectedId(c.id)}
                >
                  <TableCell className="font-mono text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      {c.code}
                      {c.id === activeCompanyId && <Badge variant="outline" className="text-[9px] uppercase">Active</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{c.legalName}</TableCell>
                  <TableCell className="font-mono text-xs">{c.gstin || "—"}</TableCell>
                  <TableCell className="text-xs">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs">{c.currency}</TableCell>
                  <TableCell className="text-right tabular-nums">{branchCount(c.id)}</TableCell>
                  <TableCell>
                    <Badge variant={c.active === false ? "outline" : "secondary"} className="text-[10px]">
                      {c.active === false ? "inactive" : "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedId(c.id)}><Eye className="mr-2 h-4 w-4" /> View profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDialog({ mode: "edit", record: c })}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={c.id === activeCompanyId || c.active === false}
                          onClick={() => { adminStore.setActiveCompany(c.id); toast.success(`${c.code} is now the active company`); }}
                        ><CheckCircle2 className="mr-2 h-4 w-4" /> Set as active</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { adminStore.toggleCompanyActive(c.id); toast.success(c.active === false ? "Company activated" : "Company deactivated"); }}>
                          <Power className="mr-2 h-4 w-4" /> {c.active === false ? "Activate" : "Deactivate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => printRows("Company profile", [c as unknown as Row])}><Printer className="mr-2 h-4 w-4" /> Print</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDel(c)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No companies match your search.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {detail && (
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" /> {detail.legalName}
              <Badge variant="outline" className="font-mono text-[10px]">{detail.code}</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => printRows("Company profile", [detail as unknown as Row])}><Printer className="h-3.5 w-3.5" /> Print</Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setDialog({ mode: "edit", record: detail })}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {warnings.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                {warnings.join(" · ")}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ["Legal Name", detail.legalName], ["Short Name", detail.name], ["GSTIN", detail.gstin], ["PAN", detail.pan],
                ["CIN", detail.cin], ["TAN", detail.tan], ["Base Currency", detail.currency], ["FY Start", detail.fyStart],
                ["Company Code", detail.code], ["Address", detail.address], ["City / State", [detail.city, detail.state].filter(Boolean).join(", ")], ["PIN", detail.pincode],
                ["Email", detail.email], ["Phone", detail.phone], ["Website", detail.website], ["Branches", String(branchCount(detail.id))],
              ] as [string, string | undefined][]).map(([k, v]) => (
                <div key={k} className="rounded-md border p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className="mt-1 text-sm font-medium break-words">{v || "—"}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <RecordDialog
        open={!!dialog}
        onOpenChange={(v) => !v && setDialog(null)}
        title={dialog?.mode === "edit" ? "Edit company" : "New company"}
        description={dialog?.mode === "edit" ? undefined : "Company code must be unique — it stamps every downstream document."}
        fields={COMPANY_FIELDS}
        initial={dialog?.record as unknown as Row | undefined}
        onSubmit={(v) => {
          const patch = { ...v, code: String(v.code ?? "").trim().toUpperCase() } as Partial<Company>;
          const warn = statutoryWarnings(patch);
          if (dialog?.mode === "edit" && dialog.record) {
            adminStore.saveCompany({ ...patch, id: dialog.record.id });
            toast.success("Company updated");
          } else {
            const res = adminStore.addCompany(patch);
            if (res.error) { toast.error(res.error); return; }
            if (res.id) setSelectedId(res.id);
            toast.success(`Company ${patch.code} created`);
          }
          if (warn.length) toast.warning(warn.join(" · "));
          setDialog(null);
        }}
      />

      <ConfirmDialog
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete company?"
        description={`${del?.legalName ?? ""} will be removed from Organization Setup.`}
        onConfirm={() => {
          if (!del) return;
          const res = adminStore.deleteCompany(del.id);
          if (res.error) toast.error(res.error);
          else { toast.success("Company deleted"); setSelectedId(null); }
          setDel(null);
        }}
      />
    </div>
  );
}

const BRANCH_TYPES = ["HQ", "Plant", "Warehouse", "Sales-Office"] as const;

export function BranchesPanel() {
  const companies = useAdmin((s) => s.companies);
  const activeCompanyId = useAdmin((s) => s.activeCompanyId);
  const branches = useAdmin((s) => s.branches);
  const active = companies.find((c) => c.id === activeCompanyId) ?? companies[0];
  const scoped = branches.filter((b) => b.companyId === active?.id);

  const rollup = BRANCH_TYPES.map((t) => {
    const rows = scoped.filter((b) => b.type === t);
    return { type: t, count: rows.length, headcount: rows.reduce((s, b) => s + (b.headcount || 0), 0) };
  });

  const codeToId = new Map(companies.map((c) => [c.code, c.id] as const));
  const idToCode = new Map(companies.map((c) => [c.id, c.code] as const));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rollup.map((r) => (
          <div key={r.type} className="rounded-lg border bg-card p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.type}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-semibold tabular-nums">{r.count}</span>
              <span className="text-xs text-muted-foreground">{r.headcount} people</span>
            </div>
          </div>
        ))}
      </div>

      <AdminCrudTable
        collection="branches"
        title="Branches / Locations"
        icon={<MapPin className="h-4 w-4 text-primary" />}
        searchKeys={["code", "name", "city", "state", "manager", "costCentre"]}
        toggleField="active"
        filter={(r) => r.companyId === active?.id}
        banner={
          <div className="mb-3 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Showing branches for <span className="font-medium text-foreground">{active?.legalName ?? "—"}</span>{" "}
            <span className="font-mono">({active?.code ?? "—"})</span>. Switch the company from the header to see others.
          </div>
        }
        columns={[
          { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
          { key: "name", label: "Name", render: (r) => <span className="font-medium">{String(r.name)}</span> },
          { key: "type", label: "Type", render: (r) => <Badge variant="outline" className="text-[10px]">{String(r.type)}</Badge> },
          { key: "city", label: "Location", render: (r) => <span className="text-xs">{String(r.city)}, {String(r.state)}</span> },
          { key: "gstin", label: "GSTIN", render: (r) => <span className="font-mono text-xs">{String(r.gstin ?? "—")}</span> },
          { key: "costCentre", label: "Cost centre", render: (r) => <span className="font-mono text-xs">{String(r.costCentre ?? "—")}</span> },
          { key: "manager", label: "In-charge", render: (r) => <span className="text-xs">{String(r.manager ?? "—")}</span> },
          { key: "headcount", label: "Headcount", align: "right" },
        ]}
        fields={[
          { name: "companyCode", label: "Company", type: "select", options: companies.map((c) => c.code), required: true },
          { name: "code", label: "Branch code", type: "text", required: true },
          { name: "name", label: "Branch name", type: "text", required: true },
          { name: "type", label: "Type", type: "select", options: [...BRANCH_TYPES], required: true },
          { name: "address", label: "Address", type: "textarea", colSpan: 2 },
          { name: "city", label: "City", type: "text", required: true },
          { name: "state", label: "State", type: "text", required: true },
          { name: "pincode", label: "PIN code", type: "text" },
          { name: "gstin", label: "GSTIN", type: "text" },
          { name: "costCentre", label: "Cost centre code", type: "text" },
          { name: "manager", label: "In-charge / manager", type: "text" },
          { name: "headcount", label: "Headcount", type: "number" },
        ]}
        transformIn={(r) => ({ ...r, companyCode: idToCode.get(String(r.companyId)) ?? active?.code ?? "" })}
        transformOut={(v) => {
          const companyId = codeToId.get(String(v.companyCode ?? "")) ?? active?.id;
          const code = String(v.code ?? "").trim().toUpperCase();
          const clash = branches.some((b) => b.companyId === companyId && b.code.toUpperCase() === code && b.id !== v.id);
          if (clash) toast.warning(`Branch code ${code} already exists for this company`);
          const gstin = String(v.gstin ?? "");
          const co = companies.find((c) => c.id === companyId);
          if (gstin && co?.gstin && gstin.slice(0, 2) !== co.gstin.slice(0, 2) && gstin.slice(2, 12) !== co.gstin.slice(2, 12)) {
            toast.warning("Branch GSTIN does not match the company PAN block");
          }
          const { companyCode: _drop, ...rest } = v;
          void _drop;
          return { ...rest, code, companyId, headcount: Number(v.headcount ?? 0), active: v.active ?? true };
        }}
      />
    </div>
  );
}
