// app/api/repo/scan-all/route.ts

import { NextRequest } from "next/server";
import { scanFile } from "@/src/lib/secretScanner";
import type { FileScanResult } from "@/src/lib/secretScanner";

/* ── file extensions we can actually scan ── */
const SCANNABLE_EXTS = new Set([
  "ts","tsx","js","jsx","mjs","cjs",
  "py","rb","go","rs","java","php","cs","cpp","c","swift","kt",
  "env","sh","bash","zsh","fish",
  "yaml","yml","toml","ini","cfg","conf","config",
  "xml","html","htm","css","scss",
  "tf","tfvars","hcl",
  "dockerfile","makefile","rakefile",
  "sql","prisma","graphql",
  "md","txt","npmrc","nvmrc",
]);

const SKIP_DIRS = new Set([
  "node_modules",".git",".next","dist","build",
  "out","coverage",".cache","vendor","__pycache__",
  ".pytest_cache","target","bin","obj",
]);

/* ── files that produce false positives ── */
const SKIP_FILES = new Set([
  "package.json","package-lock.json",
  "yarn.lock","pnpm-lock.yaml",
  "composer.json","composer.lock",
  "gemfile.lock","cargo.lock",
  "go.sum","go.mod",
  "pipfile.lock","poetry.lock",
  ".gitignore",
]);

function isScannableFile(path: string): boolean {
  const parts = path.split("/");
  if (parts.some((p) => SKIP_DIRS.has(p))) return false;

  const filename  = parts[parts.length - 1].toLowerCase();
  if (SKIP_FILES.has(filename)) return false;

  const ext       = filename.split(".").pop() ?? "";
  const noExt     = ["dockerfile","makefile",".env",".envrc",".npmrc"];

  return SCANNABLE_EXTS.has(ext) || noExt.some((n) => filename.includes(n));
}

/* ── fetch a single file via raw URL ── */
async function fetchRaw(owner: string, repo: string, branch: string, path: string): Promise<string | null> {
  try {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const res = await fetch(url, {
      headers: process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {},
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes("\0")) return null;
    return text.length > 150_000 ? text.slice(0, 150_000) : text;
  } catch {
    return null;
  }
}

/* ── POST /api/repo/scan-all ── (streams NDJSON progress) */
export async function POST(req: NextRequest) {
  try {
    const { owner, repo, branch, tree } = await req.json();

    if (!owner || !repo || !branch || !tree) {
      return new Response(JSON.stringify({ error: "owner, repo, branch, tree required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    /* collect scannable file paths from the tree */
    const allPaths: string[] = [];
    function collectPaths(nodes: any[]) {
      for (const node of nodes) {
        if (node.type === "file" && isScannableFile(node.path)) {
          allPaths.push(node.path);
        }
        if (node.children) collectPaths(node.children);
      }
    }
    collectPaths(tree);

    const filesToScan = allPaths.slice(0, 300);
    const totalToScan = filesToScan.length;

    /* stream NDJSON: progress events + final result */
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const fetched: { path: string; content: string }[] = [];
          let fetchedCount = 0;

          /* send progress: fetching phase */
          const sendProgress = (phase: string, current: number, total: number) => {
            controller.enqueue(encoder.encode(
              JSON.stringify({ type: "progress", phase, current, total }) + "\n"
            ));
          };

          /* fetch all files in batches of 15 */
          const BATCH = 15;
          for (let i = 0; i < filesToScan.length; i += BATCH) {
            const batch = filesToScan.slice(i, i + BATCH);
            const results = await Promise.all(
              batch.map(async (path) => {
                const content = await fetchRaw(owner, repo, branch, path);
                return content ? { path, content } : null;
              })
            );
            results.forEach((r) => r && fetched.push(r));
            fetchedCount += batch.length;
            sendProgress("fetching", fetchedCount, totalToScan);
          }

          /* scan phase */
          const scanResults: FileScanResult[] = [];
          let totalSecrets = 0;
          let critical = 0, high = 0, medium = 0;

          for (let i = 0; i < fetched.length; i++) {
            const file = fetched[i];
            const result = scanFile(file.path, file.content);
            if (result.matches.length > 0) {
              scanResults.push(result);
              totalSecrets += result.matches.length;
              critical += result.matches.filter((m) => m.severity === "critical").length;
              high     += result.matches.filter((m) => m.severity === "high").length;
              medium   += result.matches.filter((m) => m.severity === "medium").length;
            }
            // send scanning progress every 10 files
            if ((i + 1) % 10 === 0 || i === fetched.length - 1) {
              sendProgress("scanning", i + 1, fetched.length);
            }
          }

          /* sort by severity */
          scanResults.sort((a, b) => {
            const aScore = a.matches.filter(m => m.severity === "critical").length * 3
                         + a.matches.filter(m => m.severity === "high").length * 2
                         + a.matches.filter(m => m.severity === "medium").length;
            const bScore = b.matches.filter(m => m.severity === "critical").length * 3
                         + b.matches.filter(m => m.severity === "high").length * 2
                         + b.matches.filter(m => m.severity === "medium").length;
            return bScore - aScore;
          });

          /* final result */
          controller.enqueue(encoder.encode(
            JSON.stringify({
              type: "result",
              owner, repo, branch,
              scannedFiles: fetched.length,
              totalFiles: allPaths.length,
              totalSecrets,
              critical, high, medium,
              cleanFiles: fetched.length - scanResults.length,
              results: scanResults,
            }) + "\n"
          ));

          controller.close();
        } catch (err: any) {
          controller.enqueue(encoder.encode(
            JSON.stringify({ type: "error", error: err.message || "Scan failed" }) + "\n"
          ));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (err: any) {
    console.error("scan-all error:", err);
    return new Response(JSON.stringify({ error: err.message || "Scan failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
