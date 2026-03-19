"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FileScanResult,SecretMatch } from "../lib/secretScanner";

export type FullScanData = {
  owner: string;
  repo: string;
  branch: string;
  scannedFiles: number;
  totalFiles: number;
  totalSecrets: number;
  critical: number;
  high: number;
  medium: number;
  cleanFiles: number;
  results: FileScanResult[];
  fileContents: Record<string, string>;
};


const SEV = {
  critical: { color: "#c4707e", bg: "rgba(196,112,126,0.08)",  border: "rgba(196,112,126,0.2)",  label: "Critical" },
  high:     { color: "#ff8800", bg: "rgba(255,136,0,0.08)",   border: "rgba(255,136,0,0.2)",   label: "High"     },
  medium:   { color: "#b8976a", bg: "rgba(184,151,106,0.08)",   border: "rgba(184,151,106,0.2)",   label: "Medium"   },
};

function getEnvVarName(patternName: string): string {
  const map: Record<string, string> = {
    "AWS Access Key ID":            "AWS_ACCESS_KEY_ID",
    "AWS Secret Access Key":        "AWS_SECRET_ACCESS_KEY",
    "Google API Key":               "GOOGLE_API_KEY",
    "Google OAuth Client Secret":   "GOOGLE_CLIENT_SECRET",
    "GitHub Personal Access Token": "GITHUB_TOKEN",
    "GitHub OAuth Token":           "GITHUB_OAUTH_TOKEN",
    "GitHub App Token":             "GITHUB_APP_TOKEN",
    "Stripe Secret Key":            "STRIPE_SECRET_KEY",
    "Stripe Publishable Key":       "STRIPE_PUBLISHABLE_KEY",
    "Stripe Test Key":              "STRIPE_TEST_KEY",
    "MongoDB URI":                  "MONGODB_URI",
    "PostgreSQL URI":               "DATABASE_URL",
    "MySQL URI":                    "DATABASE_URL",
    "Redis URI":                    "REDIS_URL",
    "JWT Secret (hardcoded)":       "JWT_SECRET",
    "JWT Token":                    "JWT_TOKEN",
    "RSA Private Key":              "PRIVATE_KEY",
    "Private Key (generic)":        "PRIVATE_KEY",
    "SendGrid API Key":             "SENDGRID_API_KEY",
    "Twilio Account SID":           "TWILIO_ACCOUNT_SID",
    "Twilio Auth Token":            "TWILIO_AUTH_TOKEN",
    "Slack Bot Token":              "SLACK_BOT_TOKEN",
    "Slack Webhook URL":            "SLACK_WEBHOOK_URL",
    "Hardcoded Password":           "DB_PASSWORD",
    "Hardcoded Secret":             "API_SECRET",
    "NPM Auth Token":               "NPM_TOKEN",
  };
  return map[patternName] ?? "SECRET_VALUE";
}

function getPlaceholderValue(patternName: string): string {
  const map: Record<string, string> = {
    "AWS Access Key ID":            "AKIAIOSFODNN7EXAMPLE",
    "AWS Secret Access Key":        "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "Google API Key":               "AIzaSyD_xK9mN2vPxxxxxxxxxxxxxxxxxxxxxxx",
    "MongoDB URI":                  "mongodb+srv://user:pass@cluster.mongodb.net/db",
    "JWT Secret (hardcoded)":       "your-256-bit-secret",
    "Stripe Secret Key":            "stripe_secret_key_here",
    "GitHub Personal Access Token": "github_token_here",
  };
  return map[patternName] ?? "your_secret_value_here";
}

function getBeforeLine(match: SecretMatch): string {
  const truncated = match.match.length > 40
    ? match.match.slice(0, 37) + "..."
    : match.match;
  return `// line ${match.line}\nconst value = "${truncated}";`;
}

function getAfterLine(match: SecretMatch): string {
  const envVar = getEnvVarName(match.pattern);
  return `// line ${match.line}\nconst value = process.env.${envVar};`;
}

