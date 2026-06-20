import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse, logAdminAction } from "@/lib/security";
import { parseBody, adminReplySchema } from "@/lib/validation";
import { sanitizeMessage } from "@/lib/sanitize";

// POST /api/support/admin/tickets/[id]/reply
// body: { adminId, content, resolve? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const [data, parseErr] = parseBody(adminReplySchema, body);
    if (parseErr) return errorResponse(parseErr);
    const { adminId, resolve } = data!;
    const content = sanitizeMessage(data!.content);

    const { user: admin, error } = await getActorById(adminId, {
      requireAdmin: true,
    });
    if (error) return errorResponse(error);

    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }

    await db.$transaction([
      db.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: admin!.id,
          senderRole: "ADMIN",
          content,
          isAuto: false,
        },
      }),
      db.supportTicket.update({
        where: { id },
        data: {
          status: resolve ? "RESOLVED" : "ADMIN_HANDLED",
          updatedAt: new Date(),
        },
      }),
    ]);

    await logAdminAction({
      actorId: admin!.id,
      targetId: ticket.openerId,
      action: "REPLY_TICKET",
      metadata: { ticketId: id, resolved: !!resolve },
    });

    const messages = await db.ticketMessage.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (e) {
    console.error("Admin reply error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
