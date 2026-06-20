import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";
import { classifyMessage } from "@/lib/support-bot";
import { parseBody, createTicketSchema } from "@/lib/validation";
import { sanitizeMessage } from "@/lib/sanitize";

// GET /api/support/tickets?userId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { user, error } = await getActorById(userId);
  if (error) return errorResponse(error);

  const tickets = await db.supportTicket.findMany({
    where: { openerId: user!.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ tickets });
}

// POST /api/support/tickets
// body: { userId, subject, message, orderId? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const [data, parseErr] = parseBody(createTicketSchema, body);
    if (parseErr) return errorResponse(parseErr);
    const { userId, orderId } = data!;
    const subject = sanitizeMessage(data!.subject);
    const message = sanitizeMessage(data!.message);

    const { user, error } = await getActorById(userId);
    if (error) return errorResponse(error);

    // Classify the message
    const bot = classifyMessage(message);

    // Create ticket + first user message + bot auto-response in a transaction
    const ticket = await db.$transaction(async (tx) => {
      const t = await tx.supportTicket.create({
        data: {
          openerId: user!.id,
          subject: subject.slice(0, 200),
          category: bot.category,
          priority: bot.priority,
          orderId: orderId || null,
          status: bot.escalate ? "ADMIN_HANDLED" : "BOT_HANDLED",
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: t.id,
          senderId: user!.id,
          senderRole: "USER",
          content: message,
          isAuto: false,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: t.id,
          senderId: null,
          senderRole: "BOT",
          content: bot.response,
          isAuto: true,
        },
      });

      return t;
    });

    const fullTicket = await db.supportTicket.findUnique({
      where: { id: ticket.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({
      ticket: fullTicket,
      botResponse: bot.response,
      escalate: bot.escalate,
      suggestedActions: bot.suggestedActions,
    });
  } catch (e) {
    console.error("Create ticket error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
