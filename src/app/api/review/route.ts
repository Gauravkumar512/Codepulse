// app/api/review/route.ts

import { NextRequest } from "next/server";

/* ── Prompt Builder ── */
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
- Return ONLY raw JSON
- No markdown
- No explanation
- issues must contain items if problems exist
- Keep messages under 100 characters
- Provide line numbers where possible

Code to review (${filename}):

${code.slice(0, 12000)}
`;
}

/* ── POST /api/review ── */
export async function POST(req: NextRequest) {
  try {
    const { filename, code } = await req.json();

    if (!filename || !code) {
      return new Response(
        JSON.stringify({ error: "filename and code are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (code.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "File is too short to review" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    console.log("[review] API key present:", !!apiKey, "length:", apiKey?.length ?? 0);

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not configured on the server" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const prompt = buildPrompt(filename, code);

    /* ── OpenRouter API Call ── */
    console.log("[review] Sending request to OpenRouter...");
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://codepulse.dev",
          "X-Title": "CodePulse",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          stream: true,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    console.log("[review] OpenRouter response status:", response.status);

    /* ── Check for errors from OpenRouter ── */
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[review] OpenRouter error response:", errorText);
      let errorMsg = "OpenRouter API error";
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson?.error?.message || errorJson?.error || errorMsg;
      } catch {
        errorMsg = errorText || errorMsg;
      }
      return new Response(
        JSON.stringify({ error: errorMsg }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!response.body) {
      throw new Error("No response body from OpenRouter");
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            controller.enqueue(encoder.encode(chunk));
          }

          controller.close();
        } catch (error) {
          controller.error(error);
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
      JSON.stringify({
        error: err.message || "Failed to generate review",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}