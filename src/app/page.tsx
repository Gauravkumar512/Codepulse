"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence,Variants } from "framer-motion";

const C = {
  bg:       "#000000",
  surface:  "#0a0a0a",
  card:     "#0f0f0f",
  border:   "#1a1a1a",
  border2:  "#252525",
  cyan:     "#8aa2b8",
  cyanDim:  "rgba(138,162,184,0.07)",
  cyanMid:  "rgba(138,162,184,0.16)",
  green:    "#7a9c8e",
  red:      "#c4707e",
  amber:    "#b8976a",
  text:     "#d4d4d4",
  muted:    "#3a3a3a",
  muted2:   "#666",
};

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const PARTICLE_COUNT = 80;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(138,162,184,${0.05 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // dots
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(138,162,184,${p.alpha * 0.6})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.6 }}
    />
  );
}

/* ─────────────────────────────────────────
   NOISE OVERLAY
───────────────────────────────────────── */
function NoiseOverlay() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
      opacity: 0.025,
    }} />
  );
}

/* ─────────────────────────────────────────
   GLOW ORBS
───────────────────────────────────────── */
function GlowOrbs() {
  return (
    <>
      <div style={{
        position: "fixed", top: "-20vh", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(138,162,184,0.035) 0%, transparent 65%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "10vh", right: "-10vw",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(122,156,142,0.03) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
    </>
  );
}

/* ─────────────────────────────────────────
   NAVBAR
───────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: 60,
        background: scrolled ? "rgba(0,0,0,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
        transition: "all 0.4s ease",
      }}
    >
      <LogoMark />
      <div style={{ display: "flex", gap: 36 }}>
        {[["Features", "#features"], ["How it works", "#how"]].map(([l, h]) => (
          <NavLink key={l} href={h}>{l}</NavLink>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/signin" style={{ color: C.muted2, fontSize: 13, fontWeight: 500, textDecoration: "none", fontFamily: "var(--font-sans)", letterSpacing: "0.2px" }}>
          Sign in
        </Link>
        <GlowButton href="/signup" small>Get started</GlowButton>
      </div>
    </motion.nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <a href={href}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ color: hov ? C.text : C.muted2, fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "color 0.2s", fontFamily: "var(--font-sans)", letterSpacing: "0.2px" }}>
      {children}
    </a>
  );
}

function LogoMark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill={C.cyanDim} stroke={C.cyanMid} strokeWidth="1" />
        <path d="M8 14 L12 10 L16 14 L20 10" stroke={C.cyan} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 18 L12 14 L16 18 L20 14" stroke={C.cyan} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
      </svg>
      <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "var(--font-mono)", letterSpacing: "-0.3px" }}>
        CodePulse
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   GLOW BUTTON
───────────────────────────────────────── */
function GlowButton({ href, children, small, outline }: { href: string; children: React.ReactNode; small?: boolean; outline?: boolean }) {
  const [hov, setHov] = useState(false);
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: small ? "7px 18px" : "12px 28px",
    borderRadius: 8,
    fontSize: small ? 13 : 15,
    fontWeight: 600, letterSpacing: "0.2px",
    textDecoration: "none",
    transition: "all 0.2s ease",
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
    border: "none",
    position: "relative",
    overflow: "hidden",
  };

  if (outline) return (
    <Link href={href}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, background: "transparent", color: C.text, border: `1px solid ${hov ? C.border2 : C.border}`, boxShadow: "none" }}>
      {children}
    </Link>
  );

  return (
    <Link href={href}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        ...base,
        background: hov ? "#9ab4c8" : C.cyan,
        color: "#000",
        boxShadow: hov ? `0 0 24px rgba(138,162,184,0.3), 0 0 48px rgba(138,162,184,0.1)` : `0 0 12px rgba(138,162,184,0.15)`,
        transform: hov ? "translateY(-1px)" : "translateY(0)",
      }}>
      {children}
      <span style={{ fontSize: small ? 12 : 14 }}>→</span>
    </Link>
  );
}

