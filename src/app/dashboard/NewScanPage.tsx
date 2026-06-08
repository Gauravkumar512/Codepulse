"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewPanel, useReview } from "@/src/components/ReviewPanel";
import { ChatTray, useFileChat } from "@/src/components/ChatTray";
import { DependencyPanel, useDependencyScan } from "@/src/components/DependencyPanel";
import { useSecretDecorations, injectSecretStyles } from "@/src/hooks/useSecretDecorations";
import { useIgnoredSecrets, secretKey } from "@/src/context/IgnoredSecretsContext";
import { scanFile, maskSecretsInContent } from "@/src/lib/secretScanner";
import type { FileNode } from "../api/repo/route";
import type { SecretMatch, FileScanResult } from "@/src/lib/secretScanner";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const EMPTY_PATHS: Set<string> = new Set();

type RepoMeta = { owner: string; repo: string; branch: string; totalFiles: number };

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts:"typescript", tsx:"typescript", js:"javascript", jsx:"javascript",
    py:"python", rb:"ruby", go:"go", rs:"rust", java:"java",
    cs:"csharp", cpp:"cpp", c:"c", php:"php", swift:"swift",
    kt:"kotlin", md:"markdown", json:"json", yaml:"yaml", yml:"yaml",
    toml:"ini", env:"plaintext", sh:"shell", bash:"shell",
    css:"css", scss:"scss", html:"html", xml:"xml", sql:"sql",
    prisma:"plaintext", dockerfile:"dockerfile",
  };
  return map[ext] ?? "plaintext";
}

