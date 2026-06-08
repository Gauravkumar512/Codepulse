import { NextRequest, NextResponse } from "next/server";
import { analyzeDependencies, type UnusedDep, type UnusedStatus } from "@/src/lib/depScanner";

const SOURCE_EXTS = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs", "mts", "cts", "vue", "svelte", "astro"]);
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".cache", "vendor",
]);

const MAX_SOURCE_FILES = 400;
const FETCH_BATCH = 15;
const REGISTRY_CONCURRENCY = 8;

function isSourceFile(path: string): boolean {
  const parts = path.split("/");
  if (parts.some((p) => SKIP_DIRS.has(p))) return false;
  const ext = parts[parts.length - 1].split(".").pop()?.toLowerCase() ?? "";
  return SOURCE_EXTS.has(ext);
}

async function fetchRaw(owner: string, repo: string, branch: string, path: string): Promise<string | null> {
  try {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes("\0")) return null;
    return text.length > 200_000 ? text.slice(0, 200_000) : text;
  } catch {
    return null;
  }
}

async function registryStatus(name: string): Promise<UnusedStatus> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${name}`, {
      method: "GET",
      headers: { Accept: "application/vnd.npm.install-v1+json" }, // slim metadata
      signal: AbortSignal.timeout(6000),
    });
    if (res.status === 404) return "ghost"; // not on npm → AI-hallucinated / typo'd
    if (res.ok) return "unused"; // exists, just not imported
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function classifyUnused(deps: UnusedDep[]): Promise<UnusedDep[]> {
  const out: UnusedDep[] = [];
  for (let i = 0; i < deps.length; i += REGISTRY_CONCURRENCY) {
    const batch = deps.slice(i, i + REGISTRY_CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (d) => ({ ...d, status: await registryStatus(d.name) }))
    );
    out.push(...settled);
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { owner, repo, branch, tree } = await req.json();
    if (!owner || !repo || !branch || !tree) {
      return NextResponse.json({ error: "owner, repo, branch, tree required" }, { status: 400 });
    }

    const sourcePaths: string[] = [];
    const packageJsonPaths: string[] = [];
    const walk = (nodes: any[]) => {
      for (const n of nodes) {
        if (n.type === "file") {
          if (n.name === "package.json" && !n.path.split("/").some((p: string) => SKIP_DIRS.has(p))) {
            packageJsonPaths.push(n.path);
          } else if (isSourceFile(n.path)) {
            sourcePaths.push(n.path);
          }
        }
        if (n.children) walk(n.children);
      }
    };
    walk(tree);

    if (packageJsonPaths.length === 0) {
      return NextResponse.json({ error: "No package.json found in this repository" }, { status: 404 });
    }

    /* prefer the root package.json (shortest path) */
    packageJsonPaths.sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
    const packageJsonPath = packageJsonPaths[0];

    const pkgRaw = await fetchRaw(owner, repo, branch, packageJsonPath);
    if (pkgRaw === null) {
      return NextResponse.json({ error: "Could not read package.json from GitHub" }, { status: 502 });
    }

    let pkg: any;
    try {
      pkg = JSON.parse(pkgRaw);
    } catch {
      return NextResponse.json({ error: "package.json is not valid JSON" }, { status: 422 });
    }

    const dependencies: Record<string, string> = pkg.dependencies ?? {};
    const scripts: Record<string, string> = pkg.scripts ?? {};

    if (Object.keys(dependencies).length === 0) {
      return NextResponse.json({
        score: 100, total: 0, usedCount: 0, unused: [], implicitlyUsed: [],
        packageJsonPath, scannedFiles: 0,
      });
    }

    const toFetch = sourcePaths.slice(0, MAX_SOURCE_FILES);
    const files: { path: string; content: string }[] = [];
    for (let i = 0; i < toFetch.length; i += FETCH_BATCH) {
      const batch = toFetch.slice(i, i + FETCH_BATCH);
      const results = await Promise.all(
        batch.map(async (path) => {
          const content = await fetchRaw(owner, repo, branch, path);
          return content !== null ? { path, content } : null;
        })
      );
      results.forEach((r) => r && files.push(r));
    }

    const analysis = analyzeDependencies({ packageJsonPath, dependencies, scripts, files });

    const classified = await classifyUnused(analysis.unused);
    // ghosts first, then alphabetical
    classified.sort((a, b) =>
      a.status === b.status ? a.name.localeCompare(b.name) : a.status === "ghost" ? -1 : 1
    );

    return NextResponse.json({
      ...analysis,
      unused: classified,
      scannedFiles: files.length,
      sourceFilesTotal: sourcePaths.length,
      truncated: sourcePaths.length > MAX_SOURCE_FILES,
    });
  } catch (err: any) {
    console.error("deps route error:", err);
    return NextResponse.json({ error: "Dependency scan failed" }, { status: 500 });
  }
}
