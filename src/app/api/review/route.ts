// app/api/review/route.ts

import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/* ── Prompt ── */
function buildPrompt(filename: string, code: string): string {
  return `You are an expert code reviewer. Analyze the following code from file "${filename}" and return ONLY a valid JSON object — no markdown, no explanation, no backticks.

The JSON must follow this exact structure:
{
  "summary": "2-3 sentence overall summary of the code",
  "score": {
    "quality": <0-100>,
    "security": <0-100>,
    "readability": <0-100>,
    "performance": <0-100>
  },
  "issues": [
    {
      "line": <line number or null>,
      "severity": "critical" | "high" | "medium" | "low",
      "category": "security" | "performance" | "readability" | "best-practice" | "bug",
      "message": "short description of the issue",
      "fix": "specific actionable fix suggestion"
    }
  ],
  "positives": ["what is done well — 2 to 4 short strings"]
}

Rules:
- Return ONLY the raw JSON. No prose before or after.
- issues array must have at least 1 item if any problems exist, empty array if code is perfect
- severity "critical" = security vulnerabilities or data loss bugs only
- Be specific with line numbers when possible
- Keep messages under 100 characters
- Keep fixes practical and concise

Code to review (${filename}):
\`\`\`
${code.slice(0, 12000)}
\`\`\``;
}

/* ── POST /api/review ── */
export async function POST(req: NextRequest) {
  try {
    const { filename, code } = await req.json();

    if (!filename || !code) {
      return new Response(
        JSON.stringify({ error: "filename and code are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (code.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "File is too short to review" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = buildPrompt(filename, code);

    /* ── Stream the response ── */
    const streamResult = await model.generateContentStream(prompt);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          for await (const chunk of streamResult.stream) {
            const text = chunk.text();
            buffer += text;
            controller.enqueue(new TextEncoder().encode(text));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("Review API error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to generate review" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}