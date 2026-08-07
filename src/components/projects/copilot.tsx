import { useMemo, useState } from "react";
import {
  Sparkles, TrendingDown, TrendingUp, Wand2, ShieldAlert, CalendarClock,
  Users2, CheckCircle2, RefreshCw, Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Progress, RagBadge, fmtCompact, fmtINR } from "@/components/projects/shared";
import { cn } from "@/lib/utils";
import { upsertProjectRecord } from "@/lib/projects/store";
import {
  projectEvm, projectHealth, nextBestActions, suggestRisks, delayedTasks,
  rescheduleFromDelays, autoTriageIssues, resourceLoads, milestoneAlerts, criticalPath,
  type Evm, type HealthResult,
} from "@/lib/projects/intelligence";
import {
  recommendTemplate, generatePlan, applyPlan, PROJECT_TEMPLATES,
  type ProjectTemplate, type GeneratedPlan,
} from "@/lib/projects/templates";
import type {
  Project, WbsNode, Milestone, Risk, Issue, ChangeRequest, BudgetLine, TeamMember,
} from "@/lib/projects/types";

export interface IntelInput {
  project: Project;
  wbs: WbsNode[];
  milestones: Milestone[];
  risks: Risk[];
  issues: Issue[];
  changes: ChangeRequest[];
  budget: BudgetLine[];
  team: TeamMember[];
}

export function useProjectIntel(i: IntelInput): { evm: Evm; health: HealthResult } {
  return useMemo(() => {
    const evm = projectEvm(i.project, i.wbs, i.budget);
    const health = projectHealth(i.project, evm, i.risks, i.issues, i.changes, i.milestones);
    return { evm, health };
  }, [i.project, i.wbs, i.budget, i.risks, i.issues, i.changes, i.milestones]);
}

