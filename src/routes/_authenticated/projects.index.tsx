import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart, Cell,
} from "recharts";
import {
  FolderKanban, TrendingUp, AlertTriangle, Target, Wallet, Sparkles, Plus, Search,
  FileSpreadsheet, Printer, Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectsStore, upsertProjectRecord } from "@/lib/projects/store";
import { fmtCompact, fmtINR, RagBadge, StatusPill, Progress, shortDate } from "@/components/projects/shared";
import { RecordDialog } from "@/components/record-dialog";
import { PROJECT_SCHEMAS } from "@/lib/projects/schemas";
import { projectEvm, projectHealth } from "@/lib/projects/intelligence";
import { portfolioReport, downloadCsv, type ProjectBundle } from "@/lib/projects/documents";
import { useQualityDoc } from "@/components/quality-doc-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({ meta: [{ title: "Projects Portfolio · Faith Automation ERP" }] }),
  component: PortfolioDashboard,
});


function PortfolioDashboard() {
  const s = useProjectsStore((s) => s);
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const navigate = useNavigate();

  const active = s.projects.filter((p) => p.status === "active");
  const totalValue = s.projects.reduce((sum, p) => sum + p.value, 0);
  const totalSpent = s.projects.reduce((sum, p) => sum + p.spent, 0);
  const totalBudget = s.projects.reduce((sum, p) => sum + p.budget, 0);
  const openRisks = s.risks.filter((r) => r.status === "open").length;
  const openIssues = s.issues.filter((i) => i.status !== "resolved").length;
  const upcomingMs = s.milestones.filter((m) => m.status === "upcoming" || m.status === "at-risk").length;
  const avgProgress = Math.round(active.reduce((sum, p) => sum + p.progress, 0) / Math.max(active.length, 1));

  const ragCounts = { green: 0, amber: 0, red: 0 };
  s.projects.forEach((p) => ragCounts[p.rag]++);

  const doc = useQualityDoc();
  const bundles: ProjectBundle[] = useMemo(
    () =>
      s.projects.map((p) => ({
        project: p,
        wbs: s.wbs.filter((w) => w.projectId === p.id),
        milestones: s.milestones.filter((m) => m.projectId === p.id),
        risks: s.risks.filter((r) => r.projectId === p.id),
        issues: s.issues.filter((i) => i.projectId === p.id),
        changes: s.changes.filter((c) => c.projectId === p.id),
        budget: s.budget.filter((b) => b.projectId === p.id),
        team: s.team.filter((t) => t.projectId === p.id),
      })),
    [s],
  );

  const intel = useMemo(
    () =>
      bundles.map((b) => {
        const evm = projectEvm(b.project, b.wbs, b.budget);
        return {
          id: b.project.id,
          evm,
          health: projectHealth(b.project, evm, b.risks, b.issues, b.changes, b.milestones),
        };
      }),
    [bundles],
  );
  const intelById = useMemo(() => Object.fromEntries(intel.map((x) => [x.id, x])), [intel]);
  const avgHealth = Math.round(intel.reduce((sum, x) => sum + x.health.score, 0) / Math.max(intel.length, 1));
  const avgSpi = intel.length ? intel.reduce((s2, x) => s2 + x.evm.spi, 0) / intel.length : 1;
  const avgCpi = intel.length ? intel.reduce((s2, x) => s2 + x.evm.cpi, 0) / intel.length : 1;
  const atRisk = intel.filter((x) => x.health.score < 60);
  const forecastEac = intel.reduce((s2, x) => s2 + x.evm.eac, 0);


  const kpis = [
    { label: "Active Projects", value: String(active.length), sub: `${s.projects.length} total`, icon: FolderKanban },
    { label: "Order Value", value: fmtCompact(totalValue), sub: `Budget ${fmtCompact(totalBudget)}`, icon: TrendingUp },
    { label: "Cost Consumed", value: fmtCompact(totalSpent), sub: `${Math.round((totalSpent / totalBudget) * 100)}% of budget`, icon: Wallet },
    { label: "Portfolio Progress", value: `${avgProgress}%`, sub: `${upcomingMs} milestones due`, icon: Target },
  ];

  const budgetSeries = s.projects.map((p) => ({
    name: p.code,
    Planned: p.budget,
    Actual: p.spent,
  }));

  const trend = Array.from({ length: 8 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 7 + i);
    return {
      m: d.toLocaleDateString("en-IN", { month: "short" }),
      plan: totalBudget / 8 * (i + 1),
      actual: totalSpent / 8 * (i + 1) * (0.85 + Math.random() * 0.3),
    };
  });

  const filtered = s.projects.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.code.toLowerCase().includes(q.toLowerCase()) ||
      p.customerName.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="flex min-h-full flex-col">
      {/* Hero */}
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 sm:p-6 lg:p-8 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">Projects Portfolio</h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Project-Centric</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Enterprise delivery cockpit — WBS, milestones, budget, risks, issues, change requests and RAG health across every BIW & automation program.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link
                  to="/ai-assistant"
                  search={{ q: "How is my project portfolio performing? Show schedule and cost forecast" }}
                >
                  <Sparkles className="h-4 w-4 text-primary" /> Ask AI
                </Link>
              </Button>
              <Button
                variant="outline" size="sm" className="gap-2"
                onClick={() => doc.show(portfolioReport(bundles))}
              >
                <Printer className="h-4 w-4" /> Portfolio Report
              </Button>
              <Button
                variant="outline" size="sm" className="gap-2"
                onClick={() => {
                  downloadCsv(
                    "portfolio-performance",
                    ["Code", "Project", "Customer", "Status", "Health", "SPI", "CPI", "Value", "EAC", "Margin %"],
                    bundles.map((b) => {
                      const x = intelById[b.project.id]!;
                      return [
                        b.project.code, b.project.name, b.project.customerName, b.project.status,
                        x.health.score, x.evm.spi, x.evm.cpi, b.project.value, Math.round(x.evm.eac), x.evm.profitability,
                      ];
                    }),
                  );
                  toast.success("Portfolio exported to Excel (CSV)");
                }}
              >
                <FileSpreadsheet className="h-4 w-4" /> Export
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> New Project
              </Button>

            </div>
          </div>
        </div>
      </div>

      <RecordDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="New Project"
        description="Create a new delivery program."
        fields={PROJECT_SCHEMAS.projects}
        initial={{
          code: `PRJ-${1000 + s.projects.length + 1}`,
          status: "planning",
          rag: "green",
          spent: 0,
          progress: 0,
          manager: "You",
        }}
        onSubmit={(values) => {
          const id = upsertProjectRecord("projects", values);
          setFormOpen(false);
          toast.success("Project created");
          navigate({ to: "/projects/$id", params: { id } });
        }}
        submitLabel="Create project"
      />

      {doc.dialog}

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Portfolio intelligence */}
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="font-display text-base">Portfolio Intelligence</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px]">Earned Value Management</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Avg Health Score", value: `${avgHealth}`, sub: `${atRisk.length} project(s) below 60` },
              { label: "Portfolio SPI", value: avgSpi.toFixed(2), sub: avgSpi >= 1 ? "Ahead of schedule" : "Behind schedule" },
              { label: "Portfolio CPI", value: avgCpi.toFixed(2), sub: avgCpi >= 1 ? "Cost efficient" : "Cost overrun trend" },
              { label: "Forecast Cost (EAC)", value: fmtCompact(forecastEac), sub: `vs budget ${fmtCompact(totalBudget)}` },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</div>
                <div className="mt-1 font-display text-2xl font-semibold">{m.value}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{m.sub}</div>
              </div>
            ))}
            {atRisk.length > 0 && (
              <div className="md:col-span-2 lg:col-span-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Projects needing intervention
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {atRisk.slice(0, 4).map((x) => {
                    const p = s.projects.find((pp) => pp.id === x.id)!;
                    return (
                      <Link
                        key={x.id}
                        to="/projects/$id"
                        params={{ id: x.id }}
                        className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{p.code} · {p.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {x.health.drivers.map((d) => d.label).join(", ") || "Watchlist"}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-rose-600">{x.health.score}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPIs */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <k.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{k.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Cumulative Cost — Plan vs Actual</CardTitle>
              <p className="text-xs text-muted-foreground">Portfolio S-curve, trailing 8 months</p>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="prj-act" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="m" className="text-xs" tickLine={false} axisLine={false} />
                    <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(Number(v))} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => fmtINR(v)}
                    />
                    <Area type="monotone" dataKey="plan" stroke="hsl(215 20% 65%)" strokeDasharray="4 4" fill="transparent" strokeWidth={2} />
                    <Area type="monotone" dataKey="actual" stroke="hsl(217 91% 60%)" fill="url(#prj-act)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Portfolio Health (RAG)</CardTitle>
              <p className="text-xs text-muted-foreground">{s.projects.length} projects</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["green", "amber", "red"] as const).map((r) => {
                const pct = Math.round((ragCounts[r] / Math.max(s.projects.length, 1)) * 100);
                return (
                  <div key={r}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <RagBadge rag={r} />
                      <span className="font-mono text-muted-foreground">{ragCounts[r]} · {pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                );
              })}
              <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 text-center">
                <div>
                  <div className="text-2xl font-semibold text-rose-600">{openRisks}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Open Risks</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-amber-600">{openIssues}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Open Issues</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Project Budget — Planned vs Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(Number(v))} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => fmtINR(v)}
                  />
                  <Bar dataKey="Planned" fill="hsl(215 20% 65%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]}>
                    {budgetSeries.map((_, i) => <Cell key={i} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Project list */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-display text-base">All Projects</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects…"
                className="h-9 w-64 pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  to="/projects/$id"
                  params={{ id: p.id }}
                  className="grid grid-cols-1 gap-3 p-4 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                      <StatusPill status={p.status} />
                      <RagBadge rag={p.rag} />
                      {intelById[p.id] && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-[10px]",
                            intelById[p.id]!.health.score < 60 && "border-rose-500/40 text-rose-600",
                            intelById[p.id]!.health.score >= 75 && "border-emerald-500/40 text-emerald-600",
                          )}
                        >
                          <Gauge className="h-3 w-3" /> {intelById[p.id]!.health.score}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 truncate font-medium">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.customerName} · PM {p.manager}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-mono font-medium">{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} />
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      {shortDate(p.startDate)} → {shortDate(p.endDate)}
                      {intelById[p.id] && (
                        <> · SPI {intelById[p.id]!.evm.spi.toFixed(2)} · CPI {intelById[p.id]!.evm.cpi.toFixed(2)}</>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">{fmtCompact(p.value)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Spent {fmtCompact(p.spent)} / {fmtCompact(p.budget)}
                    </div>
                    {intelById[p.id] && (
                      <div className="text-[11px] text-muted-foreground">
                        EAC {fmtCompact(intelById[p.id]!.evm.eac)} · margin {intelById[p.id]!.evm.profitability}%
                      </div>
                    )}
                  </div>
                  <div className="hidden items-center md:flex">
                    <AlertTriangle className={p.rag === "red" ? "h-4 w-4 text-rose-500" : "hidden"} />
                  </div>

                </Link>
              ))}
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">No projects match your search.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
