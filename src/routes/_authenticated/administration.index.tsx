import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Building2, Workflow, Hash, ShieldCheck, Activity, CheckCircle2, AlertTriangle, XCircle, Presentation, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resetDemoData } from "@/lib/demo/reset";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/lib/admin/store";
import { shortDate } from "@/components/projects/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/administration/")({
  head: () => ({ meta: [{ title: "Administration Overview · Faith Automation ERP" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const s = useAdmin((s) => s);
  const activeUsers = s.users.filter((u) => u.status === "active").length;
  const mfaOn = s.users.filter((u) => u.mfa).length;
  const activeBranches = s.branches.filter((b) => b.active).length;
  const activeWorkflows = s.workflows.filter((w) => w.active).length;
  const govAvg = Math.round(s.governance.reduce((a, g) => a + g.qualityScore, 0) / s.governance.length);

  const kpis = [
    { label: "Users", value: String(s.users.length), sub: `${activeUsers} active · ${mfaOn} MFA · ${s.users.filter((u) => u.status === "invited").length} invited`, icon: Users, tone: "from-primary via-primary/50" },
    { label: "Branches", value: String(activeBranches), sub: `${s.branches.length - activeBranches} inactive · across ${new Set(s.branches.map((b) => b.state)).size} states`, icon: Building2, tone: "from-emerald-500 via-emerald-500/50" },
    { label: "Approval Workflows", value: String(activeWorkflows), sub: `${s.workflows.length - activeWorkflows} disabled · ${s.workflows.reduce((a, w) => a + w.steps.length, 0)} steps`, icon: Workflow, tone: "from-amber-500 via-amber-500/50" },
    { label: "MDM Quality", value: `${govAvg}%`, sub: `${s.governance.length} governed entities`, icon: ShieldCheck, tone: govAvg >= 90 ? "from-emerald-500 via-emerald-500/50" : "from-rose-500 via-rose-500/50" },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${k.tone} to-transparent`} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <k.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-2xl font-semibold">{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> System health</CardTitle>
            <Link to="/administration/$section" params={{ section: "audit" }} className="text-xs text-primary hover:underline">Audit log</Link>
          </CardHeader>
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
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /> Numbering next</CardTitle>
            <Link to="/administration/$section" params={{ section: "numbering" }} className="text-xs text-primary hover:underline">All series</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.series.slice(0, 6).map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded-md border p-2.5">
                <div>
                  <div className="text-sm font-medium">{n.object}</div>
                  <div className="text-[11px] text-muted-foreground">Next: {n.example}</div>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">{n.resetFreq}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Workflow className="h-4 w-4 text-primary" /> Active workflows</CardTitle>
            <Link to="/administration/$section" params={{ section: "workflows" }} className="text-xs text-primary hover:underline">Design</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.workflows.filter((w) => w.active).slice(0, 5).map((w) => (
              <div key={w.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{w.name}</div>
                  <Badge variant="outline" className="text-[10px]">{w.object}</Badge>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {w.steps.length} steps · roles: {w.steps.map((s) => s.role).join(" → ")}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> MDM governance</CardTitle>
            <Link to="/administration/$section" params={{ section: "governance" }} className="text-xs text-primary hover:underline">Manage</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.governance.map((g) => (
              <div key={g.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{g.entity}</div>
                  <span className={cn("text-xs font-semibold tabular-nums",
                    g.qualityScore >= 95 ? "text-emerald-600" : g.qualityScore >= 85 ? "text-amber-600" : "text-rose-600"
                  )}>{g.qualityScore}%</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">Owner {g.owner} · {[g.dedupe && "dedupe", g.approval && "approval", g.changeAudit && "audit"].filter(Boolean).join(" · ")}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Recent audit</CardTitle>
            <Link to="/administration/$section" params={{ section: "audit" }} className="text-xs text-primary hover:underline">Full log</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.audit.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-md border p-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.action} · {a.entity} <span className="text-muted-foreground font-normal">{a.ref}</span></div>
                  <div className="text-[11px] text-muted-foreground">{a.actor} · {shortDate(a.when)} · {a.ip}</div>
                </div>
                <Badge variant="outline" className={
                  a.severity === "critical" ? "border-rose-500/40 text-rose-600" :
                  a.severity === "warn" ? "border-amber-500/40 text-amber-600" : ""
                }>{a.severity}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Presentation className="h-4 w-4 text-primary" /> Demo environment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-xs text-muted-foreground">
            Restore every module to its seeded dataset so a customer walkthrough can be run again from a clean slate.
            This clears all locally captured demo transactions and reloads the workspace.
          </p>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/demo">Open demo guide</Link>
            </Button>
            <Button size="sm" variant="secondary" className="gap-2" onClick={() => { toast.success("Restoring seeded demo data…"); resetDemoData(); }}>
              <RotateCcw className="h-4 w-4" /> Reset demo data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
