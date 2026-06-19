import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findWavePaymentByAmount } from "@/lib/wave-scraper";
import { isWaveScraperConfigured } from "@/lib/wave-config";

/**
 * GET /api/orders/[id]/poll?userId=...
 *
 * Frontend polls this endpoint every ~3s after the buyer has been
 * redirected to Wave checkout. The endpoint:
 *  1. Scrapes Wave Business GraphQL for an incoming transaction
 *     matching the order amount, since the order creation time.
 *  2. If found: marks the order as PAID, sends an auto-message
 *     from the seller, returns { status: "PAID" } so the frontend
 *     can redirect to the chat.
 *  3. If not found: returns { status: "PENDING" } so the frontend
 *     keeps polling.
 *
 * This achieves < 10s detection as requested by the user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id },
      include: { listing: { include: { game: true } }, seller: true, buyer: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    if (order.buyerId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // If already paid (or later), short-circuit
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({
        status: order.status,
        orderId: order.id,
        chatUrl: "/",
      });
    }

    // If scraper not configured, return PENDING (manual confirmation fallback)
    if (!isWaveScraperConfigured()) {
      return NextResponse.json({
        status: "PENDING",
        message: "Wave scraper not configured. Set WAVE_BUSINESS_SESSION + WAVE_BUSINESS_ACCOUNT_ID.",
        orderId: order.id,
      });
    }

    // Use createdAt as the "since" time (the buyer can only have paid after creating the order)
    const since = order.createdAt;
    const match = await findWavePaymentByAmount(order.amount, since);

    if (!match) {
      return NextResponse.json({
        status: "PENDING",
        orderId: order.id,
      });
    }

    // 🎉 Payment found! Mark as PAID + send seller auto-welcome message
    const now = new Date();
    await db.$transaction([
      db.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paidAt: now,
          // Reset autoValidateAt to 24h from now
          autoValidateAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      }),
      db.message.create({
        data: {
          orderId: order.id,
          senderId: order.sellerId,
          content: `Salut 👋 Bienvenue chez ${order.seller.username} ! J'ai bien reçu ton paiement Wave de ${order.amount} FCFA${match.senderName ? ` de ${match.senderName}` : ""}. Je prépare ta commande "${order.listing.title}" pour ${order.listing.game.name}. Dis-moi quand tu es prêt·e !`,
          isAuto: true,
        },
      }),
    ]);

    return NextResponse.json({
      status: "PAID",
      orderId: order.id,
      waveTransaction: {
        id: match.id,
        amount: match.amount,
        timestamp: match.timestamp,
        senderName: match.senderName,
      },
    });
  } catch (e) {
    console.error("Poll error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
