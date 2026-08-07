import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Presentation, Play, RotateCcw, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { DEMO_ACTS, DEMO_MINUTES, DEMO_STEPS } from "@/lib/demo/flows";
import { readSession, resetDemoData, subscribeSession, updateSession } from "@/lib/demo/reset";

export const Route = createFileRoute("/_authenticated/demo")({
  head: () => ({
    meta: [
      { title: "Demo Guide · Faith Automation ERP" },
      {
        name: "description",
        content:
          "A 30-minute customer demo runbook for the Faith Automation ERP with deep links into every screen of the lead-to-cash flow.",
      },
    ],
  }),
  component: DemoGuide,
});

function DemoGuide() {
  const [session, setSession] = useState(() => readSession());

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    return subscribeSession(sync);
  }, []);

  const doneSet = useMemo(() => new Set(session.done), [session.done]);
  const pct = Math.round((doneSet.size / DEMO_STEPS.length) * 100);

  const toggle = (id: string) => {
    const next = new Set(session.done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateSession({ done: Array.from(next) });
  };

  const start = () => {
    updateSession({ active: true, index: 0, done: [] });
    toast.success("Demo started — use the pill at the bottom to move between steps.");
  };

  const openStep = (id: string) => {
    const index = DEMO_STEPS.findIndex((s) => s.id === id);
    updateSession({ active: true, index: index < 0 ? 0 : index, done: Array.from(new Set([...session.done, id])) });
  };

  const reset = () => {
    updateSession({ active: false, index: 0, done: [] });
    toast.success("Restoring seeded demo data…");
    resetDemoData();
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Presentation className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">Demo Guide</h1>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {DEMO_MINUTES} min · {DEMO_STEPS.length} steps
                  </Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  A scripted lead-to-cash walkthrough for prospective customers. Each step jumps straight to the screen and
                  gives you the line to say.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> Reset demo data
              </Button>
              <Button asChild size="sm" className="gap-2">
                <Link to={DEMO_STEPS[0].to as never} params={DEMO_STEPS[0].params as never} onClick={start}>
                  <Play className="h-4 w-4" /> Start demo
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Progress value={pct} className="h-2 max-w-md" />
            <span className="text-xs text-muted-foreground">
              {doneSet.size} of {DEMO_STEPS.length} steps covered
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        {DEMO_ACTS.map((act) => {
          const actDone = act.steps.every((s) => doneSet.has(s.id));
          return (
            <Card key={act.id} className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 font-display text-base">
                    {actDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
                    <span className="text-muted-foreground">{act.act}</span> · {act.title}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{act.talkTrack}</p>
                </div>
                <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                  <Clock className="h-3 w-3" /> {act.minutes} min
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {act.steps.map((step) => (
                  <div key={step.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Checkbox
                      checked={doneSet.has(step.id)}
                      onCheckedChange={() => toggle(step.id)}
                      className="mt-0.5"
                      aria-label={`Mark ${step.title} as covered`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{step.title}</div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{step.say}</p>
                    </div>
                    <Button asChild size="sm" variant="secondary" className="shrink-0 gap-1.5">
                      <Link to={step.to as never} params={step.params as never} onClick={() => openStep(step.id)}>
                        Go <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
