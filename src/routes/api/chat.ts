import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai/gateway.server";

type ChatBody = {
  question?: string;
  facts?: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

const SYSTEM = `You are "Faith AI", the executive copilot embedded in the Faith Automation ERP
(a Body-in-White / industrial automation manufacturer, single tenant, INR currency, India GST regime).

You are given a FACTS block: a JSON snapshot of the live ERP data (CRM, projects, engineering,
procurement, inventory, quality, finance, GST, HR, master data) plus pre-computed deterministic
forecasts (EVM SPI/CPI/EAC, weighted pipeline, cash-flow buckets, stock-out risk, quality trend).

ABSOLUTE GROUNDING RULES — never break these:
1. Every number, code, name, date and status you state MUST come verbatim from the FACTS block
   (or be arithmetic you perform on those numbers, which you may show). Never invent records,
   document numbers, customers, vendors, part numbers or amounts.
2. If the FACTS block does not contain what was asked, say plainly:
   "That isn't in the current ERP data" and name the closest data you do have. Never guess.
3. Forecasts must be labelled as forecasts and must reference the pre-computed values in
   FACTS.forecasts (or a simple, explicitly-stated calculation on FACTS data). State the basis
   ("linear run-rate on 6 months of NCR data", "EVM SPI of 0.87", etc.).
4. Do not describe ERP features or generic best practice unless asked; answer with this company's data.
5. Currency in Indian format: ₹1.2Cr / ₹45.6L. Percentages to 1 decimal.

STYLE: concise executive tone. Short markdown: a one-line verdict, then up to 5 bullets, then an
optional "Recommended action" line. No preamble, no restating the question, no tables (the UI
already renders data tables and charts alongside your answer).`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatBody;
        try {
          body = (await request.json()) as ChatBody;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const question = (body.question ?? "").trim();
        if (!question) return new Response("Question is required", { status: 400 });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI is not configured", { status: 500 });

        const facts = (body.facts ?? "").slice(0, 120_000);
        const history = (body.history ?? []).slice(-8);

        const messages: ModelMessage[] = [
          { role: "system", content: SYSTEM },
          {
            role: "system",
            content: `FACTS (live ERP snapshot, generated ${new Date().toISOString()}):\n${facts || "{}"}`,
          },
          ...history.map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
          { role: "user", content: question },
        ];

        try {
          const gateway = createLovableAiGatewayProvider(key, getLovableAiGatewayRunId(request));
          const result = streamText({
            model: gateway("google/gemini-3.6-flash"),
            messages,
            temperature: 0.2,
          });
          return result.toTextStreamResponse();
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI request failed";
          return new Response(message, { status: 502 });
        }
      },
    },
  },
});
