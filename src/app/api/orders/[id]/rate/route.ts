import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, errorResponse, rateOrderSchema } from "@/lib/validation";
import { sanitizeMessage } from "@/lib/sanitize";

// POST /api/orders/[id]/rate  - buyer rates the seller after validation
// body: { stars: 1-5, comment?, userId }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const [data, error] = parseBody(rateOrderSchema, body);
    if (error) return errorResponse(error);
    const { stars, userId } = data!;
    const comment = data!.comment ? sanitizeMessage(data!.comment) : "";

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
        data: { stars, comment: comment || null },
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
        comment: comment || null,
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
