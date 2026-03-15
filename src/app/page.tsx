"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ background: "#080b0f", color: "#e8edf2", fontFamily: "'Syne', sans-serif", overflowX: "hidden", minHeight: "100vh" }}>
      <GridBackground />
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </div>
  );
}

/* ── Grid background ── */
function GridBackground() {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(#1e2a36 1px, transparent 1px), linear-gradient(90deg, #1e2a36 1px, transparent 1px)",
        backgroundSize: "40px 40px", opacity: 0.35,
      }}
    />
  );
}

/* ── Navbar ── */
function Navbar() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 48px",
      background: "rgba(8,11,15,0.85)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1e2a36",
    }}>
      <Logo />
      <ul style={{ display: "flex", gap: 32, listStyle: "none", margin: 0, padding: 0 }}>
        {[["Features", "#features"], ["How it works", "#how"]].map(([label, href]) => (
          <li key={label}>
            <a href={href} style={{ color: "#5a6a7a", textDecoration: "none", fontSize: 14, fontWeight: 600, letterSpacing: "0.3px", transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#e8edf2")}
              onMouseLeave={e => (e.currentTarget.style.color = "#5a6a7a")}>
              {label}
            </a>
          </li>
        ))}
      </ul>
      <Link href="/signup" style={{
        background: "#00e5ff", color: "#000", padding: "8px 20px", borderRadius: 6,
        fontSize: 13, fontWeight: 700, letterSpacing: "0.5px", textDecoration: "none",
        transition: "box-shadow .2s, transform .15s", display: "inline-block",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px #00e5ff55"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
        Get started →
      </Link>
    </nav>
  );
}

function Logo() {
  return (
    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: "#00e5ff",
        boxShadow: "0 0 10px #00e5ff", display: "inline-block",
        animation: "pulse 2s ease infinite",
      }} />
      CodePulse
    </div>
  );
}

