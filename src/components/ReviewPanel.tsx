"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
export type ReviewIssue = {
  line: number | null;
  severity: "critical" | "high" | "medium" | "low";
  category: "security" | "performance" | "readability" | "best-practice" | "bug";
  message: string;
  fix: string;
};

export type ReviewResult = {
  summary: string;
  score: {
    quality: number;
    security: number;
    readability: number;
    performance: number;
  };
  issues: ReviewIssue[];
  positives: string[];
};

type ReviewState = "idle" | "streaming" | "done" | "error";

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const severityConfig = {
  critical: { color: "#ff4466", bg: "rgba(255,68,102,0.1)",  border: "rgba(255,68,102,0.25)", label: "Critical" },
  high:     { color: "#ff8800", bg: "rgba(255,136,0,0.1)",   border: "rgba(255,136,0,0.25)",  label: "High"     },
  medium:   { color: "#ffcc00", bg: "rgba(255,204,0,0.1)",   border: "rgba(255,204,0,0.25)",  label: "Medium"   },
  low:      { color: "#00d9ff", bg: "rgba(0,217,255,0.08)",  border: "rgba(0,217,255,0.2)",   label: "Low"      },
};

const categoryIcons: Record<string, React.ReactNode> = {
  security:     <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  performance:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  readability:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  "best-practice": <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  bug:          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 9.17l4.24-4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M9.17 14.83l-4.24 4.24"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M12 2v4"/><path d="M12 18v4"/></svg>,
};

function scoreColor(v: number) {
  if (v >= 80) return "#00ff85";
  if (v >= 60) return "#ffcc00";
  if (v >= 40) return "#ff8800";
  return "#ff4466";
}