/** Earned-value strip: SPI, CPI, EAC, forecast finish and margin. */
export function EvmStrip({ evm, health }: { evm: Evm; health: HealthResult }) {
  const items = [
    { label: "Health Score", value: `${health.score}`, sub: health.rag, good: health.score >= 75, warn: health.score < 50 },
    { label: "SPI", value: evm.spi.toFixed(2), sub: `${evm.actualPct}% vs ${evm.plannedPct}% planned`, good: evm.spi >= 1, warn: evm.spi < 0.9 },
    { label: "CPI", value: evm.cpi.toFixed(2), sub: `AC ${fmtCompact(evm.ac)} of ${fmtCompact(evm.bac)}`, good: evm.cpi >= 1, warn: evm.cpi < 0.9 },
    { label: "EAC", value: fmtCompact(evm.eac), sub: `${evm.vac >= 0 ? "Under" : "Over"} by ${fmtCompact(Math.abs(evm.vac))}`, good: evm.vac >= 0, warn: evm.vac < 0 },
    { label: "Forecast Finish", value: new Date(evm.forecastFinish).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), sub: evm.scheduleSlipDays > 0 ? `+${evm.scheduleSlipDays}d slip` : "On baseline", good: evm.scheduleSlipDays <= 0, warn: evm.scheduleSlipDays > 14 },
    { label: "Forecast Margin", value: `${evm.profitability}%`, sub: "on contract value", good: evm.profitability >= 12, warn: evm.profitability < 5 },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{it.label}</div>
            {it.warn ? <TrendingDown className="h-3.5 w-3.5 text-rose-500" /> : it.good ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <Gauge className="h-3.5 w-3.5 text-amber-500" />}
          </div>
          <div className={cn("mt-1 font-display text-xl font-semibold capitalize",
            it.warn ? "text-rose-600" : it.good ? "text-emerald-600" : "text-amber-600")}>{it.value}</div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

/** AI Project Copilot panel: recommendations plus one-click automations. */
export function ProjectCopilotPanel({
  i, evm, health, onGoTab,
}: { i: IntelInput; evm: Evm; health: HealthResult; onGoTab: (tab: string) => void }) {
  const actions = useMemo(
    () => nextBestActions(i.project, evm, i.wbs, i.milestones, i.risks, i.issues, i.changes, i.team),
    [i, evm],
  );
  const emerging = useMemo(() => suggestRisks(i.project.id), [i]);
  const delayed = useMemo(() => delayedTasks(i.wbs), [i.wbs]);
  const cp = useMemo(() => criticalPath(i.wbs), [i.wbs]);
  const alerts = useMemo(() => milestoneAlerts(i.milestones), [i.milestones]);
  const conflicts = useMemo(
    () => resourceLoads().filter((l) => l.conflict && i.team.some((t) => t.name === l.name)),
    [i.team],
  );

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="font-display text-base">AI Project Copilot</CardTitle>
        </div>
        <RagBadge rag={health.rag} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Health score</span>
            <span className="font-mono font-medium">{health.score}/100</span>
          </div>
          <Progress value={health.score} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {health.drivers.map((d) => (
              <Badge key={d.label} variant="outline" className="text-[10px]" title={d.detail}>
                {d.label} {d.delta}
              </Badge>
            ))}
            {health.drivers.length === 0 && <span className="text-xs text-muted-foreground">No detractors — all indicators within tolerance.</span>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next best actions</div>
          {actions.map((a) => (
            <button
              key={a.title}
              onClick={() => a.tab && onGoTab(a.tab)}
              className="flex w-full gap-2 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/40"
            >
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full",
                a.severity === "high" ? "bg-rose-500" : a.severity === "medium" ? "bg-amber-500" : "bg-emerald-500")} />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{a.title}</span>
                <span className="block text-xs text-muted-foreground">{a.detail}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline" size="sm" className="justify-start gap-2"
            onClick={() => {
              const moves = rescheduleFromDelays(i.project.id);
              if (!moves.length) return toast.info("No delayed tasks — schedule is intact");
              toast.success(`Rescheduled ${moves.length} item(s)`, { description: moves.slice(0, 3).join(" · ") });
            }}
          >
            <RefreshCw className="h-4 w-4 text-primary" /> Auto-reschedule delays ({delayed.length})
          </Button>
          <Button
            variant="outline" size="sm" className="justify-start gap-2"
            onClick={() => {
              const n = autoTriageIssues(i.project.id);
              toast[n ? "success" : "info"](n ? `Triaged and assigned ${n} issue(s)` : "All issues already triaged");
            }}
          >
            <Users2 className="h-4 w-4 text-primary" /> Auto-triage & assign issues
          </Button>
          <Button
            variant="outline" size="sm" className="justify-start gap-2"
            disabled={!emerging.length}
            onClick={() => {
              emerging.forEach((r) => upsertProjectRecord("risks", { ...r, source: undefined }, i.project.id));
              toast.success(`${emerging.length} emerging risk(s) added to the register`);
            }}
          >
            <ShieldAlert className="h-4 w-4 text-primary" /> Add {emerging.length} emerging risk(s)
          </Button>
          <Button
            variant="outline" size="sm" className="justify-start gap-2"
            onClick={() => {
              const overdue = alerts.filter((a) => a.level !== "watch");
              if (!overdue.length) return toast.info("No milestone alerts");
              overdue.forEach((a) => {
                if (a.milestone.status !== "at-risk")
                  upsertProjectRecord("milestones", { ...a.milestone, status: a.dueInDays < 0 ? "missed" : "at-risk" }, i.project.id);
              });
              toast.success(`${overdue.length} milestone alert(s) escalated to stakeholders`);
            }}
          >
            <CalendarClock className="h-4 w-4 text-primary" /> Escalate milestone alerts ({alerts.length})
          </Button>
        </div>

        <div className="grid gap-3 border-t pt-3 text-xs sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Critical path</div>
            <div className="mt-0.5 font-medium">{cp.length} activities</div>
            <div className="truncate text-muted-foreground">{cp[0]?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Resource conflicts</div>
            <div className="mt-0.5 font-medium">{conflicts.length}</div>
            <div className="truncate text-muted-foreground">{conflicts[0] ? `${conflicts[0].name} @ ${conflicts[0].totalAllocation}%` : "None"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Cash at milestones</div>
            <div className="mt-0.5 font-medium">
              {fmtINR(i.milestones.filter((m) => m.status !== "achieved").reduce((s, m) => s + (m.billing ?? 0), 0))}
            </div>
            <div className="text-muted-foreground">unbilled pipeline</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** AI planning wizard — recommend a template and generate the full execution plan. */
export function AiPlanDialog({
  open, onOpenChange, project,
}: { open: boolean; onOpenChange: (v: boolean) => void; project: Project }) {
  const rec = useMemo(() => recommendTemplate(project), [project]);
  const [templateId, setTemplateId] = useState(rec.template.id);
  const [replace, setReplace] = useState(false);
  const template: ProjectTemplate = PROJECT_TEMPLATES.find((t) => t.id === templateId) ?? rec.template;
  const plan: GeneratedPlan = useMemo(() => generatePlan(project, template), [project, template]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Wand2 className="h-4 w-4 text-primary" /> AI Project Planner
          </DialogTitle>
          <DialogDescription>
            Recommended methodology for {project.code} — review, switch template or apply to generate the full plan.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{rec.template.name}</div>
              <Badge variant="outline">{rec.confidence}% confidence</Badge>
            </div>
            <ul className="mt-1.5 list-inside list-disc text-xs text-muted-foreground">
              {rec.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {PROJECT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={cn("rounded-lg border p-3 text-left transition-colors hover:bg-muted/40",
                  t.id === templateId && "border-primary ring-1 ring-primary/30")}
              >
                <div className="text-sm font-medium">{t.name}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{t.description}</div>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Phases / tasks", `${plan.wbs.length} / ${plan.wbs.reduce((s, p) => s + p.children.length, 0)}`],
              ["Milestones", String(plan.milestones.length)],
              ["Budget lines", String(plan.budget.length)],
              ["Risk register", String(plan.risks.length)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                <div className="mt-1 font-display text-lg font-semibold">{v}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border">
            <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Generated schedule · estimated finish {new Date(plan.estimatedFinish).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
            <div className="divide-y">
              {plan.wbs.map((p) => (
                <div key={p.code} className="p-3">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{p.code} {p.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{p.start} → {p.end}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {p.children.map((c) => (
                      <Badge key={c.code} variant="secondary" className="text-[10px] font-normal" title={c.deliverable}>
                        {c.code} {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Milestones & billing</div>
              <div className="mt-2 space-y-1 text-xs">
                {plan.milestones.map((m) => (
                  <div key={m.name} className="flex justify-between gap-2">
                    <span className="truncate">{m.name}</span>
                    <span className="font-mono text-muted-foreground">{m.due} · {fmtCompact(m.billing)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget structure</div>
              <div className="mt-2 space-y-1 text-xs">
                {plan.budget.map((b) => (
                  <div key={b.category} className="flex justify-between gap-2">
                    <span>{b.category}</span>
                    <span className="font-mono text-muted-foreground">{fmtCompact(b.planned)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Replace existing WBS, milestones, budget, risks and calendar for this project
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="gap-2"
            onClick={() => {
              const created = applyPlan(project.id, plan, { replaceExisting: replace });
              onOpenChange(false);
              toast.success("Project plan generated", {
                description: Object.entries(created).map(([k, v]) => `${v} ${k}`).join(" · "),
              });
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> Apply plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
