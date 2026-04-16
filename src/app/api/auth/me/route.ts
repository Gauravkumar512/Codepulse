import { NextResponse } from "next/server";
import { verifyJWT } from "@/src/lib/jwt";
import { getSessionCookie } from "@/src/lib/session";

export async function GET() {
  try {
    const token = await getSessionCookie();

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: payload.id,
          email: payload.email,
          username: payload.username ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}