import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";
import { parseBody, orderMessageSchema } from "@/lib/validation";
import { sanitizeMessage } from "@/lib/sanitize";

// GET /api/orders/[id]/messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = await db.message.findMany({
    where: { orderId: id },
    orderBy: { createdAt: "asc" },
    include: { sender: true },
  });
  return NextResponse.json({ messages });
}

// POST /api/orders/[id]/messages
// body: { userId, content }
// Saves the user's message. NO auto-response — the seller responds manually.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const [data, parseErr] = parseBody(orderMessageSchema, body);
    if (parseErr) return errorResponse(parseErr);
    const { userId } = data!;
    const content = sanitizeMessage(data!.content);

    const { user: sender, error } = await getActorById(userId);
    if (error) return errorResponse(error);

    const order = await db.order.findUnique({
      where: { id },
      include: { listing: { include: { game: true } }, seller: true, buyer: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    // Sender must be buyer or seller
    const isBuyer = order.buyerId === sender!.id;
    const isSeller = order.sellerId === sender!.id;
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Save message — no auto-response, no status change
    await db.message.create({
      data: {
        orderId: id,
        senderId: sender!.id,
        content,
        isAuto: false,
      },
    });

    await db.order.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    const messages = await db.message.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
      include: { sender: true },
    });

    return NextResponse.json({ messages });
  } catch (e) {
    console.error("Message error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
