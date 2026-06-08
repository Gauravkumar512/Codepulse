"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export type UnusedStatus = "ghost" | "unused" | "unknown";

export type DepScanResult = {
  score: number;
  total: number;
  usedCount: number;
  unused: { name: string; version: string; status: UnusedStatus }[];
  implicitlyUsed: string[];
  packageJsonPath: string;
  scannedFiles: number;
  sourceFilesTotal?: number;
  truncated?: boolean;
};

type State = "idle" | "loading" | "done" | "error";

const DEP_COOLDOWN_MS = 5000;
const toastStyle = { background: "#111", color: "#fff", border: "1px solid #1f1f1f" };

export function useDependencyScan() {
  const [state, setState]   = useState<State>("idle");
  const [result, setResult] = useState<DepScanResult | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const lastRunRef  = useRef(0);

  const run = useCallback(
    async (owner: string, repo: string, branch: string, tree: unknown) => {
      if (inFlightRef.current) return;
      const sinceLast = Date.now() - lastRunRef.current;
      if (sinceLast < DEP_COOLDOWN_MS) {
        const wait = Math.ceil((DEP_COOLDOWN_MS - sinceLast) / 1000);
        toast(`Slow down — wait ${wait}s before re-scanning deps`, { style: toastStyle });
        return;
      }
      lastRunRef.current = Date.now();
      inFlightRef.current = true;

      setState("loading");
      setResult(null);
      setError(null);

      try {
        const res = await fetch("/api/repo/deps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo, branch, tree }),
        });

        if (res.status === 429) {
          toast.error("Rate limited — try again shortly", { style: toastStyle });
          setError("Rate limited. Wait a moment and try again.");
          setState("error");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Dependency scan failed");

        setResult(data as DepScanResult);
        setState("done");
      } catch (err: any) {
        const msg = err?.message || "Dependency scan failed";
        toast.error(msg, { style: toastStyle });
        setError(msg);
        setState("error");
      } finally {
        inFlightRef.current = false;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState("idle");
    setResult(null);
    setError(null);
  }, []);

  return { state, result, error, run, reset };
}

const STATUS = {
  ghost:   { color: "#c4707e", bg: "rgba(196,112,126,0.1)", border: "rgba(196,112,126,0.28)", label: "not on npm" },
  unused:  { color: "#b8976a", bg: "rgba(184,151,106,0.1)", border: "rgba(184,151,106,0.28)", label: "unused"     },
  unknown: { color: "#777",    bg: "rgba(120,120,120,0.1)", border: "rgba(120,120,120,0.25)", label: "unknown"    },
} as const;

function scoreColor(score: number): string {
  if (score >= 90) return "#7a9c8e";
  if (score >= 60) return "#b8976a";
  return "#c4707e";
}

function Gauge({ score }: { score: number }) {
  const color = scoreColor(score);
  const r = 46;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
        <motion.circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 30, fontWeight: 800, color, fontFamily: "var(--font-mono)", letterSpacing: "-1px", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: "#555", fontFamily: "var(--font-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 3 }}>clean-up</span>
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center", padding: "0 14px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "var(--font-mono)", letterSpacing: "-0.5px", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: "#555", fontFamily: "var(--font-mono)", letterSpacing: "1px", textTransform: "uppercase", marginTop: 5 }}>{label}</div>
    </div>
  );
}

function DepRow({ name, version, status, index }: { name: string; version: string; status: UnusedStatus; index: number }) {
  const cfg = STATUS[status];
  const [copied, setCopied] = useState(false);
  const cmd = `npm uninstall ${name}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}
    >
      <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "1px", textTransform: "uppercase", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 8px", borderRadius: 100, flexShrink: 0 }}>
        {cfg.label}
      </span>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", fontFamily: "var(--font-mono)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {name}
      </span>
      <span style={{ fontSize: 11, color: "#555", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{version}</span>
      <button
        onClick={() => { navigator.clipboard.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
        title={cmd}
        style={{ flexShrink: 0, background: copied ? "rgba(122,156,142,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${copied ? "rgba(122,156,142,0.3)" : "rgba(255,255,255,0.1)"}`, color: copied ? "#7a9c8e" : "#888", padding: "3px 9px", borderRadius: 5, fontSize: 10, fontFamily: "var(--font-mono)", cursor: "pointer", transition: "all 0.2s" }}
      >
        {copied ? "Copied!" : "uninstall"}
      </button>
    </motion.div>
  );
}