/* ─────────────────────────────────────────
   SCORE RING
───────────────────────────────────────── */
function ScoreRing({ value, label }: { value: number; label: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color = scoreColor(value);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 52, height: 52 }}>
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
          <motion.circle
            cx="26" cy="26" r={r} fill="none"
            stroke={color} strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color, fontFamily: "var(--cp-mono)", letterSpacing: "-0.5px" }}>
          {value}
        </div>
      </div>
      <span style={{ fontSize: 9, color: "#444", fontFamily: "var(--cp-mono)", letterSpacing: "1.5px", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   ISSUE CARD
───────────────────────────────────────── */
function IssueCard({ issue, index }: { issue: ReviewIssue; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = severityConfig[issue.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => setExpanded((p) => !p)}
      style={{
        background: expanded ? cfg.bg : "rgba(255,255,255,0.02)",
        border: `1px solid ${expanded ? cfg.border : "rgba(255,255,255,0.06)"}`,
        borderRadius: 8, padding: "12px 14px", cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Severity badge */}
        <span style={{ fontSize: 9, fontFamily: "var(--cp-mono)", letterSpacing: "1px", textTransform: "uppercase", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 8px", borderRadius: 100, flexShrink: 0 }}>
          {cfg.label}
        </span>
        {/* Category icon */}
        <span style={{ color: "#444", flexShrink: 0 }}>{categoryIcons[issue.category]}</span>
        {/* Message */}
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "var(--cp-mono)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {issue.message}
        </span>
        {/* Line number */}
        {issue.line && (
          <span style={{ fontSize: 10, color: "#444", fontFamily: "var(--cp-mono)", flexShrink: 0 }}>
            :{issue.line}
          </span>
        )}
        {/* Chevron */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>

      {/* Expanded fix */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${cfg.border}` }}>
              <div style={{ fontSize: 10, color: "#444", fontFamily: "var(--cp-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>
                Suggested fix
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "var(--cp-mono)", lineHeight: 1.7 }}>
                {issue.fix}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   STREAMING SKELETON
───────────────────────────────────────── */
function StreamingIndicator({ raw }: { raw: string }) {
  return (
    <div style={{ padding: "16px", flex: 1, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d9ff", display: "inline-block", animation: "cpulse 1s ease infinite" }} />
        <span style={{ fontSize: 11, color: "#00d9ff", fontFamily: "var(--cp-mono)", letterSpacing: "1px" }}>
          AI reviewing your code...
        </span>
      </div>
      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 8, padding: "14px", fontFamily: "var(--cp-mono)", fontSize: 11,
        color: "#2a2a2a", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-all",
        maxHeight: 200, overflowY: "auto",
      }}>
        {raw || "Initialising..."}
        <span style={{ display: "inline-block", width: 7, height: 13, background: "#00d9ff", opacity: 0.7, marginLeft: 2, verticalAlign: "middle", animation: "cpblink 1s step-end infinite" }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   REVIEW PANEL — main export
───────────────────────────────────────── */
export function useReview() {
  const [state, setState]       = useState<ReviewState>("idle");
  const [result, setResult]     = useState<ReviewResult | null>(null);
  const [rawStream, setRaw]     = useState("");
  const [error, setError]       = useState<string | null>(null);

 const runReview = useCallback(async (filename: string, code: string) => {
  setState("streaming");
  setResult(null);
  setRaw("");
  setError(null);

  try {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, code }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Review failed");
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // OpenRouter sends SSE: "data: {...}\n\n"
      // extract content delta from each line
      const lines = chunk.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            setRaw(full);
          }
        } catch {
          // malformed chunk — skip
        }
      }
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
    setError(err.message || "Something went wrong");
    setState("error");
  }
}, []);

  const reset = useCallback(() => {
    setState("idle");
    setResult(null);
    setRaw("");
    setError(null);
  }, []);

  return { state, result, rawStream, error, runReview, reset };
}

/* ─────────────────────────────────────────
   REVIEW PANEL UI
───────────────────────────────────────── */
export function ReviewPanel({
  state, result, rawStream, error, onRun, onReset, filename, hasFile,
}: {
  state: ReviewState;
  result: ReviewResult | null;
  rawStream: string;
  error: string | null;
  onRun: () => void;
  onReset: () => void;
  filename: string | null;
  hasFile: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"issues" | "positives">("issues");

  /* ── idle ── */
  if (state === "idle") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, padding: "24px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(0,217,255,0.06)", border: "1px solid rgba(0,217,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#00d9ff" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#444", fontFamily: "var(--cp-display)", marginBottom: 4 }}>AI Review</div>
          <div style={{ fontSize: 12, color: "#2a2a2a", fontFamily: "var(--cp-mono)", lineHeight: 1.7 }}>
            {hasFile ? `Select a file and click\n"Run AI review →"` : "Load a repo and select a file first"}
          </div>
        </div>
        {hasFile && filename && (
          <button onClick={onRun}
            style={{ marginTop: 8, padding: "9px 22px", background: "#00d9ff", color: "#000", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: "var(--cp-mono)", cursor: "pointer", boxShadow: "0 0 16px rgba(0,217,255,0.2)" }}>
            Review {filename} →
          </button>
        )}
      </div>
    );
  }

  /* ── streaming ── */
  if (state === "streaming") {
    return <StreamingIndicator raw={rawStream} />;
  }

  /* ── error ── */
  if (state === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#ff4466", fontFamily: "var(--cp-mono)" }}>{error}</div>
        <button onClick={onReset} style={{ padding: "8px 18px", background: "rgba(255,68,102,0.1)", color: "#ff4466", border: "1px solid rgba(255,68,102,0.25)", borderRadius: 7, fontSize: 12, fontFamily: "var(--cp-mono)", cursor: "pointer" }}>
          Try again
        </button>
      </div>
    );
  }

  /* ── done ── */
  if (!result) return null;
  const criticalCount = result.issues.filter((i) => i.severity === "critical").length;
  const highCount     = result.issues.filter((i) => i.severity === "high").length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff85" }} />
        <span style={{ fontSize: 11, color: "#00ff85", fontFamily: "var(--cp-mono)", letterSpacing: "0.5px" }}>Review complete</span>
        <button onClick={onReset} style={{ marginLeft: "auto", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#444", padding: "4px 10px", borderRadius: 5, fontSize: 10, fontFamily: "var(--cp-mono)", cursor: "pointer" }}>
          Clear
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>

        {/* Score rings */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
          {Object.entries(result.score).map(([k, v]) => (
            <ScoreRing key={k} value={v} label={k} />
          ))}
        </div>

        {/* Alert banners */}
        {(criticalCount > 0 || highCount > 0) && (
          <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(255,68,102,0.07)", border: "1px solid rgba(255,68,102,0.2)", borderRadius: 8, fontSize: 12, color: "#ff4466", fontFamily: "var(--cp-mono)", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {criticalCount > 0 && <span>{criticalCount} critical issue{criticalCount > 1 ? "s" : ""}</span>}
            {criticalCount > 0 && highCount > 0 && <span style={{ color: "#333" }}>·</span>}
            {highCount > 0 && <span style={{ color: "#ff8800" }}>{highCount} high severity</span>}
          </div>
        )}

        {/* Summary */}
        <div style={{ marginBottom: 16, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
          <div style={{ fontSize: 9, color: "#444", fontFamily: "var(--cp-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 7 }}>Summary</div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "var(--cp-mono)", lineHeight: 1.75 }}>{result.summary}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 10, background: "rgba(255,255,255,0.03)", borderRadius: 7, padding: 3, border: "1px solid rgba(255,255,255,0.05)" }}>
          {(["issues", "positives"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: "6px", borderRadius: 5, border: "none", cursor: "pointer",
                background: activeTab === tab ? "rgba(255,255,255,0.07)" : "transparent",
                color: activeTab === tab ? "#f0f0f0" : "#444",
                fontSize: 11, fontFamily: "var(--cp-mono)", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              {tab === "issues" ? (
                <>{tab} <span style={{ background: result.issues.length > 0 ? "rgba(255,68,102,0.2)" : "rgba(255,255,255,0.08)", color: result.issues.length > 0 ? "#ff4466" : "#444", padding: "1px 6px", borderRadius: 100, fontSize: 9 }}>{result.issues.length}</span></>
              ) : (
                <>{tab} <span style={{ background: "rgba(0,255,133,0.1)", color: "#00ff85", padding: "1px 6px", borderRadius: 100, fontSize: 9 }}>{result.positives.length}</span></>
              )}
            </button>
          ))}
        </div>

        {/* Issues list */}
        <AnimatePresence mode="wait">
          {activeTab === "issues" && (
            <motion.div key="issues" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {result.issues.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", fontSize: 12, color: "#00ff85", fontFamily: "var(--cp-mono)" }}>
                  ✓ No issues found
                </div>
              ) : (
                result.issues.map((issue, i) => <IssueCard key={i} issue={issue} index={i} />)
              )}
            </motion.div>
          )}

          {activeTab === "positives" && (
            <motion.div key="positives" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {result.positives.map((p, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "rgba(0,255,133,0.04)", border: "1px solid rgba(0,255,133,0.1)", borderRadius: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff85" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "var(--cp-mono)", lineHeight: 1.7 }}>{p}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}