import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/auth/google
// body: { email, name, googleSub, avatar? }
// Simulates Google OAuth callback - finds or creates the user.
// In production, replace with real NextAuth Google provider.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, googleSub, avatar } = body as {
      email?: string;
      name?: string;
      googleSub?: string;
      avatar?: string;
    };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    // Find by googleSub first, then by email
    let user = googleSub
      ? await db.user.findUnique({ where: { googleSub } })
      : null;

    if (!user) {
      user = await db.user.findUnique({ where: { email } });
    }

    if (!user) {
      // Create new user from Google profile
      const username =
        name?.trim() || email.split("@")[0].slice(0, 20) || "Joueur";
      user = await db.user.create({
        data: {
          email,
          username,
          googleSub: googleSub || null,
          avatar: avatar || "🎮",
          isSeller: false,
          balance: 0,
        },
      });
    } else if (googleSub && !user.googleSub) {
      // Link googleSub to existing account
      user = await db.user.update({
        where: { id: user.id },
        data: { googleSub },
      });
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error("Google auth error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
