import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";
import { parseBody } from "@/lib/validation";
import { z } from "zod";

const cancelOrderSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  reason: z.string().trim().max(200, "Motif trop long").optional().or(z.literal("")),
});

/**
 * POST /api/orders/[id]/cancel
 * Body: { userId, reason? }
 *
 * Allows the SELLER to cancel an order before validation.
 * Only allowed when status is PAID or DELIVERED (i.e. buyer has paid
 * but order not yet validated). Cannot cancel VALIDATED orders
 * (payment already released to seller).
 *
 * Posts a system message in the chat announcing the cancellation.
 * The seller balance is NOT touched (balance is only credited on
 * VALIDATED status, so cancelling before that means no refund needed).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const [data, parseErr] = parseBody(cancelOrderSchema, body);
    if (parseErr) return errorResponse(parseErr);
    const { userId } = data!;
    const reason =
      data!.reason?.trim().slice(0, 200) || "Annulation par le vendeur";

    const { user: seller, error } = await getActorById(userId);
    if (error) return errorResponse(error);

    const order = await db.order.findUnique({
      where: { id },
      include: { listing: { include: { game: true } } },
    });
    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      );
    }

    // The seller OR the buyer (if PENDING_PAYMENT) can cancel
    const isSeller = order.sellerId === seller!.id;
    const isBuyer = order.buyerId === seller!.id;
    if (!isSeller && !isBuyer) {
      return NextResponse.json(
        { error: "Tu n'es pas impliqué dans cette commande" },
        { status: 403 }
      );
    }

    // Buyer can only cancel PENDING_PAYMENT orders
    // Seller can cancel PAID or DELIVERED orders
    if (isBuyer && !isSeller && order.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: "Tu ne peux annuler qu'une commande non payée" },
        { status: 400 }
      );
    }

    if (order.status === "VALIDATED") {
      return NextResponse.json(
        {
          error:
            "Impossible d'annuler une commande déjà validée (paiement déjà reçu).",
        },
        { status: 400 }
      );
    }
    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Commande déjà annulée" },
        { status: 400 }
      );
    }

    const wasPaid = order.status === "PAID" || order.status === "DELIVERED";

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await tx.message.create({
        data: {
          orderId: order.id,
          senderId: seller!.id,
          content: `🛡️ ROBLOX BOUTIK — Commande annulée par le vendeur. Raison : ${reason}. ${
            wasPaid
              ? "Le remboursement Wave sera traité manuellement par le support sous 24-48h."
              : "Aucun paiement n'avait été reçu."
          }`,
          isAuto: true,
        },
      });
    });

    const updated = await db.order.findUnique({
      where: { id },
      include: {
        listing: { include: { game: true } },
        buyer: { select: { id: true, username: true, avatar: true, email: true } },
        seller: { select: { id: true, username: true, avatar: true, email: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    // Notify the buyer that their order was cancelled
    try {
      const { sendNotification, buildEmailHtml } = await import(
        "@/lib/notifications"
      );
      sendNotification({
        userId: order.buyerId,
        type: "ORDER_VALIDATED",
        subject: `❌ Commande annulée — ${order.listing.title}`,
        body: buildEmailHtml(
          "Commande annulée",
          `<p>Bonjour <strong>${order.buyer?.username ?? ""}</strong>,</p>
           <p>Le vendeur a annulé ta commande :</p>
           <div style="background:#fef2f2;border-radius:12px;padding:16px;margin:16px 0;border-left:3px solid #ef4444;">
             <p style="margin:0;font-size:16px;"><strong>${order.listing.title}</strong></p>
             <p style="margin:4px 0 0;color:#475569;">${order.listing.game?.name} · ${order.amount} FCFA</p>
             <p style="margin:8px 0 0;color:#dc2626;font-weight:600;">Motif : ${reason}</p>
           </div>
           ${
             wasPaid
               ? "<p>Ton paiement Wave sera remboursé manuellement sous 24-48h. Si tu ne reçois rien, contacte le support.</p>"
               : "<p>Aucun paiement n'avait été reçu, ta carte n'a pas été débitée.</p>"
           }`
        ),
        whatsappBody: `❌ RobloxBoutik : commande annulée par le vendeur (${order.listing.title}). ${reason}`,
        refType: "ORDER",
        refId: order.id,
      }).catch(() => {});
    } catch (e) {
      console.error("Cancel notification failed:", e);
    }

    return NextResponse.json({ ok: true, order: updated });
  } catch (e) {
    console.error("Cancel order error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
