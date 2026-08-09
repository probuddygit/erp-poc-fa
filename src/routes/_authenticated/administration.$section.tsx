import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2, Users, Workflow, Hash, ShieldCheck, Search, Plus, MapPin, KeyRound,
  CheckCircle2, XCircle, AlertTriangle, Pencil, Trash2, Download, Printer, Mail, Upload,
  MoreHorizontal, Bell, FileText, Gavel, Sparkles, Plug, Lock, SlidersHorizontal, DatabaseBackup,
  FileSpreadsheet, RotateCcw,
} from "lucide-react";
import { adminStore, useAdmin, ADMIN_ROLES } from "@/lib/admin/store";
import type { AdminRole, AdminState } from "@/lib/admin/store";
import { StatusPill, shortDate, fmtINR } from "@/components/projects/shared";
import { RecordDialog, ConfirmDialog, type FieldSpec } from "@/components/record-dialog";
import { exportCsvRows, exportExcelRows, exportPdfRows, printRows, emailRows, parseCsv, readFileText } from "@/lib/reports/export";
import { cn } from "@/lib/utils";

const SECTIONS = [
  "company", "users", "permissions", "workflows", "numbering", "governance",
  "notifications", "templates", "rules", "ai", "integrations", "security", "system", "audit",
] as const;
type Section = typeof SECTIONS[number];

const LABELS: Record<Section, string> = {
  company: "Company & Branches", users: "Users & Roles", permissions: "Permission Matrix",
  workflows: "Approval Workflows", numbering: "Numbering Series", governance: "Master Data Governance",
  notifications: "Notification Settings", templates: "Email & Document Templates", rules: "Business Rules",
  ai: "AI Configuration", integrations: "Integration Settings", security: "Security Policies",
  system: "System Configuration", audit: "Audit & Health",
};

export const Route = createFileRoute("/_authenticated/administration/$section")({
  head: ({ params }) => ({ meta: [{ title: `${LABELS[params.section as Section] ?? "Administration"} · Administration` }] }),
  beforeLoad: ({ params }) => { if (!SECTIONS.includes(params.section as Section)) throw notFound(); },
  component: SectionPage,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">Section not found.</div>,
});

function SectionPage() {
  const { section } = Route.useParams();
  const s = section as Section;
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {s === "company" && <Company />}
      {s === "users" && <UsersRoles />}
      {s === "permissions" && <PermissionMatrix />}
      {s === "workflows" && <Workflows />}
      {s === "numbering" && <Numbering />}
      {s === "governance" && <Governance />}
      {s === "notifications" && <Notifications />}
      {s === "templates" && <Templates />}
      {s === "rules" && <Rules />}
      {s === "ai" && <AiSettings />}
      {s === "integrations" && <Integrations />}
      {s === "security" && <Security />}
      {s === "system" && <SystemConfig />}
      {s === "audit" && <AuditHealth />}
    </div>
  );
}

/* ------------------------------------------------------------ shared table */

type Row = Record<string, unknown>;
interface Col { key: string; label: string; align?: "right"; render?: (r: Row) => ReactNode; }

function ToolBar({
  title, icon, rows, onNew, onImport, extra,
}: {
  title: string; icon: ReactNode; rows: Row[]; onNew?: () => void;
  onImport?: (rows: Row[]) => void; extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <CardTitle className="flex items-center gap-2 text-sm">{icon} {title}</CardTitle>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        {onImport && (
          <Button
            size="sm" variant="outline" className="h-8 gap-1.5"
            onClick={async () => {
              const f = await readFileText(".csv");
              if (!f) return;
              const parsed = parseCsv(f.text);
              onImport(parsed);
              toast.success(`${parsed.length} rows imported`);
            }}
          ><Upload className="h-3.5 w-3.5" /> Import</Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportCsvRows(title, rows)}><FileText className="mr-2 h-4 w-4" /> CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportExcelRows(title, rows)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportPdfRows(title, rows)}><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => printRows(title, rows)}><Printer className="mr-2 h-4 w-4" /> Print</DropdownMenuItem>
            <DropdownMenuItem onClick={() => emailRows(title, rows)}><Mail className="mr-2 h-4 w-4" /> Email</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {onNew && <Button size="sm" className="h-8 gap-1.5" onClick={onNew}><Plus className="h-3.5 w-3.5" /> New</Button>}
      </div>
    </div>
  );
}

