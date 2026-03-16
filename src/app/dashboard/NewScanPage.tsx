"use client";

import React, { useState, useCallback } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewPanel,useReview } from "@/src/components/ReviewPanel";
import type { FileNode } from "../api/repo/route";

/* ── Monaco client-side only ── */
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type RepoMeta = { owner: string; repo: string; branch: string; totalFiles: number };

/* ── Language detector ── */
function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    cs: "csharp", cpp: "cpp", c: "c", php: "php", swift: "swift",
    kt: "kotlin", md: "markdown", json: "json", yaml: "yaml", yml: "yaml",
    toml: "ini", env: "plaintext", sh: "shell", bash: "shell",
    css: "css", scss: "scss", html: "html", xml: "xml", sql: "sql",
    prisma: "plaintext", dockerfile: "dockerfile",
  };
  return map[ext] ?? "plaintext";
}

/* ── File icon ── */
function FileIcon({ name, isDir, open }: { name: string; isDir: boolean; open?: boolean }) {
  if (isDir) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={open ? "rgba(0,217,255,0.35)" : "rgba(255,255,255,0.1)"} stroke={open ? "#00d9ff" : "rgba(255,255,255,0.25)"} strokeWidth="1.5" strokeLinecap="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const c: Record<string, string> = { ts:"#3178c6", tsx:"#3178c6", js:"#f7df1e", jsx:"#61dafb", py:"#3572a5", json:"#d4b896", md:"#ffffff", css:"#563d7c", scss:"#c6538c", html:"#e34c26", sh:"#89e051", env:"#ecc94b" };
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c[ext] ?? "rgba(255,255,255,0.25)"} strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

