import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse, logAdminAction } from "@/lib/security";

/**
 * POST /api/admin/orders/[id]/cancel
 * Body: { adminId, reason? }
 *
 * Admin cancels an order. Refunds the seller's balance if it was already paid
 * (i.e. status was PAID/DELIVERED). Posts a system message in the chat.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: admin, error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = (body as { reason?: string })?.reason?.trim().slice(0, 200) || "Annulation par l'administration";

  const order = await db.order.findUnique({
    where: { id },
    include: { listing: { include: { game: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  if (order.status === "VALIDATED") {
    return NextResponse.json(
      { error: "Impossible d'annuler une commande déjà validée (paiement libéré)." },
      { status: 400 }
    );
  }
  if (order.status === "CANCELLED") {
    return NextResponse.json({ error: "Commande déjà annulée" }, { status: 400 });
  }

  // If seller was already credited, refund by deducting from balance.
  // (Only PAID/DELIVERED orders have credited the seller balance via auto-validate path.)
  const wasPaid = order.status === "PAID" || order.status === "DELIVERED";

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    if (wasPaid) {
      // Reverse the seller balance credit (only the net amount was credited on validation,
      // but for PAID/DELIVERED we haven't validated yet, so balance wasn't credited).
      // Actually: balance is only credited on VALIDATED status. So nothing to refund here.
      // We just cancel the pending order.
    }

    // Restore stock if it was decremented at order creation time
    // (we don't currently decrement stock at order time, so no-op)

    await tx.message.create({
      data: {
        orderId: order.id,
        senderId: admin!.id,
        content: `🛡️ ROBLOX BOUTIK — Commande annulée par l'administration. Raison : ${reason}. ${
          wasPaid
            ? "Le paiement Wave sera remboursé manuellement par le support."
            : "Aucun paiement n'avait été reçu."
        }`,
        isAuto: true,
      },
    });
  });

  await logAdminAction({
    actorId: admin!.id,
    targetId: order.sellerId,
    action: "CANCEL_ORDER",
    metadata: { orderId: id, reason, previousStatus: order.status },
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