/** Generic CRUD table over an admin collection. */
function AdminCrudTable({
  collection, title, icon, columns, fields, searchKeys, toggleField, transformIn, transformOut,
}: {
  collection: keyof AdminState;
  title: string;
  icon: ReactNode;
  columns: Col[];
  fields: FieldSpec[];
  searchKeys: string[];
  toggleField?: string;
  transformIn?: (r: Row) => Row;
  transformOut?: (v: Row) => Row;
}) {
  const data = useAdmin((s) => s[collection]) as unknown as Row[];
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [edit, setEdit] = useState<{ record?: Row } | null>(null);
  const [del, setDel] = useState<{ ids: string[]; label: string } | null>(null);

  const list = data.filter((r) =>
    q === "" || searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q.toLowerCase()))
  );
  const allSelected = list.length > 0 && list.every((r) => sel.includes(r.id as string));

  return (
    <Card>
      <CardHeader className="pb-2">
        <ToolBar
          title={title}
          icon={icon}
          rows={list}
          onNew={() => setEdit({})}
          onImport={(rows) => rows.forEach((r) => adminStore.upsert(collection as never, r))}
          extra={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-8 w-56 pl-9" />
            </div>
          }
        />
        {sel.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
            <span className="text-xs text-muted-foreground">{sel.length} selected</span>
            <Button size="sm" variant="outline" className="h-7" onClick={() => exportExcelRows(`${title}-selection`, data.filter((r) => sel.includes(r.id as string)))}>Export</Button>
            {toggleField && (
              <>
                <Button size="sm" variant="outline" className="h-7" onClick={() => { sel.forEach((id) => { const r = data.find((x) => x.id === id); if (r && !r[toggleField]) adminStore.toggleField(collection as never, id, toggleField); }); toast.success("Activated"); }}>Activate</Button>
                <Button size="sm" variant="outline" className="h-7" onClick={() => { sel.forEach((id) => { const r = data.find((x) => x.id === id); if (r && r[toggleField]) adminStore.toggleField(collection as never, id, toggleField); }); toast.success("Deactivated"); }}>Deactivate</Button>
              </>
            )}
            <Button size="sm" variant="destructive" className="h-7" onClick={() => setDel({ ids: sel, label: `${sel.length} records` })}>Delete</Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox checked={allSelected} onCheckedChange={(v) => setSel(v ? list.map((r) => r.id as string) : [])} aria-label="Select all" />
              </TableHead>
              {columns.map((c) => <TableHead key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.label}</TableHead>)}
              {toggleField && <TableHead className="text-right">Active</TableHead>}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id as string}>
                <TableCell>
                  <Checkbox
                    checked={sel.includes(r.id as string)}
                    onCheckedChange={(v) => setSel((s) => v ? [...s, r.id as string] : s.filter((x) => x !== r.id))}
                    aria-label="Select row"
                  />
                </TableCell>
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.align === "right" ? "text-right tabular-nums" : ""}>
                    {c.render ? c.render(r) : String(r[c.key] ?? "—")}
                  </TableCell>
                ))}
                {toggleField && (
                  <TableCell className="text-right">
                    <Switch checked={Boolean(r[toggleField])} onCheckedChange={() => adminStore.toggleField(collection as never, r.id as string, toggleField)} />
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEdit({ record: transformIn ? transformIn(r) : r })}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const { id: _id, ...rest } = r; void _id; adminStore.upsert(collection as never, { ...rest, name: `${String(r.name ?? r.code ?? "Copy")} (copy)` }); toast.success("Duplicated"); }}><Plus className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => printRows(title, [r])}><Printer className="mr-2 h-4 w-4" /> Print</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDel({ ids: [r.id as string], label: String(r.name ?? r.code ?? "record") })}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow><TableCell colSpan={columns.length + 3} className="py-10 text-center text-sm text-muted-foreground">No records.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <RecordDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title={edit?.record ? `Edit ${title}` : `New ${title}`}
        fields={fields}
        initial={edit?.record}
        onSubmit={(values) => {
          const payload = transformOut ? transformOut(values) : values;
          adminStore.upsert(collection as never, { ...(edit?.record ?? {}), ...payload });
          toast.success(edit?.record ? "Saved" : "Created");
          setEdit(null);
        }}
      />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete record?"
        message={del ? `“${del.label}” will be permanently removed.` : ""}
        onConfirm={() => { if (del) { adminStore.remove(collection as never, del.ids); setSel([]); toast.success("Deleted"); } setDel(null); }}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ Company */

