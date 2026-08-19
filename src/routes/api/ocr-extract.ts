import { createFileRoute } from "@tanstack/react-router";
import { verifyRequestUser } from "@/lib/auth/verify-request.server";

/**
 * Vision-based document extraction for procurement documents (PO, vendor
 * invoice, GRN). Accepts a PDF or image as a data URL and returns structured
 * line items so the client can validate part numbers against the item master.
 */

type Body = {
  /** data:<mime>;base64,... */
  fileData?: string;
  fileName?: string;
  /** po | invoice | grn */
  kind?: string;
};

const SYSTEM = `You extract structured data from Indian manufacturing procurement documents
(purchase orders, vendor tax invoices, goods receipt notes).

Return ONLY minified JSON, no markdown fences, matching exactly:
{"docType":"po|invoice|grn|unknown","docNumber":"","docDate":"","vendor":"","currency":"INR",
 "lines":[{"partNumber":"","description":"","qty":0,"uom":"","rate":0,"amount":0,"hsn":""}],
 "subTotal":0,"tax":0,"total":0,"notes":""}

Rules:
- Copy part numbers, HSN codes and quantities character-for-character from the document.
- Use 0 / "" when a value is not printed. Never invent values.
- Numbers must be plain numbers (no commas, no currency symbols).`;

export const Route = createFileRoute("/api/ocr-extract")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const fileData = body.fileData ?? "";
        if (!fileData.startsWith("data:")) return new Response("A file is required", { status: 400 });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI is not configured", { status: 500 });

        const mime = fileData.slice(5, fileData.indexOf(";"));
        const isPdf = mime === "application/pdf";
        const instruction = `Extract the line items from this ${body.kind ?? "procurement"} document.`;

        const content = isPdf
          ? [
              { type: "text", text: instruction },
              {
                type: "file",
                file: { filename: body.fileName || "document.pdf", file_data: fileData },
              },
            ]
          : [
              { type: "text", text: instruction },
              { type: "image_url", image_url: { url: fileData } },
            ];

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify({
              model: "google/gemini-3.6-flash",
              temperature: 0,
              messages: [
                { role: "system", content: SYSTEM },
                { role: "user", content },
              ],
            }),
          });

          if (!upstream.ok) {
            const detail = await upstream.text().catch(() => "");
            console.error("[api/ocr-extract] gateway error", upstream.status, detail.slice(0, 500));
            const message =
              upstream.status === 429
                ? "AI rate limit reached — please retry in a moment."
                : upstream.status === 402
                  ? "AI credits are exhausted for this workspace."
                  : upstream.status === 403
                    ? "AI access is blocked for this workspace."
                    : "The AI service could not read this document.";
            return new Response(message, { status: upstream.status });
          }

          const payload = (await upstream.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const raw = payload.choices?.[0]?.message?.content?.trim() ?? "";
          const json = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

          try {
            JSON.parse(json);
          } catch {
            return new Response("The model returned an unreadable extraction.", { status: 502 });
          }

          return new Response(json, {
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "OCR request failed";
          console.error("[api/ocr-extract]", message);
          return new Response("The AI service is unavailable right now.", { status: 502 });
        }
      },
    },
  },
});
