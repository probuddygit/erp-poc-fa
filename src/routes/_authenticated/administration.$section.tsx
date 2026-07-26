import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Users, Workflow, Hash, ShieldCheck, Search, Plus, MapPin, KeyRound, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { adminStore, useAdmin } from "@/lib/admin/store";
import type { AdminRole } from "@/lib/admin/store";
import { StatusPill, shortDate, fmtINR } from "@/components/projects/shared";
import { cn } from "@/lib/utils";

const SECTIONS = ["company", "users", "workflows", "numbering", "governance", "audit"] as const;
type Section = typeof SECTIONS[number];

export const Route = createFileRoute("/_authenticated/administration/$section")({
  head: ({ params }) => ({ meta: [{ title: `${labelOf(params.section as Section)} · Administration` }] }),
  beforeLoad: ({ params }) => { if (!SECTIONS.includes(params.section as Section)) throw notFound(); },
  component: SectionPage,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">Section not found.</div>,
});

function labelOf(s: Section) {
  return ({ company: "Company & Branches", users: "Users & Roles", workflows: "Approval Workflows", numbering: "Numbering Series", governance: "Master Data Governance", audit: "Audit & Health" } as const)[s];
}

function SectionPage() {
  const { section } = Route.useParams();
  const s = section as Section;
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {s === "company" && <Company />}
      {s === "users" && <UsersRoles />}
      {s === "workflows" && <Workflows />}
      {s === "numbering" && <Numbering />}
      {s === "governance" && <Governance />}
      {s === "audit" && <AuditHealth />}
    </div>
  );
}

function Company() {
  const s = useAdmin((s) => s);
  const co = s.companies[0];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Company</CardTitle>
          <Button size="sm" variant="outline" className="h-8">Edit</Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Legal Name", co.legalName], ["Short Name", co.name], ["GSTIN", co.gstin], ["PAN", co.pan],
            ["CIN", co.cin], ["Base Currency", co.currency], ["FY Start", co.fyStart], ["Company Code", co.code],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="mt-1 text-sm font-medium">{v}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Branches / Locations</CardTitle>
          <Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" /> Add branch</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead>
              <TableHead>Location</TableHead><TableHead>GSTIN</TableHead><TableHead className="text-right">Headcount</TableHead>
              <TableHead className="text-right">Active</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {s.branches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.code}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{b.type}</Badge></TableCell>
                  <TableCell className="text-xs"><MapPin className="mr-1 inline h-3 w-3 text-muted-foreground" />{b.city}, {b.state}</TableCell>
                  <TableCell className="font-mono text-xs">{b.gstin}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.headcount}</TableCell>
                  <TableCell className="text-right"><Switch checked={b.active} onCheckedChange={() => adminStore.toggleBranch(b.id)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

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

function UsersRoles() {
  const s = useAdmin((s) => s);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("all");
  const users = s.users.filter((u) =>
    (role === "all" || u.roles.includes(role as AdminRole)) &&
    (q === "" || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
  );
  const allRoles = Array.from(new Set(s.users.flatMap((u) => u.roles)));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Users</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="pl-9 w-64" />
            </div>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setRole("all")} className={cn("rounded-md border px-2 py-1 text-xs", role === "all" ? "border-primary text-primary" : "text-muted-foreground")}>All</button>
              {allRoles.map((r) => (
                <button key={r} onClick={() => setRole(r)} className={cn("rounded-md border px-2 py-1 text-xs", role === r ? "border-primary text-primary" : "text-muted-foreground")}>{r}</button>
              ))}
            </div>
            <Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" /> Invite user</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>User</TableHead><TableHead>Department</TableHead><TableHead>Roles</TableHead>
              <TableHead>MFA</TableHead><TableHead>Last login</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Enabled</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="text-xs">{u.department}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => <Badge key={r} variant="outline" className={cn("text-[10px]", ROLE_COLORS[r])}>{r}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.mfa ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><KeyRound className="h-3.5 w-3.5" /> On</span>
                      : <span className="text-xs text-muted-foreground">Off</span>}
                  </TableCell>
                  <TableCell className="text-xs">{u.lastLogin ? shortDate(u.lastLogin) : "—"}</TableCell>
                  <TableCell><StatusPill status={u.status} /></TableCell>
                  <TableCell className="text-right">
                    <Switch checked={u.status === "active"} onCheckedChange={() => adminStore.toggleUserStatus(u.id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Role → module permissions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Module</TableHead><TableHead>Action</TableHead><TableHead>Granted roles</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {s.permissions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.module}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] uppercase">{p.action}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.roles.map((r) => <Badge key={r} variant="outline" className={cn("text-[10px]", ROLE_COLORS[r])}>{r}</Badge>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Workflows() {
  const s = useAdmin((s) => s);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Approval routing per business object. Thresholds trigger additional steps.</div>
        <Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" /> New workflow</Button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {s.workflows.map((w) => (
          <Card key={w.id} className={cn(!w.active && "opacity-70")}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2"><Workflow className="h-4 w-4 text-primary" /> {w.name}</CardTitle>
                  <div className="mt-1 text-[11px] text-muted-foreground">{w.code} · object: {w.object}</div>
                </div>
                <Switch checked={w.active} onCheckedChange={() => adminStore.toggleWorkflow(w.id)} />
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
    </div>
  );
}

function Numbering() {
  const s = useAdmin((s) => s);
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /> Numbering series</CardTitle>
        <Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" /> New series</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Object</TableHead><TableHead>Prefix</TableHead><TableHead>Padding</TableHead>
            <TableHead className="text-right">Next #</TableHead><TableHead>Example</TableHead>
            <TableHead>Reset</TableHead><TableHead className="text-right">Active</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {s.series.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-medium">{n.object}</TableCell>
                <TableCell className="font-mono text-xs">{n.prefix}</TableCell>
                <TableCell className="text-xs">{n.padding} digits</TableCell>
                <TableCell className="text-right tabular-nums">{n.next}</TableCell>
                <TableCell className="font-mono text-xs">{n.example}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] uppercase">{n.resetFreq}</Badge></TableCell>
                <TableCell className="text-right"><Switch checked={n.active} onCheckedChange={() => adminStore.toggleSeries(n.id)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Governance() {
  const s = useAdmin((s) => s);
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {s.governance.map((g) => (
        <Card key={g.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> {g.entity}</CardTitle>
              <span className={cn("text-lg font-display font-semibold tabular-nums",
                g.qualityScore >= 95 ? "text-emerald-600" : g.qualityScore >= 85 ? "text-amber-600" : "text-rose-600"
              )}>{g.qualityScore}%</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Data owner: {g.owner}</div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-md border p-2">
              <span>Duplicate prevention</span>
              {g.dedupe ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <span>Approval on create/edit</span>
              {g.approval ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <span>Change audit trail</span>
              {g.changeAudit ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AuditHealth() {
  const s = useAdmin((s) => s);
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
              <div className={cn("mt-1 text-sm font-semibold",
                h.tone === "warn" && "text-amber-600",
                h.tone === "err" && "text-rose-600",
              )}>{h.value}</div>
              <div className="text-[11px] text-muted-foreground">{h.sub}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Audit log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead>
              <TableHead>Entity</TableHead><TableHead>Ref</TableHead><TableHead>IP</TableHead>
              <TableHead className="text-right">Severity</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {s.audit.map((a) => (
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
