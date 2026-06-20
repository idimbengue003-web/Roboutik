import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse, logAdminAction } from "@/lib/security";
import { parseBody, adminActionSchema } from "@/lib/validation";

// POST /api/admin/users/[id]/unban
// body: { adminId }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const [data, parseErr] = parseBody(adminActionSchema, body);
    if (parseErr) return errorResponse(parseErr);
    const { adminId } = data!;

    const { user: admin, error } = await getActorById(adminId, {
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

    if (!target.isBanned) {
      return NextResponse.json(
        { error: "Utilisateur non banni" },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id },
      data: {
        isBanned: false,
        bannedAt: null,
        banReason: null,
      },
    });

    await logAdminAction({
      actorId: admin!.id,
      targetId: id,
      action: "UNBAN_USER",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Unban error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
