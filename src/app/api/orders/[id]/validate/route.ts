import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/orders/[id]/validate - buyer validates, balance goes to seller
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: { listing: { include: { game: true } }, seller: true, buyer: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    if (order.status === "VALIDATED") {
      return NextResponse.json({ error: "Commande déjà validée" }, { status: 400 });
    }

    if (order.status !== "DELIVERED" && order.status !== "PAID") {
      return NextResponse.json(
        { error: "Le vendeur doit d'abord confirmer la livraison" },
        { status: 400 }
      );
    }

    const now = new Date();
    // Credit seller with NET amount (excl. commission). Commission is kept by the platform.
    const netAmount = order.sellerNetAmount;
    const commission = order.amount - netAmount;
    await db.$transaction([
      db.order.update({
        where: { id },
        data: { status: "VALIDATED", validatedAt: now },
      }),
      db.user.update({
        where: { id: order.sellerId },
        data: { balance: { increment: netAmount } },
      }),
      db.message.create({
        data: {
          orderId: order.id,
          senderId: order.sellerId,
          content: `🛡️ ROBLOX BOUTIK — Commande validée. Le vendeur a reçu ${netAmount} FCFA (montant net après commission de 16%, soit ${commission} FCFA conservés par la plateforme). Merci pour votre achat !`,
          isAuto: true,
        },
      }),
    ]);

    const updated = await db.order.findUnique({
      where: { id },
      include: {
        listing: { include: { game: true, ratings: true } },
        seller: true,
        buyer: true,
        messages: { orderBy: { createdAt: "asc" } },
        rating: true,
      },
    });

    return NextResponse.json({ order: updated });
  } catch (e) {
    console.error("Validate error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
