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

    if (order.status !== "DELIVERED") {
      return NextResponse.json(
        { error: "Le vendeur doit d'abord confirmer la livraison" },
        { status: 400 }
      );
    }

    // Transfer balance to seller
    await db.$transaction([
      db.order.update({
        where: { id },
        data: { status: "VALIDATED" },
      }),
      db.user.update({
        where: { id: order.sellerId },
        data: { balance: { increment: order.amount } },
      }),
      db.message.create({
        data: {
          orderId: order.id,
          senderId: order.sellerId,
          content: `Merci beaucoup ! 🎉 Tu as validé la commande. Les ${order.amount} FCFA ont bien été transférées sur mon solde Wave. À bientôt pour de nouveaux achats !`,
          isAuto: true,
        },
      }),
    ]);

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
    console.error("Validate error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
