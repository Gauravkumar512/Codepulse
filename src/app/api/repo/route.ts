    // app/api/repo/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // optional but increases rate limit from 60 to 5000 req/hr
});

/* ── Parse owner/repo from any GitHub URL format ── */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleaned = url.trim().replace(/\.git$/, "");
    const match = cleaned.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

/* ── Recursive file tree type ── */
export type FileNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
};

/* ── Build nested tree from flat GitHub tree ── */
function buildTree(items: { path?: string; type?: string }[]): FileNode[] {
  const root: FileNode[] = [];

  // sort: dirs first, then files, alphabetically
  const sorted = [...items].sort((a, b) => {
    if (a.type === b.type) return (a.path ?? "").localeCompare(b.path ?? "");
    return a.type === "tree" ? -1 : 1;
  });

  for (const item of sorted) {
    if (!item.path || !item.type) continue;

    // skip unwanted files
    const skip = [".git", "node_modules", ".next", "dist", "build", ".cache", "coverage"];
    if (skip.some((s) => item.path!.startsWith(s))) continue;

    const parts = item.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        current.push({
          name: part,
          path: item.path,
          type: item.type === "tree" ? "dir" : "file",
          children: item.type === "tree" ? [] : undefined,
        });
      } else {
        let dir = current.find((n) => n.name === part && n.type === "dir");
        if (!dir) {
          dir = { name: part, path: parts.slice(0, i + 1).join("/"), type: "dir", children: [] };
          current.push(dir);
        }
        current = dir.children!;
      }
    }
  }

  return root;
}

/* ── POST /api/repo ── */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "GitHub URL is required" }, { status: 400 });
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid GitHub URL. Use format: https://github.com/owner/repo" }, { status: 400 });
    }

    const { owner, repo } = parsed;

    // get default branch first
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const branch = repoData.default_branch;

    // get full recursive tree
    const { data: treeData } = await octokit.git.getTree({
      owner, repo,
      tree_sha: branch,
      recursive: "1",
    });

    if (treeData.truncated) {
      console.warn(`Tree truncated for ${owner}/${repo} — repo may be very large`);
    }

    const tree = buildTree(treeData.tree);

    return NextResponse.json({
      owner,
      repo,
      branch,
      tree,
      totalFiles: treeData.tree.filter((i) => i.type === "blob").length,
    });
  } catch (err: any) {
    if (err.status === 404) {
      return NextResponse.json({ error: "Repo not found or is private" }, { status: 404 });
    }
    if (err.status === 403) {
      return NextResponse.json({ error: "GitHub API rate limit hit. Add GITHUB_TOKEN to .env" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to fetch repo" }, { status: 500 });
  }
}