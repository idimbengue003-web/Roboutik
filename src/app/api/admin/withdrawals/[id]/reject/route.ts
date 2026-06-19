import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse, logAdminAction } from "@/lib/security";

// POST /api/admin/withdrawals/[id]/reject
// body: { adminId, reason }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { adminId, reason } = body as { adminId?: string; reason?: string };

    const { user: admin, error } = await getActorById(adminId, {
      requireAdmin: true,
    });
    if (error) return errorResponse(error);

    const withdrawal = await db.withdrawal.findUnique({
      where: { id },
      include: { seller: true },
    });
    if (!withdrawal) {
      return NextResponse.json(
        { error: "Retrait introuvable" },
        { status: 404 }
      );
    }
    if (withdrawal.status !== "PENDING") {
      return NextResponse.json(
        { error: "Retrait déjà traité" },
        { status: 400 }
      );
    }

    await db.$transaction([
      db.withdrawal.update({
        where: { id },
        data: { status: "REJECTED" },
      }),
      db.user.update({
        where: { id: withdrawal.sellerId },
        data: { balance: { increment: withdrawal.amount } },
      }),
    ]);

    await logAdminAction({
      actorId: admin!.id,
      targetId: withdrawal.sellerId,
      action: "REJECT_WITHDRAWAL",
      metadata: {
        withdrawalId: id,
        amount: withdrawal.amount,
        reason: reason ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Reject withdrawal error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