/* ── Tree node ── */
function TreeNode({ node, depth, selectedPath, onSelectFile }: { node: FileNode; depth: number; selectedPath: string | null; onSelectFile: (n: FileNode) => void }) {
  const [open, setOpen] = useState(depth < 1);
  const [hov, setHov] = useState(false);
  const isSelected = selectedPath === node.path;

  if (node.type === "dir") return (
    <div>
      <div onClick={() => setOpen(p => !p)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ display:"flex", alignItems:"center", gap:6, padding:`5px 10px 5px ${14+depth*14}px`, cursor:"pointer", borderRadius:5, background: hov ? "rgba(255,255,255,0.04)":"transparent", transition:"background .15s" }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open?"rotate(90deg)":"rotate(0deg)", transition:"transform .2s", flexShrink:0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <FileIcon name={node.name} isDir open={open} />
        <span style={{ fontSize:12, color: open?"rgba(255,255,255,0.65)":"rgba(255,255,255,0.35)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{node.name}</span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:.2 }} style={{ overflow:"hidden" }}>
            {node.children?.map(c => <TreeNode key={c.path} node={c} depth={depth+1} selectedPath={selectedPath} onSelectFile={onSelectFile} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div onClick={() => onSelectFile(node)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:"flex", alignItems:"center", gap:6, padding:`5px 10px 5px ${26+depth*14}px`, cursor:"pointer", borderRadius:5, background: isSelected?"rgba(0,217,255,0.07)": hov?"rgba(255,255,255,0.03)":"transparent", borderLeft: isSelected?"2px solid #00d9ff":"2px solid transparent", transition:"all .15s" }}>
      <FileIcon name={node.name} isDir={false} />
      <span style={{ fontSize:12, color: isSelected?"#00d9ff":"rgba(255,255,255,0.4)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{node.name}</span>
    </div>
  );
}

/* ── URL bar ── */
function UrlBar({ onSubmit, loading }: { onSubmit: (url: string) => void; loading: boolean }) {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  return (
    <form onSubmit={e => { e.preventDefault(); if (url.trim()) onSubmit(url.trim()); }}
      style={{ display:"flex", gap:10, padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,0.05)", background:"#080808", flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:34, height:34, borderRadius:7, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", flexShrink:0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)" stroke="none">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </div>
      <input value={url} onChange={e => setUrl(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder="https://github.com/owner/repo" disabled={loading}
        style={{ flex:1, padding:"8px 13px", background: focused?"rgba(0,217,255,0.04)":"rgba(255,255,255,0.03)", border:`1px solid ${focused?"rgba(0,217,255,0.28)":"rgba(255,255,255,0.08)"}`, borderRadius:7, fontSize:13, color:"#f0f0f0", outline:"none", transition:"all .2s" }} />
      <button type="submit" disabled={!url.trim()||loading}
        style={{ padding:"8px 18px", borderRadius:7, border:"none", flexShrink:0, background: url.trim()&&!loading?"#00d9ff":"rgba(255,255,255,0.05)", color: url.trim()&&!loading?"#000":"#333", fontSize:12, fontWeight:700, cursor: url.trim()&&!loading?"pointer":"not-allowed", boxShadow: url.trim()&&!loading?"0 0 14px rgba(0,217,255,0.2)":"none", transition:"all .2s", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
        {loading ? <><span style={{ width:11, height:11, border:"2px solid rgba(0,0,0,0.3)", borderTop:"2px solid #000", borderRadius:"50%", display:"inline-block", animation:"cpspin .7s linear infinite" }}/>Fetching...</> : "Fetch repo →"}
      </button>
    </form>
  );
}

/* ── Breadcrumb ── */
function Breadcrumb({ path, repo }: { path: string; repo: string }) {
  const parts = path.split("/");
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, padding:"7px 14px", borderBottom:"1px solid rgba(255,255,255,0.05)", flexShrink:0, flexWrap:"wrap" }}>
      <span style={{ fontSize:11, color:"#00d9ff" }}>{repo}</span>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          <span style={{ fontSize:11, color:"#2a2a2a" }}>/</span>
          <span style={{ fontSize:11, color: i===parts.length-1?"rgba(255,255,255,0.6)":"#444" }}>{p}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── Placeholder ── */
function Placeholder({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"#333" }}>
      <div style={{ fontSize:26 }}>{icon}</div>
      <div style={{ fontSize:13, fontWeight:600, color:"#3a3a3a" }}>{title}</div>
      <div style={{ fontSize:11, color:"#252525", textAlign:"center", lineHeight:1.7 }}>{sub}</div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function NewScanPage() {
  const [repoMeta, setRepoMeta]         = useState<RepoMeta | null>(null);
  const [fileTree, setFileTree]         = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent]   = useState<string | null>(null);
  const [repoLoading, setRepoLoading]   = useState(false);
  const [fileLoading, setFileLoading]   = useState(false);
  const [fetchError, setFetchError]     = useState<string | null>(null);

  /* review hook */
  const review = useReview();

  /* fetch repo */
  const handleFetchRepo = useCallback(async (url: string) => {
    setRepoLoading(true);
    setFetchError(null);
    setFileTree([]); setSelectedFile(null); setFileContent(null); setRepoMeta(null);
    review.reset();
    try {
      const { data } = await axios.post("/api/repo", { url });
      setFileTree(data.tree);
      setRepoMeta({ owner: data.owner, repo: data.repo, branch: data.branch, totalFiles: data.totalFiles });
    } catch (err: any) {
      setFetchError(err?.response?.data?.error || "Failed to fetch repo");
    } finally {
      setRepoLoading(false);
    }
  }, [review]);

  /* fetch file */
  const handleSelectFile = useCallback(async (node: FileNode) => {
    if (node.type === "dir" || !repoMeta) return;
    setSelectedFile(node);
    setFileContent(null);
    setFileLoading(true);
    review.reset();
    try {
      const { data } = await axios.get("/api/repo/file", {
        params: { owner: repoMeta.owner, repo: repoMeta.repo, path: node.path, branch: repoMeta.branch },
      });
      setFileContent(data.content);
    } catch (err: any) {
      setFileContent(`// Error: ${err?.response?.data?.error || "Unknown error"}`);
    } finally {
      setFileLoading(false);
    }
  }, [repoMeta, review]);

  /* run review */
  const handleRunReview = useCallback(() => {
    if (!selectedFile || !fileContent) return;
    review.runReview(selectedFile.name, fileContent);
  }, [selectedFile, fileContent, review]);

  return (
    <>
      <style>{`
        @keyframes cpspin  { to { transform: rotate(360deg); } }
        @keyframes cpulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        @keyframes cpblink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

        {/* URL bar */}
        <UrlBar onSubmit={handleFetchRepo} loading={repoLoading} />

        {/* Error */}
        <AnimatePresence>
          {fetchError && (
            <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              style={{ padding:"9px 18px", background:"rgba(255,68,102,0.07)", borderBottom:"1px solid rgba(255,68,102,0.18)", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff4466" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize:12, color:"#ff4466" }}>{fetchError}</span>
              <button onClick={() => setFetchError(null)} style={{ marginLeft:"auto", background:"transparent", border:"none", color:"#ff4466", cursor:"pointer", fontSize:16 }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Repo meta bar */}
        <AnimatePresence>
          {repoMeta && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ padding:"7px 18px", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", alignItems:"center", gap:16, flexShrink:0, background:"rgba(0,217,255,0.025)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#00ff85", display:"inline-block" }}/>
                <span style={{ fontSize:12, color:"#00d9ff", fontWeight:600 }}>{repoMeta.owner}/{repoMeta.repo}</span>
              </div>
              <span style={{ fontSize:11, color:"#444" }}>branch: {repoMeta.branch}</span>
              <span style={{ fontSize:11, color:"#444" }}>{repoMeta.totalFiles} files</span>
              <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
                {selectedFile && fileContent && review.state === "idle" && (
                  <motion.button initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }}
                    onClick={handleRunReview}
                    style={{ padding:"5px 14px", borderRadius:6, border:"none", cursor:"pointer", background:"#00d9ff", color:"#000", fontSize:11, fontWeight:700, boxShadow:"0 0 12px rgba(0,217,255,0.2)" }}>
                    Run AI review →
                  </motion.button>
                )}
                {review.state === "streaming" && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#00d9ff" }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:"#00d9ff", animation:"cpulse 1s ease infinite", display:"inline-block" }}/>
                    Reviewing...
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3-column layout: tree | editor | review */}
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

          {/* File tree */}
          <div style={{ width:220, flexShrink:0, borderRight:"1px solid rgba(255,255,255,0.05)", overflowY:"auto", background:"#060606" }}>
            {!repoMeta ? (
              <div style={{ padding:"32px 12px", textAlign:"center", fontSize:11, color:"#222", lineHeight:1.8 }}>
                {repoLoading ? "Loading tree..." : "File explorer\nappears here"}
              </div>
            ) : (
              <div style={{ padding:"8px 6px" }}>
                <div style={{ padding:"4px 10px 8px", fontSize:9, color:"#2a2a2a", letterSpacing:"2px", textTransform:"uppercase" }}>Explorer</div>
                {fileTree.map(node => (
                  <TreeNode key={node.path} node={node} depth={0} selectedPath={selectedFile?.path ?? null} onSelectFile={handleSelectFile} />
                ))}
              </div>
            )}
          </div>

          {/* Monaco editor */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#050505", minWidth:0 }}>
            {selectedFile && repoMeta && <Breadcrumb path={selectedFile.path} repo={`${repoMeta.owner}/${repoMeta.repo}`} />}
            {fileLoading ? (
              <Placeholder icon="⟳" title="Loading file..." sub="Fetching from GitHub API" />
            ) : fileContent !== null && selectedFile ? (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ flex:1, overflow:"hidden" }}>
                <MonacoEditor
                  height="100%"
                  language={detectLanguage(selectedFile.name)}
                  value={fileContent}
                  theme="vs-dark"
                  options={{
                    readOnly: true, fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    wordWrap: "on",
                    padding: { top: 14, bottom: 14 },
                    smoothScrolling: true,
                    scrollbar: { verticalScrollbarSize: 3, horizontalScrollbarSize: 3 },
                  }}
                />
              </motion.div>
            ) : (
              <Placeholder
                icon="◈"
                title={repoMeta ? "Select a file" : "No repo loaded"}
                sub={repoMeta ? "Click any file in the explorer" : "Paste a GitHub URL above"}
              />
            )}
          </div>

          {/* Review panel */}
          <div style={{ width:300, flexShrink:0, borderLeft:"1px solid rgba(255,255,255,0.05)", background:"#060606", overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <ReviewPanel
              state={review.state}
              result={review.result}
              rawStream={review.rawStream}
              error={review.error}
              onRun={handleRunReview}
              onReset={review.reset}
              filename={selectedFile?.name ?? null}
              hasFile={!!fileContent}
            />
          </div>

        </div>
      </div>
    </>
  );
}
