import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Banknote, Brain, Copy, Landmark, PiggyBank, ReceiptText, Send, ShieldCheck, Sparkles, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiCopilotPanel, type AiAction } from "@/components/ai/module-copilot";
import { useFinance } from "@/lib/finance/store";
import {
  financeActions, detectAnomalies, reconciliationSuggestions, budgetVariances,
  profitability, workingCapital, financeKpis, cashForecast,
} from "@/lib/finance/intelligence";
import { buildFactsJson } from "@/lib/copilot/facts";
import { fmtCompact } from "@/components/projects/shared";

type CopilotKey = "cash" | "ar" | "ap" | "controls" | "margin";

const COPILOTS: {
  key: CopilotKey;
  label: string;
  icon: typeof Banknote;
  blurb: string;
  prompts: string[];
}[] = [
  {
    key: "cash",
    label: "Cash Copilot",
    icon: Banknote,
    blurb: "13-week direct cash forecast, shortfall weeks, collection pull-forward and payment deferral advice.",
    prompts: [
      "Where does our 13-week cash forecast dip and by how much?",
      "Which collections should we pull forward to protect cash?",
      "What is our cash runway and conversion cycle today?",
    ],
  },
  {
    key: "ar",
    label: "Receivables Copilot",
    icon: ReceiptText,
    blurb: "Ageing buckets, overdue chasing order, top customer exposure and DSO improvement levers.",
    prompts: [
      "Show our AR ageing and the top overdue customers",
      "Which invoices should we chase first this week?",
      "How can we bring DSO down by 10 days?",
    ],
  },
  {
    key: "ap",
    label: "Payables & Match Copilot",
    icon: Landmark,
    blurb: "3-way match exceptions, duplicate and price-variance bills, approval queue and payment timing.",
    prompts: [
      "Which vendor bills failed the 3-way match and why?",
      "Are there duplicate or suspicious payments pending?",
      "What should we pay this week without hurting cash?",
    ],
  },
  {
    key: "controls",
    label: "Controls & Audit Copilot",
    icon: ShieldCheck,
    blurb: "Anomaly detection, unposted journals, unreconciled bank items and period-close blockers.",
    prompts: [
      "List the highest-severity finance anomalies right now",
      "What is blocking this period's close?",
      "Which bank transactions are still unreconciled?",
    ],
  },
  {
    key: "margin",
    label: "Margin & Budget Copilot",
    icon: PiggyBank,
    blurb: "Project and customer profitability, budget overruns, EBITDA drivers and cost-centre variance.",
    prompts: [
      "Which projects are eroding margin and why?",
      "Which budget lines will overrun this year?",
      "Explain our EBITDA movement and biggest cost drivers",
    ],
  },
];

const BUCKETS: Record<CopilotKey, string[]> = {
  cash: ["cash-risk", "bank-reco"],
  ar: ["ar-chase", "ar-issue"],
  ap: ["ap-approve", "ap-dup"],
  controls: ["gl-drafts", "close-run", "tax-open", "asset-dep"],
  margin: ["budget-overrun"],
};

