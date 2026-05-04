import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyJWT } from "@/src/lib/jwt";
import { getSessionCookie } from "@/src/lib/session";

export async function GET(request: NextRequest) {
  try {
    const token = await getSessionCookie();

    if (token) {
      const payload = await verifyJWT(token);

      if (payload) {
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
      }
    }

    const nextAuthToken = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    if (!nextAuthToken?.email || !nextAuthToken?.mongoId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: nextAuthToken.mongoId as string,
          email: nextAuthToken.email as string,
          username: (nextAuthToken.dbUsername as string) ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("me route error:", error);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}