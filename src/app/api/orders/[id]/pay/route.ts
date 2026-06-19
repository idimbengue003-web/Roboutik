import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildWaveCheckoutUrl } from "@/lib/wave-config";

/**
 * POST /api/orders/[id]/pay
 *
 * Body: { userId, wavePhone? }
 *
 * Returns the Wave checkout URL the buyer should be redirected to.
 * The frontend then opens this URL, and the buyer pays on Wave.
 *
 * The actual payment confirmation happens via /api/orders/[id]/poll
 * which scrapes Wave Business GraphQL to detect the incoming payment.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { userId, wavePhone } = body as { userId?: string; wavePhone?: string };

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const buyer = await db.user.findUnique({ where: { id: userId } });
    if (!buyer) {
      return NextResponse.json({ error: "Connecte-toi avec Google d'abord" }, { status: 401 });
    }
    if (buyer.isBanned) {
      return NextResponse.json(
        { error: `Ton compte est banni. Contacte le support.`, banned: true },
        { status: 403 }
      );
    }

    const order = await db.order.findUnique({
      where: { id },
      include: { listing: { include: { game: true } }, seller: true, buyer: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    if (order.buyerId !== buyer.id) {
      return NextResponse.json({ error: "Ce n'est pas ta commande" }, { status: 403 });
    }
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: "Commande déjà payée ou annulée" }, { status: 400 });
    }

    // Mark order as "PAYMENT_INITIATED" + store wavePhone + record start time
    // so the poll endpoint can match the Wave transaction by amount + time.
    const now = new Date();
    const autoValidateAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.order.update({
      where: { id },
      data: {
        // We keep status as PENDING_PAYMENT until the scraper confirms,
        // but store the payment-initiated timestamp for matching.
        // Reuse paidAt only when actually confirmed.
        autoValidateAt,
      },
    });

    // Save the buyer's Wave phone as a message if provided (so seller can reach them)
    if (wavePhone && wavePhone.trim()) {
      // Only save if not already present
      const existing = await db.message.findFirst({
        where: {
          orderId: order.id,
          content: { contains: wavePhone.trim() },
        },
      });
      if (!existing) {
        await db.message.create({
          data: {
            orderId: order.id,
            senderId: buyer.id,
            content: `📞 Mon numéro Wave : ${wavePhone.trim()}`,
            isAuto: false,
          },
        });
      }
    }

    // Build the Wave checkout URL with the order amount
    const checkoutUrl = buildWaveCheckoutUrl(order.amount);

    return NextResponse.json({
      checkoutUrl,
      amount: order.amount,
      orderId: order.id,
      pollIntervalMs: 3000, // frontend polls /api/orders/[id]/poll every 3s
    });
  } catch (e) {
    console.error("Pay (Wave redirect) error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
