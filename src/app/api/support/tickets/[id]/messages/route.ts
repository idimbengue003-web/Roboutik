import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";
import { classifyMessage } from "@/lib/support-bot";

// GET /api/support/tickets/[id]/messages?userId=...
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

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
  }

  // Only the opener or an admin can read
  if (ticket.openerId !== user!.id && !user!.isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  return NextResponse.json({ ticket, messages: ticket.messages });
}

// POST /api/support/tickets/[id]/messages
// body: { userId, content }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId, content } = body as { userId?: string; content?: string };

    if (!userId || !content?.trim()) {
      return NextResponse.json(
        { error: "userId et content requis" },
        { status: 400 }
      );
    }

    const { user, error } = await getActorById(userId);
    if (error) return errorResponse(error);

    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }
    if (ticket.openerId !== user!.id) {
      return NextResponse.json({ error: "Ce n'est pas ton ticket" }, { status: 403 });
    }
    if (ticket.status === "CLOSED") {
      return NextResponse.json({ error: "Ticket fermé" }, { status: 400 });
    }

    await db.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: user!.id,
        senderRole: "USER",
        content: content.trim(),
        isAuto: false,
      },
    });

    let botResponse: string | null = null;
    if (ticket.status !== "ADMIN_HANDLED") {
      const bot = classifyMessage(content);
      botResponse = bot.response;

      await db.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: null,
          senderRole: "BOT",
          content: bot.response,
          isAuto: true,
        },
      });

      if (bot.escalate) {
        await db.supportTicket.update({
          where: { id },
          data: {
            status: "ADMIN_HANDLED",
            priority: bot.priority,
            category: bot.category,
          },
        });
      }
    }

    await db.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    const messages = await db.ticketMessage.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages, botResponse });
  } catch (e) {
    console.error("Ticket message error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
