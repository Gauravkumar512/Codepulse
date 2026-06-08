import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { scanFile, partitionMatches, maskSecretsInContent } from "@/src/lib/secretScanner";

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



function buildPrompt(filename: string, code: string): string {
  return `You are an expert code reviewer. Analyze the following code from file "${filename}" and return ONLY a valid JSON object — no markdown, no explanation, no backticks.

The JSON must follow this exact structure:
{
  "summary": "2-3 sentence overall summary of the code",
  "issues": [
    {
      "description": "Short description of the issue and what the fix does",
      "code": "The exact code snippet showing the fix. Do not wrap in markdown code blocks.",
      "language": "typescript"
    }
  ]
}

Rules:
- Return ONLY raw JSON
- No markdown strings or markdown blocks framing the JSON globally or within the "code" field. Note: \`code\` field should just be the raw text snippet of the code fix.
- issues must contain items if problems exist. If no problems exist, return an empty array.
- Provide clear copyable solutions.

Code to review (${filename}):

${code.slice(0, 12000)}
`;
}


export async function POST(req: NextRequest) {
  try {
    const { filename, code, override } = await req.json();

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

    const scan = scanFile(filename, code);
    const { blocking, redactable } = partitionMatches(scan.matches);

    if (blocking.length > 0 && override === true) {
      console.warn(
        `[review] OVERRIDE — proceeding despite ${blocking.length} high-severity finding(s) in ${filename} (user marked safe).`
      );
    }

    if (blocking.length > 0 && override !== true) {
      console.warn(
        `[review] BLOCKED — ${blocking.length} high-severity secret(s) in ${filename}. Gemini call skipped.`
      );
      return json(
        {
          blocked: true,
          error: "Review blocked: high-severity secrets detected in this file.",
          secrets: blocking,
          counts: {
            critical: blocking.filter((m) => m.severity === "critical").length,
            high: blocking.filter((m) => m.severity === "high").length,
          },
        },
        403
      );
    }

    const safeCode =
      redactable.length > 0 ? maskSecretsInContent(code, redactable) : code;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const prompt = buildPrompt(filename, safeCode);


    console.log(
      `[review] Sending request to Gemini...${
        redactable.length ? ` (${redactable.length} medium secret(s) redacted first)` : ""
      }`
    );
    const ai = new GoogleGenAI({ apiKey });

    let responseStream;
    try {
      responseStream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
    } catch (err: any) {
      if (isRateLimitError(err)) {
        console.warn("[review] Gemini rate limit / quota hit.");
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
            controller.enqueue(encoder.encode(chunk.text));
          }
          controller.close();
        } catch (error) {
          console.error("Stream generation error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-CodePulse-Redacted": String(redactable.length),
      },
    });
  } catch (err: any) {
    console.error("Review API error:", err);

    if (isRateLimitError(err)) {
      return json(
        { error: "Gemini is rate-limiting requests. Wait a moment and try again.", rateLimited: true },
        429
      );
    }

    return json({ error: "Failed to generate review" }, 500);
  }
}