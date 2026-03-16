"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

/* ── Particle canvas ── */
function ParticleBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
      r: Math.random() * 1.2 + .4, a: Math.random() * .4 + .08,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) { ctx.beginPath(); ctx.strokeStyle = `rgba(138,162,184,${.06 * (1 - d / 130)})`; ctx.lineWidth = .5; ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
        }
      }
      for (const p of pts) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(138,162,184,${p.a})`; ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: .55 }} />;
}

/* ── Input field ── */
function Field({ label, type, value, onChange, placeholder, autoComplete }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, color: "#444", fontFamily: "var(--cp-mono)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={type} value={value} autoComplete={autoComplete} required
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            width: "100%", background: focused ? "rgba(138,162,184,0.04)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${focused ? "rgba(138,162,184,0.35)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#d4d4d4",
            outline: "none", fontFamily: "var(--cp-mono)", transition: "all 0.2s",
            boxShadow: focused ? "0 0 0 3px rgba(138,162,184,0.06)" : "none",
          }}
          onMouseEnter={e => { if (!focused) (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
          onMouseLeave={e => { if (!focused) (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const isDisabled = !user.email || !user.password || loading;

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/auth/login", user);
      toast.success("Welcome back!");
      router.replace("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        :root { --cp-display: 'Cabinet Grotesk', sans-serif; --cp-mono: 'JetBrains Mono', monospace; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: rgba(255,255,255,0.18); }
        body { background: #000; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#000", color: "#d4d4d4", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <ParticleBackground />

        {/* glow orb */}
        <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(138,162,184,0.05) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

        {/* nav */}
        <motion.nav initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="7" fill="rgba(138,162,184,0.08)" stroke="rgba(138,162,184,0.2)" strokeWidth="1" />
              <path d="M8 14 L12 10 L16 14 L20 10" stroke="#8aa2b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 18 L12 14 L16 18 L20 14" stroke="#8aa2b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity=".4" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#d4d4d4", fontFamily: "var(--cp-mono)", letterSpacing: "-0.3px" }}>CodePulse</span>
          </Link>
          <span style={{ fontSize: 12, color: "#444", fontFamily: "var(--cp-mono)" }}>
            No account?{" "}
            <Link href="/signup" style={{ color: "rgba(138,162,184,0.6)", textDecoration: "none", transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#8aa2b8")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(138,162,184,0.6)")}>
              Sign up
            </Link>
          </span>
        </motion.nav>

        {/* main */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", zIndex: 10 }}>
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: "100%", maxWidth: 400 }}>

            {/* heading */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(138,162,184,0.07)", border: "1px solid rgba(138,162,184,0.15)", color: "#8aa2b8", padding: "4px 12px", borderRadius: 100, fontSize: 10, fontFamily: "var(--cp-mono)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 20 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#8aa2b8", display: "inline-block" }} />
                Welcome back
              </div>
              <h1 style={{ fontFamily: "var(--cp-display)", fontSize: 42, fontWeight: 900, letterSpacing: "-2px", lineHeight: 1, color: "#fff" }}>
                Sign in<span style={{ color: "#8aa2b8" }}>.</span>
              </h1>
              <p style={{ marginTop: 10, fontSize: 14, color: "#444", fontFamily: "var(--cp-display)", lineHeight: 1.6 }}>
                Scan your codebase for secrets and quality issues.
              </p>
            </div>

            {/* card */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "28px 28px", backdropFilter: "blur(8px)" }}>
              <form onSubmit={onLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Field label="Email" type="email" autoComplete="email" value={user.email} onChange={v => setUser({ ...user, email: v })} placeholder="you@example.com" />
                <Field label="Password" type="password" autoComplete="current-password" value={user.password} onChange={v => setUser({ ...user, password: v })} placeholder="••••••••" />

                <motion.button type="submit" disabled={isDisabled}
                  whileHover={!isDisabled ? { scale: 1.015 } : {}}
                  whileTap={!isDisabled ? { scale: 0.985 } : {}}
                  style={{
                    marginTop: 4, width: "100%", padding: "13px", borderRadius: 8, border: "none",
                    fontSize: 14, fontWeight: 700, fontFamily: "var(--cp-mono)", letterSpacing: "0.5px",
                    cursor: isDisabled ? "not-allowed" : "pointer", transition: "all 0.2s",
                    background: isDisabled ? "rgba(255,255,255,0.05)" : "#8aa2b8",
                    color: isDisabled ? "rgba(255,255,255,0.2)" : "#000",
                    boxShadow: isDisabled ? "none" : "0 0 24px rgba(138,162,184,0.25)",
                  }}>
                  {loading
                    ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <span style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.3)", borderTop: "2px solid #000", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                        Signing in...
                      </span>
                    : "Sign in →"}
                </motion.button>
              </form>
            </div>

            <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#333", fontFamily: "var(--cp-mono)" }}>
              Don't have an account?{" "}
              <Link href="/signup" style={{ color: "rgba(138,162,184,0.5)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#8aa2b8")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(138,162,184,0.5)")}>
                Create one
              </Link>
            </p>
          </motion.div>
        </div>

        {/* footer */}
        <footer style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span style={{ fontSize: 11, color: "#222", fontFamily: "var(--cp-mono)" }}>
            Powered by <span style={{ color: "rgba(138,162,184,0.2)" }}>CodePulse</span>
          </span>
        </footer>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}