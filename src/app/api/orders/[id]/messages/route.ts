import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

// POST /api/orders/[id]/messages  - buyer sends a message
// body: { content }
// Special: if content triggers seller auto-delivery, seller auto-responds and marks as DELIVERED
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content } = body as { content?: string };

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id },
      include: { listing: { include: { game: true } }, seller: true, buyer: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    const buyer = await db.user.findUnique({ where: { username: "Moi" } });
    if (!buyer) {
      return NextResponse.json({ error: "Run /api/init first" }, { status: 400 });
    }

    // Save buyer message
    await db.message.create({
      data: {
        orderId: order.id,
        senderId: buyer.id,
        content: content.trim(),
        isAuto: false,
      },
    });

    // Seller auto-response logic
    const lower = content.toLowerCase();
    const sellerResponses: string[] = [];

    if (order.status === "PAID") {
      // Buyer might say "livré", "reçu", "pret", "ok", "oui", "go"
      if (
        lower.includes("pret") ||
        lower.includes("prêt") ||
        lower.includes("ok") ||
        lower.includes("oui") ||
        lower.includes("go") ||
        lower.includes("reçu") ||
        lower.includes("recu") ||
        lower.includes("livré") ||
        lower.includes("livre") ||
        lower.includes("bonjour") ||
        lower.includes("salut")
      ) {
        // Seller simulates delivery
        await db.order.update({
          where: { id: order.id },
          data: { status: "DELIVERED" },
        });
        sellerResponses.push(
          `Super ! Je viens de livrer "${order.listing.title}" sur ton compte Roblox. ✅ Vérifie bien que tu as tout reçu, puis clique sur "Valider la commande" pour confirmer. Si tu as un souci, dis-le moi avant de valider !`
        );
      } else {
        sellerResponses.push(
          `Merci pour ton message 👍 Dis-moi quand tu es prêt·e à recevoir ta commande, et je te livre tout de suite sur ${order.listing.game.name} !`
        );
      }
    } else if (order.status === "DELIVERED") {
      sellerResponses.push(
        `Pas de souci ! Si tout est correct, clique sur "Valider la commande" en haut. Les fonds seront transférés sur mon solde. Pour toute question, je reste là.`
      );
    } else if (order.status === "VALIDATED") {
      sellerResponses.push(`Merci encore pour ta commande ! À bientôt 🎮`);
    } else if (order.status === "PENDING_PAYMENT") {
      sellerResponses.push(
        `Pense à payer avec Wave pour démarrer la commande 💸`
      );
    }

    for (const msg of sellerResponses) {
      await db.message.create({
        data: {
          orderId: order.id,
          senderId: order.sellerId,
          content: msg,
          isAuto: true,
        },
      });
    }

    const messages = await db.message.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
      include: { sender: true },
    });

    const updatedOrder = await db.order.findUnique({
      where: { id },
      include: { listing: { include: { game: true } }, seller: true, buyer: true },
    });

    return NextResponse.json({ messages, order: updatedOrder });
  } catch (e) {
    console.error("Message error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
