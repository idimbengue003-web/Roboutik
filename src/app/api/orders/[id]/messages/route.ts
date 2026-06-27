import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";
import { parseBody, orderMessageSchema } from "@/lib/validation";
import { sanitizeMessage } from "@/lib/sanitize";
import { sendNotification, buildEmailHtml } from "@/lib/notifications";
import { isFictionalSeller, getAdminForwardUserId } from "@/lib/fictional-sellers";

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
    const savedMessage = await db.message.create({
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

    // 🔔 Notify the OTHER party (buyer if seller sent, seller if buyer sent)
    // If the recipient is a fictional seller, redirect notification to admin
    const recipient = isBuyer ? order.seller : order.buyer;
    const senderName = sender!.username;
    const recipientIsFictional = isFictionalSeller(recipient?.email);
    const notifyUserId = recipientIsFictional
      ? getAdminForwardUserId()!
      : recipient.id;

    if (recipient && recipient.id !== sender!.id) {
      sendNotification({
        userId: notifyUserId,
        type: "NEW_MESSAGE",
        subject: recipientIsFictional
          ? `📨 [${recipient?.username}] Message de ${senderName}`
          : `💬 Nouveau message de ${senderName}`,
        body: buildEmailHtml(
          "Nouveau message",
          `<p><strong>${senderName}</strong> t'a envoyé un message sur ta commande :</p>
           <p style="background:#f8fafc; padding:12px; border-radius:8px; margin:12px 0;">
             <strong>${order.listing.title}</strong><br>
             <span style="color:#64748b;">${order.listing.game?.name} · ${order.amount} FCFA</span>
           </p>
           ${recipientIsFictional ? `<p style="background:#ede9fe; padding:8px; border-radius:6px; color:#5b21b6; font-size:12px;">ℹ️ Message reçu sur le vendeur virtuel <strong>${recipient?.username}</strong>. Réponds via le chat RobloxBoutik.</p>` : ""}
           <p style="background:#fef3c7; padding:12px; border-radius:8px; border-left:3px solid #f59e0b;">
             ${content.replace(/\n/g, "<br>")}
           </p>
           <p style="margin-top:16px;">Connecte-toi à RobloxBoutik pour répondre à ${senderName}.</p>
           <p style="margin-top:24px;"><a href="https://robloxboutik.com" style="background:#c026d3;color:white;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:bold;">Répondre</a></p>`
        ),
        whatsappBody: `💬 RobloxBoutik : ${senderName} t'a écrit au sujet de "${order.listing.title}". Connecte-toi pour répondre.`,
        refType: "ORDER",
        refId: order.id,
      }).catch((e) => console.error("Message notification failed:", e));
    }

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
