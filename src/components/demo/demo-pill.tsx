import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ListChecks, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_STEPS } from "@/lib/demo/flows";
import { endSession, readSession, subscribeSession, updateSession } from "@/lib/demo/reset";

/** Floating presenter pill shown while a demo session is running. */
export function DemoPill() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [session, setSession] = useState(() => readSession());

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    return subscribeSession(sync);
  }, []);

  if (!session.active || pathname === "/demo") return null;

  const index = Math.min(Math.max(session.index, 0), DEMO_STEPS.length - 1);
  const step = DEMO_STEPS[index];
  const prev = DEMO_STEPS[index - 1];
  const next = DEMO_STEPS[index + 1];

  const go = (i: number) => updateSession({ index: i, done: Array.from(new Set([...session.done, step.id])) });

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 print:hidden">
      <div className="pointer-events-auto flex max-w-3xl items-center gap-2 rounded-full border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur">
        <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Step {index + 1}/{DEMO_STEPS.length}
        </span>
        <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:block">{step.title}</span>

        <div className="ml-1 flex items-center gap-1">
          {prev ? (
            <Button asChild size="icon" variant="ghost" className="h-7 w-7" title={prev.title}>
              <Link to={prev.to as never} params={prev.params as never} onClick={() => go(index - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          {next ? (
            <Button asChild size="sm" variant="secondary" className="h-7 gap-1 px-2.5 text-xs" title={next.title}>
              <Link to={next.to as never} params={next.params as never} onClick={() => go(index + 1)}>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
            <Link to="/demo">
              <ListChecks className="h-3.5 w-3.5" /> Guide
            </Link>
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" title="End demo" onClick={endSession}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
