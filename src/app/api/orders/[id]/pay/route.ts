import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildWaveCheckoutUrl } from "@/lib/wave-config";
import { parseBody, errorResponse, payOrderSchema } from "@/lib/validation";
import { sanitizePhone } from "@/lib/sanitize";

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
    console.log("[pay] start, orderId:", id);
    const body = await req.json().catch(() => null);
    console.log("[pay] body:", JSON.stringify(body));
    const [data, error] = parseBody(payOrderSchema, body);
    if (error) {
      console.log("[pay] validation error:", JSON.stringify(error));
      return errorResponse(error);
    }
    const { userId, wavePhone } = data!;
    const sanitizedWavePhone = wavePhone ? sanitizePhone(wavePhone) : "";
    console.log("[pay] userId:", userId, "phone:", sanitizedWavePhone);

    const buyer = await db.user.findUnique({ where: { id: userId } });
    if (!buyer) {
      console.log("[pay] buyer not found");
      return NextResponse.json({ error: "Connecte-toi avec Google d'abord" }, { status: 401 });
    }
    if (buyer.isBanned) {
      console.log("[pay] buyer banned");
      return NextResponse.json(
        { error: `Ton compte est banni. Contacte le support.`, banned: true },
        { status: 403 }
      );
    }
    console.log("[pay] buyer OK:", buyer.username);

    const order = await db.order.findUnique({
      where: { id },
      include: { listing: { include: { game: true } }, seller: true, buyer: true },
    });

    if (!order) {
      console.log("[pay] order not found");
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    if (order.buyerId !== buyer.id) {
      console.log("[pay] not buyer's order");
      return NextResponse.json({ error: "Ce n'est pas ta commande" }, { status: 403 });
    }
    if (order.status !== "PENDING_PAYMENT") {
      console.log("[pay] order status:", order.status);
      return NextResponse.json({ error: "Commande déjà payée ou annulée" }, { status: 400 });
    }
    console.log("[pay] order OK, amount:", order.amount);

    // Mark order as "PAYMENT_INITIATED" + store wavePhone + record start time
    const now = new Date();
    const autoValidateAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.order.update({
      where: { id },
      data: {
        autoValidateAt,
      },
    });
    console.log("[pay] order updated with autoValidateAt");

    // Save the buyer's Wave phone as a message if provided
    if (sanitizedWavePhone) {
      const existing = await db.message.findFirst({
        where: {
          orderId: order.id,
          content: { contains: sanitizedWavePhone },
        },
      });
      if (!existing) {
        await db.message.create({
          data: {
            orderId: order.id,
            senderId: buyer.id,
            content: `📞 Mon numéro Wave : ${sanitizedWavePhone}`,
            isAuto: false,
          },
        });
        console.log("[pay] phone message saved");
      }
    }

    // Build the Wave checkout URL with the order amount
    let checkoutUrl: string;
    try {
      checkoutUrl = buildWaveCheckoutUrl(order.amount);
      console.log("[pay] checkoutUrl:", checkoutUrl);
    } catch (urlErr) {
      console.error("[pay] buildWaveCheckoutUrl failed:", urlErr);
      return NextResponse.json(
        { error: "Erreur construction URL Wave", detail: urlErr instanceof Error ? urlErr.message : "?" },
        { status: 500 }
      );
    }

    console.log("[pay] success, returning checkoutUrl");
    return NextResponse.json({
      checkoutUrl,
      amount: order.amount,
      orderId: order.id,
      pollIntervalMs: 3000,
    });
  } catch (e) {
    console.error("[pay] FATAL error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur", stack: e instanceof Error ? e.stack?.slice(0, 500) : undefined },
      { status: 500 }
    );
  }
}
