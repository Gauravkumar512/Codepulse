"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

/* ── Particle canvas (shared logic) ── */
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
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx*dx+dy*dy);
          if (d < 130) { ctx.beginPath(); ctx.strokeStyle=`rgba(0,217,255,${.06*(1-d/130)})`; ctx.lineWidth=.5; ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.stroke(); }
        }
      for (const p of pts) {
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(0,217,255,${p.a})`; ctx.fill();
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>canvas.width) p.vx*=-1;
        if(p.y<0||p.y>canvas.height) p.vy*=-1;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", opacity:.5 }} />;
}

/* ── Password strength ── */
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let s = 0;
  if (pw.length >= 8)  s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const map = [
    { label: "Weak",   color: "#ff4466" },
    { label: "Weak",   color: "#ff4466" },
    { label: "Fair",   color: "#ffaa00" },
    { label: "Good",   color: "#00d9ff" },
    { label: "Strong", color: "#00ff85" },
  ];
  return { score: s, ...map[s] };
}

/* ── Input field ── */
function Field({ label, type, value, onChange, placeholder, autoComplete, error }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  autoComplete?: string; error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;
  return (
    <div>
      <label style={{ display:"block", fontSize:10, color:"#444", fontFamily:"var(--cp-mono)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:8 }}>
        {label}
      </label>
      <input
        type={type} value={value} autoComplete={autoComplete} required
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width:"100%",
          background: focused ? "rgba(0,217,255,0.04)" : hasError ? "rgba(255,68,102,0.04)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${hasError ? "rgba(255,68,102,0.4)" : focused ? "rgba(0,217,255,0.35)" : "rgba(255,255,255,0.08)"}`,
          borderRadius:8, padding:"12px 16px", fontSize:14, color:"#f0f0f0",
          outline:"none", fontFamily:"var(--cp-mono)", transition:"all 0.2s",
          boxShadow: focused ? `0 0 0 3px ${hasError ? "rgba(255,68,102,0.06)" : "rgba(0,217,255,0.06)"}` : "none",
        }}
      />
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
            style={{ fontSize:11, color:"rgba(255,68,102,0.8)", fontFamily:"var(--cp-mono)", marginTop:6 }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Strength bar ── */
function StrengthBar({ password }: { password: string }) {
  const { score, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ marginTop:-8 }}>
      <div style={{ display:"flex", gap:4, marginBottom:4 }}>
        {[1,2,3,4].map(i => (
          <motion.div key={i} initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:i*0.05 }}
            style={{ flex:1, height:2, borderRadius:2, background: i <= score ? color : "rgba(255,255,255,0.08)", transformOrigin:"left", transition:"background 0.3s" }} />
        ))}
      </div>
      <span style={{ fontSize:10, color, fontFamily:"var(--cp-mono)", letterSpacing:"1px" }}>{label}</span>
    </motion.div>
  );
}

