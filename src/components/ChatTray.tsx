"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import type { ReviewResult } from "./ReviewPanel";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatContext = {
  filename: string | null;
  code: string | null;
  review: ReviewResult | null;
};

const CHAT_COOLDOWN_MS = 3000;
const toastStyle = { background: "#111", color: "#fff", border: "1px solid #1f1f1f" };

export function useFileChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const lastSendRef = useRef(0);

  const send = useCallback(
    async (text: string, ctx: ChatContext) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!ctx.filename || ctx.code == null) {
        toast("Open a file and run a review first", { style: toastStyle });
        return;
      }
      if (inFlightRef.current) return;

      const since = Date.now() - lastSendRef.current;
      if (since < CHAT_COOLDOWN_MS) {
        const wait = Math.ceil((CHAT_COOLDOWN_MS - since) / 1000);
        toast(`Slow down — wait ${wait}s between messages`, { style: toastStyle });
        return;
      }
      lastSendRef.current = Date.now();
      inFlightRef.current = true;

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      const history = [...messages, userMsg]; // full conversation sent to the server
      setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
      setStreaming(true);
      setError(null);

      const finishAssistant = (content: string) =>
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content };
          return copy;
        });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: ctx.filename,
            code: ctx.code,
            review: ctx.review,
            messages: history,
          }),
          signal: controller.signal,
        });

        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          const msg = data?.error || "Rate limited — try again shortly";
          toast.error(msg, { style: toastStyle });
          setError(msg);
          finishAssistant(`⚠ ${msg}`);
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Chat request failed");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let full = "";
        while (true) {
          if (controller.signal.aborted) {
            await reader.cancel();
            break;
          }
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          finishAssistant(full);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          finishAssistant("⏹ stopped");
          return;
        }
        const msg = err?.message || "Something went wrong";
        toast.error(msg, { style: toastStyle });
        setError(msg);
        finishAssistant(`⚠ ${msg}`);
      } finally {
        setStreaming(false);
        inFlightRef.current = false;
        abortRef.current = null;
      }
    },
    [messages]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    setMessages([]);
    setStreaming(false);
    setError(null);
  }, []);

  return { messages, streaming, error, send, stop, reset };
}

function Bubble({ msg, streaming }: { msg: ChatMessage; streaming: boolean }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}
    >
      <div
        style={{
          maxWidth: "86%",
          background: isUser ? "rgba(138,162,184,0.12)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${isUser ? "rgba(138,162,184,0.22)" : "rgba(255,255,255,0.06)"}`,
          color: isUser ? "#cdd9e3" : "rgba(255,255,255,0.82)",
          borderRadius: 12,
          padding: "10px 13px",
          fontSize: 13,
          fontFamily: "var(--font-mono)",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.content}
        {!isUser && streaming && msg.content === "" && (
          <span style={{ display: "inline-block", width: 7, height: 13, background: "#8aa2b8", opacity: 0.7, verticalAlign: "middle", animation: "cpblink 1s step-end infinite" }} />
        )}
      </div>
    </motion.div>
  );
}

export function ChatTray({
  open, messages, streaming, error, filename, onSend, onStop, onClose, onClear,
}: {
  open: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  filename: string | null;
  onSend: (text: string) => void;
  onStop: () => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  const submit = () => {
    const t = input.trim();
    if (!t || streaming) return;
    onSend(t);
    setInput("");
  };

  const shortName = filename ? filename.split("/").pop() : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.45)" }}
          />
          {/* drawer */}
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.26, ease: "easeOut" }}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(440px, 92%)", zIndex: 56, background: "#080808", borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", boxShadow: "-16px 0 48px rgba(0,0,0,0.6)" }}
          >
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(138,162,184,0.1)", border: "1px solid rgba(138,162,184,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8aa2b8" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#d4d4d4", fontFamily: "var(--font-display)" }}>Chat about this file</div>
                {shortName && <div style={{ fontSize: 11, color: "#555", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shortName}</div>}
              </div>
              {messages.length > 0 && (
                <button onClick={onClear} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#555", padding: "3px 9px", borderRadius: 5, fontSize: 10, fontFamily: "var(--font-mono)", cursor: "pointer" }}>Clear</button>
              )}
              <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#666", width: 26, height: 26, borderRadius: 6, fontSize: 15, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {/* messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.length === 0 ? (
                <div style={{ margin: "auto", textAlign: "center", maxWidth: 280 }}>
                  <div style={{ fontSize: 26, marginBottom: 10 }}>💬</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#666", fontFamily: "var(--font-display)", marginBottom: 6 }}>Ask about {shortName ?? "this file"}</div>
                  <div style={{ fontSize: 12, color: "#3a3a3a", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>
                    I have this file's code and its AI review in context. Ask me to explain, refactor, or fix anything.
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <Bubble key={i} msg={m} streaming={streaming && i === messages.length - 1} />
                ))
              )}
            </div>

            {/* input */}
            <div style={{ padding: "0 14px 14px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "#1a1a1a", borderRadius: 16, padding: "8px 8px 8px 14px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                  placeholder={streaming ? "Generating…" : "Ask a follow-up… (Enter to send)"}
                  rows={1}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", color: "#d4d4d4", fontSize: 13, fontFamily: "var(--font-sans)", lineHeight: 1.5, maxHeight: 120, padding: "4px 0" }}
                />
                {streaming ? (
                  <button onClick={onStop} title="Stop"
                    style={{ width: 32, height: 32, borderRadius: "50%", background: "#444", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#d4d4d4"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  </button>
                ) : (
                  <button onClick={submit} disabled={!input.trim()} title="Send"
                    style={{ width: 32, height: 32, borderRadius: "50%", background: input.trim() ? "#8aa2b8" : "#333", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() ? "pointer" : "default", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? "#000" : "#666"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
                  </button>
                )}
              </div>
              {error && <div style={{ fontSize: 10, color: "#c4707e", fontFamily: "var(--font-mono)", marginTop: 6, paddingLeft: 4 }}>{error}</div>}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
