import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse, logAdminAction } from "@/lib/security";

/**
 * POST /api/admin/orders/[id]/validate
 * Body: { adminId }
 *
 * Admin forces validation of an order (releases payment to seller).
 * Only works if the order is in PAID or DELIVERED status.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: admin, error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: { listing: { include: { game: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  if (order.status !== "PAID" && order.status !== "DELIVERED") {
    return NextResponse.json(
      { error: `Impossible de valider une commande dans l'état ${order.status}` },
      { status: 400 }
    );
  }

  const netAmount = order.sellerNetAmount ?? order.amount;

  await db.$transaction([
    db.order.update({
      where: { id },
      data: {
        status: "VALIDATED",
        validatedAt: new Date(),
        deliveredAt: order.deliveredAt ?? new Date(),
      },
    }),
    db.user.update({
      where: { id: order.sellerId },
      data: { balance: { increment: netAmount } },
    }),
    db.message.create({
      data: {
        orderId: order.id,
        senderId: admin!.id,
        content: `🛡️ ROBLOX BOUTIK — Commande validée par l'administration. Le vendeur a reçu ${netAmount} FCFA (montant net) sur son solde. Merci pour votre achat !`,
        isAuto: true,
      },
    }),
  ]);

  await logAdminAction({
    actorId: admin!.id,
    targetId: order.sellerId,
    action: "VALIDATE_ORDER",
    metadata: { orderId: id, netAmount },
  });

  const updated = await db.order.findUnique({
    where: { id },
    include: {
      listing: { include: { game: true } },
      buyer: { select: { id: true, username: true, avatar: true, email: true } },
      seller: { select: { id: true, username: true, avatar: true, email: true } },
      messages: true,
    },
  });

  return NextResponse.json({ ok: true, order: updated });
}
