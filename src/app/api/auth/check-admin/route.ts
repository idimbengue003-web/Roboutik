import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

/**
 * GET /api/auth/check-admin
 *
 * Checks if the current session user is admin by looking up the DB directly.
 * Passes the request headers to getServerSession for proper cookie handling.
 */
export async function GET(req: NextRequest) {
  try {
    // NextAuth v4 with App Router: need to pass headers for cookie extraction
    const session = await getServerSession(
      req,
      {
        headers: req.headers,
      } as any,
      authOptions
    );

    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false, reason: "not_authenticated" });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        isAdmin: true,
        isSeller: true,
        isVerified: true,
        isBanned: true,
        balance: true,
      },
    });

    if (!user) {
      return NextResponse.json({ isAdmin: false, reason: "user_not_found" });
    }

    return NextResponse.json({
      isAdmin: user.isAdmin,
      user,
    });
  } catch (e) {
    console.error("check-admin error:", e);
    return NextResponse.json(
      { isAdmin: false, reason: "error", error: e instanceof Error ? e.message : "?" },
      { status: 500 }
    );
  }
}