function FileIcon({ name, isDir, open, hasSecrets }: { name: string; isDir: boolean; open?: boolean; hasSecrets?: boolean }) {
  if (isDir) return (
    <svg width="14" height="14" viewBox="0 0 24 24"
      fill={open ? "rgba(138,162,184,0.35)" : "rgba(255,255,255,0.1)"}
      stroke={open ? "#8aa2b8" : "rgba(255,255,255,0.25)"}
      strokeWidth="1.5" strokeLinecap="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const c: Record<string, string> = {
    ts:"#3178c6", tsx:"#3178c6", js:"#f7df1e", jsx:"#61dafb",
    py:"#3572a5", json:"#d4b896", md:"#ffffff", css:"#563d7c",
    scss:"#c6538c", html:"#e34c26", sh:"#89e051", env:"#ecc94b",
  };
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke={hasSecrets ? "#c4707e" : (c[ext] ?? "rgba(255,255,255,0.25)")}
      strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function TreeNode({ node, depth, selectedPath, onSelectFile, secretPaths }: {
  node: FileNode; depth: number; selectedPath: string | null;
  onSelectFile: (n: FileNode) => void;
  secretPaths: Set<string>;
}) {
  const [open, setOpen] = useState(depth < 1);
  const [hov, setHov] = useState(false);
  const isSelected  = selectedPath === node.path;
  const hasSecrets  = secretPaths.has(node.path);

  const childHasSecrets = node.type === "dir" && node.children
    ? node.children.some(c => secretPaths.has(c.path) || (c.children && c.children.some(cc => secretPaths.has(cc.path))))
    : false;

  if (node.type === "dir") return (
    <div>
      <div onClick={() => setOpen(p => !p)}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ display:"flex", alignItems:"center", gap:6, padding:`5px 10px 5px ${14+depth*14}px`, cursor:"pointer", borderRadius:5, background: hov ? "rgba(255,255,255,0.04)" : "transparent", transition:"background .15s" }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition:"transform .2s", flexShrink:0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <FileIcon name={node.name} isDir open={open} />
        <span style={{ fontSize:12, color: open ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.35)", fontFamily:"var(--font-mono)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", flex:1 }}>
          {node.name}
        </span>
        {childHasSecrets && (
          <span style={{ width:5, height:5, borderRadius:"50%", background:"#c4707e", flexShrink:0 }} />
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.2}} style={{overflow:"hidden"}}>
            {node.children?.map(c => (
              <TreeNode key={c.path} node={c} depth={depth+1} selectedPath={selectedPath} onSelectFile={onSelectFile} secretPaths={secretPaths} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div onClick={() => onSelectFile(node)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:6,
        padding:`5px 10px 5px ${26+depth*14}px`,
        cursor:"pointer", borderRadius:5,
        background: isSelected ? (hasSecrets ? "rgba(196,112,126,0.08)" : "rgba(138,162,184,0.07)") : hov ? "rgba(255,255,255,0.03)" : "transparent",
        borderLeft: isSelected ? `2px solid ${hasSecrets ? "#c4707e" : "#8aa2b8"}` : "2px solid transparent",
        transition:"all .15s",
      }}>
      <FileIcon name={node.name} isDir={false} hasSecrets={hasSecrets} />
      <span style={{ fontSize:12, color: isSelected ? (hasSecrets ? "#c4707e" : "#8aa2b8") : hasSecrets ? "rgba(255,100,100,0.7)" : "rgba(255,255,255,0.4)", fontFamily:"var(--font-mono)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", flex:1 }}>
        {node.name}
      </span>
      {hasSecrets && (
        <span style={{ fontSize:9, color:"#c4707e", background:"rgba(196,112,126,0.15)", border:"1px solid rgba(196,112,126,0.3)", padding:"1px 5px", borderRadius:100, fontFamily:"var(--font-mono)", flexShrink:0 }}>
          !
        </span>
      )}
    </div>
  );
}

function UrlBar({ onSubmit, loading }: { onSubmit:(url:string)=>void; loading:boolean }) {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  return (
    <form onSubmit={e=>{e.preventDefault();if(url.trim())onSubmit(url.trim());}}
      style={{ display:"flex",gap:10,padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"#080808",flexShrink:0 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"center",width:34,height:34,borderRadius:7,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",flexShrink:0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)" stroke="none">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </div>
      <input value={url} onChange={e=>setUrl(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        placeholder="https://github.com/owner/repo" disabled={loading}
        style={{ flex:1,padding:"8px 13px",background:focused?"rgba(138,162,184,0.04)":"rgba(255,255,255,0.03)",border:`1px solid ${focused?"rgba(138,162,184,0.28)":"rgba(255,255,255,0.08)"}`,borderRadius:7,fontSize:13,color:"#d4d4d4",outline:"none",fontFamily:"var(--font-mono)",transition:"all .2s" }}/>
      <button type="submit" disabled={!url.trim()||loading}
        style={{ padding:"8px 18px",borderRadius:7,border:"none",flexShrink:0,background:url.trim()&&!loading?"#8aa2b8":"rgba(255,255,255,0.05)",color:url.trim()&&!loading?"#000":"#333",fontSize:12,fontWeight:700,fontFamily:"var(--font-mono)",cursor:url.trim()&&!loading?"pointer":"not-allowed",transition:"all .2s",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap" }}>
        {loading?<><span style={{width:11,height:11,border:"2px solid rgba(0,0,0,0.3)",borderTop:"2px solid #000",borderRadius:"50%",display:"inline-block",animation:"cpspin .7s linear infinite"}}/>Fetching...</>:"Fetch repo"}
      </button>
    </form>
  );
}

function Breadcrumb({ path, repo, secretCount }: { path:string; repo:string; secretCount:number }) {
  const parts = path.split("/");
  return (
    <div style={{ display:"flex",alignItems:"center",gap:4,padding:"7px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0,flexWrap:"wrap" }}>
      <span style={{ fontSize:11,color:"#8aa2b8",fontFamily:"var(--font-mono)" }}>{repo}</span>
      {parts.map((p,i)=>(
        <React.Fragment key={i}>
          <span style={{ fontSize:11,color:"#2a2a2a",fontFamily:"var(--font-mono)" }}>/</span>
          <span style={{ fontSize:11,color:i===parts.length-1?"rgba(255,255,255,0.6)":"#444",fontFamily:"var(--font-mono)" }}>{p}</span>
        </React.Fragment>
      ))}
      {secretCount > 0 && (
        <span style={{ marginLeft:8,fontSize:10,color:"#c4707e",background:"rgba(196,112,126,0.1)",border:"1px solid rgba(196,112,126,0.25)",padding:"2px 8px",borderRadius:100,fontFamily:"var(--font-mono)" }}>
          {secretCount} secret{secretCount>1?"s":""} found
        </span>
      )}
    </div>
  );
}

function Placeholder({ icon, title, sub }: { icon:string; title:string; sub:string }) {
  return (
    <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,color:"#333" }}>
      <div style={{ fontSize:24 }}>{icon}</div>
      <div style={{ fontSize:13,fontWeight:600,color:"#3a3a3a",fontFamily:"var(--font-display)" }}>{title}</div>
      <div style={{ fontSize:11,color:"#252525",fontFamily:"var(--font-mono)",textAlign:"center",lineHeight:1.7 }}>{sub}</div>
    </div>
  );
}

function ScanningOverlay({ phase, current, total }: { phase: string; current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const isFetching = phase === "fetching";
  return (
    <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",zIndex:50,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:18,backdropFilter:"blur(4px)" }}>
      <div style={{ width:48,height:48,borderRadius:12,background:"rgba(196,112,126,0.1)",border:"1px solid rgba(196,112,126,0.25)",display:"flex",alignItems:"center",justifyContent:"center",color:"#c4707e" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:16,fontWeight:700,color:"#d4d4d4",fontFamily:"var(--font-display)",marginBottom:6 }}>Scanning entire repo...</div>
        <div style={{ fontSize:12,color:"#555",fontFamily:"var(--font-mono)" }}>
          {isFetching ? "Fetching files from GitHub" : "Running 25+ secret patterns"}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ width:320 }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
          <span style={{ fontSize:11,color:"#888",fontFamily:"var(--font-mono)" }}>
            {isFetching ? `Fetching ${current}/${total} files` : `Scanning ${current}/${total} files`}
          </span>
          <span style={{ fontSize:11,color:"#8aa2b8",fontFamily:"var(--font-mono)",fontWeight:700 }}>{pct}%</span>
        </div>
        <div style={{ height:4,background:"rgba(255,255,255,0.06)",borderRadius:100,overflow:"hidden" }}>
          <motion.div
            animate={{ width:`${pct}%` }}
            transition={{ duration:0.3,ease:"easeOut" }}
            style={{ height:"100%",background:isFetching?"linear-gradient(90deg,#8aa2b8,#7a9c8e)":"linear-gradient(90deg,#c4707e,#ff8800)",borderRadius:100 }}
          />
        </div>
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:4 }}>
        <span style={{ width:6,height:6,borderRadius:"50%",background:isFetching?"#8aa2b8":"#c4707e",display:"inline-block",animation:"cpulse .8s ease infinite" }}/>
        <span style={{ fontSize:11,color:isFetching?"#8aa2b8":"#c4707e",fontFamily:"var(--font-mono)" }}>
          {isFetching ? "Downloading file contents..." : "Scanning for secrets & API keys..."}
        </span>
      </div>
    </div>
  );
}

function ScanSummaryStrip({ data, selectedIdx, totalSecretFiles, onPrev, onNext, onClear }: {
  data: { totalSecrets: number; critical: number; high: number; medium: number; scannedFiles: number; cleanFiles: number };
  selectedIdx: number;
  totalSecretFiles: number;
  onPrev: () => void;
  onNext: () => void;
  onClear: () => void;
}) {
  const isClean = data.totalSecrets === 0;
  return (
    <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
      style={{ padding:"8px 18px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:12,flexShrink:0,background:isClean?"rgba(122,156,142,0.03)":"rgba(196,112,126,0.03)" }}>
      <span style={{ width:6,height:6,borderRadius:"50%",background:isClean?"#7a9c8e":"#c4707e",display:"inline-block" }}/>
      <span style={{ fontSize:12,color:isClean?"#7a9c8e":"#c4707e",fontFamily:"var(--font-mono)",fontWeight:600 }}>
        {isClean ? "All clear — no secrets found" : `${data.totalSecrets} secret${data.totalSecrets>1?"s":""} found`}
      </span>
      {!isClean && (
        <div style={{ display:"flex",gap:6 }}>
          {data.critical > 0 && <span style={{ fontSize:10,color:"#c4707e",background:"rgba(196,112,126,0.1)",border:"1px solid rgba(196,112,126,0.2)",padding:"2px 8px",borderRadius:100,fontFamily:"var(--font-mono)" }}>{data.critical} critical</span>}
          {data.high > 0 && <span style={{ fontSize:10,color:"#ff8800",background:"rgba(255,136,0,0.1)",border:"1px solid rgba(255,136,0,0.2)",padding:"2px 8px",borderRadius:100,fontFamily:"var(--font-mono)" }}>{data.high} high</span>}
          {data.medium > 0 && <span style={{ fontSize:10,color:"#b8976a",background:"rgba(184,151,106,0.1)",border:"1px solid rgba(184,151,106,0.2)",padding:"2px 8px",borderRadius:100,fontFamily:"var(--font-mono)" }}>{data.medium} medium</span>}
        </div>
      )}
      <span style={{ fontSize:11,color:"#333",fontFamily:"var(--font-mono)" }}>{data.scannedFiles} files scanned · {data.cleanFiles} clean</span>

      <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:16 }}>
        {!isClean && totalSecretFiles > 0 && (
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:11,color:"#555",fontFamily:"var(--font-mono)" }}>File {selectedIdx + 1}/{totalSecretFiles}</span>
            <div style={{ display:"flex",gap:4 }}>
              <button onClick={onPrev} disabled={selectedIdx <= 0} style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.07)",color:selectedIdx<=0?"#333":"#8aa2b8",padding:"3px 8px",borderRadius:4,fontSize:10,fontFamily:"var(--font-mono)",cursor:selectedIdx<=0?"not-allowed":"pointer" }}>{"< Prev"}</button>
              <button onClick={onNext} disabled={selectedIdx >= totalSecretFiles-1} style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.07)",color:selectedIdx>=totalSecretFiles-1?"#333":"#8aa2b8",padding:"3px 8px",borderRadius:4,fontSize:10,fontFamily:"var(--font-mono)",cursor:selectedIdx>=totalSecretFiles-1?"not-allowed":"pointer" }}>{"Next >"}</button>
            </div>
          </div>
        )}
        <button onClick={onClear} style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.07)",color:"#444",padding:"3px 10px",borderRadius:5,fontSize:10,fontFamily:"var(--font-mono)",cursor:"pointer" }}>Clear</button>
      </div>
    </motion.div>
  );
}

export default function NewScanPage() {
  const [repoMeta, setRepoMeta]           = useState<RepoMeta | null>(null);
  const [fileTree, setFileTree]           = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile]   = useState<FileNode | null>(null);
  const [fileContent, setFileContent]     = useState<string | null>(null);
  const [fileSecrets, setFileSecrets]     = useState<SecretMatch[]>([]);
  const [repoResults, setRepoResults]     = useState<FileScanResult[]>([]);
  const [scanMeta, setScanMeta]           = useState<{ scannedFiles:number; totalFiles:number } | null>(null);
  const [repoLoading, setRepoLoading]     = useState(false);
  const [fileLoading, setFileLoading]     = useState(false);
  const [scanning, setScanning]           = useState(false);
  const [scanProgress, setScanProgress]   = useState({ phase:"fetching", current:0, total:0 });
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [reviewWidth, setReviewWidth]     = useState(380);
  const [revealed, setRevealed]           = useState(false);
  const [reviewOpen, setReviewOpen]       = useState(false);

  const review     = useReview();
  const deps       = useDependencyScan();
  const chat       = useFileChat();
  const [chatOpen, setChatOpen] = useState(false);
  const { applyDecorations, clearDecorations } = useSecretDecorations();
  const { ignored, getIgnored, ignoreKeys } = useIgnoredSecrets();

  const ignoredList = selectedFile ? getIgnored(selectedFile.path) : [];
  const ignoredSig  = ignoredList.join("|");
  const overridden  = ignoredList.length > 0; // file has been marked safe
  const activeSecrets = useMemo(() => {
    const set = new Set(ignoredList);
    return fileSecrets.filter((m) => !set.has(secretKey(m)));
  }, [fileSecrets, ignoredSig]);

  const liveScan = useMemo(() => {
    if (!scanMeta) return null;
    let totalSecrets = 0, critical = 0, high = 0, medium = 0;
    const activePaths = new Set<string>();
    for (const r of repoResults) {
      const set = new Set(ignored[r.path] ?? []);
      const active = r.matches.filter((m) => !set.has(secretKey(m)));
      if (active.length === 0) continue;
      activePaths.add(r.path);
      totalSecrets += active.length;
      for (const m of active) {
        if (m.severity === "critical") critical++;
        else if (m.severity === "high") high++;
        else medium++;
      }
    }
    return {
      totalSecrets, critical, high, medium,
      scannedFiles: scanMeta.scannedFiles,
      cleanFiles: scanMeta.scannedFiles - activePaths.size,
      activePaths,
    };
  }, [repoResults, scanMeta, ignored]);

  const secretPaths = liveScan?.activePaths ?? EMPTY_PATHS;
  const secretFilesList = useMemo(() => {
    if (!liveScan || liveScan.activePaths.size === 0) return [] as FileNode[];
    const nodes: FileNode[] = [];
    const walk = (ns: FileNode[]) => {
      for (const n of ns) {
        if (n.type === "file" && liveScan.activePaths.has(n.path)) nodes.push(n);
        if (n.children) walk(n.children);
      }
    };
    walk(fileTree);
    return nodes;
  }, [liveScan, fileTree]);

  // mark every current finding in this file as safe (persisted to the record)
  const markFileSafe = useCallback(() => {
    if (!selectedFile) return;
    const keys = Array.from(
      new Set([...fileSecrets, ...review.blockedSecrets].map(secretKey))
    );
    ignoreKeys(selectedFile.path, keys);
  }, [selectedFile, fileSecrets, review.blockedSecrets, ignoreKeys]);

  const sendChat = useCallback((text: string) => {
    setChatOpen(true);
    chat.send(text, {
      filename: selectedFile?.path ?? null,
      code: fileContent,
      review: review.result,
    });
  }, [chat, selectedFile, fileContent, review.result]);
  const hasScannedRef = useRef(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // inject CSS once
  useEffect(() => { injectSecretStyles(); }, []);

  useEffect(() => {
    if (review.state === "blocked" && review.blockedSecrets.length > 0) {
      setFileSecrets(review.blockedSecrets);
      setRevealed(false);
      setReviewOpen(true);
    }
  }, [review.state, review.blockedSecrets]);

  const displayedContent = useMemo(() => {
    if (fileContent === null) return null;
    if (revealed || activeSecrets.length === 0) return fileContent;
    return maskSecretsInContent(fileContent, activeSecrets);
  }, [fileContent, activeSecrets, revealed]);

  const handleIgnore = useCallback(() => {
    markFileSafe();
    if (selectedFile && fileContent) {
      review.runReview(selectedFile.name, fileContent, { override: true });
    }
  }, [markFileSafe, selectedFile, fileContent, review]);

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      if (activeSecrets.length > 0) {
        applyDecorations(editorRef.current, monacoRef.current, activeSecrets);
      } else {
        clearDecorations(editorRef.current);
      }
    }
  }, [activeSecrets, revealed, displayedContent, applyDecorations, clearDecorations]);

  const handleFetchRepo = useCallback(async (url: string) => {
    setRepoLoading(true); setFetchError(null);
    setFileTree([]); setSelectedFile(null); setFileContent(null);
    setRepoMeta(null); setScanMeta(null); setRepoResults([]);
    hasScannedRef.current = false;
    setFileSecrets([]);
    review.reset();
    try {
      const { data } = await axios.post("/api/repo", { url });
      setFileTree(data.tree);
      setRepoMeta({ owner:data.owner, repo:data.repo, branch:data.branch, totalFiles:data.totalFiles });
    } catch (err: any) {
      setFetchError(err?.response?.data?.error || "Failed to fetch repo");
    } finally {
      setRepoLoading(false);
    }
  }, [review]);

  const handleSelectFile = useCallback(async (node: FileNode) => {
    if (node.type === "dir" || !repoMeta) return;
    setSelectedFile(node); setFileContent(null);
    setFileSecrets([]); setFileLoading(true); setRevealed(false);
    review.reset();
    chat.reset(); setChatOpen(false);
    try {
      const { data } = await axios.get("/api/repo/file", {
        params: { owner:repoMeta.owner, repo:repoMeta.repo, path:node.path, branch:repoMeta.branch },
      });
      setFileContent(data.content);
      // run secret scanner only if the repo has been scanned
      if (hasScannedRef.current) {
        const result = scanFile(node.path, data.content);
        setFileSecrets(result.matches);
      } else {
        setFileSecrets([]);
      }
    } catch (err: any) {
      setFileContent(`// Error: ${err?.response?.data?.error || "Unknown error"}`);
    } finally {
      setFileLoading(false);
    }
  }, [repoMeta, review, chat]);

  const handleScanRepo = useCallback(async () => {
    if (!repoMeta || !fileTree.length) return;
    setScanning(true); setFetchError(null);
    setScanProgress({ phase:"fetching", current:0, total:0 });
    try {
      const res = await fetch("/api/repo/scan-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: repoMeta.owner, repo: repoMeta.repo,
          branch: repoMeta.branch, tree: fileTree,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Scan failed");
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "progress") {
              setScanProgress({ phase: msg.phase, current: msg.current, total: msg.total });
            } else if (msg.type === "result") {
              finalData = msg;
            } else if (msg.type === "error") {
              throw new Error(msg.error);
            }
          } catch (e: any) {
            if (e.message && !e.message.includes("JSON")) throw e;
          }
        }
      }

      if (finalData) {
        const results: FileScanResult[] = finalData.results ?? [];
        setRepoResults(results);
        setScanMeta({ scannedFiles: finalData.scannedFiles, totalFiles: finalData.totalFiles });
        hasScannedRef.current = true;

        const paths = new Set<string>(
          results
            .filter((r) => r.matches.some((m) => !(ignored[r.path] ?? []).includes(secretKey(m))))
            .map((r) => r.path)
        );
        const fileNodes: FileNode[] = [];
        const findNodes = (nodes: FileNode[]) => {
          for (const n of nodes) {
            if (n.type === "file" && paths.has(n.path)) fileNodes.push(n);
            if (n.children) findNodes(n.children);
          }
        };
        findNodes(fileTree);

        if (fileNodes.length > 0) {
          if (!selectedFile || !paths.has(selectedFile.path)) {
            handleSelectFile(fileNodes[0]);
          } else if (fileContent) {
            const result = scanFile(selectedFile.path, fileContent);
            setFileSecrets(result.matches);
          }
        }
      }
    } catch (err: any) {
      setFetchError(err?.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [repoMeta, fileTree, selectedFile, fileContent, ignored]);

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco;
    if (activeSecrets.length > 0) {
      applyDecorations(editor, monaco, activeSecrets);
    }
  }, [activeSecrets, applyDecorations]);

  return (
    <>
      <style>{`
        @keyframes cpspin  { to { transform: rotate(360deg); } }
        @keyframes cpulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        @keyframes cpblink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      <div style={{ display:"flex",flexDirection:"column",height:"100%",overflow:"hidden" }}>

        <UrlBar onSubmit={handleFetchRepo} loading={repoLoading}/>

        <AnimatePresence>
          {fetchError && (
            <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{ padding:"9px 18px",background:"rgba(196,112,126,0.07)",borderBottom:"1px solid rgba(196,112,126,0.18)",display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c4707e" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize:12,color:"#c4707e",fontFamily:"var(--font-mono)" }}>{fetchError}</span>
              <button onClick={()=>setFetchError(null)} style={{ marginLeft:"auto",background:"transparent",border:"none",color:"#c4707e",cursor:"pointer",fontSize:16 }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {repoMeta && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}}
              style={{ padding:"7px 18px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:14,flexShrink:0,background:"rgba(138,162,184,0.02)" }}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:"#7a9c8e",display:"inline-block" }}/>
              <span style={{ fontSize:12,color:"#8aa2b8",fontFamily:"var(--font-mono)",fontWeight:600 }}>{repoMeta.owner}/{repoMeta.repo}</span>
              <span style={{ fontSize:11,color:"#444",fontFamily:"var(--font-mono)" }}>branch: {repoMeta.branch}</span>
              <span style={{ fontSize:11,color:"#444",fontFamily:"var(--font-mono)" }}>{repoMeta.totalFiles} files</span>
              <div style={{ marginLeft:"auto",display:"flex",gap:8,alignItems:"center" }}>
                {/* Check dependencies button */}
                <button onClick={()=>{ if(repoMeta) deps.run(repoMeta.owner,repoMeta.repo,repoMeta.branch,fileTree); }}
                  disabled={deps.state==="loading"||scanning}
                  style={{ padding:"5px 16px",borderRadius:6,border:"1px solid rgba(138,162,184,0.3)",background:"rgba(138,162,184,0.08)",color:"#8aa2b8",fontSize:11,fontWeight:700,fontFamily:"var(--font-mono)",cursor:(deps.state==="loading"||scanning)?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6,transition:"all .2s",opacity:(deps.state==="loading"||scanning)?0.6:1 }}
                  onMouseEnter={e=>{ if(deps.state!=="loading"&&!scanning)(e.currentTarget as HTMLElement).style.background="rgba(138,162,184,0.15)"; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(138,162,184,0.08)"; }}>
                  {deps.state==="loading"
                    ? <><span style={{width:10,height:10,border:"1.5px solid rgba(138,162,184,0.3)",borderTop:"1.5px solid #8aa2b8",borderRadius:"50%",display:"inline-block",animation:"cpspin .7s linear infinite"}}/>Checking...</>
                    : <>Check dependencies</>}
                </button>
                <button onClick={handleScanRepo} disabled={scanning}
                  style={{ padding:"5px 16px",borderRadius:6,border:"1px solid rgba(196,112,126,0.35)",background:"rgba(196,112,126,0.1)",color:"#c4707e",fontSize:11,fontWeight:700,fontFamily:"var(--font-mono)",cursor:scanning?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6,transition:"all .2s" }}
                  onMouseEnter={e=>{ if(!scanning)(e.currentTarget as HTMLElement).style.background="rgba(196,112,126,0.18)"; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(196,112,126,0.1)"; }}>
                  {scanning
                    ? <><span style={{width:10,height:10,border:"1.5px solid rgba(196,112,126,0.3)",borderTop:"1.5px solid #c4707e",borderRadius:"50%",display:"inline-block",animation:"cpspin .7s linear infinite"}}/>Scanning...</>
                    : <>Scan</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {liveScan && (
          <ScanSummaryStrip
            data={liveScan}
            selectedIdx={selectedFile ? secretFilesList.findIndex(f => f.path === selectedFile.path) : -1}
            totalSecretFiles={secretFilesList.length}
            onPrev={() => {
              const idx = secretFilesList.findIndex(f => f?.path === selectedFile?.path);
              if (idx > 0) handleSelectFile(secretFilesList[idx - 1]);
            }}
            onNext={() => {
              const idx = secretFilesList.findIndex(f => f?.path === selectedFile?.path);
              if (idx >= 0 && idx < secretFilesList.length - 1) handleSelectFile(secretFilesList[idx + 1]);
            }}
            onClear={() => {
              setScanMeta(null);
              setRepoResults([]);
              hasScannedRef.current = false;
              if (selectedFile) setFileSecrets([]);
            }}
          />
          )}
        </AnimatePresence>

        <div style={{ flex:1,display:"flex",overflow:"hidden",position:"relative" }}>

          <AnimatePresence>
            {scanning && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:"absolute",inset:0,zIndex:50}}>
                <ScanningOverlay phase={scanProgress.phase} current={scanProgress.current} total={scanProgress.total}/>
              </motion.div>
            )}
          </AnimatePresence>

          <DependencyPanel
            state={deps.state}
            result={deps.result}
            error={deps.error}
            onClose={deps.reset}
            onRetry={()=>{ if(repoMeta) deps.run(repoMeta.owner,repoMeta.repo,repoMeta.branch,fileTree); }}
          />

          <ChatTray
            open={chatOpen}
            messages={chat.messages}
            streaming={chat.streaming}
            error={chat.error}
            filename={selectedFile?.path ?? null}
            onSend={sendChat}
            onStop={chat.stop}
            onClose={()=>setChatOpen(false)}
            onClear={chat.reset}
          />

          <div style={{ width:220,flexShrink:0,borderRight:"1px solid rgba(255,255,255,0.05)",overflowY:"auto",background:"#060606" }}>
            {!repoMeta ? (
              <div style={{ padding:"28px 12px",textAlign:"center",fontSize:11,color:"#222",fontFamily:"var(--font-mono)",lineHeight:1.8 }}>
                {repoLoading?"Loading tree...":"File explorer\nappears here"}
              </div>
            ) : (
              <div style={{ padding:"8px 6px" }}>
                <div style={{ padding:"4px 10px 8px",fontSize:9,color:"#2a2a2a",fontFamily:"var(--font-mono)",letterSpacing:"2px",textTransform:"uppercase" }}>Explorer</div>
                {fileTree.map(node=>(
                  <TreeNode key={node.path} node={node} depth={0}
                    selectedPath={selectedFile?.path??null}
                    onSelectFile={handleSelectFile}
                    secretPaths={secretPaths}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#050505",minWidth:0 }}>
            {selectedFile && repoMeta && (
              <Breadcrumb
                path={selectedFile.path}
                repo={`${repoMeta.owner}/${repoMeta.repo}`}
                secretCount={activeSecrets.length}
              />
            )}
            {activeSecrets.length > 0 && fileContent !== null && (
              <div style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(196,112,126,0.04)",flexShrink:0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c4707e" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span style={{ fontSize:11,color:"#c4707e",fontFamily:"var(--font-mono)" }}>
                  {revealed
                    ? "Secret values visible"
                    : `${activeSecrets.length} secret value${activeSecrets.length>1?"s":""} hidden`}
                </span>
                <button onClick={()=>setRevealed(r=>!r)}
                  style={{ marginLeft:"auto",background:"transparent",border:"1px solid rgba(196,112,126,0.3)",color:"#c4707e",padding:"3px 12px",borderRadius:5,fontSize:10,fontFamily:"var(--font-mono)",cursor:"pointer" }}>
                  {revealed ? "Hide" : "Reveal"}
                </button>
                <button onClick={markFileSafe} title="Mark these findings as false positives — unmask & dismiss (persists across navigation)"
                  style={{ background:"rgba(184,151,106,0.12)",border:"1px solid rgba(184,151,106,0.3)",color:"#b8976a",padding:"3px 12px",borderRadius:5,fontSize:10,fontWeight:700,fontFamily:"var(--font-mono)",cursor:"pointer" }}>
                  ✓ Ignore / Mark safe
                </button>
              </div>
            )}
            {fileLoading ? (
              <Placeholder icon="⟳" title="Loading file..." sub="Fetching from GitHub API"/>
            ) : fileContent !== null && selectedFile ? (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{flex:1,overflow:"hidden"}}>
                <MonacoEditor
                  height="100%"
                  language={detectLanguage(selectedFile.name)}
                  value={displayedContent ?? ""}
                  theme="vs-dark"
                  options={{
                    readOnly:true, fontSize:13,
                    fontFamily:"'JetBrains Mono',monospace",
                    fontLigatures:true,
                    minimap:{ enabled:true },
                    glyphMargin:true,
                    scrollBeyondLastLine:false,
                    lineNumbers:"on",
                    wordWrap:"on",
                    padding:{ top:14,bottom:14 },
                    smoothScrolling:true,
                    automaticLayout:true,
                    scrollbar:{ verticalScrollbarSize:3,horizontalScrollbarSize:3 },
                  }}
                  onMount={handleEditorMount}
                />
              </motion.div>
            ) : (
              <Placeholder
                icon="◈"
                title={repoMeta?"Select a file":"No repo loaded"}
                sub={repoMeta?"Click any file — secrets are highlighted inline\nOr click 'Scan entire repo' to find all leaks":"Paste a GitHub URL above to get started"}
              />
            )}
          </div>

          <AnimatePresence initial={false}>
            {reviewOpen && (
              <motion.div
                key="review-panel"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: reviewWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "tween", duration: 0.26, ease: "easeOut" }}
                style={{ flexShrink:0, borderLeft:"1px solid rgba(255,255,255,0.05)", background:"#060606", position:"relative", display:"flex", flexDirection:"column", overflow:"hidden" }}
              >
                {/* Drag Handle */}
                <div
                  style={{
                    position: "absolute", left: -4, top: 0, bottom: 0, width: 8,
                    cursor: "col-resize", zIndex: 10,
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(138,162,184,0.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const startW = reviewWidth;
                    const onMouseMove = (moveE: MouseEvent) => {
                      const delta = startX - moveE.clientX;
                      setReviewWidth(Math.max(250, Math.min(1000, startW + delta)));
                    };
                    const onMouseUp = () => {
                      document.removeEventListener("mousemove", onMouseMove);
                      document.removeEventListener("mouseup", onMouseUp);
                    };
                    document.addEventListener("mousemove", onMouseMove);
                    document.addEventListener("mouseup", onMouseUp);
                  }}
                />
                {/* fixed inner width keeps content from squishing during the slide */}
                <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", width: reviewWidth }}>
                  <ReviewPanel
                    state={review.state} result={review.result}
                    rawStream={review.rawStream} error={review.error}
                    blockedSecrets={review.blockedSecrets}
                    onRun={()=>{ if(selectedFile&&fileContent) review.runReview(selectedFile.name,fileContent!,{ override: overridden }); }}
                    onReset={review.reset}
                    onStop={review.stopReview}
                    filename={selectedFile?.name??null} hasFile={!!fileContent}
                    onSendChat={sendChat}
                    onOpenChat={()=>setChatOpen(true)}
                    chatBusy={chat.streaming}
                    chatCount={chat.messages.length}
                    onIgnore={handleIgnore}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={()=>setReviewOpen(o=>!o)}
            title={reviewOpen ? "Hide AI panel" : "Show AI Review & Chat"}
            style={{
              position:"absolute", top:10, zIndex:40,
              right: reviewOpen ? reviewWidth + 12 : 12,
              transition:"right .26s ease",
              display:"flex", alignItems:"center", gap:7,
              padding:"7px 13px", borderRadius:8,
              background: reviewOpen ? "rgba(138,162,184,0.16)" : "rgba(138,162,184,0.1)",
              border:"1px solid rgba(138,162,184,0.3)", color:"#8aa2b8",
              fontSize:11, fontWeight:700, fontFamily:"var(--font-mono)", cursor:"pointer",
              boxShadow:"0 4px 14px rgba(0,0,0,0.4)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.9 4.8L18.7 9l-4.8 1.9L12 15.7 10.1 10.9 5.3 9l4.8-1.2z"/>
            </svg>
            {reviewOpen ? "Hide AI" : "AI Review"}
            {!reviewOpen && (review.state === "blocked" || review.state === "done" || chat.messages.length > 0) && (
              <span style={{ width:7, height:7, borderRadius:"50%", background: review.state === "blocked" ? "#c4707e" : "#7a9c8e", boxShadow:`0 0 6px ${review.state === "blocked" ? "#c4707e" : "#7a9c8e"}` }} />
            )}
          </button>

        </div>
      </div>
    </>
  );
}
