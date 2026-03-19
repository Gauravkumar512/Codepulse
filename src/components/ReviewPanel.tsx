"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";


export type ReviewIssue = {
  description: string;
  code: string;
  language: string;
};

export type ReviewResult = {
  summary: string;
  issues: ReviewIssue[];
};

type ReviewState = "idle" | "streaming" | "done" | "error";

function IssueCard({ issue, index }: { issue: ReviewIssue; index: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(issue.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8, padding: "14px",
        marginBottom: 12, display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a9c8e" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>
          {issue.description}
        </span>
      </div>

      <div style={{ position: "relative", marginTop: 4 }}>
        <button
          onClick={handleCopy}
          style={{
            position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "4px 8px",
            borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "var(--font-mono)",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <pre style={{
          background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)",
          padding: "12px 14px", borderRadius: 6, margin: 0,
          whiteSpace: "pre-wrap", wordBreak: "break-word"
        }}>
          <code style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#d4d4d4", lineHeight: 1.6 }}>
            {issue.code}
          </code>
        </pre>
      </div>
    </motion.div>
  );
}

function StreamingIndicator({ raw }: { raw: string }) {
  return (
    <div style={{ padding: "16px", flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8aa2b8", display: "inline-block", animation: "cpulse 1s ease infinite" }} />
        <span style={{ fontSize: 11, color: "#8aa2b8", fontFamily: "var(--font-mono)", letterSpacing: "1px" }}>
          AI reviewing your code...
        </span>
      </div>
      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 8, padding: "14px", fontFamily: "var(--font-mono)", fontSize: 11,
        color: "#2a2a2a", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-all",
        maxHeight: 200, overflowY: "auto",
      }}>
        {raw || "Initialising..."}
        <span style={{ display: "inline-block", width: 7, height: 13, background: "#8aa2b8", opacity: 0.7, marginLeft: 2, verticalAlign: "middle", animation: "cpblink 1s step-end infinite" }} />
      </div>
    </div>
  );
}

export function useReview() {
  const [state, setState]       = useState<ReviewState>("idle");
  const [result, setResult]     = useState<ReviewResult | null>(null);
  const [rawStream, setRaw]     = useState("");
  const [error, setError]       = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

 const runReview = useCallback(async (filename: string, code: string) => {
  // Abort any previous in-flight request
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;

  setState("streaming");
  setResult(null);
  setRaw("");
  setError(null);

  try {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, code }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Review failed");
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      if (controller.signal.aborted) {
        await reader.cancel();
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      setRaw(full);
    }

    // If aborted, go back to idle silently
    if (controller.signal.aborted) {
      setState("idle");
      return;
    }

    // parse final JSON
    const clean = full
                    .replace(/<think>[\s\S]*?<\/think>/g, "")
                    .replace(/```json\n?/g, "")
                    .replace(/```\n?/g, "")
                    .trim();
    const start = clean.indexOf("{");
    const end   = clean.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("AI returned an invalid response — try again");

    const parsed: ReviewResult = JSON.parse(clean.slice(start, end + 1));
    setResult(parsed);
    setState("done");

  } catch (err: any) {
    if (err.name === "AbortError") {
      setState("idle");
      return;
    }
    setError(err.message || "Something went wrong");
    setState("error");
  }
}, []);

  const stopReview = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setRaw("");
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setResult(null);
    setRaw("");
    setError(null);
  }, []);

  return { state, result, rawStream, error, runReview, stopReview, reset };
}


export function ReviewPanel({
  state, result, rawStream, error, onRun, onReset, onStop, filename, hasFile,
}: {
  state: ReviewState;
  result: ReviewResult | null;
  rawStream: string;
  error: string | null;
  onRun: () => void;
  onReset: () => void;
  onStop: () => void;
  filename: string | null;
  hasFile: boolean;
}) {
  if (state === "idle") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, padding: "24px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(138,162,184,0.06)", border: "1px solid rgba(138,162,184,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8aa2b8" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#444", fontFamily: "var(--font-display)", marginBottom: 4 }}>AI Review</div>
          <div style={{ fontSize: 12, color: "#2a2a2a", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>
            {hasFile ? `Select a file and click\n"Run AI review →"` : "Load a repo and select a file first"}
          </div>
        </div>
        {hasFile && filename && (
          <button onClick={onRun}
            style={{ marginTop: 8, padding: "9px 22px", background: "#8aa2b8", color: "#000", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", cursor: "pointer", boxShadow: "0 0 16px rgba(138,162,184,0.2)" }}>
            Review {filename} →
          </button>
        )}
      </div>
    );
  }

  if (state === "streaming") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <StreamingIndicator raw={rawStream} />
        <div style={{ padding: "0 16px 16px", flexShrink: 0 }}>
          <button onClick={onStop}
            style={{
              width: "100%", padding: "9px 0", borderRadius: 7, border: "1px solid rgba(196,112,126,0.3)",
              background: "rgba(196,112,126,0.08)", color: "#c4707e", fontSize: 12, fontWeight: 700,
              fontFamily: "var(--font-mono)", cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 7, transition: "all 0.2s",
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#c4707e" stroke="none">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
            Stop generating
          </button>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#c4707e", fontFamily: "var(--font-mono)" }}>{error}</div>
        <button onClick={onReset} style={{ padding: "8px 18px", background: "rgba(196,112,126,0.1)", color: "#c4707e", border: "1px solid rgba(196,112,126,0.25)", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer" }}>
          Try again
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7a9c8e" }} />
        <span style={{ fontSize: 11, color: "#7a9c8e", fontFamily: "var(--font-mono)", letterSpacing: "0.5px" }}>Review complete</span>
        <button onClick={onReset} style={{ marginLeft: "auto", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#444", padding: "4px 10px", borderRadius: 5, fontSize: 10, fontFamily: "var(--font-mono)", cursor: "pointer" }}>
          Clear
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

        <div style={{ marginBottom: 20, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: "#444", fontFamily: "var(--font-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Overall Summary</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-mono)", lineHeight: 1.75 }}>{result.summary}</p>
        </div>

        <div style={{ marginBottom:  16 }}>
          <div style={{ fontSize: 11, color: "#444", fontFamily: "var(--font-mono)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>Suggested Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(!result.issues || result.issues.length === 0) ? (
              <div style={{ textAlign: "center", padding: "24px", fontSize: 12, color: "#7a9c8e", fontFamily: "var(--font-mono)", background: "rgba(122,156,142,0.05)", borderRadius: 8, border: "1px dashed rgba(122,156,142,0.2)" }}>
                ✓ No critical issues or suggestions found
              </div>
            ) : (
              result.issues.map((issue, i) => <IssueCard key={i} issue={issue} index={i} />)
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