export function FinanceCopilotSection() {
  const state = useFinance((s) => s);

  const actions = useMemo(() => financeActions(state), [state]);
  const anomalies = useMemo(() => detectAnomalies(state), [state]);
  const matches = useMemo(() => reconciliationSuggestions(state), [state]);
  const variances = useMemo(() => budgetVariances(state), [state]);
  const projectMargin = useMemo(() => profitability(state, "project"), [state]);
  const wc = useMemo(() => workingCapital(state), [state]);
  const kpis = useMemo(() => financeKpis(state), [state]);
  const forecast = useMemo(() => cashForecast(state), [state]);

  const grouped = useMemo(() => {
    const byKey = (k: CopilotKey) => actions.filter((a) => BUCKETS[k].includes(a.id));

    const controlExtras: AiAction[] = anomalies.slice(0, 4).map((a) => ({
      id: `anom-${a.id}`,
      title: a.title,
      detail: a.detail,
      severity: a.severity,
      impact: a.reference,
    }));

    const marginExtras: AiAction[] = projectMargin
      .filter((p) => p.marginPct < 12)
      .slice(0, 4)
      .map((p) => ({
        id: `margin-${p.key}`,
        title: `${p.label} margin at ${p.marginPct.toFixed(1)}%`,
        detail: `Revenue ${fmtCompact(p.revenue)} against cost ${fmtCompact(p.cost)} leaves ${fmtCompact(p.margin)} of contribution — below the 12% guardrail.`,
        severity: p.marginPct < 5 ? "high" : "medium",
        impact: "Margin protection",
      }));

    const cashExtras: AiAction[] =
      matches.length > 0
        ? [
            {
              id: "cash-matches",
              title: `${matches.length} bank item(s) have a confident ledger match`,
              detail: `Top suggestion pairs ${matches[0]!.narration} with ${matches[0]!.suggestedRef} at ${matches[0]!.confidence}% confidence.`,
              severity: "low" as const,
              impact: "Faster cash visibility",
            },
          ]
        : [];

    return [
      {
        key: "cash" as const,
        title: "Cash Copilot",
        actions: [...byKey("cash"), ...cashExtras].slice(0, 6),
        ask: "Summarise our cash position, 13-week forecast risk and what to do about it",
      },
      {
        key: "ar" as const,
        title: "Receivables Copilot",
        actions: byKey("ar").slice(0, 6),
        ask: "Give me an AR ageing summary and a collection plan for the top exposures",
      },
      {
        key: "ap" as const,
        title: "Payables & Match Copilot",
        actions: byKey("ap").slice(0, 6),
        ask: "Review payables: match exceptions, duplicates and what to pay this week",
      },
      {
        key: "controls" as const,
        title: "Controls & Audit Copilot",
        actions: [...byKey("controls"), ...controlExtras].slice(0, 6),
        ask: "What control exceptions and period-close blockers need attention?",
      },
      {
        key: "margin" as const,
        title: "Margin & Budget Copilot",
        actions: [...byKey("margin"), ...marginExtras].slice(0, 6),
        ask: "Explain margin performance, budget overruns and the biggest cost drivers",
      },
    ];
  }, [actions, anomalies, matches, projectMargin]);

  const [question, setQuestion] = useState("");
  const chatRef = useRef<HTMLTextAreaElement>(null);
  const ask = useAskFinance();

  const runPrompt = useCallback(
    (p: string) => {
      setQuestion(p);
      chatRef.current?.focus();
      void ask.send(p);
    },
    [ask],
  );

  const riskWeeks = forecast.filter((w) => w.risk).length;

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">Finance AI Copilot</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Five specialised assistants grounded in the live ledger — receivables, payables, cash, controls and margin.
          Every recommendation traces back to a posted document, and the chat answers only from current ERP data.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Cash" value={fmtCompact(wc.cash)} />
        <Kpi label="Receivables" value={fmtCompact(wc.receivables)} />
        <Kpi label="Payables" value={fmtCompact(wc.payables)} />
        <Kpi label="Net margin" value={`${kpis.netMarginPct.toFixed(1)}%`} />
        <Kpi label="Exceptions" value={String(anomalies.length)} />
        <Kpi label="Cash risk weeks" value={String(riskWeeks)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {COPILOTS.map((c) => (
          <Card key={c.key}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="h-4 w-4" />
                </span>
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">{c.blurb}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {c.prompts.map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 whitespace-normal text-left text-[11px]"
                    onClick={() => runPrompt(p)}
                  >
                    <Sparkles className="h-3 w-3 text-primary" /> {p}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Brain className="h-4 w-4 text-primary" /> Ask Finance
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Answers are generated from a live snapshot of the ERP ledger — no invented numbers.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {ask.turns.length > 0 && (
            <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-3">
              {ask.turns.map((t) => (
                <div key={t.id}>
                  {t.role === "user" ? (
                    <div className="ml-auto w-fit max-w-[85%] rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                      {t.text}
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-card p-3">
                      {t.error ? (
                        <p className="text-xs text-rose-600 dark:text-rose-400">{t.error}</p>
                      ) : (
                        <>
                          <div className="prose prose-sm max-w-none text-sm dark:prose-invert prose-p:my-1.5 prose-li:my-0.5">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {t.text || (t.streaming ? "…" : "")}
                            </ReactMarkdown>
                          </div>
                          {!t.streaming && t.text && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-1 h-7 gap-1.5 text-[11px]"
                              onClick={() => {
                                void navigator.clipboard.writeText(t.text);
                                toast.success("Answer copied");
                              }}
                            >
                              <Copy className="h-3 w-3" /> Copy
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <Textarea
              ref={chatRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const q = question;
                  setQuestion("");
                  void ask.send(q);
                }
              }}
              rows={2}
              placeholder="Ask about cash, AR/AP, margin, budgets, compliance…"
              className="min-h-[52px] resize-none text-sm"
            />
            <Button
              className="gap-1.5"
              disabled={ask.pending || !question.trim()}
              onClick={() => {
                const q = question;
                setQuestion("");
                void ask.send(q);
              }}
            >
              {ask.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Ask
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Need charts and drill-down alongside the answer?{" "}
            <Link to="/ai-assistant" search={{ q: "Summarise our financial position, cash risk and margin outlook" }} className="text-primary underline-offset-2 hover:underline">
              Open the full AI Assistant
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {grouped.map((g) => (
          <AiCopilotPanel
            key={g.key}
            title={g.title}
            subtitle="Deterministic recommendations from the live ledger"
            actions={g.actions}
            askQuery={g.ask}
          />
        ))}
        <AiCopilotPanel
          title="Budget watchlist"
          subtitle={`${variances.filter((v) => v.overrunRisk !== "low").length} line(s) outside tolerance`}
          actions={variances
            .filter((v) => v.overrunRisk !== "low")
            .slice(0, 5)
            .map((v) => ({
              id: `bv-${v.id}`,
              title: `${v.category} · ${v.costCentre}`,
              detail: `YTD actual ${fmtCompact(v.ytdActual)} against budget ${fmtCompact(v.ytdBudget)} — projected close ${fmtCompact(v.projectedYear)} vs annual ${fmtCompact(v.annualBudget)}.`,
              severity: v.overrunRisk === "high" ? "high" : "medium",
              impact: `${v.variancePct.toFixed(1)}% variance`,
            }))}
          askQuery="Which budget lines are at risk and what should we do?"
        />
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 font-display text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

type ChatTurn = { id: string; role: "user" | "assistant"; text: string; streaming?: boolean; error?: string };

/** Grounded chat against /api/chat with the live ERP facts snapshot. */
function useAskFinance() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState(false);
  const turnsRef = useRef<ChatTurn[]>([]);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const send = useCallback(async (raw: string) => {
    const query = raw.trim();
    if (!query) return;
    const aid = crypto.randomUUID();
    const history = turnsRef.current
      .slice(-8)
      .filter((t) => t.text && !t.error)
      .map((t) => ({ role: t.role, content: t.text }));

    setPending(true);
    setTurns((t) => [
      ...t,
      { id: crypto.randomUUID(), role: "user", text: query },
      { id: aid, role: "assistant", text: "", streaming: true },
    ]);
    const patch = (fn: (t: ChatTurn) => ChatTurn) =>
      setTurns((t) => t.map((x) => (x.id === aid ? fn(x) : x)));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `${query}\n\n(Focus the answer on finance & accounting.)`,
          facts: buildFactsJson(),
          history,
        }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        patch((x) => ({
          ...x,
          streaming: false,
          error:
            res.status === 429
              ? "AI rate limit reached — please retry in a moment."
              : res.status === 402
                ? "AI credits exhausted for this workspace."
                : detail || "The AI service is unavailable right now.",
        }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        patch((x) => ({ ...x, text: acc }));
      }
      patch((x) => ({ ...x, text: acc.trim(), streaming: false }));
    } catch (error) {
      patch((x) => ({
        ...x,
        streaming: false,
        error: error instanceof Error ? error.message : "The AI service is unavailable right now.",
      }));
    } finally {
      setPending(false);
    }
  }, []);

  return { turns, pending, send };
}
