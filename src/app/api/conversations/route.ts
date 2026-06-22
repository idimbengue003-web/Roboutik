import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";
import { sendNotification, buildEmailHtml } from "@/lib/notifications";
import { parseBody, createConversationSchema } from "@/lib/validation";
import { sanitizeMessage } from "@/lib/sanitize";

// GET /api/conversations?userId=...
// Returns all conversations where user is buyer OR seller
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { user, error } = await getActorById(userId);
  if (error) return errorResponse(error);

  const conversations = await db.conversation.findMany({
    where: {
      OR: [{ buyerId: user!.id }, { sellerId: user!.id }],
    },
    include: {
      listing: { include: { game: true } },
      buyer: true,
      seller: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ conversations });
}

// POST /api/conversations
// body: { userId, listingId, firstMessage }
// Creates or reuses a conversation about a listing, sends the first message
// + notifies the seller via email/WhatsApp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const [data, parseErr] = parseBody(createConversationSchema, body);
    if (parseErr) return errorResponse(parseErr);
    const { userId, listingId } = data!;
    const firstMessage = sanitizeMessage(data!.firstMessage);

    const { user: buyer, error } = await getActorById(userId);
    if (error) return errorResponse(error);

    const listing = await db.listing.findUnique({
      where: { id: listingId },
      include: { game: true, seller: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
    }
    if (!listing.active) {
      return NextResponse.json({ error: "Annonce inactive" }, { status: 400 });
    }

    // ANTI-FRAUD: cannot start a conversation on your own listing
    if (listing.sellerId === buyer!.id) {
      return NextResponse.json(
        { error: "Tu ne peux pas contacter ton propre annonce" },
        { status: 400 }
      );
    }

    // ANTI-FRAUD: cannot start a conversation with a banned seller
    if (listing.seller?.isBanned) {
      return NextResponse.json(
        { error: "Ce vendeur n'est plus disponible" },
        { status: 400 }
      );
    }

    // Find or create conversation
    let conversation = await db.conversation.findUnique({
      where: {
        listingId_buyerId: { listingId, buyerId: buyer!.id },
      },
      include: {
        listing: { include: { game: true } },
        buyer: true,
        seller: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          listingId,
          buyerId: buyer!.id,
          sellerId: listing.sellerId,
        },
        include: {
          listing: { include: { game: true } },
          buyer: true,
          seller: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
    }

    // Save buyer message
    const message = await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: buyer!.id,
        content: firstMessage,
        isAuto: false,
      },
    });

    await db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Send notification to the SELLER
    await sendNotification({
      userId: listing.sellerId,
      type: "NEW_MESSAGE",
      subject: `Nouveau message de ${buyer!.username}`,
      body: buildEmailHtml(
        "Nouveau message",
        `<p><strong>${buyer!.username}</strong> t'a envoyé un message au sujet de :</p>
         <p style="background:#f8fafc; padding:12px; border-radius:8px; margin:12px 0;">
           <strong>${listing.title}</strong><br>
           <span style="color:#64748b;">${listing.game?.name} · ${listing.price} FCFA</span>
         </p>
         <p style="background:#fef3c7; padding:12px; border-radius:8px; border-left:3px solid #f59e0b;">
           ${firstMessage.replace(/\n/g, "<br>")}
         </p>
         <p style="margin-top:16px;">Connecte-toi à Roboutik pour répondre à ${buyer!.username}.</p>`
      ),
      whatsappBody: `🎮 Roboutik : ${buyer!.username} t'a écrit au sujet de "${listing.title}" (${listing.price} FCFA). Connecte-toi pour répondre.`,
      refType: "CONVERSATION_MESSAGE",
      refId: message.id,
    });

    const fullConversation = await db.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        listing: { include: { game: true } },
        buyer: true,
        seller: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({ conversation: fullConversation });
  } catch (e) {
    console.error("Create conversation error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
