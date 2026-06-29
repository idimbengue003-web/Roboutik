import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById } from "@/lib/security";

/**
 * POST /api/heartbeat
 * Body: { userId }
 *
 * Updates the user's lastActiveAt timestamp.
 * Called by the client every 30 seconds when the user is online.
 * Used to determine online/offline status (online = active within last 2 minutes).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ ok: true }); // silent no-op
    }

    const { user, error } = await getActorById(userId);
    if (error || !user) {
      return NextResponse.json({ ok: true }); // silent
    }

    // Update lastActiveAt — only once every 30s to avoid DB spam
    // (the client sends every 30s, so this is fine)
    await db.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // silent
  }
}
