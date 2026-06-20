import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, errorResponse, profileUpdateSchema } from "@/lib/validation";
import { sanitizeUsername, sanitizeAvatar } from "@/lib/sanitize";

/**
 * PATCH /api/account/profile
 * body: { userId, username?, avatar? }
 *
 * Update user's display name and avatar emoji.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const [data, error] = parseBody(profileUpdateSchema, body);
    if (error) return errorResponse(error);
    const { userId } = data!;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: { username?: string; avatar?: string | null } = {};

    if (data!.username !== undefined) {
      const trimmed = sanitizeUsername(data!.username);
      if (trimmed.length < 2 || trimmed.length > 30) {
        return NextResponse.json(
          { error: "Pseudo entre 2 et 30 caractères" },
          { status: 400 }
        );
      }
      // Check uniqueness (case-insensitive)
      const existing = await db.user.findFirst({
        where: {
          username: { equals: trimmed, mode: "insensitive" },
          NOT: { id: userId },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Ce pseudo est déjà pris" },
          { status: 400 }
        );
      }
      updateData.username = trimmed;
    }

    if (data!.avatar !== undefined) {
      // Validate: must be a single emoji or short string
      const trimmed = sanitizeAvatar(data!.avatar);
      if (trimmed.length === 0 || trimmed.length > 10) {
        return NextResponse.json(
          { error: "Avatar invalide (1-10 caractères)" },
          { status: 400 }
        );
      }
      updateData.avatar = trimmed;
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ user: updated });
  } catch (e) {
    console.error("Profile update error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
