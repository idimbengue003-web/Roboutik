import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

/**
 * GET /api/auth/check-admin
 *
 * Checks if the current session user is admin by looking up the DB directly.
 * This bypasses JWT caching issues.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false, reason: "not_authenticated" });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, username: true, email: true, isAdmin: true, isSeller: true, isVerified: true, isBanned: true, balance: true, avatar: true },
    });

    if (!user) {
      return NextResponse.json({ isAdmin: false, reason: "user_not_found" });
    }

    return NextResponse.json({
      isAdmin: user.isAdmin,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isSeller: user.isSeller,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        balance: user.balance,
      },
    });
  } catch (e) {
    console.error("check-admin error:", e);
    return NextResponse.json(
      { isAdmin: false, error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
