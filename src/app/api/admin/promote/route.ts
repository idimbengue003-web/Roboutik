import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/admin/promote
 * body: { email }
 *
 * Promotes a user to admin by email. Used once to set up the real admin.
 * After the user logs in with Google, call this endpoint with their email
 * to grant admin privileges.
 *
 * Security: protected by a one-time secret key passed as query param.
 * Set ADMIN_PROMOTE_KEY in Vercel env vars.
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("key");
    const expectedSecret = process.env.ADMIN_PROMOTE_KEY || "roboutik-admin-2026";

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    // Find or create the user
    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      // Pre-create the user so when they login with Google, NextAuth finds them
      user = await db.user.create({
        data: {
          email,
          username: email.split("@")[0].slice(0, 20),
          avatar: "🛡️",
          isAdmin: true,
          isSeller: false,
          balance: 0,
        },
      });
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
    }

    return NextResponse.json({
      ok: true,
      message: `${email} est maintenant admin. Connecte-toi avec Google pour accéder à /admin.`,
      userId: user.id,
    });
  } catch (e) {
    console.error("Promote error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