/* ── Checkbox ── */
function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange}
      style={{
        width:18, height:18, borderRadius:5, cursor:"pointer", flexShrink:0, marginTop:1,
        background: checked ? "#00d9ff" : "rgba(255,255,255,0.04)",
        border: `1px solid ${checked ? "#00d9ff" : "rgba(255,255,255,0.12)"}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all 0.2s", boxShadow: checked ? "0 0 12px rgba(0,217,255,0.3)" : "none",
      }}>
      <AnimatePresence>
        {checked && (
          <motion.svg initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0 }}
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [user, setUser] = useState({ username:"", email:"", password:"", confirmPassword:"" });
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwMismatch = user.confirmPassword.length > 0 && user.password !== user.confirmPassword;
  const isDisabled = !accepted || !user.username || !user.email || !user.password || !user.confirmPassword || pwMismatch || loading;

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.password !== user.confirmPassword) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    try {
      await axios.post("/api/auth/signup", user);
      toast.success("Account created!");
      router.push("/dashboard");
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
        :root { --cp-display:'Cabinet Grotesk',sans-serif; --cp-mono:'JetBrains Mono',monospace; }
        *{box-sizing:border-box;margin:0;padding:0;}
        input::placeholder{color:rgba(255,255,255,0.18);}
        body{background:#000;}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ minHeight:"100vh", background:"#000", color:"#f0f0f0", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
        <ParticleBackground />

        {/* glow orbs */}
        <div style={{ position:"fixed", top:"20%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(0,217,255,0.045) 0%, transparent 65%)", pointerEvents:"none", zIndex:0 }} />
        <div style={{ position:"fixed", bottom:"0%", right:"-5%", width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle, rgba(0,255,133,0.03) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }} />

        {/* nav */}
        <motion.nav initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
          style={{ position:"relative", zIndex:10, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 40px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none" }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="7" fill="rgba(0,217,255,0.08)" stroke="rgba(0,217,255,0.2)" strokeWidth="1"/>
              <path d="M8 14 L12 10 L16 14 L20 10" stroke="#00d9ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 18 L12 14 L16 18 L20 14" stroke="#00d9ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity=".4"/>
            </svg>
            <span style={{ fontSize:14, fontWeight:700, color:"#f0f0f0", fontFamily:"var(--cp-mono)", letterSpacing:"-0.3px" }}>CodePulse</span>
          </Link>
          <span style={{ fontSize:12, color:"#444", fontFamily:"var(--cp-mono)" }}>
            Have an account?{" "}
            <Link href="/login" style={{ color:"rgba(0,217,255,0.6)", textDecoration:"none" }}
              onMouseEnter={e=>(e.currentTarget.style.color="#00d9ff")}
              onMouseLeave={e=>(e.currentTarget.style.color="rgba(0,217,255,0.6)")}>
              Sign in
            </Link>
          </span>
        </motion.nav>

        {/* main */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px", position:"relative", zIndex:10 }}>
          <motion.div initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.65, ease:[0.16,1,0.3,1] }}
            style={{ width:"100%", maxWidth:420 }}>

            {/* heading */}
            <div style={{ marginBottom:32 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(0,217,255,0.07)", border:"1px solid rgba(0,217,255,0.15)", color:"#00d9ff", padding:"4px 12px", borderRadius:100, fontSize:10, fontFamily:"var(--cp-mono)", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:18 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"#00d9ff", display:"inline-block" }}/>
                Free to get started
              </div>
              <h1 style={{ fontFamily:"var(--cp-display)", fontSize:40, fontWeight:900, letterSpacing:"-2px", lineHeight:1, color:"#fff" }}>
                Create account<span style={{ color:"#00d9ff" }}>.</span>
              </h1>
              <p style={{ marginTop:10, fontSize:14, color:"#444", fontFamily:"var(--cp-display)", lineHeight:1.6 }}>
                Get 3 free scans a day. No credit card needed.
              </p>
            </div>

            {/* card */}
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"28px", backdropFilter:"blur(8px)" }}>
              <form onSubmit={onSignUp} style={{ display:"flex", flexDirection:"column", gap:18 }}>

                {/* row: username + email */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <Field label="Username" type="text" autoComplete="username" value={user.username} onChange={v=>setUser({...user,username:v})} placeholder="johndoe" />
                  <Field label="Email" type="email" autoComplete="email" value={user.email} onChange={v=>setUser({...user,email:v})} placeholder="you@example.com" />
                </div>

                {/* password */}
                <Field label="Password" type="password" autoComplete="new-password" value={user.password} onChange={v=>setUser({...user,password:v})} placeholder="Min. 6 characters" />
                <StrengthBar password={user.password} />

                {/* confirm password */}
                <Field
                  label="Confirm password" type="password" autoComplete="new-password"
                  value={user.confirmPassword} onChange={v=>setUser({...user,confirmPassword:v})}
                  placeholder="••••••••"
                  error={pwMismatch ? "Passwords don't match" : undefined}
                />

                {/* terms */}
                <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"4px 0" }}>
                  <Checkbox checked={accepted} onChange={()=>setAccepted(p=>!p)} />
                  <p style={{ fontSize:12, color:"#444", fontFamily:"var(--cp-mono)", lineHeight:1.6, cursor:"pointer" }} onClick={()=>setAccepted(p=>!p)}>
                    I agree to the{" "}
                    <a href="/terms" onClick={e=>e.stopPropagation()} style={{ color:"rgba(0,217,255,0.5)", textDecoration:"none" }}>Terms</a>
                    {" "}and{" "}
                    <a href="/privacy" onClick={e=>e.stopPropagation()} style={{ color:"rgba(0,217,255,0.5)", textDecoration:"none" }}>Privacy Policy</a>
                  </p>
                </div>

                {/* submit */}
                <motion.button type="submit" disabled={isDisabled}
                  whileHover={!isDisabled ? { scale:1.015 } : {}}
                  whileTap={!isDisabled ? { scale:0.985 } : {}}
                  style={{
                    marginTop:4, width:"100%", padding:"13px", borderRadius:8, border:"none",
                    fontSize:14, fontWeight:700, fontFamily:"var(--cp-mono)", letterSpacing:"0.5px",
                    cursor:isDisabled ? "not-allowed" : "pointer", transition:"all 0.2s",
                    background:isDisabled ? "rgba(255,255,255,0.05)" : "#00d9ff",
                    color:isDisabled ? "rgba(255,255,255,0.2)" : "#000",
                    boxShadow:isDisabled ? "none" : "0 0 24px rgba(0,217,255,0.25)",
                  }}>
                  {loading
                    ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                        <span style={{ width:14, height:14, border:"2px solid rgba(0,0,0,0.3)", borderTop:"2px solid #000", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>
                        Creating account...
                      </span>
                    : "Create account →"}
                </motion.button>
              </form>
            </div>

            <p style={{ marginTop:20, textAlign:"center", fontSize:12, color:"#333", fontFamily:"var(--cp-mono)" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color:"rgba(0,217,255,0.5)", textDecoration:"none" }}
                onMouseEnter={e=>(e.currentTarget.style.color="#00d9ff")}
                onMouseLeave={e=>(e.currentTarget.style.color="rgba(0,217,255,0.5)")}>
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>

        {/* footer */}
        <footer style={{ position:"relative", zIndex:10, textAlign:"center", padding:"20px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
          <span style={{ fontSize:11, color:"#222", fontFamily:"var(--cp-mono)" }}>
            Powered by <span style={{ color:"rgba(0,217,255,0.2)" }}>CodePulse</span>
          </span>
        </footer>
      </div>
    </>
  );
}