/* ── Hero ── */
function HeroSection() {
  return (
    <section style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "120px 24px 80px", position: "relative", zIndex: 1,
    }}>
      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "#00e5ff22", border: "1px solid #00e5ff55",
        color: "#00e5ff", padding: "6px 16px", borderRadius: 100,
        fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
        letterSpacing: "0.5px", marginBottom: 32,
        animation: "fadeUp .6s ease both",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e5ff", display: "inline-block", animation: "pulse 2s ease infinite" }} />
        AI-powered code review + secret detection
      </div>

      {/* Heading */}
      <h1 style={{
        fontSize: "clamp(48px, 7vw, 88px)", fontWeight: 800, lineHeight: 1.0,
        letterSpacing: "-2px", marginBottom: 24,
        animation: "fadeUp .6s .1s ease both", animationFillMode: "both",
      }}>
        <span style={{ display: "block", color: "#fff" }}>Your code reviewed.</span>
        <span style={{
          display: "block",
          background: "linear-gradient(90deg, #00e5ff, #00ff88)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Your secrets safe.
        </span>
      </h1>

      <p style={{
        fontSize: 18, color: "#5a6a7a", maxWidth: 520, lineHeight: 1.7,
        fontWeight: 400, marginBottom: 48,
        animation: "fadeUp .6s .2s ease both", animationFillMode: "both",
      }}>
        Paste a GitHub repo URL and get instant AI-powered code review, security scoring, and API leak detection — in seconds.
      </p>

      {/* CTAs */}
      <div style={{
        display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center",
        animation: "fadeUp .6s .3s ease both", animationFillMode: "both",
      }}>
        <Link href="/signup" style={{
          background: "#00e5ff", color: "#000", padding: "14px 32px", borderRadius: 8,
          fontSize: 15, fontWeight: 700, textDecoration: "none", letterSpacing: "0.3px",
          transition: "box-shadow .2s, transform .15s", display: "inline-block",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 32px #00e5ff55"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
          Scan your repo →
        </Link>
        <a href="#how" style={{
          color: "#e8edf2", padding: "14px 32px", borderRadius: 8,
          border: "1px solid #1e2a36", fontSize: 15, fontWeight: 600,
          textDecoration: "none", transition: "border-color .2s, background .2s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#5a6a7a"; (e.currentTarget as HTMLElement).style.background = "#111820"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1e2a36"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
          See how it works
        </a>
      </div>

      {/* Code card */}
      <HeroCard />
    </section>
  );
}

function HeroCard() {
  return (
    <div style={{
      marginTop: 64, width: "100%", maxWidth: 680,
      background: "#111820", border: "1px solid #1e2a36", borderRadius: 12,
      overflow: "hidden", textAlign: "left",
      animation: "fadeUp .6s .4s ease both", animationFillMode: "both",
      boxShadow: "0 0 60px rgba(0,229,255,0.06)",
      position: "relative",
    }}>
      {/* Title bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "14px 18px",
        borderBottom: "1px solid #1e2a36", background: "#0d1117",
      }}>
        {["#ff5f56", "#ffbd2e", "#27c93f"].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
        ))}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#5a6a7a", marginLeft: "auto" }}>
          scan results — config.js
        </span>
      </div>

      {/* Scan animation line */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent, #00e5ff, transparent)",
        animation: "scan 3s ease-in-out infinite", opacity: 0.6, zIndex: 2,
      }} />

      {/* Code */}
      <div style={{ padding: "20px 24px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.8 }}>
        <div><span style={{ color: "#5a6a7a" }}>{"// "}</span><span style={{ color: "#ff3d6b" }}>⚠ CRITICAL — API key exposed</span></div>
        <div><span style={{ color: "#5a6a7a" }}>{"12 │ "}</span><span style={{ color: "#ff9944" }}>const</span> <span style={{ color: "#fff" }}> apiKey</span> <span style={{ color: "#5a6a7a" }}> = </span><span style={{ color: "#ff3d6b" }}>"AIzaSyD_xK9mN2vP..."</span> <span style={{ color: "#ff3d6b" }}> ← Google API key</span></div>
        <div style={{ marginTop: 12 }}><span style={{ color: "#5a6a7a" }}>{"// "}</span><span style={{ color: "#00e5ff" }}>AI Review — line 34</span></div>
        <div><span style={{ color: "#5a6a7a" }}>{"34 │ "}</span><span style={{ color: "#ff9944" }}>fetch</span><span style={{ color: "#fff" }}>(url)</span> <span style={{ color: "#5a6a7a" }}>{"// "}</span><span style={{ color: "#00e5ff" }}>no error handling — wrap in try/catch</span></div>
        <div style={{ marginTop: 12 }}><span style={{ color: "#5a6a7a" }}>{"// "}</span><span style={{ color: "#00ff88" }}>✓ Suggestion</span></div>
        <div><span style={{ color: "#5a6a7a" }}>{"   │ "}</span><span style={{ color: "#00ff88" }}>Move secrets to .env → add to .gitignore → rotate key</span></div>
      </div>
    </div>
  );
}

/* ── Features ── */
const features = [
  { icon: "🤖", title: "AI Code Review", desc: "Line-by-line review powered by Gemini. Detects missing error handling, bad patterns, performance issues, and readability problems with exact line numbers.", tag: "Gemini AI", tagColor: "cyan" },
  { icon: "🔐", title: "Secret & API Leak Scanner", desc: "20+ regex patterns catch AWS keys, Google API tokens, JWTs, MongoDB URIs, and private keys instantly. AI second pass catches hardcoded passwords regex misses.", tag: "Critical security", tagColor: "red" },
  { icon: "📊", title: "Quality Score Dashboard", desc: "Visual scores for code quality, security, readability, and best practices. Each score is clickable and jumps to the exact issues that affected it.", tag: "Scored report", tagColor: "green" },
  { icon: "⚡", title: "Instant Fix Suggestions", desc: "Not just what's wrong — exactly how to fix it. Every issue comes with a specific, actionable suggestion so you know what to do next.", tag: "Actionable", tagColor: "cyan" },
  { icon: "🗂", title: "Full Repo File Explorer", desc: "Navigate every file in your repo. Monaco Editor renders your code exactly like VS Code. Select any file and get a fresh AI review in seconds.", tag: "Monaco editor", tagColor: "cyan" },
  { icon: "📁", title: "Scan History", desc: "Every scan is saved to your account. Track your progress over time, revisit past reviews, and see how your code quality improves with each commit.", tag: "Per account", tagColor: "green" },
];

const tagStyles: Record<string, React.CSSProperties> = {
  cyan: { background: "#00e5ff22", color: "#00e5ff", border: "1px solid #00e5ff55" },
  green: { background: "#00ff8818", color: "#00ff88", border: "1px solid #00ff8844" },
  red: { background: "#ff3d6b11", color: "#ff3d6b", border: "1px solid #ff3d6b33" },
};

const iconBg: Record<string, React.CSSProperties> = {
  cyan: { background: "#00e5ff11", border: "1px solid #00e5ff33" },
  green: { background: "#00ff8818", border: "1px solid #00ff8844" },
  red: { background: "#ff3d6b11", border: "1px solid #ff3d6b33" },
};

function FeaturesSection() {
  return (
    <section id="features" style={{ position: "relative", zIndex: 1, padding: "100px 24px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <SectionLabel>Features</SectionLabel>
        <h2 style={{ fontSize: "clamp(32px,4vw,52px)", fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16 }}>
          Everything your code<br />needs to be production-ready
        </h2>
        <p style={{ fontSize: 16, color: "#5a6a7a", maxWidth: 480, lineHeight: 1.7 }}>
          Three powerful engines working together so you ship cleaner, safer code.
        </p>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 1, background: "#1e2a36", border: "1px solid #1e2a36",
          borderRadius: 12, overflow: "hidden", marginTop: 64,
        }}>
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc, tag, tagColor }: typeof features[0]) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      style={{ background: hovered ? "#111820" : "#080b0f", padding: "40px 36px", transition: "background .25s", cursor: "default" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 20, ...iconBg[tagColor] }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.3px" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#5a6a7a", lineHeight: 1.7 }}>{desc}</p>
      <span style={{ display: "inline-block", marginTop: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "1px", padding: "3px 10px", borderRadius: 100, fontWeight: 500, ...tagStyles[tagColor] }}>
        {tag}
      </span>
    </div>
  );
}

/* ── How it works ── */
const steps = [
  { num: "01", title: "Paste your repo URL", desc: "Drop any public GitHub repo link. CodePulse fetches the full file tree instantly using the GitHub API." },
  { num: "02", title: "Secret scan runs first", desc: "All files are scanned in milliseconds for API keys, tokens, and secrets before a single AI call is made." },
  { num: "03", title: "Select a file to review", desc: "Browse the file tree, click any file, and watch the AI review stream in live — line by line, in real time." },
  { num: "04", title: "Get your score report", desc: "See your quality scores, fix suggestions, and every security issue — all in one clean dashboard." },
];

function HowItWorksSection() {
  return (
    <section id="how" style={{
      position: "relative", zIndex: 1, padding: "100px 24px",
      background: "#0d1117",
      borderTop: "1px solid #1e2a36", borderBottom: "1px solid #1e2a36",
    }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <SectionLabel>How it works</SectionLabel>
        <h2 style={{ fontSize: "clamp(32px,4vw,52px)", fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16 }}>
          From repo URL to<br />full report in seconds
        </h2>
        <p style={{ fontSize: 16, color: "#5a6a7a", maxWidth: 480, lineHeight: 1.7 }}>No setup. No installs. Just paste and go.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 0, marginTop: 64, position: "relative" }}>
          {/* Connector line */}
          <div style={{
            position: "absolute", top: 28, left: "10%", right: "10%", height: 1,
            background: "linear-gradient(90deg, transparent, #1e2a36, #1e2a36, transparent)",
          }} />
          {steps.map((s) => <StepCard key={s.num} {...s} />)}
        </div>
      </div>
    </section>
  );
}

function StepCard({ num, title, desc }: typeof steps[0]) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div style={{ textAlign: "center", padding: "0 24px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "#080b0f",
        border: hovered ? "1px solid #00e5ff" : "1px solid #1e2a36",
        boxShadow: hovered ? "0 0 16px #00e5ff22" : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, color: "#00e5ff",
        margin: "0 auto 24px", position: "relative", zIndex: 1,
        transition: "border-color .25s, box-shadow .25s",
      }}>
        {num}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.2px" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "#5a6a7a", lineHeight: 1.7 }}>{desc}</p>
    </div>
  );
}