function getEnvEntry(match: SecretMatch): string {
  const envVar     = getEnvVarName(match.pattern);
  const placeholder = getPlaceholderValue(match.pattern);
  return `${envVar}=${placeholder}`;
}

function CodeDiff({ match }: { match: SecretMatch }) {
  const before = getBeforeLine(match);
  const after  = getAfterLine(match);
  const env    = getEnvEntry(match);

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Before */}
      <div>
        <div style={{ fontSize: 9, color: "#c4707e", fontFamily: "var(--cp-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
          <span>✕</span> Before (vulnerable)
        </div>
        <div style={{ background: "rgba(196,112,126,0.06)", border: "1px solid rgba(196,112,126,0.15)", borderRadius: 7, padding: "10px 14px", fontFamily: "var(--cp-mono)", fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, whiteSpace: "pre" }}>
          {before}
        </div>
      </div>

      {/* After */}
      <div>
        <div style={{ fontSize: 9, color: "#7a9c8e", fontFamily: "var(--cp-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
          <span>✓</span> After (safe)
        </div>
        <div style={{ background: "rgba(122,156,142,0.05)", border: "1px solid rgba(122,156,142,0.12)", borderRadius: 7, padding: "10px 14px", fontFamily: "var(--cp-mono)", fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, whiteSpace: "pre" }}>
          {after}
        </div>
      </div>

      {/* .env example */}
      <div>
        <div style={{ fontSize: 9, color: "#8aa2b8", fontFamily: "var(--cp-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
          <span>⊕</span> Add to .env
        </div>
        <div style={{ background: "rgba(138,162,184,0.05)", border: "1px solid rgba(138,162,184,0.12)", borderRadius: 7, padding: "10px 14px", position: "relative" }}>
          <code style={{ fontFamily: "var(--cp-mono)", fontSize: 12, color: "#8aa2b8", opacity: 0.8 }}>
            {env}
          </code>
          <CopyBtn text={env} />
        </div>
      </div>

      {/* .gitignore reminder */}
      <div style={{ fontSize: 11, color: "#444", fontFamily: "var(--cp-mono)", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 6, borderLeft: "2px solid #333" }}>
        💡 Make sure <span style={{ color: "#b8976a" }}>.env</span> is in your <span style={{ color: "#b8976a" }}>.gitignore</span> — never commit it to git
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ position: "absolute", top: 8, right: 10, background: copied ? "rgba(122,156,142,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${copied ? "rgba(122,156,142,0.3)" : "rgba(255,255,255,0.1)"}`, color: copied ? "#7a9c8e" : "#555", padding: "3px 10px", borderRadius: 5, fontSize: 10, fontFamily: "var(--cp-mono)", cursor: "pointer", transition: "all 0.2s" }}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function MatchRow({ match, index }: { match: SecretMatch; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEV[match.severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{ border: `1px solid ${expanded ? cfg.border : "rgba(255,255,255,0.06)"}`, borderRadius: 9, overflow: "hidden", background: expanded ? cfg.bg : "rgba(255,255,255,0.01)", transition: "all 0.2s" }}
    >
      {/* Header */}
      <div onClick={() => setExpanded(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer" }}>
        {/* Severity */}
        <span style={{ fontSize: 9, fontFamily: "var(--cp-mono)", letterSpacing: "1px", textTransform: "uppercase", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 8px", borderRadius: 100, flexShrink: 0 }}>
          {cfg.label}
        </span>
        {/* Pattern name */}
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "var(--cp-mono)", fontWeight: 600, flex: 1 }}>
          {match.pattern}
        </span>
        {/* Line */}
        <span style={{ fontSize: 11, color: "#555", fontFamily: "var(--cp-mono)", flexShrink: 0 }}>
          line {match.line}
        </span>
        {/* Chevron */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Matched value preview */}
      <div style={{ padding: "0 16px 10px", fontFamily: "var(--cp-mono)", fontSize: 11, color: cfg.color, opacity: 0.7, wordBreak: "break-all" }}>
        {match.match}
      </div>

      {/* Expanded — code diff */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${cfg.border}` }}>
              {/* Description */}
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--cp-mono)", lineHeight: 1.7, marginTop: 12 }}>
                {match.description}
              </p>
              <CodeDiff match={match} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FileCard({ result, content, index, onAiReview }: {
  result: FileScanResult;
  content: string;
  index: number;
  onAiReview: (path: string, content: string) => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const critCount = result.matches.filter(m => m.severity === "critical").length;
  const highCount = result.matches.filter(m => m.severity === "high").length;
  const topSev    = critCount > 0 ? "critical" : highCount > 0 ? "high" : "medium";
  const cfg       = SEV[topSev];

  const filename  = result.path.split("/").pop() ?? result.path;
  const folder    = result.path.includes("/") ? result.path.split("/").slice(0, -1).join("/") : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      style={{ background: "#0a0a0a", border: `1px solid ${expanded ? cfg.border : "rgba(255,255,255,0.07)"}`, borderRadius: 12, overflow: "hidden" }}
    >
      {/* Card header */}
      <div onClick={() => setExpanded(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", cursor: "pointer", background: expanded ? cfg.bg : "transparent", transition: "background 0.2s" }}>

        {/* File icon */}
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${cfg.color}12`, border: `1px solid ${cfg.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="1.8" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>

        {/* File info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#d4d4d4", fontFamily: "var(--cp-mono)", marginBottom: 2 }}>
            {filename}
          </div>
          {folder && (
            <div style={{ fontSize: 11, color: "#444", fontFamily: "var(--cp-mono)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {folder}
            </div>
          )}
        </div>

        {/* Severity pills */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {critCount > 0 && <SevPill count={critCount} sev="critical" />}
          {highCount > 0 && <SevPill count={highCount} sev="high" />}
          {result.matches.filter(m => m.severity === "medium").length > 0 && (
            <SevPill count={result.matches.filter(m => m.severity === "medium").length} sev="medium" />
          )}
        </div>

        {/* AI review button */}
        <button
          onClick={e => { e.stopPropagation(); onAiReview(result.path, content); }}
          style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(138,162,184,0.2)", background: "rgba(138,162,184,0.06)", color: "#8aa2b8", fontSize: 11, fontFamily: "var(--cp-mono)", cursor: "pointer", flexShrink: 0, transition: "all 0.2s", whiteSpace: "nowrap" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(138,162,184,0.12)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(138,162,184,0.06)"; }}>
          AI review →
        </button>

        {/* Chevron */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Expanded matches */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {result.matches.map((m, i) => (
                <MatchRow key={i} match={m} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SevPill({ count, sev }: { count: number; sev: keyof typeof SEV }) {
  const cfg = SEV[sev];
  return (
    <span style={{ fontSize: 10, fontFamily: "var(--cp-mono)", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 9px", borderRadius: 100 }}>
      {count} {cfg.label.toLowerCase()}
    </span>
  );
}

function SummaryBar({ data }: { data: FullScanData }) {
  const isClean = data.totalSecrets === 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", marginBottom: 28 }}>
      {[
        { label: "Files scanned",  value: data.scannedFiles, color: "#8aa2b8"  },
        { label: "Secrets found",  value: data.totalSecrets, color: isClean ? "#7a9c8e" : "#c4707e" },
        { label: "Critical",       value: data.critical,     color: "#c4707e"  },
        { label: "High",           value: data.high,         color: "#ff8800"  },
        { label: "Medium",         value: data.medium,       color: "#b8976a"  },
        { label: "Clean files",    value: data.cleanFiles,   color: "#7a9c8e"  },
      ].map((s, i) => (
        <div key={i} style={{ padding: "20px 20px", background: "#080808", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "var(--cp-mono)", letterSpacing: "-1px", lineHeight: 1 }}>
            {s.value}
          </div>
          <div style={{ fontSize: 10, color: "#444", fontFamily: "var(--cp-mono)", letterSpacing: "1px", textTransform: "uppercase", marginTop: 6 }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

type Filter = "all" | "critical" | "high" | "medium";

function FilterBar({ active, setActive, counts }: {
  active: Filter;
  setActive: (f: Filter) => void;
  counts: Record<Filter, number>;
}) {
  const tabs: { id: Filter; label: string; color: string }[] = [
    { id: "all",      label: "All files",  color: "#d4d4d4" },
    { id: "critical", label: "Critical",   color: "#c4707e" },
    { id: "high",     label: "High",       color: "#ff8800" },
    { id: "medium",   label: "Medium",     color: "#b8976a" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)}
          style={{ padding: "6px 16px", borderRadius: 100, border: `1px solid ${active === t.id ? t.color + "55" : "rgba(255,255,255,0.08)"}`, background: active === t.id ? t.color + "10" : "transparent", color: active === t.id ? t.color : "#555", fontSize: 12, fontFamily: "var(--cp-mono)", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>
          {t.label}
          <span style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 100 }}>
            {counts[t.id]}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ScanResultsPage({
  data,
  onBack,
  onAiReview,
}: {
  data: FullScanData;
  onBack: () => void;
  onAiReview: (path: string, content: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const isClean = data.totalSecrets === 0;

  const filtered = filter === "all"
    ? data.results
    : data.results.filter(r =>
        r.matches.some(m => m.severity === filter)
      );

  const counts: Record<Filter, number> = {
    all:      data.results.length,
    critical: data.results.filter(r => r.matches.some(m => m.severity === "critical")).length,
    high:     data.results.filter(r => r.matches.some(m => m.severity === "high")).length,
    medium:   data.results.filter(r => r.matches.some(m => m.severity === "medium")).length,
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "28px 32px" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#555", padding: "7px 14px", borderRadius: 7, fontSize: 12, fontFamily: "var(--cp-mono)", cursor: "pointer", transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ccc")}
          onMouseLeave={e => (e.currentTarget.style.color = "#555")}>
          ← Back
        </button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#d4d4d4", fontFamily: "var(--cp-display)", letterSpacing: "-0.5px", marginBottom: 2 }}>
            Scan Results
          </h2>
          <p style={{ fontSize: 12, color: "#444", fontFamily: "var(--cp-mono)" }}>
            {data.owner}/{data.repo} · {data.branch} · {data.scannedFiles} files scanned
          </p>
        </div>

        {/* Clean / vulnerable badge */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 100, background: isClean ? "rgba(122,156,142,0.07)" : "rgba(196,112,126,0.07)", border: `1px solid ${isClean ? "rgba(122,156,142,0.2)" : "rgba(196,112,126,0.2)"}` }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isClean ? "#7a9c8e" : "#c4707e", display: "inline-block" }} />
          <span style={{ fontSize: 12, color: isClean ? "#7a9c8e" : "#c4707e", fontFamily: "var(--cp-mono)" }}>
            {isClean ? "No secrets found" : `${data.totalSecrets} secret${data.totalSecrets > 1 ? "s" : ""} found`}
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <SummaryBar data={data} />

      {/* Clean state */}
      {isClean && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: "center", padding: "60px 24px", background: "rgba(122,156,142,0.03)", border: "1px solid rgba(122,156,142,0.1)", borderRadius: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛡️</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#7a9c8e", fontFamily: "var(--cp-display)", marginBottom: 8 }}>All clear</div>
          <p style={{ fontSize: 14, color: "#444", fontFamily: "var(--cp-mono)", lineHeight: 1.7 }}>
            No secrets, API keys, or tokens detected across {data.scannedFiles} files.
          </p>
        </motion.div>
      )}

      {/* File cards */}
      {!isClean && (
        <>
          <FilterBar active={filter} setActive={setFilter} counts={counts} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((result, i) => (
              <FileCard
                key={result.path}
                result={result}
                content={data.fileContents[result.path] ?? ""}
                index={i}
                onAiReview={onAiReview}
              />
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#333", fontFamily: "var(--cp-mono)", fontSize: 13 }}>
                No files with {filter} severity issues
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}