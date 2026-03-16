"use client";

import React from "react";
import NewScanPage from "./NewScanPage";

/* ─────────────────────────────────────────
   ICONS
───────────────────────────────────────── */
const Icons = {
  logout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

/* ─────────────────────────────────────────
   LOGO
───────────────────────────────────────── */
function LogoMark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="rgba(0,217,255,0.1)" stroke="rgba(0,217,255,0.25)" strokeWidth="1"/>
        <path d="M8 14 L12 10 L16 14 L20 10" stroke="#00d9ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 18 L12 14 L16 18 L20 14" stroke="#00d9ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity=".4"/>
      </svg>
      <span style={{ fontSize: 15, fontWeight: 600, color: "#f0f0f0", letterSpacing: "-0.3px" }}>
        CodePulse
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   TOPBAR (with logout button)
───────────────────────────────────────── */
function Topbar() {
  return (
    <div style={{
      padding: "12px 24px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#060606",
      flexShrink: 0,
    }}>
      <LogoMark />
      <button
        onClick={() => alert("logout")}
        title="Sign out"
        style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          color: "#888", cursor: "pointer", padding: "8px 16px", borderRadius: 8,
          fontSize: 13, fontWeight: 500, transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = "#ff4466";
          e.currentTarget.style.borderColor = "rgba(255,68,102,0.3)";
          e.currentTarget.style.background = "rgba(255,68,102,0.06)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = "#888";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        }}>
        {Icons.logout}
        Logout
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   DASHBOARD ROOT
───────────────────────────────────────── */
export default function DashboardLayout() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        input, button, select { font-family: inherit; }
        input::placeholder { color: rgba(255,255,255,0.18); }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 2px; }
      `}</style>

      <div style={{ height: "100vh", background: "#000", color: "#f0f0f0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Topbar />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <NewScanPage />
        </div>
      </div>
    </>
  );
}