import { apiHeaders } from "@/lib/auth/api-headers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Brain, Copy, FileCheck2, Loader2, RefreshCw, Send, ShieldCheck, Sparkles, Truck, Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AiCopilotPanel, AiMetricStrip, type AiAction } from "@/components/ai/module-copilot";
import { useGst } from "@/lib/gst/store";
import { useFinance } from "@/lib/finance/store";
import { gstActions, gstExceptions, gstKpis, complianceCalendar } from "@/lib/gst/intelligence";
import { syncGstFromFinance } from "@/lib/gst/sync";
import { buildFactsJson } from "@/lib/copilot/facts";
import { fmtCompact } from "@/components/projects/shared";

const COPILOTS: { key: string; label: string; icon: typeof Wallet; blurb: string; prompts: string[] }[] = [
  {
    key: "filing",
    label: "Filing Copilot",
    icon: FileCheck2,
    blurb: "Period readiness, due-date countdown, late-fee exposure and the order in which to file.",
    prompts: ["Which GST returns are due or late and what is the exposure?", "Summarise my filing readiness by period"],
  },
  {
    key: "itc",
    label: "ITC Copilot",
    icon: ShieldCheck,
    blurb: "Books vs GSTR-2B matching, credit at risk and supplier follow-up priority.",
    prompts: ["Which suppliers are blocking my input tax credit?", "How much ITC is at risk this period?"],
  },
  {
    key: "einvoice",
    label: "e-Invoice Copilot",
    icon: Sparkles,
    blurb: "IRN coverage against finance invoices, IRP rejections and re-submission guidance.",
    prompts: ["Which invoices are missing an IRN?", "Explain the IRP rejections and how to fix them"],
  },
  {
    key: "logistics",
    label: "e-Way Copilot",
    icon: Truck,
    blurb: "Validity windows, expiring consignments and Part-B vehicle updates.",
    prompts: ["Which e-way bills expire in the next 48 hours?"],
  },
  {
    key: "ledger",
    label: "Ledger Copilot",
    icon: Wallet,
    blurb: "Return liability versus the GST payable account, set-off journals and cash impact.",
    prompts: ["Does my GST ledger agree with the filed returns?", "What is the cash outflow on the next 3B?"],
  },
];

interface ChatTurn { id: string; role: "user" | "assistant"; text: string; streaming?: boolean; error?: string }