export function DependencyPanel({
  state, result, error, onClose, onRetry,
}: {
  state: State;
  result: DepScanResult | null;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  if (state === "idle") return null;

  const ghostCount = result?.unused.filter((u) => u.status === "ghost").length ?? 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "min(560px, 100%)", maxHeight: "82vh", display: "flex", flexDirection: "column", background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
        >
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(138,162,184,0.08)", border: "1px solid rgba(138,162,184,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8aa2b8" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#d4d4d4", fontFamily: "var(--font-display)", letterSpacing: "-0.3px" }}>Dependency Hygiene</div>
              {result && <div style={{ fontSize: 11, color: "#555", fontFamily: "var(--font-mono)" }}>{result.packageJsonPath} · {result.scannedFiles} source files scanned</div>}
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#666", width: 28, height: 28, borderRadius: 7, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>

          {/* body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            {state === "loading" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "48px 0" }}>
                <span style={{ width: 30, height: 30, border: "3px solid rgba(138,162,184,0.2)", borderTop: "3px solid #8aa2b8", borderRadius: "50%", display: "inline-block", animation: "cpspin .7s linear infinite" }} />
                <div style={{ fontSize: 12, color: "#8aa2b8", fontFamily: "var(--font-mono)" }}>Analyzing imports & checking npm registry…</div>
                <div style={{ fontSize: 11, color: "#444", fontFamily: "var(--font-mono)" }}>Reading package.json and source files</div>
              </div>
            )}

            {state === "error" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "40px 0" }}>
                <div style={{ fontSize: 13, color: "#c4707e", fontFamily: "var(--font-mono)", textAlign: "center" }}>{error}</div>
                <button onClick={onRetry} style={{ padding: "8px 18px", background: "rgba(196,112,126,0.1)", color: "#c4707e", border: "1px solid rgba(196,112,126,0.25)", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer" }}>Try again</button>
              </div>
            )}

            {state === "done" && result && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 22 }}>
                  <Gauge score={result.score} />
                  <div style={{ flex: 1, display: "flex", justifyContent: "space-around", borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 8 }}>
                    <Stat value={result.total} label="deps" color="#8aa2b8" />
                    <Stat value={result.usedCount} label="used" color="#7a9c8e" />
                    <Stat value={result.unused.length} label="unused" color={result.unused.length ? "#b8976a" : "#7a9c8e"} />
                    <Stat value={ghostCount} label="ghost" color={ghostCount ? "#c4707e" : "#555"} />
                  </div>
                </div>

                {result.unused.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 16px", background: "rgba(122,156,142,0.04)", border: "1px dashed rgba(122,156,142,0.2)", borderRadius: 12 }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>✨</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#7a9c8e", fontFamily: "var(--font-display)", marginBottom: 5 }}>All clean</div>
                    <div style={{ fontSize: 12, color: "#555", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>Every runtime dependency is imported somewhere.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 10, color: "#444", fontFamily: "var(--font-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>
                      Redundant packages ({result.unused.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {result.unused.map((u, i) => (
                        <DepRow key={u.name} name={u.name} version={u.version} status={u.status} index={i} />
                      ))}
                    </div>
                    {ghostCount > 0 && (
                      <div style={{ marginTop: 14, fontSize: 11, color: "#c4707e", fontFamily: "var(--font-mono)", padding: "10px 12px", background: "rgba(196,112,126,0.05)", borderRadius: 7, borderLeft: "2px solid #c4707e", lineHeight: 1.6 }}>
                        ⚠ {ghostCount} package{ghostCount > 1 ? "s" : ""} not found on npm — likely AI-hallucinated or typo'd. Verify before keeping.
                      </div>
                    )}
                  </>
                )}

                <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 10, color: "#444", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>
                  Scans <span style={{ color: "#666" }}>dependencies</span> only (not devDependencies). Packages used via dynamic config or non-standard means may appear unused — verify before removing.
                  {result.truncated && <div style={{ marginTop: 4, color: "#b8976a" }}>Note: only the first {result.scannedFiles} of {result.sourceFilesTotal} source files were scanned (large repo).</div>}
                  {result.implicitlyUsed.length > 0 && (
                    <div style={{ marginTop: 4 }}>Treated as used (framework runtime): {result.implicitlyUsed.join(", ")}</div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