function Company() {
  const s = useAdmin((x) => x);
  const co = s.companies[0];
  const [editCo, setEditCo] = useState(false);
  if (!co) return null;

  const coFields: FieldSpec[] = [
    { name: "legalName", label: "Legal name", type: "text", required: true, colSpan: 2 },
    { name: "name", label: "Short name", type: "text", required: true },
    { name: "code", label: "Company code", type: "text", required: true },
    { name: "gstin", label: "GSTIN", type: "text" },
    { name: "pan", label: "PAN", type: "text" },
    { name: "cin", label: "CIN", type: "text" },
    { name: "currency", label: "Base currency", type: "select", options: ["INR", "USD", "EUR"] },
    { name: "fyStart", label: "FY start (MM-DD)", type: "text" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-primary" /> Company</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => printRows("Company profile", [co as unknown as Row])}><Printer className="h-3.5 w-3.5" /> Print</Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setEditCo(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["Legal Name", co.legalName], ["Short Name", co.name], ["GSTIN", co.gstin], ["PAN", co.pan],
            ["CIN", co.cin], ["Base Currency", co.currency], ["FY Start", co.fyStart], ["Company Code", co.code],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="rounded-md border p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="mt-1 text-sm font-medium">{v}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AdminCrudTable
        collection="branches"
        title="Branches / Locations"
        icon={<MapPin className="h-4 w-4 text-primary" />}
        searchKeys={["code", "name", "city", "state"]}
        toggleField="active"
        columns={[
          { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
          { key: "name", label: "Name", render: (r) => <span className="font-medium">{String(r.name)}</span> },
          { key: "type", label: "Type", render: (r) => <Badge variant="outline" className="text-[10px]">{String(r.type)}</Badge> },
          { key: "city", label: "Location", render: (r) => <span className="text-xs">{String(r.city)}, {String(r.state)}</span> },
          { key: "gstin", label: "GSTIN", render: (r) => <span className="font-mono text-xs">{String(r.gstin)}</span> },
          { key: "headcount", label: "Headcount", align: "right" },
        ]}
        fields={[
          { name: "code", label: "Branch code", type: "text", required: true },
          { name: "name", label: "Branch name", type: "text", required: true },
          { name: "type", label: "Type", type: "select", options: ["HQ", "Plant", "Warehouse", "Sales-Office"], required: true },
          { name: "city", label: "City", type: "text", required: true },
          { name: "state", label: "State", type: "text", required: true },
          { name: "gstin", label: "GSTIN", type: "text" },
          { name: "headcount", label: "Headcount", type: "number" },
        ]}
        transformOut={(v) => ({ ...v, companyId: co.id, headcount: Number(v.headcount ?? 0), active: true })}
      />

      <RecordDialog
        open={editCo}
        onOpenChange={setEditCo}
        title="Edit company"
        fields={coFields}
        initial={co as unknown as Row}
        onSubmit={(v) => { adminStore.saveCompany(v as never); toast.success("Company updated"); setEditCo(false); }}
      />
    </div>
  );
}

/* -------------------------------------------------------------- Users/Roles */

const ROLE_COLORS: Record<AdminRole, string> = {
  Admin: "border-primary/50 text-primary",
  Executives: "border-amber-500/50 text-amber-600",
  Sales: "border-emerald-500/50 text-emerald-600",
  Projects: "border-blue-500/50 text-blue-600",
  Engineering: "border-violet-500/50 text-violet-600",
  Purchase: "border-cyan-500/50 text-cyan-600",
  Stores: "border-slate-500/50 text-slate-600",
  Production: "border-orange-500/50 text-orange-600",
  Quality: "border-rose-500/50 text-rose-600",
  Finance: "border-teal-500/50 text-teal-600",
  HR: "border-pink-500/50 text-pink-600",
};

function RoleChips({ roles }: { roles: AdminRole[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => <Badge key={r} variant="outline" className={cn("text-[10px]", ROLE_COLORS[r])}>{r}</Badge>)}
    </div>
  );
}

function UsersRoles() {
  const users = useAdmin((s) => s.users);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("all");
  const [roleEdit, setRoleEdit] = useState<string | null>(null);

  const list = users.filter((u) =>
    (role === "all" || u.roles.includes(role as AdminRole)) &&
    (q === "" || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
  );
  const target = users.find((u) => u.id === roleEdit);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="w-64 pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setRole("all")} className={cn("rounded-md border px-2 py-1 text-xs", role === "all" ? "border-primary text-primary" : "text-muted-foreground")}>All</button>
          {ADMIN_ROLES.map((r) => (
            <button key={r} onClick={() => setRole(r)} className={cn("rounded-md border px-2 py-1 text-xs", role === r ? "border-primary text-primary" : "text-muted-foreground")}>{r}</button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{list.length} of {users.length} users</span>
      </div>

      <AdminCrudTable
        collection="users"
        title="Users"
        icon={<Users className="h-4 w-4 text-primary" />}
        searchKeys={["name", "email", "department"]}
        columns={[
          { key: "name", label: "User", render: (r) => (<div><div className="font-medium">{String(r.name)}</div><div className="text-[11px] text-muted-foreground">{String(r.email)}</div></div>) },
          { key: "department", label: "Department" },
          {
            key: "roles", label: "Roles", render: (r) => (
              <button className="text-left" onClick={() => setRoleEdit(r.id as string)}>
                <RoleChips roles={(r.roles as AdminRole[]) ?? []} />
              </button>
            ),
          },
          { key: "mfa", label: "MFA", render: (r) => r.mfa ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><KeyRound className="h-3.5 w-3.5" /> On</span> : <span className="text-xs text-muted-foreground">Off</span> },
          { key: "lastLogin", label: "Last login", render: (r) => <span className="text-xs">{r.lastLogin ? shortDate(String(r.lastLogin)) : "—"}</span> },
          { key: "status", label: "Status", render: (r) => <StatusPill status={String(r.status)} /> },
        ]}
        fields={[
          { name: "name", label: "Full name", type: "text", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "department", label: "Department", type: "text" },
          { name: "rolesText", label: "Roles (comma separated)", type: "text", colSpan: 2, placeholder: "Sales, Projects" },
          { name: "status", label: "Status", type: "select", options: ["active", "invited", "disabled"] },
        ]}
        transformIn={(r) => ({ ...r, rolesText: ((r.roles as AdminRole[]) ?? []).join(", ") })}
        transformOut={({ rolesText, ...v }) => ({
          ...v,
          roles: String(rolesText ?? "").split(",").map((x) => x.trim()).filter((x) => ADMIN_ROLES.includes(x as AdminRole)) as AdminRole[],
          mfa: false, lastLogin: "",
        })}
      />

      <RecordDialog
        open={!!target}
        onOpenChange={(v) => !v && setRoleEdit(null)}
        title={target ? `Roles — ${target.name}` : "Roles"}
        fields={[{ name: "rolesText", label: "Roles (comma separated)", type: "text", colSpan: 2 }]}
        initial={target ? { rolesText: target.roles.join(", ") } : undefined}
        onSubmit={(v) => {
          if (!target) return;
          adminStore.setUserRoles(target.id, String(v.rolesText ?? "").split(",").map((x) => x.trim()).filter((x) => ADMIN_ROLES.includes(x as AdminRole)) as AdminRole[]);
          toast.success("Roles updated");
          setRoleEdit(null);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------- Permission matrix */

function PermissionMatrix() {
  const permissions = useAdmin((s) => s.permissions);
  const modules = Array.from(new Set(permissions.map((p) => p.module)));
  const rows = permissions.map((p) => ({ module: p.module, action: p.action, roles: p.roles.join("; ") }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <ToolBar
          title="Role → module permission matrix"
          icon={<ShieldCheck className="h-4 w-4 text-primary" />}
          rows={rows}
          extra={<Badge variant="outline" className="text-[10px] uppercase">{modules.length} modules · {ADMIN_ROLES.length} roles</Badge>}
        />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">Module</TableHead>
              <TableHead>Action</TableHead>
              {ADMIN_ROLES.map((r) => <TableHead key={r} className="text-center text-[10px] uppercase">{r}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="sticky left-0 bg-background font-medium">{p.module}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] uppercase">{p.action}</Badge></TableCell>
                {ADMIN_ROLES.map((r) => {
                  const on = p.roles.includes(r);
                  return (
                    <TableCell key={r} className="text-center">
                      <Checkbox
                        checked={on}
                        aria-label={`${p.module} ${p.action} ${r}`}
                        onCheckedChange={(v) => adminStore.setPermissionRoles(p.id, v ? [...p.roles, r] : p.roles.filter((x) => x !== r))}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- Workflows */

function Workflows() {
  const workflows = useAdmin((s) => s.workflows);
  const [edit, setEdit] = useState<{ record?: Row } | null>(null);
  const [del, setDel] = useState<{ id: string; label: string } | null>(null);

  const parseSteps = (text: string) =>
    text.split("\n").map((line, i) => {
      const [role, sla, th] = line.split("|").map((x) => x.trim());
      return { level: i + 1, role: (role || "Admin") as AdminRole, slaHours: Number(sla || 24), ...(th ? { thresholdInr: Number(th) } : {}) };
    }).filter((s) => s.role);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">Approval routing per business object. Thresholds trigger additional steps.</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => exportExcelRows("approval-workflows", workflows.map((w) => ({ code: w.code, name: w.name, object: w.object, steps: w.steps.map((s) => `L${s.level} ${s.role} ${s.slaHours}h`).join(" → "), active: w.active })))}><Download className="h-3.5 w-3.5" /> Export</Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setEdit({})}><Plus className="h-3.5 w-3.5" /> New workflow</Button>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {workflows.map((w) => (
          <Card key={w.id} className={cn(!w.active && "opacity-70")}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm"><Workflow className="h-4 w-4 text-primary" /> {w.name}</CardTitle>
                  <div className="mt-1 text-[11px] text-muted-foreground">{w.code} · object: {w.object}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={w.active} onCheckedChange={() => adminStore.toggleWorkflow(w.id)} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEdit({ record: { ...w, stepsText: w.steps.map((s) => `${s.role} | ${s.slaHours} | ${s.thresholdInr ?? ""}`).join("\n") } as unknown as Row })}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { adminStore.saveWorkflow({ ...w, id: undefined, code: `${w.code}-C`, name: `${w.name} (copy)` }); toast.success("Duplicated"); }}><Plus className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => printRows(w.name, w.steps.map((s) => ({ level: s.level, role: s.role, slaHours: s.slaHours, threshold: s.thresholdInr ?? "—" })), undefined, `${w.code} · ${w.object}`)}><Printer className="mr-2 h-4 w-4" /> Print</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDel({ id: w.id, label: w.name })}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {w.steps.map((step) => (
                  <li key={step.level} className="flex items-center gap-3 rounded-md border p-2.5">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">L{step.level}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{step.role}</div>
                      <div className="text-[11px] text-muted-foreground">
                        SLA {step.slaHours}h {step.thresholdInr ? `· triggers above ${fmtINR(step.thresholdInr)}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>

      <RecordDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title={edit?.record ? "Edit workflow" : "New workflow"}
        description="One approval step per line: Role | SLA hours | Threshold (optional)"
        fields={[
          { name: "code", label: "Workflow code", type: "text", required: true },
          { name: "name", label: "Name", type: "text", required: true },
          { name: "object", label: "Business object", type: "text", required: true },
          { name: "stepsText", label: "Steps", type: "textarea", colSpan: 2, placeholder: "Purchase | 8 |\nFinance | 16 | 1000000" },
        ]}
        initial={edit?.record}
        onSubmit={(v) => {
          adminStore.saveWorkflow({
            ...(edit?.record ? { id: (edit.record as { id: string }).id } : {}),
            code: String(v.code), name: String(v.name), object: String(v.object),
            steps: parseSteps(String(v.stepsText ?? "")),
          });
          toast.success(edit?.record ? "Workflow updated" : "Workflow created");
          setEdit(null);
        }}
      />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete workflow?"
        message={del ? `“${del.label}” approval routing will be removed.` : ""}
        onConfirm={() => { if (del) { adminStore.remove("workflows", [del.id]); toast.success("Workflow deleted"); } setDel(null); }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- Numbering */

function Numbering() {
  return (
    <AdminCrudTable
      collection="series"
      title="Numbering series"
      icon={<Hash className="h-4 w-4 text-primary" />}
      searchKeys={["object", "prefix"]}
      toggleField="active"
      columns={[
        { key: "object", label: "Object", render: (r) => <span className="font-medium">{String(r.object)}</span> },
        { key: "prefix", label: "Prefix", render: (r) => <span className="font-mono text-xs">{String(r.prefix)}</span> },
        { key: "padding", label: "Padding", render: (r) => <span className="text-xs">{String(r.padding)} digits</span> },
        { key: "next", label: "Next #", align: "right" },
        { key: "example", label: "Example", render: (r) => <span className="font-mono text-xs">{String(r.example)}</span> },
        { key: "resetFreq", label: "Reset", render: (r) => <Badge variant="outline" className="text-[10px] uppercase">{String(r.resetFreq)}</Badge> },
      ]}
      fields={[
        { name: "object", label: "Business object", type: "text", required: true },
        { name: "prefix", label: "Prefix", type: "text", required: true },
        { name: "padding", label: "Padding digits", type: "number", required: true },
        { name: "next", label: "Next number", type: "number", required: true },
        { name: "resetFreq", label: "Reset frequency", type: "select", options: ["never", "yearly", "monthly"] },
      ]}
      transformOut={(v) => {
        const padding = Number(v.padding ?? 4);
        const next = Number(v.next ?? 1);
        return { ...v, padding, next, example: `${String(v.prefix)}-${String(next).padStart(padding, "0")}`, active: true };
      }}
    />
  );
}

/* --------------------------------------------------------------- Governance */

function Governance() {
  const governance = useAdmin((s) => s.governance);
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => exportExcelRows("mdm-governance", governance as unknown as Row[])}><Download className="h-3.5 w-3.5" /> Export</Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => printRows("Master data governance", governance as unknown as Row[])}><Printer className="h-3.5 w-3.5" /> Print</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {governance.map((g) => (
          <Card key={g.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-primary" /> {g.entity}</CardTitle>
                <span className={cn("font-display text-lg font-semibold tabular-nums",
                  g.qualityScore >= 95 ? "text-emerald-600" : g.qualityScore >= 85 ? "text-amber-600" : "text-rose-600")}>{g.qualityScore}%</span>
              </div>
              <div className="text-[11px] text-muted-foreground">Data owner: {g.owner}</div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {([["Duplicate prevention", "dedupe"], ["Approval on create/edit", "approval"], ["Change audit trail", "changeAudit"]] as const).map(([label, key]) => (
                <div key={key} className="flex items-center justify-between rounded-md border p-2">
                  <span>{label}</span>
                  <div className="flex items-center gap-2">
                    {g[key] ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                    <Switch checked={g[key]} onCheckedChange={() => adminStore.toggleField("governance", g.id, key)} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Notifications */

function Notifications() {
  return (
    <AdminCrudTable
      collection="notifications"
      title="Notification rules"
      icon={<Bell className="h-4 w-4 text-primary" />}
      searchKeys={["event", "module", "recipients"]}
      toggleField="active"
      columns={[
        { key: "event", label: "Event", render: (r) => <span className="font-medium">{String(r.event)}</span> },
        { key: "module", label: "Module" },
        { key: "channels", label: "Channels", render: (r) => (<div className="flex gap-1">{((r.channels as string[]) ?? []).map((c) => <Badge key={c} variant="outline" className="text-[10px] uppercase">{c}</Badge>)}</div>) },
        { key: "recipients", label: "Recipients", render: (r) => <span className="text-xs text-muted-foreground">{String(r.recipients)}</span> },
      ]}
      fields={[
        { name: "event", label: "Trigger event", type: "text", required: true, colSpan: 2 },
        { name: "module", label: "Module", type: "text", required: true },
        { name: "channelsText", label: "Channels (comma separated)", type: "text", placeholder: "email, in-app" },
        { name: "recipients", label: "Recipients (roles)", type: "text", colSpan: 2 },
      ]}
      transformIn={(r) => ({ ...r, channelsText: ((r.channels as string[]) ?? []).join(", ") })}
      transformOut={({ channelsText, ...v }) => ({ ...v, channels: String(channelsText ?? "email").split(",").map((x) => x.trim()).filter(Boolean), active: true })}
    />
  );
}

/* ----------------------------------------------------------------- Templates */

function Templates() {
  return (
    <div className="space-y-4">
      <AdminCrudTable
        collection="emailTemplates"
        title="Email templates"
        icon={<Mail className="h-4 w-4 text-primary" />}
        searchKeys={["code", "name", "subject", "module"]}
        toggleField="active"
        columns={[
          { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
          { key: "name", label: "Template", render: (r) => <span className="font-medium">{String(r.name)}</span> },
          { key: "module", label: "Module" },
          { key: "subject", label: "Subject", render: (r) => <span className="text-xs text-muted-foreground">{String(r.subject)}</span> },
        ]}
        fields={[
          { name: "code", label: "Code", type: "text", required: true },
          { name: "name", label: "Template name", type: "text", required: true },
          { name: "module", label: "Module", type: "text" },
          { name: "subject", label: "Subject", type: "text", required: true, colSpan: 2 },
          { name: "body", label: "Body", type: "textarea", colSpan: 2 },
        ]}
        transformOut={(v) => ({ ...v, active: true })}
      />
      <AdminCrudTable
        collection="docTemplates"
        title="Document templates"
        icon={<FileText className="h-4 w-4 text-primary" />}
        searchKeys={["code", "name", "object"]}
        toggleField="active"
        columns={[
          { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
          { key: "name", label: "Layout", render: (r) => <span className="font-medium">{String(r.name)}</span> },
          { key: "object", label: "Object" },
          { key: "terms", label: "Default terms", render: (r) => <span className="line-clamp-1 text-xs text-muted-foreground">{String(r.terms)}</span> },
        ]}
        fields={[
          { name: "code", label: "Code", type: "text", required: true },
          { name: "name", label: "Layout name", type: "text", required: true },
          { name: "object", label: "Business object", type: "text", required: true },
          { name: "header", label: "Header text", type: "text", colSpan: 2 },
          { name: "footer", label: "Footer text", type: "text", colSpan: 2 },
          { name: "terms", label: "Default terms", type: "textarea", colSpan: 2 },
        ]}
        transformOut={(v) => ({ ...v, active: true })}
      />
    </div>
  );
}

/* --------------------------------------------------------------------- Rules */

function Rules() {
  return (
    <AdminCrudTable
      collection="rules"
      title="Business rules"
      icon={<Gavel className="h-4 w-4 text-primary" />}
      searchKeys={["code", "name", "module", "condition"]}
      toggleField="active"
      columns={[
        { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs">{String(r.code)}</span> },
        { key: "name", label: "Rule", render: (r) => <span className="font-medium">{String(r.name)}</span> },
        { key: "module", label: "Module" },
        { key: "condition", label: "Condition", render: (r) => <span className="text-xs text-muted-foreground">{String(r.condition)}</span> },
        { key: "action", label: "Action", render: (r) => <span className="text-xs">{String(r.action)}</span> },
        {
          key: "severity", label: "Severity", render: (r) => (
            <Badge variant="outline" className={cn("text-[10px] uppercase",
              r.severity === "block" ? "border-rose-500/40 text-rose-600" : r.severity === "warn" ? "border-amber-500/40 text-amber-600" : "")}>
              {String(r.severity)}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: "code", label: "Rule code", type: "text", required: true },
        { name: "name", label: "Rule name", type: "text", required: true },
        { name: "module", label: "Module", type: "text", required: true },
        { name: "severity", label: "Severity", type: "select", options: ["block", "warn", "info"], required: true },
        { name: "condition", label: "Condition", type: "textarea", colSpan: 2 },
        { name: "action", label: "Action", type: "textarea", colSpan: 2 },
      ]}
      transformOut={(v) => ({ ...v, active: true })}
    />
  );
}

/* ------------------------------------------------------------------ AI config */

function AiSettings() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          All AI features run grounded on live ERP data — responses are constrained to deterministic facts to avoid hallucination.
          <Button asChild size="sm" variant="outline" className="ml-auto h-8 gap-1.5">
            <Link to="/ai-assistant" search={{ q: "What AI features are enabled in this ERP?" }}><Sparkles className="h-3.5 w-3.5 text-primary" /> Ask AI</Link>
          </Button>
        </CardContent>
      </Card>
      <AdminCrudTable
        collection="aiConfigs"
        title="AI configuration"
        icon={<Sparkles className="h-4 w-4 text-primary" />}
        searchKeys={["feature", "model"]}
        toggleField="active"
        columns={[
          { key: "feature", label: "Feature", render: (r) => <span className="font-medium">{String(r.feature)}</span> },
          { key: "model", label: "Model", render: (r) => <span className="font-mono text-xs">{String(r.model)}</span> },
          { key: "temperature", label: "Temp", align: "right" },
          { key: "grounded", label: "Grounded", render: (r) => r.grounded ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" /> },
          { key: "notes", label: "Notes", render: (r) => <span className="text-xs text-muted-foreground">{String(r.notes)}</span> },
        ]}
        fields={[
          { name: "feature", label: "Feature", type: "text", required: true, colSpan: 2 },
          { name: "model", label: "Model", type: "select", options: ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite", "google/gemini-2.5-pro"], required: true },
          { name: "temperature", label: "Temperature", type: "number" },
          { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
        ]}
        transformOut={(v) => ({ ...v, temperature: Number(v.temperature ?? 0.2), grounded: true, active: true })}
      />
    </div>
  );
}

/* -------------------------------------------------------------- Integrations */

function Integrations() {
  return (
    <AdminCrudTable
      collection="integrations"
      title="Integrations"
      icon={<Plug className="h-4 w-4 text-primary" />}
      searchKeys={["name", "type", "endpoint"]}
      toggleField="active"
      columns={[
        { key: "name", label: "Integration", render: (r) => <span className="font-medium">{String(r.name)}</span> },
        { key: "type", label: "Type", render: (r) => <Badge variant="outline" className="text-[10px] uppercase">{String(r.type)}</Badge> },
        { key: "endpoint", label: "Endpoint", render: (r) => <span className="font-mono text-xs text-muted-foreground">{String(r.endpoint)}</span> },
        {
          key: "status", label: "Status", render: (r) => (
            <span className={cn("inline-flex items-center gap-1 text-xs",
              r.status === "connected" ? "text-emerald-600" : r.status === "error" ? "text-rose-600" : "text-muted-foreground")}>
              {r.status === "connected" ? <CheckCircle2 className="h-3.5 w-3.5" /> : r.status === "error" ? <XCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {String(r.status)}
            </span>
          ),
        },
        { key: "lastSync", label: "Last sync", render: (r) => <span className="text-xs">{shortDate(String(r.lastSync))}</span> },
      ]}
      fields={[
        { name: "name", label: "Integration name", type: "text", required: true, colSpan: 2 },
        { name: "type", label: "Type", type: "select", options: ["API", "Webhook", "SFTP", "Email"], required: true },
        { name: "status", label: "Status", type: "select", options: ["connected", "disconnected", "error"] },
        { name: "endpoint", label: "Endpoint", type: "text", colSpan: 2 },
      ]}
      transformOut={(v) => ({ ...v, lastSync: new Date().toISOString(), active: true })}
    />
  );
}

/* ------------------------------------------------------------------ Security */

function Security() {
  const security = useAdmin((s) => s.security);
  return (
    <div className="space-y-4">
      <AdminCrudTable
        collection="security"
        title="Security policies"
        icon={<Lock className="h-4 w-4 text-primary" />}
        searchKeys={["policy", "scope", "value"]}
        toggleField="enforced"
        columns={[
          { key: "policy", label: "Policy", render: (r) => <span className="font-medium">{String(r.policy)}</span> },
          { key: "value", label: "Setting" },
          { key: "scope", label: "Scope", render: (r) => <span className="text-xs text-muted-foreground">{String(r.scope)}</span> },
        ]}
        fields={[
          { name: "policy", label: "Policy", type: "text", required: true, colSpan: 2 },
          { name: "value", label: "Setting", type: "text", required: true },
          { name: "scope", label: "Scope", type: "text" },
        ]}
        transformOut={(v) => ({ ...v, enforced: true })}
      />
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Posture summary</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Policies enforced", value: `${security.filter((p) => p.enforced).length}/${security.length}` },
            { label: "MFA coverage", value: "Mandatory for privileged roles" },
            { label: "Audit retention", value: "7 years" },
          ].map((k) => (
            <div key={k.label} className="rounded-md border p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-sm font-semibold">{k.value}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------- System config */

function SystemConfig() {
  const s = useAdmin((x) => x);
  const groups = Array.from(new Set(s.settings.map((c) => c.group)));
  const [edit, setEdit] = useState<{ record?: Row } | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <ToolBar
            title="System configuration"
            icon={<SlidersHorizontal className="h-4 w-4 text-primary" />}
            rows={s.settings as unknown as Row[]}
            onNew={() => setEdit({})}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">{g}</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {s.settings.filter((c) => c.group === g).map((c) => (
                  <button key={c.id} onClick={() => setEdit({ record: c as unknown as Row })} className="rounded-md border p-3 text-left transition-colors hover:border-primary/50">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
                    <div className="mt-1 text-sm font-medium">{c.value}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm"><DatabaseBackup className="h-4 w-4 text-primary" /> Backup &amp; restore</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { exportExcelRows("backup-history", s.backups as unknown as Row[]); }}><Download className="h-3.5 w-3.5" /> Export history</Button>
              <Button size="sm" className="h-8 gap-1.5" onClick={() => { const j = adminStore.runBackup(); toast.success(`Backup completed — ${j.sizeMb} MB`); }}><DatabaseBackup className="h-3.5 w-3.5" /> Run backup now</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Type</TableHead><TableHead>Scope</TableHead>
              <TableHead className="text-right">Size</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Restore</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {s.backups.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="text-xs">{shortDate(b.when)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] uppercase">{b.type}</Badge></TableCell>
                  <TableCell className="text-xs">{b.scope}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.sizeMb} MB</TableCell>
                  <TableCell>
                    {b.status === "success"
                      ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Success</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-rose-600"><XCircle className="h-3.5 w-3.5" /> Failed</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm" variant="ghost" className="h-7 gap-1.5" disabled={b.status !== "success"}
                      onClick={() => { adminStore.logAudit("RESTORE", "System", b.scope, "critical"); toast.success(`Restore point ${shortDate(b.when)} queued`); }}
                    ><RotateCcw className="h-3.5 w-3.5" /> Restore</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RecordDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title={edit?.record ? "Edit setting" : "New setting"}
        fields={[
          { name: "label", label: "Label", type: "text", required: true, colSpan: 2 },
          { name: "key", label: "Key", type: "text", required: true },
          { name: "group", label: "Group", type: "select", options: ["Localisation", "Operations", "Compliance"], required: true },
          { name: "value", label: "Value", type: "text", required: true, colSpan: 2 },
        ]}
        initial={edit?.record}
        onSubmit={(v) => { adminStore.upsert("settings", { ...(edit?.record ?? {}), ...v }); toast.success("Setting saved"); setEdit(null); }}
      />
    </div>
  );
}

/* -------------------------------------------------------------- Audit/Health */

function AuditHealth() {
  const s = useAdmin((x) => x);
  const [q, setQ] = useState("");
  const [sev, setSev] = useState("all");
  const list = s.audit.filter((a) =>
    (sev === "all" || a.severity === sev) &&
    (q === "" || [a.actor, a.action, a.entity, a.ref].some((v) => v.toLowerCase().includes(q.toLowerCase())))
  );
  const rows = list.map((a) => ({ when: shortDate(a.when), actor: a.actor, action: a.action, entity: a.entity, ref: a.ref, ip: a.ip, severity: a.severity }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">System health</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {s.health.map((h) => (
            <div key={h.key} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">{h.label}</div>
                {h.tone === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {h.tone === "warn" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                {h.tone === "err" && <XCircle className="h-4 w-4 text-rose-500" />}
              </div>
              <div className={cn("mt-1 text-sm font-semibold", h.tone === "warn" && "text-amber-600", h.tone === "err" && "text-rose-600")}>{h.value}</div>
              <div className="text-[11px] text-muted-foreground">{h.sub}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">Audit log</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search audit…" className="h-8 w-56 pl-9" />
              </div>
              <div className="flex gap-1">
                {["all", "info", "warn", "critical"].map((x) => (
                  <button key={x} onClick={() => setSev(x)} className={cn("rounded-md border px-2 py-1 text-xs capitalize", sev === x ? "border-primary text-primary" : "text-muted-foreground")}>{x}</button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => exportCsvRows("audit-log", rows)}><Download className="h-3.5 w-3.5" /> Export</Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => printRows("Audit log", rows)}><Printer className="h-3.5 w-3.5" /> Print</Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { adminStore.clearAudit(); toast.success("Audit log cleared"); }}><Trash2 className="h-3.5 w-3.5" /> Clear</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead>
              <TableHead>Entity</TableHead><TableHead>Ref</TableHead><TableHead>IP</TableHead>
              <TableHead className="text-right">Severity</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{shortDate(a.when)}</TableCell>
                  <TableCell className="text-xs">{a.actor}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] uppercase">{a.action}</Badge></TableCell>
                  <TableCell className="text-xs">{a.entity}</TableCell>
                  <TableCell className="font-mono text-xs">{a.ref}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{a.ip}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={
                      a.severity === "critical" ? "border-rose-500/40 text-rose-600" :
                        a.severity === "warn" ? "border-amber-500/40 text-amber-600" : ""
                    }>{a.severity}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No audit events.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
