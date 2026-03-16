import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const owner  = searchParams.get("owner");
    const repo   = searchParams.get("repo");
    const path   = searchParams.get("path");
    const branch = searchParams.get("branch") ?? "main";

    if (!owner || !repo || !path) {
      return NextResponse.json({ error: "owner, repo, and path are required" }, { status: 400 });
    }

    const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });

    if (Array.isArray(data)) {
      return NextResponse.json({ error: "Path is a directory, not a file" }, { status: 400 });
    }

    if (data.type !== "file") {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    // GitHub returns base64 encoded content
    const content = Buffer.from((data as any).content, "base64").toString("utf-8");

    return NextResponse.json({
      path,
      content,
      size: data.size,
      sha: data.sha,
    });
  } catch (err: any) {
    if (err.status === 404) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ error: err.message || "Failed to fetch file" }, { status: 500 });
  }
}