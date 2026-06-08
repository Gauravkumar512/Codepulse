"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import type { SecretMatch } from "@/src/lib/secretScanner";

export type ReviewIssue = {
  description: string;
  code: string;
  language: string;
};

export type ReviewResult = {
  summary: string;
  issues: ReviewIssue[];
};

type ReviewState = "idle" | "streaming" | "done" | "error" | "blocked";

const REVIEW_COOLDOWN_MS = 4000;

const toastStyle = { background: "#111", color: "#fff", border: "1px solid #1f1f1f" };

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8aa2b8", display: "inline-block", animation: "cpulse 1s ease infinite" }} />
          <span style={{ fontSize: 11, color: "#8aa2b8", fontFamily: "var(--font-mono)", letterSpacing: "1px" }}>
            AI reviewing your code...
          </span>
        </div>
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
  const [blockedSecrets, setBlockedSecrets] = useState<SecretMatch[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const lastRunRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);

 const runReview = useCallback(async (filename: string, code: string, opts?: { override?: boolean }) => {
  if (inFlightRef.current) return;
  const sinceLast = Date.now() - lastRunRef.current;
  if (sinceLast < REVIEW_COOLDOWN_MS) {
    const wait = Math.ceil((REVIEW_COOLDOWN_MS - sinceLast) / 1000);
    toast(`Slow down — wait ${wait}s before the next review`, { style: toastStyle });
    return;
  }
  lastRunRef.current = Date.now();
  inFlightRef.current = true;

  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;

  setState("streaming");
  setResult(null);
  setRaw("");
  setError(null);
  setBlockedSecrets([]);

  try {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, code, override: opts?.override === true }),
      signal: controller.signal,
    });

    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      if (data?.blocked) {
        setBlockedSecrets(Array.isArray(data.secrets) ? data.secrets : []);
        setState("blocked");
        toast.error("Review blocked — secrets detected in this file", { style: toastStyle });
        return;
      }
      throw new Error(data?.error || "Review failed");
    }

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error || "Rate limited — try again shortly", { style: toastStyle });
      setError(data?.error || "Gemini is rate-limiting requests. Wait a moment and try again.");
      setState("error");
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Review failed");
    }

    const redactedCount = Number(res.headers.get("X-CodePulse-Redacted") || "0");
    if (redactedCount > 0) {
      toast(`Redacted ${redactedCount} medium-risk secret${redactedCount > 1 ? "s" : ""} before review`, {
        style: toastStyle,
      });
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

    if (controller.signal.aborted) {
      setState("idle");
      return;
    }

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
    const msg = err?.message || "Something went wrong";
    toast.error(msg, { style: toastStyle });
    setError(msg);
    setState("error");
  } finally {
    inFlightRef.current = false;
  }
}, []);

  const stopReview = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    setState("idle");
    setRaw("");
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    setState("idle");
    setResult(null);
    setRaw("");
    setError(null);
    setBlockedSecrets([]);
  }, []);

  return { state, result, rawStream, error, blockedSecrets, runReview, stopReview, reset };
}


