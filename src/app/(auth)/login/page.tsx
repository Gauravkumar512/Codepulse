"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";

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

function Field({ label, type, value, onChange, placeholder, autoComplete }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, color: "#444", fontFamily: "var(--font-sans)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>
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
            outline: "none", fontFamily: "var(--font-sans)", transition: "all 0.2s",
            boxShadow: focused ? "0 0 0 3px rgba(138,162,184,0.06)" : "none",
          }}
          onMouseEnter={e => { if (!focused) (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
          onMouseLeave={e => { if (!focused) (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
        />
      </div>
    </div>
  );
}

function OAuthButton({ provider, label, icon, onClick, loading }: {
  provider: string; label: string; icon: React.ReactNode;
  onClick: () => void; loading: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      type="button"
      disabled={loading}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      style={{
        width: "100%",
        padding: "12px 16px",
        borderRadius: 8,
        border: `1px solid ${hovered ? "rgba(138,162,184,0.3)" : "rgba(255,255,255,0.1)"}`,
        background: hovered ? "rgba(138,162,184,0.06)" : "rgba(255,255,255,0.03)",
        color: "#d4d4d4",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "var(--font-sans)",
        cursor: loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        transition: "all 0.2s",
        opacity: loading ? 0.5 : 1,
      }}
      id={`oauth-${provider}-btn`}
    >
      {icon}
      {label}
    </motion.button>
  );
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#d4d4d4">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

function OrDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
      <span style={{ fontSize: 11, color: "#444", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "1.5px" }}>or</span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const isDisabled = !user.email || !user.password || loading;

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/auth/login", user);
      toast.success("Welcome back!", {
    style: {
      background: "#111",
      color: "#fff",
      border: "1px solid #111",
    },
});
      router.replace("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Something went wrong", {
    style: {
      background: "#111",
      color: "#fff",
      border: "1px solid #111",
    },
});
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: string) => {
    setOauthLoading(provider);
    signIn(provider, { callbackUrl: "/api/auth/oauth-complete" });
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: rgba(255,255,255,0.18); }
        body { background: #000; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#000", color: "#d4d4d4", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <ParticleBackground />

        {/* glow orb */}
        <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 760, height: 760, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 68%)", pointerEvents: "none", zIndex: 0 }} />

        {/* nav */}
        <motion.nav initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="7" fill="rgba(138,162,184,0.08)" stroke="rgba(138,162,184,0.2)" strokeWidth="1" />
              <path d="M8 14 L12 10 L16 14 L20 10" stroke="#8aa2b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 18 L12 14 L16 18 L20 14" stroke="#8aa2b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity=".4" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#d4d4d4", fontFamily: "var(--font-sans)", letterSpacing: "-0.3px" }}>CodePulse</span>
          </Link>
          <span style={{ fontSize: 12, color: "#444", fontFamily: "var(--font-sans)" }}>
            No account?{" "}
            <Link href="/signup" style={{ color: "rgba(138,162,184,0.6)", textDecoration: "none", transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#8aa2b8")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(138,162,184,0.6)")}>
              Sign up
            </Link>
          </span>
        </motion.nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", zIndex: 10 }}>
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: "100%", maxWidth: 400 }}>

            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(138,162,184,0.07)", border: "1px solid rgba(138,162,184,0.15)", color: "#8aa2b8", padding: "4px 12px", borderRadius: 100, fontSize: 10, fontFamily: "var(--font-sans)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 20 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#8aa2b8", display: "inline-block" }} />
                Welcome back
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 900, letterSpacing: "-2px", lineHeight: 1, color: "#fff" }}>
                Sign in<span style={{ color: "#8aa2b8" }}>.</span>
              </h1>
              <p style={{ marginTop: 10, fontSize: 14, color: "#444", fontFamily: "var(--font-sans)", lineHeight: 1.6 }}>
                Scan your codebase for secrets and quality issues.
              </p>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "28px 28px", backdropFilter: "blur(8px)" }}>

              <form onSubmit={onLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Field label="Email" type="email" autoComplete="email" value={user.email} onChange={v => setUser({ ...user, email: v })} placeholder="you@example.com" />
                <Field label="Password" type="password" autoComplete="current-password" value={user.password} onChange={v => setUser({ ...user, password: v })} placeholder="••••••••" />

                <motion.button type="submit" disabled={isDisabled}
                  whileHover={!isDisabled ? { scale: 1.015 } : {}}
                  whileTap={!isDisabled ? { scale: 0.985 } : {}}
                  style={{
                    marginTop: 4, width: "100%", padding: "13px", borderRadius: 8, border: "none",
                    fontSize: 14, fontWeight: 700, fontFamily: "var(--font-sans)", letterSpacing: "0.5px",
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

              <div style={{ margin: "20px 0" }}>
                <OrDivider />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <OAuthButton
                  provider="google"
                  label="Continue with Google"
                  icon={<GoogleIcon />}
                  onClick={() => handleOAuth("google")}
                  loading={oauthLoading === "google"}
                />
                <OAuthButton
                  provider="github"
                  label="Continue with GitHub"
                  icon={<GitHubIcon />}
                  onClick={() => handleOAuth("github")}
                  loading={oauthLoading === "github"}
                />
              </div>
            </div>

            <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#333", fontFamily: "var(--font-sans)" }}>
              Don't have an account?{" "}
              <Link href="/signup" style={{ color: "rgba(138,162,184,0.5)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#8aa2b8")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(138,162,184,0.5)")}>
                Create one
              </Link>
            </p>
          </motion.div>
        </div>

        <footer style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span style={{ fontSize: 11, color: "#222", fontFamily: "var(--font-sans)" }}>
            Powered by <span style={{ color: "rgba(138,162,184,0.2)" }}>CodePulse</span>
          </span>
        </footer>
      </div>
    </>
  );
}