import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse, logAdminAction } from "@/lib/security";

/**
 * POST /api/admin/users/[id]/promote-admin
 * Body: { adminId }
 *
 * Promotes a regular user to admin. Only existing admins can do this.
 * The target user gets isAdmin = true.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetId } = await params;
    const body = await req.json().catch(() => ({}));
    const adminId = (body as { adminId?: string })?.adminId;

    const { user: admin, error } = await getActorById(adminId, {
      requireAdmin: true,
    });
    if (error) return errorResponse(error);

    const target = await db.user.findUnique({ where: { id: targetId } });
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (target.isAdmin) {
      return NextResponse.json({ error: "Cet utilisateur est déjà admin" }, { status: 400 });
    }

    if (target.isBanned) {
      return NextResponse.json(
        { error: "Impossible de promouvoir un utilisateur banni" },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: targetId },
      data: { isAdmin: true },
    });

    await logAdminAction({
      actorId: admin!.id,
      targetId,
      action: "PROMOTE_ADMIN",
      metadata: { previousUsername: target.username },
    });

    return NextResponse.json({ ok: true, message: `${target.username} est maintenant admin` });
  } catch (e) {
    console.error("Promote admin error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]/promote-admin?adminId=...
 *
 * Demotes an admin back to regular user. Only existing admins can do this.
 * Cannot demote yourself (prevent locking yourself out).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetId } = await params;
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId");

    const { user: admin, error } = await getActorById(adminId, {
      requireAdmin: true,
    });
    if (error) return errorResponse(error);

    // Prevent self-demotion
    if (targetId === admin!.id) {
      return NextResponse.json(
        { error: "Tu ne peux pas te rétrograder toi-même" },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({ where: { id: targetId } });
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (!target.isAdmin) {
      return NextResponse.json({ error: "Cet utilisateur n'est pas admin" }, { status: 400 });
    }

    await db.user.update({
      where: { id: targetId },
      data: { isAdmin: false },
    });

    await logAdminAction({
      actorId: admin!.id,
      targetId,
      action: "DEMOTE_ADMIN",
      metadata: { username: target.username },
    });

    return NextResponse.json({ ok: true, message: `${target.username} n'est plus admin` });
  } catch (e) {
    console.error("Demote admin error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