export function ReviewPanel({
  state, result, rawStream, error, blockedSecrets, onRun, onReset, onStop, filename, hasFile,
  onSendChat, onOpenChat, chatBusy = false, chatCount = 0, onIgnore,
}: {
  state: ReviewState;
  result: ReviewResult | null;
  rawStream: string;
  error: string | null;
  blockedSecrets: SecretMatch[];
  onRun: () => void;
  onReset: () => void;
  onStop: () => void;
  filename: string | null;
  hasFile: boolean;
  onSendChat?: (text: string) => void;
  onOpenChat?: () => void;
  chatBusy?: boolean;
  chatCount?: number;
  onIgnore?: () => void;
}) {
  const [chatInput, setChatInput] = useState("");

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat?.(chatInput);
    setChatInput("");
  };

  const renderPromptBar = () => {
    const isStreaming = state === "streaming";
    return (
      <div style={{ padding: "0 16px 16px", flexShrink: 0 }}>
        <form onSubmit={handleChatSubmit} style={{
          display: "flex", alignItems: "center", background: "#212121",
          borderRadius: 24, padding: "8px 8px 8px 16px", border: "1px solid rgba(255,255,255,0.08)"
        }}>
          <input
            type="text"
            placeholder={chatBusy ? "Generating…" : "Ask anything about this file"}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isStreaming || chatBusy}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#d4d4d4", fontSize: 13, fontFamily: "var(--font-sans)",
              padding: "0 4px"
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 4 }}>
            {isStreaming ? (
              <button type="button" onClick={onStop}
                style={{
                  width: 32, height: 32, borderRadius: "50%", background: "#444",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "background 0.2s", flexShrink: 0
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#555"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#444"}
                title="Stop generating"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#d4d4d4" stroke="none">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button type="submit" disabled={!chatInput.trim() || chatBusy}
                style={{
                  width: 32, height: 32, borderRadius: "50%", background: (chatInput.trim() && !chatBusy) ? "#d4d4d4" : "#333",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: (chatInput.trim() && !chatBusy) ? "pointer" : "default", transition: "background 0.2s", flexShrink: 0
                }}
                title="Send message"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={chatInput.trim() ? "#000" : "#666"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>
    );
  };

  if (state === "idle") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, padding: "24px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(138,162,184,0.06)", border: "1px solid rgba(138,162,184,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8aa2b8" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#444", fontFamily: "var(--font-display)", marginBottom: 4 }}>AI Review</div>
          <div style={{ fontSize: 12, color: "#2a2a2a", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>
            {hasFile ? `Select a file and click\n"Run AI review"` : "Load a repo and select a file first"}
          </div>
        </div>
        {hasFile && filename && (
          <button onClick={onRun}
            style={{ marginTop: 8, padding: "9px 22px", background: "#8aa2b8", color: "#000", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", cursor: "pointer", boxShadow: "0 0 16px rgba(138,162,184,0.2)" }}>
            Review {filename}
          </button>
        )}
      </div>
    );
  }

  if (state === "streaming") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <StreamingIndicator raw={rawStream} />
        {renderPromptBar()}
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

  if (state === "blocked") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", background: "rgba(196,112,126,0.12)", borderBottom: "1px solid rgba(196,112,126,0.3)", display: "flex", alignItems: "flex-start", gap: 10, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4707e" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#c4707e", fontFamily: "var(--font-display)", marginBottom: 3 }}>
              Review blocked — secrets detected
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-mono)", lineHeight: 1.6 }}>
              The AI call was stopped on the server. No code was sent to Gemini to avoid leaking these credentials.
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          <div style={{ fontSize: 10, color: "#444", fontFamily: "var(--font-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>
            {blockedSecrets.length} blocking secret{blockedSecrets.length > 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {blockedSecrets.map((s, i) => (
              <div key={i} style={{ background: "rgba(196,112,126,0.06)", border: "1px solid rgba(196,112,126,0.2)", borderRadius: 8, padding: "11px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "1px", textTransform: "uppercase", color: s.severity === "critical" ? "#c4707e" : "#ff8800", background: s.severity === "critical" ? "rgba(196,112,126,0.12)" : "rgba(255,136,0,0.12)", border: `1px solid ${s.severity === "critical" ? "rgba(196,112,126,0.25)" : "rgba(255,136,0,0.25)"}`, padding: "2px 7px", borderRadius: 100 }}>
                    {s.severity}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-mono)", flex: 1 }}>{s.pattern}</span>
                  <span style={{ fontSize: 10, color: "#555", fontFamily: "var(--font-mono)" }}>line {s.line}</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8aa2b8", opacity: 0.85, lineHeight: 1.6 }}>{s.fix}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: "#444", fontFamily: "var(--font-mono)", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 6, borderLeft: "2px solid #c4707e", lineHeight: 1.6 }}>
            Move these to environment variables and remove them from source, then run the review again.
          </div>
        </div>

        <div style={{ padding: "12px 16px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8 }}>
          {onIgnore && (
            <button onClick={onIgnore} title="Mark these findings as false positives and review anyway"
              style={{ flex: 1, padding: "9px 0", background: "rgba(184,151,106,0.12)", color: "#b8976a", border: "1px solid rgba(184,151,106,0.3)", borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              ✓ Ignore / Mark as Safe
            </button>
          )}
          <button onClick={onReset} style={{ flex: onIgnore ? "0 0 auto" : 1, padding: "9px 16px", background: "rgba(196,112,126,0.1)", color: "#c4707e", border: "1px solid rgba(196,112,126,0.25)", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer" }}>
            Dismiss
          </button>
        </div>
      </motion.div>
    );
  }

  if (!result) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7a9c8e" }} />
        <span style={{ fontSize: 11, color: "#7a9c8e", fontFamily: "var(--font-mono)", letterSpacing: "0.5px" }}>Review complete</span>
        {chatCount > 0 && onOpenChat && (
          <button onClick={onOpenChat} style={{ marginLeft: "auto", background: "rgba(138,162,184,0.08)", border: "1px solid rgba(138,162,184,0.22)", color: "#8aa2b8", padding: "4px 10px", borderRadius: 5, fontSize: 10, fontFamily: "var(--font-mono)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            💬 Chat ({chatCount})
          </button>
        )}
        <button onClick={onReset} style={{ marginLeft: chatCount > 0 && onOpenChat ? 0 : "auto", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#444", padding: "4px 10px", borderRadius: 5, fontSize: 10, fontFamily: "var(--font-mono)", cursor: "pointer" }}>
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

      {renderPromptBar()}
    </motion.div>
  );
}
