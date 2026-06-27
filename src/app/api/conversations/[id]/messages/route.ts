import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";
import { sendNotification, buildEmailHtml } from "@/lib/notifications";
import { parseBody, conversationMessageSchema } from "@/lib/validation";
import { sanitizeMessage } from "@/lib/sanitize";
import { isFictionalSeller, getAdminForwardUserId } from "@/lib/fictional-sellers";

// GET /api/conversations/[id]/messages?userId=...
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { user, error } = await getActorById(userId);
  if (error) return errorResponse(error);

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      listing: { include: { game: true } },
      buyer: true,
      seller: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  // Only buyer or seller can read
  if (conversation.buyerId !== user!.id && conversation.sellerId !== user!.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  return NextResponse.json({ conversation });
}

// POST /api/conversations/[id]/messages
// body: { userId, content }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const [data, parseErr] = parseBody(conversationMessageSchema, body);
    if (parseErr) return errorResponse(parseErr);
    const { userId } = data!;
    const content = sanitizeMessage(data!.content);

    const { user: sender, error } = await getActorById(userId);
    if (error) return errorResponse(error);

    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        listing: { include: { game: true } },
        buyer: true,
        seller: true,
      },
    });
    if (!conversation) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    // Sender must be buyer or seller
    const isBuyer = conversation.buyerId === sender!.id;
    const isSeller = conversation.sellerId === sender!.id;
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // ANTI-FRAUD: rate limit - max 20 messages per minute per conversation
    const recentMessages = await db.conversationMessage.count({
      where: {
        conversationId: id,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
    });
    if (recentMessages >= 20) {
      return NextResponse.json(
        { error: "Trop de messages. Attends 1 minute." },
        { status: 429 }
      );
    }

    // Save message
    const message = await db.conversationMessage.create({
      data: {
        conversationId: id,
        senderId: sender!.id,
        content,
        isAuto: false,
      },
    });

    await db.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Notify the OTHER party (not the sender) — fire-and-forget for instant response
    // If the recipient is a fictional seller, redirect notification to admin
    const recipient = isBuyer ? conversation.seller : conversation.buyer;
    const senderName = sender!.username;
    const recipientIsFictional = isFictionalSeller(recipient?.email);
    const notifyUserId = recipientIsFictional
      ? getAdminForwardUserId()!
      : recipient.id;

    sendNotification({
      userId: notifyUserId,
      type: "NEW_MESSAGE",
      subject: recipientIsFictional
        ? `📨 [${recipient?.username}] Nouveau message de ${senderName}`
        : `💬 Nouveau message de ${senderName}`,
      body: buildEmailHtml(
        "Nouveau message",
        `<p><strong>${senderName}</strong> t'a envoyé un message au sujet de :</p>
         <p style="background:#f8fafc; padding:12px; border-radius:8px; margin:12px 0;">
           <strong>${conversation.listing.title}</strong><br>
           <span style="color:#64748b;">${conversation.listing.game?.name} · ${conversation.listing.price} FCFA</span>
         </p>
         ${recipientIsFictional ? `<p style="background:#ede9fe; padding:8px; border-radius:6px; color:#5b21b6; font-size:12px;">ℹ️ Message reçu sur le vendeur virtuel <strong>${recipient?.username}</strong>. Réponds via le chat RobloxBoutik.</p>` : ""}
         <p style="background:#fef3c7; padding:12px; border-radius:8px; border-left:3px solid #f59e0b;">
           ${content.replace(/\n/g, "<br>")}
         </p>
         <p style="margin-top:16px;">Connecte-toi à RobloxBoutik pour répondre à ${senderName}.</p>
         <p style="margin-top:24px;"><a href="https://robloxboutik.com" style="background:#c026d3;color:white;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:bold;">Répondre</a></p>`
      ),
      whatsappBody: `🎮 RobloxBoutik : ${senderName} t'a écrit au sujet de "${conversation.listing.title}". Connecte-toi pour répondre.`,
      refType: "CONVERSATION_MESSAGE",
      refId: message.id,
    }).catch((e) => console.error("Conversation message notification failed:", e));

    const messages = await db.conversationMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      include: { sender: true },
    });

    return NextResponse.json({ messages, conversation });
  } catch (e) {
    console.error("Conversation message error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
