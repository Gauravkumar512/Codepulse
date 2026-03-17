import { NextRequest, NextResponse } from "next/server";
import { scanFile,scanRepo } from "@/src/lib/secretScanner";

/* ── POST /api/scan ──
   Body: { mode: "file", path, content }
       | { mode: "repo", files: { path, content }[] }
*/
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.mode === "file") {
      const { path, content } = body;
      if (!path || content === undefined) {
        return NextResponse.json({ error: "path and content required" }, { status: 400 });
      }
      const result = scanFile(path, content);
      return NextResponse.json(result);
    }

    if (body.mode === "repo") {
      const { files } = body;
      if (!Array.isArray(files)) {
        return NextResponse.json({ error: "files array required" }, { status: 400 });
      }
      const result = scanRepo(files);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "mode must be 'file' or 'repo'" }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Scan failed" },
      { status: 500 }
    );
  }
}