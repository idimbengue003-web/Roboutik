import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findWavePaymentByAmount } from "@/lib/wave-scraper";
import { isWaveScraperConfigured } from "@/lib/wave-config";

/**
 * GET /api/orders/[id]/poll?userId=...
 *
 * Frontend polls this endpoint after the buyer has been redirected to
 * Wave checkout. The endpoint:
 *  1. Scrapes Wave Business GraphQL for an incoming transaction
 *     matching the order amount, since the order creation time.
 *  2. If found: marks the order as PAID, sends an auto-message
 *     from the seller, returns { status: "PAID" } so the frontend
 *     can redirect to the chat.
 *  3. If not found: returns { status: "PENDING" } + suggested next
 *     poll interval (backoff) so the frontend keeps polling.
 *
 * ANTI-ABUSE: refuses to scrape if the order is older than MAX_POLL_MINUTES
 * (default 10 min). This prevents:
 *  - Endless scraping if the buyer abandons the page
 *  - Looking suspicious to Wave (too many GraphQL queries)
 * The frontend also stops polling after this timeout.
 */
const MAX_POLL_MINUTES = 10;
const MAX_POLL_MS = MAX_POLL_MINUTES * 60 * 1000;

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
      });
    }

    // ANTI-ABUSE: refuse to scrape if order is too old
    // (prevents endless polling + looks natural to Wave)
    const orderAgeMs = Date.now() - order.createdAt.getTime();
    if (orderAgeMs > MAX_POLL_MS) {
      return NextResponse.json({
        status: "TIMEOUT",
        orderId: order.id,
        message: `Délai de ${MAX_POLL_MINUTES} minutes dépassé. Ta commande a été annulée. Si tu as payé, contacte le support.`,
        shouldStopPolling: true,
      });
    }

    // If scraper not configured, return PENDING (manual confirmation fallback)
    if (!isWaveScraperConfigured()) {
      return NextResponse.json({
        status: "PENDING",
        orderId: order.id,
        pollIntervalMs: 5000,
        message: "Wave scraper not configured.",
      });
    }

    // Use createdAt as the "since" time
    const since = order.createdAt;
    const match = await findWavePaymentByAmount(order.amount, since);

    if (!match) {
      // Suggest next poll interval based on order age (backoff)
      // First 2 min: poll every 3s (fast detection)
      // 2-5 min: poll every 5s
      // 5-10 min: poll every 10s
      let pollIntervalMs = 3000;
      if (orderAgeMs > 5 * 60 * 1000) pollIntervalMs = 10000;
      else if (orderAgeMs > 2 * 60 * 1000) pollIntervalMs = 5000;

      return NextResponse.json({
        status: "PENDING",
        orderId: order.id,
        pollIntervalMs,
        remainingMs: MAX_POLL_MS - orderAgeMs,
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
          autoValidateAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      }),
      db.message.create({
        data: {
          orderId: order.id,
          senderId: order.sellerId,
          content: `Bonjour 👋 Votre paiement Wave de ${order.amount} FCFA${match.senderName ? ` (${match.senderName})` : ""} a bien été reçu. Je prépare actuellement votre commande « ${order.listing.title} » sur ${order.listing.game.name}. Merci de m'indiquer votre nom de jeu Roblox ainsi que tout détail utile pour la livraison. Je reviens vers vous dès que c'est prêt !`,
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
