import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import buddyAsset from "@/assets/buddy-ai.png.asset.json";
import { Sparkles, Send, X, RotateCcw, AlertTriangle, User, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { answer, SUGGESTIONS, type CopilotResponse } from "@/lib/copilot/engine";
import { buildFactsJson } from "@/lib/copilot/facts";

type Turn =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      response: CopilotResponse;
      narrative: string;
      streaming: boolean;
      error?: string;
    };

export function BuddyWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, pending, open]);

  useEffect(() => {
    if (open && !pending) taRef.current?.focus();
  }, [open, pending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const ask = useCallback(async (raw: string) => {
    const query = raw.trim();
    if (!query) return;
    const uid = crypto.randomUUID();
    const aid = crypto.randomUUID();
    const response = answer(query);
    const history = turnsRef.current
      .slice(-8)
      .map((t) => ({
        role: t.role,
        content: t.role === "user" ? t.text : t.narrative || t.response.headline,
      }))
      .filter((m) => m.content);

    setInput("");
    setPending(true);
    setTurns((t) => [
      ...t,
      { id: uid, role: "user", text: query },
      { id: aid, role: "assistant", response, narrative: "", streaming: true },
    ]);

    const patch = (
      fn: (turn: Extract<Turn, { role: "assistant" }>) => Extract<Turn, { role: "assistant" }>,
    ) => setTurns((t) => t.map((x) => (x.id === aid && x.role === "assistant" ? fn(x) : x)));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, facts: buildFactsJson(), history }),
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        const message =
          res.status === 429
            ? "AI rate limit reached — please retry in a moment."
            : res.status === 402
              ? "AI credits exhausted for this workspace."
              : detail || "The AI service is unavailable right now.";
        patch((x) => ({ ...x, streaming: false, error: message }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        patch((x) => ({ ...x, narrative: acc }));
      }
      patch((x) => ({ ...x, narrative: acc.trim(), streaming: false }));
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

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Buddy AI"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-card shadow-elevated ring-4 ring-primary/15 transition hover:scale-105"
        >
          <img src={buddyAsset.url} alt="Buddy AI" className="h-full w-full object-cover" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[min(620px,calc(100vh-3rem))] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-elevated">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-primary/10 to-transparent px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 overflow-hidden rounded-lg">
                <img src={buddyAsset.url} alt="Buddy AI" className="h-full w-full object-cover" />
              </div>
              <div className="leading-tight">
                <div className="font-display text-sm font-semibold">Buddy AI</div>
                <div className="text-[11px] text-muted-foreground">Grounded in live ERP data</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {turns.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="New chat"
                  onClick={() => setTurns([])}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Open full assistant">
                <Link to="/ai-assistant" onClick={() => setOpen(false)}>
                  <Maximize2 className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Close Buddy AI"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
            {turns.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Ask about delays, budgets, cash, stock-outs, quality or suppliers — or start with
                  one of these:
                </p>
                <div className="grid gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => void ask(s)}
                      className="rounded-lg border bg-background px-3 py-2 text-left text-xs font-medium transition hover:border-primary/40 hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {turns.map((t) =>
                  t.role === "user" ? (
                    <div key={t.id} className="flex justify-end gap-2">
                      <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-primary px-3 py-2 text-xs text-primary-foreground">
                        {t.text}
                      </div>
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted ring-1 ring-border">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  ) : (
                    <div key={t.id} className="flex gap-2">
                      <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
                        <img src={buddyAsset.url} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold">{t.response.headline}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {t.response.summary}
                        </div>
                        {t.error ? (
                          <div className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{t.error}</span>
                          </div>
                        ) : t.narrative ? (
                          <div className="prose prose-sm mt-2 max-w-none text-xs dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.narrative}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1.5">
                            {[0, 120, 240].map((d) => (
                              <span
                                key={d}
                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                                style={{ animationDelay: `${d}ms` }}
                              />
                            ))}
                            <span className="ml-1 text-[11px] text-muted-foreground">
                              Analyzing your live ERP data…
                            </span>
                          </div>
                        )}
                        {t.response.followUps.length > 0 && !t.streaming && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {t.response.followUps.map((f) => (
                              <button
                                key={f}
                                onClick={() => void ask(f)}
                                className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                              >
                                {f} →
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t p-2">
            <div className="flex items-end gap-2 rounded-xl border bg-background p-1.5">
              <Textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!pending) void ask(input);
                  }
                }}
                placeholder="Ask Buddy AI…"
                className={cn(
                  "max-h-28 min-h-9 flex-1 resize-none border-0 bg-transparent p-1.5 text-xs shadow-none focus-visible:ring-0",
                )}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => void ask(input)}
                disabled={pending || !input.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
