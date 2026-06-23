import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse, logAdminAction } from "@/lib/security";

// POST /api/admin/users/[id]/verify
// body: { adminId }
// Marks the user as a verified seller (green checkmark badge)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { adminId } = body as { adminId?: string };

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

    await db.user.update({
      where: { id },
      data: { isVerified: true },
    });

    await logAdminAction({
      actorId: admin!.id,
      targetId: id,
      action: "VERIFY_SELLER",
      metadata: { username: target.username },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Verify seller error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]/verify?adminId=...
// Removes the verified badge
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId");

    const { user: admin, error } = await getActorById(adminId, {
      requireAdmin: true,
    });
    if (error) return errorResponse(error);

    await db.user.update({
      where: { id },
      data: { isVerified: false },
    });

    await logAdminAction({
      actorId: admin!.id,
      targetId: id,
      action: "UNVERIFY_SELLER",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Unverify seller error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
