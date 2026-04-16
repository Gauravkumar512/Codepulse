import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { signJWT } from "@/src/lib/jwt";

export async function GET(request: NextRequest) {
  try {
    const nextAuthToken = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    if (!nextAuthToken?.email || !nextAuthToken?.mongoId) {
      return NextResponse.redirect(new URL("/login?error=oauth", request.url));
    }

    const token = await signJWT({
      id: nextAuthToken.mongoId as string,
      email: nextAuthToken.email,
      username: (nextAuthToken.dbUsername as string) ?? undefined,
    });

    const response = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("OAuth complete error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }
}