/* ── CTA ── */
function CTASection() {
  return (
    <section style={{ position: "relative", zIndex: 1, padding: "120px 24px", textAlign: "center" }}>
      {/* Glow */}
      <div style={{
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
        width: 600, height: 300,
        background: "radial-gradient(ellipse, rgba(0,229,255,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative" }}>
        <SectionLabel>Get started</SectionLabel>
        <h2 style={{ fontSize: "clamp(32px,4vw,52px)", fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 24 }}>
          Ready to clean up your code?
        </h2>
        <p style={{ fontSize: 16, color: "#5a6a7a", maxWidth: 480, lineHeight: 1.7, margin: "0 auto 48px" }}>
          Free to use. No credit card. Just your GitHub repo URL.
        </p>
        <Link href="/signup" style={{
          background: "#00e5ff", color: "#000", padding: "14px 32px", borderRadius: 8,
          fontSize: 15, fontWeight: 700, textDecoration: "none", letterSpacing: "0.3px",
          transition: "box-shadow .2s, transform .15s", display: "inline-block",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 32px #00e5ff55"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
          Scan your first repo →
        </Link>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#5a6a7a", marginTop: 20 }}>
          Free · <span style={{ color: "#00e5ff" }}>3 scans/day</span> · No setup required
        </p>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid #1e2a36", padding: "32px 48px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "relative", zIndex: 1,
    }}>
      <Logo />
      <p style={{ fontSize: 12, color: "#5a6a7a", fontFamily: "'JetBrains Mono', monospace" }}>
        Built with Next.js · Gemini AI · MongoDB
      </p>
    </footer>
  );
}

/* ── Shared ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "2px", color: "#00e5ff", textTransform: "uppercase", marginBottom: 16 }}>
      {children}
    </div>
  );
}

// Need React for useState
import React from "react";