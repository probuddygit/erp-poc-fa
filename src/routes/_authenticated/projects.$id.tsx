import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, FolderKanban, Calendar, Users2, FileText, AlertTriangle,
  ClipboardList, GitBranch, Target, ShieldAlert, Wallet, GanttChart,
  Sparkles, Plus, Upload, Pencil, Trash2, MoreHorizontal, Download,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useProjectsStore,
  upsertProjectRecord,
  deleteProjectRecord,
} from "@/lib/projects/store";
import { RagBadge, StatusPill, Progress, fmtCompact, fmtINR, fmtDate, shortDate } from "@/components/projects/shared";
import type { WbsNode } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import { RecordDialog, ConfirmDialog } from "@/components/record-dialog";
import { PROJECT_SCHEMAS, type ProjectsSubKind } from "@/lib/projects/schemas";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({ meta: [{ title: "Project · Faith Automation ERP" }] }),
  component: ProjectDetail,
  notFoundComponent: () => (
    <div className="p-12 text-center">
      <h2 className="font-display text-lg font-semibold">Project not found</h2>
      <Link to="/projects" className="mt-2 inline-block text-sm text-primary hover:underline">
        ← Back to portfolio
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-sm text-destructive">{String(error)}</div>
  ),
});

interface EditState {
  kind: ProjectsSubKind;
  record?: Record<string, unknown>;
  title: string;
}

function ProjectDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const s = useProjectsStore((s) => s);
  const project = s.projects.find((p) => p.id === id);
  if (!project) throw notFound();

  const wbs = s.wbs.filter((w) => w.projectId === id);
  const milestones = s.milestones.filter((m) => m.projectId === id);
  const risks = s.risks.filter((r) => r.projectId === id);
  const issues = s.issues.filter((i) => i.projectId === id);
  const changes = s.changes.filter((c) => c.projectId === id);
  const docs = s.docs.filter((d) => d.projectId === id);
  const team = s.team.filter((t) => t.projectId === id);
  const events = s.events.filter((e) => e.projectId === id);
  const budget = s.budget.filter((b) => b.projectId === id);

  const [tab, setTab] = useState("overview");
  const [edit, setEdit] = useState<EditState | null>(null);
  const [projectEditOpen, setProjectEditOpen] = useState(false);
  const [projectDeleteOpen, setProjectDeleteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: ProjectsSubKind;
    id: string;
    label: string;
  } | null>(null);

  const openNew = (kind: ProjectsSubKind, title: string, defaults?: Record<string, unknown>) =>
    setEdit({ kind, title, record: defaults });
  const openEdit = (kind: ProjectsSubKind, record: Record<string, unknown>, title: string) =>
    setEdit({ kind, record, title });

  const handleSubmit = (values: Record<string, unknown>) => {
    if (!edit) return;
    const merged = { ...(edit.record ?? {}), ...values };
    upsertProjectRecord(edit.kind, merged, id);
    setEdit(null);
    toast.success(edit.record?.id ? "Updated" : "Created");
  };

  const budgetTotal = budget.reduce(
    (acc, b) => ({
      planned: acc.planned + b.planned,
      committed: acc.committed + b.committed,
      actual: acc.actual + b.actual,
    }),
    { planned: 0, committed: 0, actual: 0 },
  );

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <Link
            to="/projects"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Portfolio
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{project.code}</span>
                  <StatusPill status={project.status} />
                  <RagBadge rag={project.rag} />
                  {project.oaId && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      Auto from OA
                    </Badge>
                  )}
                </div>
                <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                  {project.name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {project.customerName} · PM {project.manager} ·{" "}
                  {shortDate(project.startDate)} → {shortDate(project.endDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Ask AI
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setProjectEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setProjectDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>

          {/* Quick KPIs */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat label="Progress" value={`${project.progress}%`}>
              <Progress value={project.progress} className="mt-2" />
            </MiniStat>
            <MiniStat label="Order Value" value={fmtCompact(project.value)} sub={`Budget ${fmtCompact(project.budget)}`} />
            <MiniStat
              label="Cost Consumed"
              value={fmtCompact(project.spent)}
              sub={`${Math.round((project.spent / project.budget) * 100)}% of budget`}
            />
            <MiniStat label="Open Items" value={String(risks.filter((r) => r.status === "open").length + issues.filter((i) => i.status !== "resolved").length)} sub={`${risks.length} risks · ${issues.length} issues`} />
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab} className="mt-6">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b bg-transparent p-0">
              {[
                ["overview", "Overview", ClipboardList],
                ["wbs", "WBS", GitBranch],
                ["gantt", "Gantt", GanttChart],
                ["milestones", "Milestones", Target],
                ["budget", "Budget", Wallet],
                ["risks", "Risks", ShieldAlert],
                ["issues", "Issues", AlertTriangle],
                ["changes", "Changes", GitBranch],
                ["docs", "Documents", FileText],
                ["team", "Team", Users2],
                ["calendar", "Calendar", Calendar],
              ].map(([v, l, Icon]) => {
                const I = Icon as typeof ClipboardList;
                return (
                  <TabsTrigger
                    key={v as string}
                    value={v as string}
                    className="gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    <I className="h-3.5 w-3.5" />
                    {l as string}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-6 pb-8">
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="font-display text-base">Recent Activity Timeline</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { t: "Fixture design frozen for Zone 2", d: "K. Sharma · 2h ago", tone: "success" },
                        { t: "Customer walkdown scheduled Fri", d: "N. Rao · 6h ago", tone: "info" },
                        { t: "PO released to KUKA India", d: "Procurement · 1d ago", tone: "info" },
                        { t: "Change Request CR-01 raised", d: "Customer · 2d ago", tone: "warn" },
                        { t: "Design Review passed with 3 actions", d: "Engineering · 5d ago", tone: "success" },
                      ].map((a, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="relative">
                            <div className={cn(
                              "mt-1.5 h-2.5 w-2.5 rounded-full ring-4",
                              a.tone === "success" && "bg-emerald-500 ring-emerald-500/15",
                              a.tone === "warn" && "bg-amber-500 ring-amber-500/15",
                              a.tone === "info" && "bg-primary ring-primary/15",
                            )} />
                            {i < 4 && <div className="absolute left-1/2 top-4 h-full w-px -translate-x-1/2 bg-border" />}
                          </div>
                          <div className="pb-4">
                            <div className="text-sm">{a.t}</div>
                            <div className="text-xs text-muted-foreground">{a.d}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="font-display text-base">Upcoming Milestones</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {milestones.filter((m) => m.status !== "achieved").slice(0, 4).map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{fmtDate(m.due)}</div>
                          </div>
                          <StatusPill status={m.status} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="font-display text-base">Team Snapshot</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {team.slice(0, 4).map((t) => (
                        <div key={t.id} className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{t.name}</div>
                            <div className="text-xs text-muted-foreground">{t.role}</div>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">{t.allocationPct}%</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* WBS */}
            <TabsContent value="wbs" className="mt-6 pb-8">
              <SectionToolbar
                title="Work Breakdown Structure"
                onNew={() => openNew("wbs", "New WBS Task", { status: "not-started", progress: 0, weight: 5, owner: project.manager })}
              />
              <WbsTree
                wbs={wbs}
                onEdit={(w) => openEdit("wbs", w as unknown as Record<string, unknown>, "Edit WBS Task")}
                onDelete={(w) => setConfirmDelete({ kind: "wbs", id: w.id, label: w.name })}
                onAddChild={(parent, nextCode) =>
                  openNew("wbs", "New Sub-Task", {
                    status: "not-started",
                    progress: 0,
                    weight: 3,
                    owner: parent.owner,
                    parentId: parent.id,
                    code: nextCode,
                    start: parent.start,
                    end: parent.end,
                  })
                }
              />
            </TabsContent>


            {/* Gantt */}
            <TabsContent value="gantt" className="mt-6 pb-8">
              <GanttView wbs={wbs} projectStart={project.startDate} projectEnd={project.endDate} />
            </TabsContent>

            {/* Milestones */}
            <TabsContent value="milestones" className="mt-6 pb-8">
              <SectionToolbar
                title="Milestones"
                onNew={() => openNew("milestones", "New Milestone", { status: "upcoming" })}
              />
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left">Milestone</th>
                        <th className="p-3 text-left">Due</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-right">Billing</th>
                        <th className="w-10 p-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {milestones.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/30">
                          <td className="p-3 font-medium">{m.name}</td>
                          <td className="p-3 text-muted-foreground">{fmtDate(m.due)}</td>
                          <td className="p-3"><StatusPill status={m.status} /></td>
                          <td className="p-3 text-right font-mono">{m.billing ? fmtINR(m.billing) : "—"}</td>
                          <td className="p-3">
                            <RowMenu
                              onEdit={() => openEdit("milestones", m as unknown as Record<string, unknown>, "Edit Milestone")}
                              onDelete={() => setConfirmDelete({ kind: "milestones", id: m.id, label: m.name })}
                            />
                          </td>
                        </tr>
                      ))}
                      {milestones.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No milestones yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Budget */}
            <TabsContent value="budget" className="mt-6 pb-8">
              <SectionToolbar
                title="Budget"
                onNew={() => openNew("budget", "New Budget Line")}
              />
              <div className="grid gap-4 lg:grid-cols-3">
                <Card><CardContent className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Planned</div><div className="mt-1 font-display text-2xl font-semibold">{fmtINR(budgetTotal.planned)}</div></CardContent></Card>
                <Card><CardContent className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Committed</div><div className="mt-1 font-display text-2xl font-semibold">{fmtINR(budgetTotal.committed)}</div></CardContent></Card>
                <Card><CardContent className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Actual</div><div className="mt-1 font-display text-2xl font-semibold">{fmtINR(budgetTotal.actual)}</div></CardContent></Card>
              </div>
              <Card className="mt-4">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left">Category</th>
                        <th className="p-3 text-right">Planned</th>
                        <th className="p-3 text-right">Committed</th>
                        <th className="p-3 text-right">Actual</th>
                        <th className="p-3 text-left">Utilisation</th>
                        <th className="w-10 p-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {budget.map((b) => {
                        const u = Math.round((b.actual / Math.max(b.planned, 1)) * 100);
                        return (
                          <tr key={b.id} className="hover:bg-muted/30">
                            <td className="p-3 font-medium">{b.category}</td>
                            <td className="p-3 text-right font-mono">{fmtINR(b.planned)}</td>
                            <td className="p-3 text-right font-mono">{fmtINR(b.committed)}</td>
                            <td className="p-3 text-right font-mono">{fmtINR(b.actual)}</td>
                            <td className="p-3"><div className="flex items-center gap-2"><Progress value={u} className="w-24" /><span className="text-xs text-muted-foreground">{u}%</span></div></td>
                            <td className="p-3">
                              <RowMenu
                                onEdit={() => openEdit("budget", b as unknown as Record<string, unknown>, "Edit Budget Line")}
                                onDelete={() => setConfirmDelete({ kind: "budget", id: b.id, label: b.category })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {budget.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No budget lines.</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Risks */}
            <TabsContent value="risks" className="mt-6 pb-8">
              <SectionToolbar
                title="Risks"
                onNew={() => openNew("risks", "New Risk", { status: "open", probability: 3, impact: 3, owner: project.manager, category: "Technical" })}
              />
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {risks.map((r) => {
                  const score = r.probability * r.impact;
                  const tone = score >= 15 ? "red" : score >= 8 ? "amber" : "green";
                  return (
                    <Card key={r.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{r.title}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{r.category} · Owner {r.owner}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <RagBadge rag={tone} />
                            <RowMenu
                              onEdit={() => openEdit("risks", r as unknown as Record<string, unknown>, "Edit Risk")}
                              onDelete={() => setConfirmDelete({ kind: "risks", id: r.id, label: r.title })}
                            />
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                          <div><div className="font-semibold">{r.probability}</div><div className="text-muted-foreground">Prob</div></div>
                          <div><div className="font-semibold">{r.impact}</div><div className="text-muted-foreground">Impact</div></div>
                          <div><div className="font-semibold">{score}</div><div className="text-muted-foreground">Score</div></div>
                        </div>
                        <div className="mt-3 rounded-md bg-muted/40 p-2 text-xs">
                          <span className="font-medium">Mitigation: </span>{r.mitigation}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {risks.length === 0 && <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No risks logged.</div>}
              </div>
            </TabsContent>

            {/* Issues */}
            <TabsContent value="issues" className="mt-6 pb-8">
              <SectionToolbar
                title="Issues"
                onNew={() => openNew("issues", "New Issue", { status: "open", severity: "medium", raisedBy: "You", assignee: project.manager })}
              />
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left">Issue</th>
                        <th className="p-3 text-left">Severity</th>
                        <th className="p-3 text-left">Assignee</th>
                        <th className="p-3 text-left">Raised</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="w-10 p-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {issues.map((i) => (
                        <tr key={i.id} className="hover:bg-muted/30">
                          <td className="p-3 font-medium">{i.title}</td>
                          <td className="p-3"><StatusPill status={i.severity} /></td>
                          <td className="p-3">{i.assignee}</td>
                          <td className="p-3 text-muted-foreground">{fmtDate(i.raisedAt)}</td>
                          <td className="p-3"><StatusPill status={i.status} /></td>
                          <td className="p-3">
                            <RowMenu
                              onEdit={() => openEdit("issues", i as unknown as Record<string, unknown>, "Edit Issue")}
                              onDelete={() => setConfirmDelete({ kind: "issues", id: i.id, label: i.title })}
                            />
                          </td>
                        </tr>
                      ))}
                      {issues.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No issues logged.</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Change Requests */}
            <TabsContent value="changes" className="mt-6 pb-8">
              <SectionToolbar
                title="Change Requests"
                onNew={() => openNew("changes", "New Change Request", { status: "draft", raisedBy: "You", impactCost: 0, impactDays: 0 })}
              />
              <div className="grid gap-3 md:grid-cols-2">
                {changes.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">{c.code}</div>
                          <div className="mt-0.5 font-medium">{c.title}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <StatusPill status={c.status} />
                          <RowMenu
                            onEdit={() => openEdit("changes", c as unknown as Record<string, unknown>, "Edit Change Request")}
                            onDelete={() => setConfirmDelete({ kind: "changes", id: c.id, label: c.title })}
                          />
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                        <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost Impact</div><div className="font-mono font-semibold">{fmtINR(c.impactCost)}</div></div>
                        <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Schedule Impact</div><div className="font-mono font-semibold">+{c.impactDays} days</div></div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">Raised by {c.raisedBy} · {fmtDate(c.raisedAt)}</div>
                    </CardContent>
                  </Card>
                ))}
                {changes.length === 0 && <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No change requests.</div>}
              </div>
            </TabsContent>

            {/* Documents */}
            <TabsContent value="docs" className="mt-6 pb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-display text-base">Project Documents</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => openNew("docs", "Upload Document", { uploadedBy: "You", size: "—", kind: "Other", at: new Date().toISOString() })}
                  >
                    <Upload className="h-4 w-4" /> Upload
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {docs.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4" /></div>
                        <div className="min-w-0 flex-1">
                          {d.fileUrl ? (
                            <a
                              href={d.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-sm font-medium text-primary hover:underline"
                            >
                              {d.name}
                            </a>
                          ) : (
                            <div className="truncate text-sm font-medium">{d.name}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {d.kind}{d.version ? ` · ${d.version}` : ""} · {d.size} · {d.uploadedBy}
                            {d.fileUrlName ? ` · ${d.fileUrlName}` : ""}
                          </div>
                          {d.notes && <div className="mt-0.5 truncate text-xs text-muted-foreground/80">{d.notes}</div>}
                        </div>
                        <span className="text-xs text-muted-foreground">{fmtDate(d.at)}</span>
                        {d.fileUrl && (
                          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                            <a href={d.fileUrl} download={d.fileUrlName ?? d.name} aria-label="Download">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <RowMenu
                          onEdit={() => openEdit("docs", d as unknown as Record<string, unknown>, "Edit Document")}
                          onDelete={() => setConfirmDelete({ kind: "docs", id: d.id, label: d.name })}
                        />
                      </div>
                    ))}

                    {docs.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No documents.</div>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team */}
            <TabsContent value="team" className="mt-6 pb-8">
              <SectionToolbar
                title="Team"
                onNew={() => openNew("team", "Add Team Member", { allocationPct: 50 })}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {team.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{t.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{t.role}</div>
                        </div>
                        <Badge variant="outline" className="font-mono">{t.allocationPct}%</Badge>
                        <RowMenu
                          onEdit={() => openEdit("team", t as unknown as Record<string, unknown>, "Edit Team Member")}
                          onDelete={() => setConfirmDelete({ kind: "team", id: t.id, label: t.name })}
                        />
                      </div>
                      <div className="mt-3 truncate text-xs text-muted-foreground">{t.email}</div>
                    </CardContent>
                  </Card>
                ))}
                {team.length === 0 && <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No team members yet.</div>}
              </div>
            </TabsContent>

            {/* Calendar */}
            <TabsContent value="calendar" className="mt-6 pb-8">
              <SectionToolbar
                title="Calendar"
                onNew={() => openNew("events", "New Event", { kind: "meeting", date: new Date().toISOString() })}
              />
              <ProjectCalendar
                events={events}
                onEdit={(e) => openEdit("events", e as unknown as Record<string, unknown>, "Edit Event")}
                onDelete={(e) => setConfirmDelete({ kind: "events", id: e.id, label: e.title })}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Project edit */}
      <RecordDialog
        open={projectEditOpen}
        onOpenChange={setProjectEditOpen}
        title="Edit Project"
        fields={PROJECT_SCHEMAS.projects}
        initial={project as unknown as Record<string, unknown>}
        onSubmit={(values) => {
          upsertProjectRecord("projects", { ...project, ...values });
          setProjectEditOpen(false);
          toast.success("Project updated");
        }}
        submitLabel="Save changes"
      />
      <ConfirmDialog
        open={projectDeleteOpen}
        onOpenChange={setProjectDeleteOpen}
        title="Delete project?"
        message="All associated WBS, milestones, risks, issues, changes, documents, team, events and budget lines will be removed."
        onConfirm={() => {
          deleteProjectRecord("projects", id);
          toast.success("Project deleted");
          navigate({ to: "/projects" });
        }}
      />

      {/* Sub-entity dialogs */}
      {edit && (
        <RecordDialog
          open
          onOpenChange={(v) => !v && setEdit(null)}
          title={edit.title}
          fields={PROJECT_SCHEMAS[edit.kind]}
          initial={edit.record}
          onSubmit={handleSubmit}
          submitLabel={edit.record?.id ? "Save changes" : "Create"}
        />
      )}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={`Delete "${confirmDelete?.label ?? ""}"?`}
        message="This action cannot be undone."
        onConfirm={() => {
          if (!confirmDelete) return;
          deleteProjectRecord(confirmDelete.kind, confirmDelete.id);
          toast.success("Deleted");
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

function MiniStat({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      {children}
    </div>
  );
}

function SectionToolbar({ title, onNew }: { title: string; onNew: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="font-display text-sm font-semibold text-muted-foreground">{title}</h3>
      <Button size="sm" className="gap-1.5" onClick={onNew}>
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
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

function WbsTree({
  wbs,
  onEdit,
  onDelete,
  onAddChild,
}: {
  wbs: WbsNode[];
  onEdit: (w: WbsNode) => void;
  onDelete: (w: WbsNode) => void;
  onAddChild: (parent: WbsNode, nextCode: string) => void;
}) {
  const parents = wbs.filter((w) => !w.parentId);
  const nextChildCode = (parent: WbsNode) => {
    const siblings = wbs.filter((w) => w.parentId === parent.id);
    return `${parent.code}.${siblings.length + 1}`;
  };
  const renderRow = (node: WbsNode, depth: number) => {
    const children = wbs.filter((w) => w.parentId === node.id);
    const canAddChild = depth < 2; // depth 0 = level 1; allow adding children up to level 3
    return (
      <div key={node.id}>
        <div
          className={cn(
            "grid grid-cols-[minmax(0,2fr)_100px_120px_120px_140px_120px_80px_40px] gap-2 px-4 py-2 text-sm hover:bg-muted/20",
            depth === 0 && "bg-muted/20 py-2.5",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              depth === 0 ? "font-semibold" : "text-muted-foreground",
            )}
            style={{ paddingLeft: `${depth * 20}px` }}
          >
            <span className="font-mono text-xs text-muted-foreground">{node.code}</span>
            {node.name}
          </div>
          <div className="text-xs">{node.owner}</div>
          <div className="text-xs">{shortDate(node.start)}</div>
          <div className="text-xs">{shortDate(node.end)}</div>
          <div className="flex items-center gap-2">
            <Progress value={node.progress} className="w-16" />
            <span className="font-mono text-xs">{node.progress}%</span>
          </div>
          <div><StatusPill status={node.status} /></div>
          <div>
            {canAddChild && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onAddChild(node, nextChildCode(node))}
              >
                <Plus className="mr-1 h-3 w-3" /> Sub
              </Button>
            )}
          </div>
          <div><RowMenu onEdit={() => onEdit(node)} onDelete={() => onDelete(node)} /></div>
        </div>
        {children.map((c) => renderRow(c, depth + 1))}
      </div>
    );
  };
  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[minmax(0,2fr)_100px_120px_120px_140px_120px_80px_40px] gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Task</div><div>Owner</div><div>Start</div><div>End</div><div>Progress</div><div>Status</div><div /><div />
        </div>
        <div className="divide-y">
          {parents.map((parent) => renderRow(parent, 0))}
          {parents.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No WBS tasks yet.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


function GanttView({ wbs, projectStart, projectEnd }: { wbs: WbsNode[]; projectStart: string; projectEnd: string }) {
  const start = new Date(projectStart).getTime();
  const end = new Date(projectEnd).getTime();
  const range = Math.max(end - start, 1);

  const parents = wbs.filter((w) => !w.parentId);
  const rows = useMemo(() => {
    const out: WbsNode[] = [];
    parents.forEach((p) => {
      out.push(p);
      wbs.filter((w) => w.parentId === p.id).forEach((c) => out.push(c));
    });
    return out;
  }, [wbs, parents]);

  const months = useMemo(() => {
    const arr: { label: string; pct: number }[] = [];
    const d = new Date(start);
    d.setDate(1);
    while (d.getTime() < end) {
      const pct = ((d.getTime() - start) / range) * 100;
      arr.push({ label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }), pct });
      d.setMonth(d.getMonth() + 1);
    }
    return arr;
  }, [start, end, range]);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[minmax(240px,320px)_1fr]">
          {/* header */}
          <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task</div>
          <div className="relative border-b border-l bg-muted/40 h-9">
            {months.map((m, i) => (
              <div key={i} className="absolute top-0 h-full border-l border-border/60 pl-1 text-[10px] text-muted-foreground" style={{ left: `${m.pct}%` }}>
                {m.label}
              </div>
            ))}
          </div>
          {/* rows */}
          {rows.map((r) => {
            const s = ((new Date(r.start).getTime() - start) / range) * 100;
            const w = ((new Date(r.end).getTime() - new Date(r.start).getTime()) / range) * 100;
            const isParent = !r.parentId;
            return (
              <div key={r.id} className="contents">
                <div className={cn(
                  "flex items-center gap-2 border-b px-4 py-2 text-sm",
                  isParent ? "bg-muted/20 font-semibold" : "pl-8 text-muted-foreground",
                )}>
                  <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                  <span className="truncate">{r.name}</span>
                </div>
                <div className="relative border-b border-l">
                  <div
                    className={cn(
                      "absolute top-1/2 h-4 -translate-y-1/2 overflow-hidden rounded-md",
                      isParent ? "bg-primary/25" : "bg-primary/70",
                      r.status === "blocked" && "bg-rose-500/60",
                      r.status === "done" && "bg-emerald-500/70",
                    )}
                    style={{ left: `${Math.max(0, s)}%`, width: `${Math.max(1, w)}%` }}
                  >
                    <div className="h-full bg-primary/60" style={{ width: `${r.progress}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface CalEvt { id: string; title: string; date: string; kind: string }

function ProjectCalendar({
  events,
  onEdit,
  onDelete,
}: {
  events: CalEvt[];
  onEdit: (e: CalEvt) => void;
  onDelete: (e: CalEvt) => void;
}) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));

  const eventMap: Record<string, CalEvt[]> = {};
  events.forEach((e) => {
    const k = new Date(e.date).toDateString();
    (eventMap[k] ??= []).push(e);
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base">{first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (<div key={d} className="py-2">{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            const evts = c ? eventMap[c.toDateString()] ?? [] : [];
            const isToday = c && c.toDateString() === now.toDateString();
            return (
              <div key={i} className={cn(
                "min-h-24 rounded-lg border p-1.5",
                !c && "border-transparent bg-transparent",
                isToday && "ring-2 ring-primary",
              )}>
                {c && (
                  <>
                    <div className="text-xs font-medium">{c.getDate()}</div>
                    <div className="mt-1 space-y-1">
                      {evts.map((e) => (
                        <div
                          key={e.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onEdit(e)}
                          onKeyDown={(k) => k.key === "Delete" && onDelete(e)}
                          className={cn(
                            "group flex items-center justify-between gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium",
                            e.kind === "milestone" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                            e.kind === "review" && "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                            e.kind === "meeting" && "bg-primary/15 text-primary",
                            e.kind === "delivery" && "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                          )}
                        >
                          <span className="truncate">{e.title}</span>
                          <button
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); onDelete(e); }}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="Delete event"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
