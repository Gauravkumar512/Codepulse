"use client";

import React from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import NewScanPage from "./NewScanPage";

const Icons = {
  logout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

function LogoMark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="rgba(138,162,184,0.1)" stroke="rgba(138,162,184,0.25)" strokeWidth="1" />
        <path d="M8 14 L12 10 L16 14 L20 10" stroke="#8aa2b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 18 L12 14 L16 18 L20 14" stroke="#8aa2b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity=".4" />
      </svg>
      <span style={{ fontSize: 15, fontWeight: 600, color: "#d4d4d4", letterSpacing: "-0.3px" }}>
        CodePulse
      </span>
    </div>
  );
}


function Topbar() {
  const router = useRouter();
  const [user, setUser] = React.useState<{ username?: string; email?: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  React.useEffect(() => {
    axios.get("/api/auth/me")
      .then(res => setUser(res.data.user))
      .catch(err => console.error("Failed to fetch user", err));
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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

      {/* User Profile Dropdown */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(138,162,184,0.1)", border: "1px solid rgba(138,162,184,0.25)",
            color: "#8aa2b8", fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)",
            cursor: "pointer", transition: "all 0.2s",
            textTransform: "uppercase",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(138,162,184,0.15)";
            e.currentTarget.style.borderColor = "rgba(138,162,184,0.4)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(138,162,184,0.1)";
            e.currentTarget.style.borderColor = "rgba(138,162,184,0.25)";
          }}
        >
          {user?.username ? user.username.charAt(0) : "?"}
        </button>

        {dropdownOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 200, background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: 8, zIndex: 50,
            boxShadow: "0 8px 24px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.02)",
          }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d4", fontFamily: "var(--font-sans)" }}>
                {user?.username || "Loading..."}
              </div>
              <div style={{ fontSize: 11, color: "#666", fontFamily: "var(--font-mono)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email || ""}
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                background: "transparent", border: "none", color: "#888",
                padding: "8px 12px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "all 0.15s", fontFamily: "var(--font-sans)"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "#c4707e";
                e.currentTarget.style.background = "rgba(196,112,126,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "#888";
                e.currentTarget.style.background = "transparent";
              }}
            >
              {Icons.logout}
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <>
      <style>{`
        input::placeholder { color: rgba(255,255,255,0.18); }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 2px; }
      `}</style>

      <div style={{ height: "100vh", background: "#000", color: "#d4d4d4", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Topbar />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <NewScanPage />
        </div>
      </div>
    </>
  );
}