import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/orders/[id]/pay - simulate Wave payment
// body: { wavePhone? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { wavePhone } = body as { wavePhone?: string };

    const order = await db.order.findUnique({
      where: { id },
      include: { listing: { include: { game: true } }, seller: true, buyer: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: "Commande déjà payée ou annulée" }, { status: 400 });
    }

    const now = new Date();
    // Auto-validate 24 hours after payment (seller protection)
    const autoValidateAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.order.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: now,
        autoValidateAt,
      },
    });

    const sellerName = order.seller.username;
    const phone = wavePhone || "ton numéro Wave";

    await db.message.create({
      data: {
        orderId: order.id,
        senderId: order.sellerId,
        content: `Salut 👋 Bienvenue chez ${sellerName} ! J'ai bien reçu ton paiement Wave de ${order.amount} FCFA depuis ${phone}. Je prépare ta commande "${order.listing.title}" pour ${order.listing.game.name}. Dis-moi quand tu es prêt·e !`,
        isAuto: true,
      },
    });

    const updated = await db.order.findUnique({
      where: { id },
      include: {
        listing: { include: { game: true } },
        seller: true,
        buyer: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({ order: updated });
  } catch (e) {
    console.error("Pay error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
