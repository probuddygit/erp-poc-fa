import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Send, MessageSquare, Zap, FileSearch, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/ai-assistant")({
  head: () => ({ meta: [{ title: "AI Assistant · Faith Automation ERP" }] }),
  component: AIAssistantPage,
});

const suggestions = [
  { icon: FileSearch, t: "Summarize project BIW-2038 status", d: "Fetch schedule, budget, and open risks." },
  { icon: Zap, t: "What's slowing down Weld Cell 3?", d: "Correlate downtime, NCRs, and shift data." },
  { icon: Lightbulb, t: "Draft an RFQ response for Tata", d: "Pull latest costing and lead-times." },
  { icon: MessageSquare, t: "Compare vendor performance", d: "Rank by OTD, quality, and price variance." },
];

function AIAssistantPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Faith AI Assistant</h1>
            <Badge className="border-0 bg-accent/20 text-accent-foreground">Beta</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Your always-on copilot across projects, engineering, procurement, production, quality, and finance.
          </p>
        </div>
      </div>

      <Card className="flex-1 border-primary/15 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardContent className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-background shadow-sm ring-1 ring-border">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div className="max-w-lg">
            <h2 className="font-display text-xl font-semibold">Ask anything about your operations</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The AI assistant will connect to your live ERP data once modules are activated.
              Try a suggestion or type a question below.
            </p>
          </div>
          <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
            {suggestions.map((s) => (
              <button
                key={s.t}
                className="group flex items-start gap-3 rounded-xl border bg-background/70 p-4 text-left transition hover:border-primary/40 hover:bg-background"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{s.t}</div>
                  <div className="text-xs text-muted-foreground">{s.d}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border bg-card p-2 shadow-elevated">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Ask Faith AI…  (e.g. Which POs are likely to slip this week?)"
            className="min-h-12 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button size="icon" className="h-10 w-10 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
