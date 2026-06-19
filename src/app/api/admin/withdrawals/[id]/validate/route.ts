import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse, logAdminAction } from "@/lib/security";

// POST /api/admin/withdrawals/[id]/validate
// body: { adminId }
// Marks withdrawal as COMPLETED (money sent via Wave to seller)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { adminId } = body as { adminId?: string };

    const reqWithHeader = new NextRequest(req, {
      headers: new Headers(req.headers),
    });
    reqWithHeader.headers.set("x-user-id", adminId ?? "");

    const { user: admin, error } = await getActor(reqWithHeader, {
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

    await db.withdrawal.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    await logAdminAction({
      actorId: admin!.id,
      targetId: withdrawal.sellerId,
      action: "VALIDATE_WITHDRAWAL",
      metadata: {
        withdrawalId: id,
        amount: withdrawal.amount,
        waveNumber: withdrawal.waveNumber,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Validate withdrawal error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