/* ─────────────────────────────────────────
   HERO
───────────────────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] } }),
};

function HeroSection() {
  return (
    <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", position: "relative", zIndex: 2 }}>

      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.cyanDim, border: `1px solid ${C.cyanMid}`, color: C.cyan, padding: "5px 14px", borderRadius: 100, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 40 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.cyan, display: "inline-block", animation: "cpulse 2s ease infinite" }} />
        AI Code Review · Secret Detection · Quality Scoring
      </motion.div>

      <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="show"
        style={{ fontSize: "clamp(52px, 7.5vw, 96px)", fontWeight: 800, lineHeight: 0.95, letterSpacing: "-3px", marginBottom: 28, fontFamily: "var(--font-display)" }}>
        <span style={{ display: "block", color: C.text }}>Review.</span>
        <span style={{ display: "block", color: C.text }}>Detect.</span>
        <span style={{ display: "block", background: `linear-gradient(100deg, #8aa2b8 0%, #a8c4b0 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Ship clean.
        </span>
      </motion.h1>

      <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show"
        style={{ fontSize: 17, color: C.muted2, maxWidth: 480, lineHeight: 1.75, fontWeight: 400, marginBottom: 48, fontFamily: "var(--font-sans)" }}>
        Paste any GitHub repo URL. Get instant AI code review, API leak scanning, and a full quality score — all streaming live.
      </motion.p>

      <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show"
        style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center", marginBottom: 72 }}>
        <GlowButton href="/signup">Scan your repo</GlowButton>
        <GlowButton href="#how" outline>See how it works</GlowButton>
      </motion.div>

      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" style={{ width: "100%", maxWidth: 720 }}>
        <TerminalCard />
      </motion.div>
    </section>
  );
}

function TerminalCard() {
  const lines = [
    { delay: 0,    content: <><span style={{ color: C.muted2 }}>$</span> <span style={{ color: C.cyan }}>codepulse</span> <span style={{ color: C.text }}>scan</span> <span style={{ color: C.amber }}>github.com/user/my-app</span></> },
    { delay: 600,  content: <><span style={{ color: C.muted }}>›</span> <span style={{ color: C.muted2 }}>Fetching repo tree... </span><span style={{ color: C.green }}>42 files found</span></> },
    { delay: 1100, content: <><span style={{ color: C.muted }}>›</span> <span style={{ color: C.muted2 }}>Running secret scanner...</span></> },
    { delay: 1600, content: <><span style={{ color: C.red }}>  ⚠ CRITICAL</span><span style={{ color: C.muted2 }}> config.js:12 — AWS key exposed</span></> },
    { delay: 1900, content: <><span style={{ color: C.red }}>  ⚠ CRITICAL</span><span style={{ color: C.muted2 }}> .env.local:3  — MongoDB URI exposed</span></> },
    { delay: 2400, content: <><span style={{ color: C.muted }}>›</span> <span style={{ color: C.muted2 }}>Running AI review on </span><span style={{ color: C.cyan }}>api/auth.js</span><span style={{ color: C.muted2 }}>...</span></> },
    { delay: 3000, content: <><span style={{ color: C.amber }}>  ⚡ HIGH</span><span style={{ color: C.muted2 }}>    line 34 — no error handling on async fetch</span></> },
    { delay: 3300, content: <><span style={{ color: C.amber }}>  ⚡ MED</span><span style={{ color: C.muted2 }}>     line 67 — raw password comparison (use bcrypt)</span></> },
    { delay: 3800, content: <><span style={{ color: C.muted }}>›</span> <span style={{ color: C.muted2 }}>Security score: </span><span style={{ color: C.red }}>38/100</span><span style={{ color: C.muted2 }}> · Quality: </span><span style={{ color: C.amber }}>71/100</span></> },
    { delay: 4200, content: <><span style={{ color: C.green }}>✓</span><span style={{ color: C.muted2 }}> Full report ready — </span><span style={{ color: C.cyan }}>view dashboard</span></> },
  ];

  const [visible, setVisible] = useState<number[]>([]);
  useEffect(() => {
    lines.forEach((l, i) => {
      setTimeout(() => setVisible(v => [...v, i]), l.delay + 800);
    });
  }, []);

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      overflow: "hidden", textAlign: "left",
      boxShadow: `0 0 0 1px ${C.border}, 0 40px 80px rgba(0,0,0,0.6), 0 0 40px rgba(138,162,184,0.03)`,
    }}>
      {/* titlebar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderBottom: `1px solid ${C.border}`, background: "#080808" }}>
        {["#ff5f56","#ffbd2e","#27c93f"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
        <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: C.muted, letterSpacing: "0.5px" }}>terminal — codepulse</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {[C.red, C.amber, C.green].map((c, i) => (
            <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: c, background: `${c}18`, padding: "2px 7px", borderRadius: 4, letterSpacing: "0.5px" }}>
              {["2 critical", "2 high", "ai ready"][i]}
            </span>
          ))}
        </div>
      </div>
      {/* code */}
      <div style={{ padding: "20px 24px", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 2, minHeight: 280 }}>
        {lines.map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={visible.includes(i) ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.35, ease: "easeOut" }}>
            {l.content}
          </motion.div>
        ))}
        {visible.length < lines.length && (
          <span style={{ display: "inline-block", width: 7, height: 14, background: C.cyan, opacity: 0.8, animation: "blink 1s step-end infinite", verticalAlign: "middle" }} />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   STATS BAR
───────────────────────────────────────── */
function StatsBar() {
  const stats = [
    { val: "20+", label: "Secret patterns" },
    { val: "~2s", label: "Avg scan time" },
    { val: "100%", label: "Free to use" },
    { val: "AI", label: "Gemini powered" },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
      style={{ position: "relative", zIndex: 2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: "#050505" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
        {stats.map((s, i) => (
          <div key={i} style={{ padding: "32px 24px", textAlign: "center", borderRight: i < 3 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.cyan, fontFamily: "var(--font-mono)", letterSpacing: "-1px", marginBottom: 4 }}>{s.val}</div>
            <div style={{ fontSize: 12, color: C.muted2, fontFamily: "var(--font-sans)", letterSpacing: "0.5px", textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   FEATURES
───────────────────────────────────────── */
const features = [
  {
    icon: <PathIcon />, accent: C.cyan,
    title: "AI Code Review", tag: "Gemini",
    desc: "Line-by-line review streamed live. Detects bad patterns, missing error handling, and performance issues — with exact line numbers.",
  },
  {
    icon: <ShieldIcon />, accent: C.red,
    title: "Secret Scanner", tag: "Critical",
    desc: "20+ regex patterns instantly surface AWS keys, JWTs, MongoDB URIs, and private keys. AI second pass catches what regex misses.",
  },
  {
    icon: <ChartIcon />, accent: C.green,
    title: "Quality Scores", tag: "Dashboard",
    desc: "Security, quality, readability scores in one view. Every score links to the exact lines causing the deduction.",
  },
  {
    icon: <ZapIcon />, accent: C.amber,
    title: "Fix Suggestions", tag: "Actionable",
    desc: "Not just what's wrong — exactly how to fix it. Every issue ships with a concrete, specific suggestion.",
  },
  {
    icon: <FileIcon />, accent: C.cyan,
    title: "File Explorer", tag: "Monaco",
    desc: "Full repo file tree. Click any file, get a live-streamed AI review in the same Monaco editor you use in VS Code.",
  },
  {
    icon: <HistoryIcon />, accent: C.green,
    title: "Scan History", tag: "Per user",
    desc: "Every scan saved to your account. Watch your quality scores climb as you iterate and improve.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" style={{ position: "relative", zIndex: 2, padding: "120px 24px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <Label>Features</Label>
          <h2 style={{ fontSize: "clamp(36px,4vw,56px)", fontWeight: 800, letterSpacing: "-2px", lineHeight: 1.05, marginBottom: 16, fontFamily: "var(--font-display)", color: C.text }}>
            Everything you need to<br />ship production-ready code.
          </h2>
          <p style={{ fontSize: 16, color: C.muted2, maxWidth: 440, lineHeight: 1.75, fontFamily: "var(--font-sans)" }}>
            Three engines. One dashboard. Zero excuses.
          </p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 1, background: C.border, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginTop: 64 }}>
          {features.map((f, i) => <FeatureCard key={i} {...f} index={i} />)}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, accent, title, tag, desc, index }: typeof features[0] & { index: number }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.07 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? "#0d0d0d" : C.surface, padding: "36px 32px", transition: "background 0.2s", cursor: "default", position: "relative", overflow: "hidden" }}>
      {hov && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 30% 40%, ${accent}08 0%, transparent 60%)`, pointerEvents: "none" }} />}
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}10`, border: `1px solid ${accent}25`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: accent }}>
        {icon}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "var(--font-sans)", letterSpacing: "-0.3px" }}>{title}</h3>
        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: accent, background: `${accent}12`, border: `1px solid ${accent}28`, padding: "2px 8px", borderRadius: 100, letterSpacing: "1px", textTransform: "uppercase" }}>{tag}</span>
      </div>
      <p style={{ fontSize: 14, color: C.muted2, lineHeight: 1.75, fontFamily: "var(--font-sans)" }}>{desc}</p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   HOW IT WORKS
───────────────────────────────────────── */
const steps = [
  { num: "01", title: "Paste your repo URL", desc: "Drop any public GitHub URL. We parse owner/repo and hit the GitHub API to fetch the full file tree.", accent: C.cyan },
  { num: "02", title: "Secrets scanned instantly", desc: "Every file is regex-scanned for 20+ secret patterns before a single AI call is made. Free, instant, zero cost.", accent: C.red },
  { num: "03", title: "Select a file", desc: "Browse the explorer. Click any file — watch the AI review stream directly into Monaco Editor, line by line.", accent: C.green },
  { num: "04", title: "See your report", desc: "Quality score dashboard. Fix suggestions table. Full history. Everything in one clean view.", accent: C.amber },
];

function HowItWorksSection() {
  return (
    <section id="how" style={{ position: "relative", zIndex: 2, padding: "120px 24px", background: "#030303", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <Label>How it works</Label>
          <h2 style={{ fontSize: "clamp(36px,4vw,56px)", fontWeight: 800, letterSpacing: "-2px", lineHeight: 1.05, marginBottom: 16, fontFamily: "var(--font-display)", color: C.text }}>
            Repo URL to full report.<br />No setup needed.
          </h2>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 0, marginTop: 72, position: "relative" }}>
          {/* connector */}
          <div style={{ position: "absolute", top: 30, left: "8%", right: "8%", height: 1, background: `linear-gradient(90deg, transparent, ${C.border}, ${C.border}, transparent)` }} />
          {steps.map((s, i) => <StepCard key={i} {...s} index={i} />)}
        </div>
      </div>
    </section>
  );
}

function StepCard({ num, title, desc, accent, index }: typeof steps[0] & { index: number }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ textAlign: "center", padding: "0 28px", paddingBottom: 8 }}>
      <div style={{
        width: 60, height: 60, borderRadius: "50%",
        background: hov ? `${accent}12` : "#050505",
        border: hov ? `1px solid ${accent}60` : `1px solid ${C.border}`,
        boxShadow: hov ? `0 0 24px ${accent}20` : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: accent,
        margin: "0 auto 28px", position: "relative", zIndex: 1,
        transition: "all 0.25s ease",
      }}>
        {num}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: C.text, fontFamily: "var(--font-sans)", letterSpacing: "-0.2px" }}>{title}</h3>
      <p style={{ fontSize: 13, color: C.muted2, lineHeight: 1.75, fontFamily: "var(--font-sans)" }}>{desc}</p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   CTA
───────────────────────────────────────── */
function CTASection() {
  return (
    <section style={{ position: "relative", zIndex: 2, padding: "140px 24px", textAlign: "center", overflow: "hidden" }}>
      <div style={{
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        width: 700, height: 400,
        background: `radial-gradient(ellipse, rgba(138,162,184,0.04) 0%, transparent 65%)`,
        pointerEvents: "none",
      }} />
      <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ position: "relative" }}>
        <Label center>Get started free</Label>
        <h2 style={{ fontSize: "clamp(40px,5vw,68px)", fontWeight: 800, letterSpacing: "-2.5px", lineHeight: 1.0, marginBottom: 24, fontFamily: "var(--font-display)", color: C.text }}>
          Ready to clean up<br />your codebase?
        </h2>
        <p style={{ fontSize: 16, color: C.muted2, maxWidth: 400, lineHeight: 1.75, margin: "0 auto 48px", fontFamily: "var(--font-sans)" }}>
          Free. No credit card. Just your GitHub repo URL and 30 seconds of your time.
        </p>
        <GlowButton href="/signup">Scan your first repo</GlowButton>
        <p style={{ marginTop: 20, fontFamily: "var(--font-mono)", fontSize: 12, color: C.muted, letterSpacing: "0.5px" }}>
          Free · <span style={{ color: C.cyan }}>3 scans/day</span> · No setup
        </p>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────────
   FOOTER
───────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ position: "relative", zIndex: 2, borderTop: `1px solid ${C.border}`, padding: "28px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
      <LogoMark />
      <p style={{ fontSize: 12, color: C.muted, fontFamily: "var(--font-mono)", letterSpacing: "0.3px" }}>
        Built with Next.js · Gemini AI · MongoDB
      </p>
    </footer>
  );
}

/* ─────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────── */
function Label({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "2.5px", color: C.cyan, textTransform: "uppercase", marginBottom: 20, textAlign: center ? "center" : "left" }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   MINI SVG ICONS
───────────────────────────────────────── */
function PathIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>; }
function ShieldIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function ChartIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function ZapIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }
function FileIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }
function HistoryIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.02"/></svg>; }

/* ─────────────────────────────────────────
   ROOT
───────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        :root {
          --font-display: 'Cabinet Grotesk', sans-serif;
          --font-sans: 'Cabinet Grotesk', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #000; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 2px; }
        @keyframes cpulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      <div style={{ background: "#000", color: C.text, minHeight: "100vh", overflowX: "hidden" }}>
        <ParticleBackground />
        <NoiseOverlay />
        <GlowOrbs />
        <Navbar />
        <HeroSection />
        <StatsBar />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
        <Footer />
      </div>
    </>
  );
}