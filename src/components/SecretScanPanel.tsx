"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FileScanResult,SecretMatch,RepoScanResult } from "../lib/secretScanner";

const S = {
  critical: { color: "#c4707e", bg: "rgba(196,112,126,0.09)",  border: "rgba(196,112,126,0.22)", label: "Critical" },
  high:     { color: "#ff8800", bg: "rgba(255,136,0,0.09)",   border: "rgba(255,136,0,0.22)",  label: "High"     },
  medium:   { color: "#b8976a", bg: "rgba(184,151,106,0.09)",   border: "rgba(184,151,106,0.22)",  label: "Medium"   },
};

export type ScanState = "idle" | "scanning" | "done" | "error";

export function useSecretScanner() {
  const [state, setState]           = useState<ScanState>("idle");
  const [fileResult, setFileResult] = useState<FileScanResult | null>(null);
  const [repoResult, setRepoResult] = useState<RepoScanResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  /* scan a single file (called when user selects a file) */
  const scanFile = useCallback(async (path: string, content: string) => {
    setState("scanning");
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "file", path, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFileResult(data);
      setState("done");
    } catch (err: any) {
      setError(err.message);
      setState("error");
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setFileResult(null);
    setRepoResult(null);
    setError(null);
  }, []);

  return { state, fileResult, repoResult, error, scanFile, reset };
}

function MatchCard({ match, index }: { match: SecretMatch; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = S[match.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={() => setExpanded((p) => !p)}
      style={{
        background: expanded ? cfg.bg : "rgba(255,255,255,0.02)",
        border: `1px solid ${expanded ? cfg.border : "rgba(255,255,255,0.06)"}`,
        borderRadius: 8, padding: "11px 13px", cursor: "pointer",
        transition: "all 0.18s",
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, fontFamily: "var(--cp-mono)", letterSpacing: "1px", textTransform: "uppercase", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 7px", borderRadius: 100, flexShrink: 0 }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "var(--cp-mono)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {match.pattern}
        </span>
        <span style={{ fontSize: 10, color: "#444", fontFamily: "var(--cp-mono)", flexShrink: 0 }}>
          line {match.line}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>

      {/* matched value */}
      <div style={{ marginTop: 6, fontFamily: "var(--cp-mono)", fontSize: 11, color: cfg.color, background: `${cfg.bg}`, padding: "4px 8px", borderRadius: 5, wordBreak: "break-all", opacity: 0.85 }}>
        {match.match}
      </div>

      {/* expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${cfg.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: "#444", fontFamily: "var(--cp-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>Why this is a problem</div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "var(--cp-mono)", lineHeight: 1.7 }}>{match.description}</p>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "#444", fontFamily: "var(--cp-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>How to fix</div>
                <p style={{ fontSize: 12, color: "#8aa2b8", fontFamily: "var(--cp-mono)", lineHeight: 1.7, opacity: 0.8 }}>{match.fix}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: `${color}10`, border: `1px solid ${color}22`, padding: "5px 12px", borderRadius: 100 }}>
      <span style={{ fontSize: 14, fontWeight: 800, color, fontFamily: "var(--cp-mono)", letterSpacing: "-0.5px" }}>{count}</span>
      <span style={{ fontSize: 10, color, opacity: 0.6, fontFamily: "var(--cp-mono)", letterSpacing: "0.5px" }}>{label}</span>
    </div>
  );
}

export function SecretScanPanel({
  state, fileResult, error, onScan, onReset, filename, hasFile,
}: {
  state: ScanState;
  fileResult: FileScanResult | null;
  error: string | null;
  onScan: () => void;
  onReset: () => void;
  filename: string | null;
  hasFile: boolean;
}) {
  /* ── idle ── */
  if (state === "idle") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, padding: "24px", textAlign: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(196,112,126,0.07)", border: "1px solid rgba(196,112,126,0.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#c4707e" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#444", fontFamily: "var(--cp-display)", marginBottom: 4 }}>Secret Scanner</div>
          <div style={{ fontSize: 12, color: "#2a2a2a", fontFamily: "var(--cp-mono)", lineHeight: 1.7 }}>
            {hasFile ? "Scan this file for exposed\nAPI keys, tokens & secrets" : "Load a repo and select a file first"}
          </div>
        </div>
        {hasFile && filename && (
          <button onClick={onScan}
            style={{ marginTop: 4, padding: "9px 20px", background: "rgba(196,112,126,0.12)", color: "#c4707e", border: "1px solid rgba(196,112,126,0.25)", borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: "var(--cp-mono)", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(196,112,126,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(196,112,126,0.12)"; }}>
            Scan {filename} →
          </button>
        )}
      </div>
    );
  }

  /* ── scanning ── */
  if (state === "scanning") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c4707e", display: "inline-block", animation: "cpulse 0.8s ease infinite" }} />
          <span style={{ fontSize: 12, color: "#c4707e", fontFamily: "var(--cp-mono)" }}>Scanning for secrets...</span>
        </div>
        <div style={{ fontSize: 11, color: "#2a2a2a", fontFamily: "var(--cp-mono)" }}>Running 25+ regex patterns</div>
      </div>
    );
  }

  /* ── error ── */
  if (state === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, padding: "24px" }}>
        <div style={{ fontSize: 12, color: "#c4707e", fontFamily: "var(--cp-mono)", textAlign: "center" }}>{error}</div>
        <button onClick={onReset} style={{ padding: "7px 16px", background: "rgba(196,112,126,0.1)", color: "#c4707e", border: "1px solid rgba(196,112,126,0.25)", borderRadius: 6, fontSize: 11, fontFamily: "var(--cp-mono)", cursor: "pointer" }}>
          Try again
        </button>
      </div>
    );
  }

  /* ── done ── */
  if (!fileResult) return null;
  const { matches } = fileResult;
  const hasSecrets = matches.length > 0;
  const critCount  = matches.filter(m => m.severity === "critical").length;
  const highCount  = matches.filter(m => m.severity === "high").length;
  const medCount   = matches.filter(m => m.severity === "medium").length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* header */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: hasSecrets ? "#c4707e" : "#7a9c8e" }} />
        <span style={{ fontSize: 11, color: hasSecrets ? "#c4707e" : "#7a9c8e", fontFamily: "var(--cp-mono)", letterSpacing: "0.5px" }}>
          {hasSecrets ? `${matches.length} secret${matches.length > 1 ? "s" : ""} found` : "No secrets found"}
        </span>
        <button onClick={onReset} style={{ marginLeft: "auto", background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#444", padding: "3px 9px", borderRadius: 5, fontSize: 10, fontFamily: "var(--cp-mono)", cursor: "pointer" }}>
          Clear
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>

        {/* stat pills */}
        {hasSecrets && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {critCount > 0 && <StatPill count={critCount} label="critical" color="#c4707e" />}
            {highCount > 0 && <StatPill count={highCount} label="high"     color="#ff8800" />}
            {medCount  > 0 && <StatPill count={medCount}  label="medium"   color="#b8976a" />}
          </div>
        )}

        {/* clean state */}
        {!hasSecrets && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center", padding: "32px 16px" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🛡️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#7a9c8e", fontFamily: "var(--cp-display)", marginBottom: 6 }}>All clear</div>
            <div style={{ fontSize: 11, color: "#2a2a2a", fontFamily: "var(--cp-mono)", lineHeight: 1.7 }}>
              No secrets or API keys detected in this file
            </div>
          </motion.div>
        )}

        {/* match cards */}
        {hasSecrets && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {matches.map((m, i) => <MatchCard key={i} match={m} index={i} />)}
          </div>
        )}

      </div>
    </motion.div>
  );
}