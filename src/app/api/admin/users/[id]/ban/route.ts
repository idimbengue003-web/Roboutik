import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse, logAdminAction } from "@/lib/security";

// POST /api/admin/users/[id]/ban
// body: { adminId, reason }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { adminId, reason } = body as { adminId?: string; reason?: string };

    const reqWithHeader = new NextRequest(req, {
      headers: new Headers(req.headers),
    });
    reqWithHeader.headers.set("x-user-id", adminId ?? "");

    const { user: admin, error } = await getActor(reqWithHeader, {
      requireAdmin: true,
    });
    if (error) return errorResponse(error);

    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    if (target.id === admin!.id) {
      return NextResponse.json(
        { error: "Tu ne peux pas te bannir toi-même" },
        { status: 400 }
      );
    }

    if (target.isAdmin) {
      return NextResponse.json(
        { error: "Impossible de bannir un autre admin" },
        { status: 400 }
      );
    }

    if (target.isBanned) {
      return NextResponse.json(
        { error: "Utilisateur déjà banni" },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        banReason: reason?.trim() || null,
      },
    });

    await logAdminAction({
      actorId: admin!.id,
      targetId: id,
      action: "BAN_USER",
      metadata: { reason: reason ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Ban error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
