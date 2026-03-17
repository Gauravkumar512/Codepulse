import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";



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

    const apiKey = process.env.GEMINI_API_KEY;
    console.log("[review] API key present:", !!apiKey, "length:", apiKey?.length ?? 0);

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const prompt = buildPrompt(filename, code);


    console.log("[review] Sending request to Gemini...");
    const ai = new GoogleGenAI({ apiKey });
    
    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

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