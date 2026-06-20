import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse, logAdminAction } from "@/lib/security";
import { parseBody, banUserSchemaWith2FA } from "@/lib/validation";
import { sanitizeMessage } from "@/lib/sanitize";
import { verify2FA } from "@/lib/two-factor";

// POST /api/admin/users/[id]/ban
// body: { adminId, reason, twoFactorCode }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const [data, parseErr] = parseBody(banUserSchemaWith2FA, body);
    if (parseErr) return errorResponse(parseErr);
    const { adminId } = data!;
    const reason = data!.reason ? sanitizeMessage(data!.reason) : "";

    const { user: admin, error } = await getActorById(adminId, {
      requireAdmin: true,
    });
    if (error) return errorResponse(error);

    // 2FA verification
    const twoFAErr = await verify2FA(admin!.id, data!.twoFactorCode);
    if (twoFAErr) return errorResponse(twoFAErr);

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
        banReason: reason || null,
      },
    });

    await logAdminAction({
      actorId: admin!.id,
      targetId: id,
      action: "BAN_USER",
      metadata: { reason: reason || null },
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
