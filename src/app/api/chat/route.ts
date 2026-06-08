import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { scanFile, maskSecretsInContent } from "@/src/lib/secretScanner";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ReviewIssue = { description: string; code?: string; language?: string };
type ReviewResult = { summary?: string; issues?: ReviewIssue[] } | null;

function isRateLimitError(err: any): boolean {
  const status = err?.status ?? err?.code ?? err?.response?.status;
  if (status === 429) return true;
  const msg = String(err?.message ?? "");
  return /\b429\b|RESOURCE_EXHAUSTED|rate limit|quota|too many requests/i.test(msg);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function formatReview(review: ReviewResult): string {
  if (!review || (!review.summary && !review.issues?.length)) {
    return "No prior static review is available for this file.";
  }
  const parts: string[] = [];
  if (review.summary) parts.push(`Summary: ${review.summary}`);
  if (review.issues?.length) {
    parts.push(
      "Issues raised:\n" +
        review.issues.map((it, i) => `  ${i + 1}. ${it.description}`).join("\n")
    );
  }
  return parts.join("\n");
}

function buildSystemInstruction(filename: string, safeCode: string, review: ReviewResult): string {
  return `You are CodePulse's coding assistant. You are helping a developer understand and improve ONE specific file from their repository.

File: ${filename}

--- FILE CONTENT (any secrets have been redacted with asterisks) ---
${safeCode}

--- PRIOR STATIC AI REVIEW OF THIS FILE ---
${formatReview(review)}

Guidelines:
- Answer questions about THIS file specifically. Reference line numbers or snippets where helpful.
- When suggesting changes, provide concise, copyable code.
- Be direct and practical. Keep answers focused; avoid restating the whole file.
- If the user asks about something outside this file, say you only have this file in context.
- Never reveal or guess the redacted secret values.`;
}

export async function POST(req: NextRequest) {
  try {
    const { filename, code, review, messages } = (await req.json()) as {
      filename?: string;
      code?: string;
      review?: ReviewResult;
      messages?: ChatMessage[];
    };

    if (!filename || typeof code !== "string") {
      return json({ error: "filename and code are required" }, 400);
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "messages are required" }, 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: "GEMINI_API_KEY is not configured on the server" }, 500);
    }

    const scan = scanFile(filename, code);
    const safeCodeFull =
      scan.matches.length > 0 ? maskSecretsInContent(code, scan.matches) : code;
    const safeCode = safeCodeFull.slice(0, 12000);

    const systemInstruction = buildSystemInstruction(filename, safeCode, review ?? null);

    const contents = messages
      .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const ai = new GoogleGenAI({ apiKey });

    let responseStream;
    try {
      responseStream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents,
        config: { systemInstruction },
      });
    } catch (err: any) {
      if (isRateLimitError(err)) {
        return json(
          { error: "Gemini is rate-limiting requests. Wait a moment and try again.", rateLimited: true },
          429
        );
      }
      throw err;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
          }
          controller.close();
        } catch (error) {
          console.error("Chat stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    if (isRateLimitError(err)) {
      return json(
        { error: "Gemini is rate-limiting requests. Wait a moment and try again.", rateLimited: true },
        429
      );
    }
    return json({ error: "Failed to generate a response" }, 500);
  }
}
