import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/orders/[id]/rate  - buyer rates the seller after validation
// body: { stars: 1-5, comment?, userId }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { stars, comment, userId } = body as {
      stars?: number;
      comment?: string;
      userId?: string;
    };

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!stars || stars < 1 || stars > 5) {
      return NextResponse.json({ error: "Note entre 1 et 5 étoiles" }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    if (order.buyerId !== userId) {
      return NextResponse.json({ error: "Seul l'acheteur peut noter" }, { status: 403 });
    }

    if (order.status !== "VALIDATED") {
      return NextResponse.json(
        { error: "Note seulement après validation" },
        { status: 400 }
      );
    }

    // Update or create rating
    const existing = await db.rating.findUnique({ where: { orderId: id } });
    if (existing) {
      const updated = await db.rating.update({
        where: { id: existing.id },
        data: { stars, comment: comment?.trim() || null },
      });
      return NextResponse.json({ rating: updated });
    }

    const rating = await db.rating.create({
      data: {
        orderId: id,
        listingId: order.listingId,
        fromUserId: order.buyerId,
        toUserId: order.sellerId,
        stars,
        comment: comment?.trim() || null,
      },
    });

    return NextResponse.json({ rating });
  } catch (e) {
    console.error("Rate error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
