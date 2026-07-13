import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  User,
  RotateCcw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { answer, SUGGESTIONS, type CopilotResponse, type ResponseCard } from "@/lib/copilot/engine";

export const Route = createFileRoute("/_authenticated/ai-assistant")({
  head: () => ({ meta: [{ title: "AI Copilot · Faith Automation ERP" }] }),
  component: CopilotPage,
});

type Turn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; response: CopilotResponse; thinking?: boolean };

const PIE_COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#64748b"];

function CopilotPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, pending]);

  useEffect(() => {
    taRef.current?.focus();
  }, [pending]);

  const ask = (q: string) => {
    const query = q.trim();
    if (!query || pending) return;
    const uid = crypto.randomUUID();
    const aid = crypto.randomUUID();
    setTurns((t) => [...t, { id: uid, role: "user", text: query }]);
    setInput("");
    setPending(true);
    setTimeout(() => {
      const response = answer(query);
      setTurns((t) => [
        ...t,
        { id: aid, role: "assistant", text: response.headline, response },
      ]);
      setPending(false);
    }, 450);
  };

  const reset = () => setTurns([]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="border-b bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-4 p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight">Executive Copilot</h1>
                <Badge className="border-0 bg-accent/20 text-accent-foreground">Beta</Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Ask about delays, budgets, RFQs, procurement, engineering. Answers include live cards, charts, and references.
              </p>
            </div>
          </div>
          {turns.length > 0 && (
            <Button variant="outline" size="sm" onClick={reset} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" />
              New chat
            </Button>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          {turns.length === 0 ? <EmptyState onPick={ask} /> : (
            <div className="space-y-8">
              {turns.map((t) => (t.role === "user" ? <UserTurn key={t.id} text={t.text} /> : <AssistantTurn key={t.id} turn={t} onPick={ask} />))}
              {pending && <ThinkingBubble />}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl p-3 sm:p-4">
          <div className="rounded-2xl border bg-card p-2 shadow-elevated">
            <div className="flex items-end gap-2">
              <Textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                placeholder="Ask Faith AI…  e.g. Which projects are delayed?"
                className="min-h-12 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                disabled={pending}
              />
              <Button size="icon" className="h-10 w-10 shrink-0" onClick={() => ask(input)} disabled={pending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={pending}
                className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-8 py-8 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <div className="max-w-xl">
        <h2 className="font-display text-xl font-semibold">Your always-on operations copilot</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          I read your live project, CRM, and engineering data to surface exceptions, financial variance, and bottlenecks — with citations back to the source records.
        </p>
      </div>
      <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-md"
          >
            <span className="text-sm font-medium">{s}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>
    </div>
  );
}

function UserTurn({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="flex items-start gap-3">
        <div className="max-w-2xl rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
          {text}
        </div>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted ring-1 ring-border">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "120ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "240ms" }} />
          <span className="ml-2 text-xs text-muted-foreground">Analyzing your operations…</span>
        </div>
      </div>
    </div>
  );
}

function AssistantTurn({ turn, onPick }: { turn: Extract<Turn, { role: "assistant" }>; onPick: (q: string) => void }) {
  const { response } = turn;
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="rounded-2xl rounded-tl-sm border bg-card p-4 shadow-sm">
          <div className="font-display text-base font-semibold">{response.headline}</div>
          <div className="mt-1 text-sm text-muted-foreground">{response.summary}</div>
        </div>

        {response.cards.some((c) => c.kind === "kpi") && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {response.cards.filter((c): c is Extract<ResponseCard, { kind: "kpi" }> => c.kind === "kpi").map((c, i) => (
              <KpiTile key={i} card={c} />
            ))}
          </div>
        )}

        {response.cards
          .filter((c) => c.kind !== "kpi")
          .map((c, i) => (
            <div key={i}>{renderCard(c)}</div>
          ))}

        {response.references.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">References</div>
              <div className="flex flex-wrap gap-2">
                {response.references.map((r) => (
                  <Link
                    key={r.to}
                    to={r.to}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium transition hover:border-primary/40 hover:text-primary"
                  >
                    {r.label}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {response.followUps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {response.followUps.map((f) => (
              <button
                key={f}
                onClick={() => onPick(f)}
                className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {f} →
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiTile({ card }: { card: Extract<ResponseCard, { kind: "kpi" }> }) {
  const toneMap = {
    default: { icon: TrendingUp, color: "text-muted-foreground", bg: "bg-muted/50" },
    positive: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    warning: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
    danger: { icon: TrendingDown, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
  } as const;
  const cfg = toneMap[card.tone ?? "default"];
  const Icon = cfg.icon;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">{card.label}</div>
          <div className={cn("grid h-6 w-6 place-items-center rounded-md", cfg.bg)}>
            <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
          </div>
        </div>
        <div className="mt-1.5 font-display text-xl font-semibold tracking-tight">{card.value}</div>
        {card.hint && <div className="text-[11px] text-muted-foreground">{card.hint}</div>}
      </CardContent>
    </Card>
  );
}

function renderCard(card: Exclude<ResponseCard, { kind: "kpi" }>) {
  if (card.kind === "text") {
    return (
      <Card>
        <CardContent className="p-4 text-sm">{card.body}</CardContent>
      </Card>
    );
  }
  if (card.kind === "table") {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-3 text-sm font-semibold">{card.title}</div>
          {card.rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{card.emptyText ?? "No records."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {card.columns.map((c) => (
                      <th
                        key={c.key}
                        className={cn(
                          "px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground",
                          c.align === "right" ? "text-right" : "text-left",
                        )}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {card.rows.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                      {card.columns.map((c) => (
                        <td key={c.key} className={cn("px-3 py-2", c.align === "right" ? "text-right tabular-nums" : "")}>
                          {r[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  // chart
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 text-sm font-semibold">{card.title}</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            {card.chart === "bar" ? (
              <BarChart data={card.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {card.data.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.tone === "danger" ? "#ef4444" : d.tone === "warning" ? "#f59e0b" : d.tone === "positive" ? "#10b981" : "#2563eb"}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie data={card.data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {card.data.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
        {card.chart === "pie" && (
          <div className="mt-3 flex flex-wrap gap-3">
            {card.data.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