export function GstCopilotSection() {
  const s = useGst((x) => x);
  const f = useFinance((x) => x);

  const k = useMemo(() => gstKpis(s, f), [s, f]);
  const actions = useMemo(() => gstActions(s, f), [s, f]);
  const exceptions = useMemo(() => gstExceptions(s, f), [s, f]);
  const calendar = useMemo(() => complianceCalendar(s).slice(0, 8), [s]);

  const [question, setQuestion] = useState("");
  const chatRef = useRef<HTMLTextAreaElement>(null);
  const ask = useAskGst();

  const runPrompt = useCallback((p: string) => {
    setQuestion(p);
    chatRef.current?.focus();
    void ask.send(p);
  }, [ask]);

  const pick = (ids: string[]): AiAction[] => actions.filter((a) => ids.some((i) => a.id.startsWith(i)));

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">GST AI Copilot</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Compliance assistants grounded in the live ledger — filing readiness, input credit, IRP status and
            e-way cover. Every recommendation traces back to a finance document and can be applied in one click.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={() => {
            const r = syncGstFromFinance();
            toast.success(`Synced from Finance — ${r.eInvoices} invoice(s), ${r.itcLines} ITC line(s), ${r.periods} period(s)`);
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Sync from Finance
        </Button>
      </div>

      <AiMetricStrip
        items={[
          { label: "Output tax", value: fmtCompact(k.outputTax) },
          { label: "ITC claimable", value: fmtCompact(k.itcClaimable), good: k.itcAtRisk === 0 },
          { label: "ITC at risk", value: fmtCompact(k.itcAtRisk), warn: k.itcAtRisk > 0 },
          { label: "Net payable", value: fmtCompact(k.netPayable) },
          { label: "IRN coverage", value: `${k.irnCoverage}%`, warn: k.irnCoverage < 100 },
          { label: "Exceptions", value: String(exceptions.length), warn: exceptions.length > 0 },
        ]}
      />

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
                  <Button key={p} size="sm" variant="outline"
                    className="h-7 gap-1.5 whitespace-normal text-left text-[11px]" onClick={() => runPrompt(p)}>
                    <Sparkles className="h-3 w-3 text-primary" /> {p}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AiCopilotPanel
          title="Filing & ledger actions"
          subtitle="Deterministic, one-click compliance moves"
          actions={pick(["sync", "prepare", "file", "overdue", "ledger"])}
          askQuery="What should I do next to stay GST compliant?"
        />
        <AiCopilotPanel
          title="Credit & document actions"
          subtitle="Input tax credit, IRN and consignment cover"
          actions={pick(["itc", "bulk-irn", "retry", "ewb"])}
          askQuery="Summarise my ITC and e-invoicing exceptions"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Compliance calendar</CardTitle>
            <p className="text-xs text-muted-foreground">Due-date countdown across every open GSTIN period.</p>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {calendar.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs">
                <div className="min-w-0">
                  <div className="font-medium">{c.type} · {c.period}</div>
                  <div className="text-muted-foreground">Due {c.dueDate} · {fmtCompact(c.amount)} tax</div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    c.status === "filed"
                      ? "text-[10px] text-emerald-600"
                      : c.daysLeft < 0
                        ? "text-[10px] text-rose-600"
                        : "text-[10px] text-amber-600"
                  }
                >
                  {c.status === "filed" ? "Filed" : c.daysLeft < 0 ? `${Math.abs(c.daysLeft)}d late` : `${c.daysLeft}d left`}
                </Badge>
              </div>
            ))}
            {!calendar.length && <p className="text-xs text-muted-foreground">No return periods yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Exception radar</CardTitle>
            <p className="text-xs text-muted-foreground">{exceptions.length} open compliance exception(s).</p>
          </CardHeader>
          <CardContent className="max-h-[360px] space-y-1.5 overflow-y-auto">
            {exceptions.slice(0, 12).map((e) => (
              <div key={e.id} className="rounded-lg border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{e.title}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{e.kind}</Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{e.detail}</p>
              </div>
            ))}
            {!exceptions.length && <p className="text-xs text-muted-foreground">No exceptions — compliance is clean.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Brain className="h-4 w-4 text-primary" /> Ask GST
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Answers come from a live snapshot of returns, ITC, e-invoices and the finance ledger.
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
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.text || (t.streaming ? "…" : "")}</ReactMarkdown>
                          </div>
                          {!t.streaming && t.text && (
                            <Button size="sm" variant="ghost" className="mt-1 h-7 gap-1.5 text-[11px]"
                              onClick={() => { void navigator.clipboard.writeText(t.text); toast.success("Answer copied"); }}>
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
              placeholder="Ask about returns, ITC, IRN, e-way bills, GST ledger…"
              className="min-h-[52px] resize-none text-sm"
            />
            <Button className="gap-1.5" disabled={ask.pending || !question.trim()}
              onClick={() => { const q = question; setQuestion(""); void ask.send(q); }}>
              {ask.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Ask
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Need charts alongside the answer?{" "}
            <Link to="/ai-assistant" search={{ q: "Summarise my GST filing status and ITC reconciliation exceptions" }}
              className="text-primary underline-offset-2 hover:underline">
              Open the full AI Assistant
            </Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function useAskGst() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState(false);
  const turnsRef = useRef<ChatTurn[]>([]);
  useEffect(() => { turnsRef.current = turns; }, [turns]);

  const send = useCallback(async (raw: string) => {
    const query = raw.trim();
    if (!query) return;
    const aid = crypto.randomUUID();
    const history = turnsRef.current.slice(-8).filter((t) => t.text && !t.error).map((t) => ({ role: t.role, content: t.text }));

    setPending(true);
    setTurns((t) => [
      ...t,
      { id: crypto.randomUUID(), role: "user", text: query },
      { id: aid, role: "assistant", text: "", streaming: true },
    ]);
    const patch = (fn: (t: ChatTurn) => ChatTurn) => setTurns((t) => t.map((x) => (x.id === aid ? fn(x) : x)));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: await apiHeaders(),
        body: JSON.stringify({
          question: `${query}\n\n(Focus the answer on GST & indirect tax compliance, and tie it back to the finance ledger.)`,
          facts: buildFactsJson(),
          history,
        }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        patch((x) => ({
          ...x,
          streaming: false,
          error: res.status === 429
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
    } catch {
      patch((x) => ({ ...x, streaming: false, error: "Could not reach the AI service." }));
    } finally {
      setPending(false);
    }
  }, []);

  return { turns, pending, send };
}
