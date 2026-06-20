import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse, logAdminAction } from "@/lib/security";
import { parseBody, adminReplySchema } from "@/lib/validation";
import { sanitizeMessage } from "@/lib/sanitize";
import { maybeAutoBanBuyer } from "@/lib/auto-ban";

// POST /api/support/admin/tickets/[id]/reply
// body: { adminId, content, resolve?, dismissed? }
// If resolve=true, the ticket is marked RESOLVED and we check whether the
// buyer should be auto-banned for filing false reports.
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
    // dismissed is accepted for forward compatibility / explicit admin intent;
    // the buyer auto-ban check uses the seller's isBanned status directly.
    const dismissed = !!data!.dismissed;

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
      metadata: { ticketId: id, resolved: !!resolve, dismissed },
    });

    // Reciprocal auto-ban: if the admin resolved the ticket, check whether the
    // buyer (ticket opener) has filed 3+ false reports (resolved SELLER tickets
    // where the reported seller is NOT banned). If so, ban the buyer.
    let buyerAutoBanned = false;
    if (resolve) {
      try {
        const result = await maybeAutoBanBuyer(ticket.openerId);
        buyerAutoBanned = result.banned;
      } catch (e) {
        // Don't fail the reply if the auto-ban check errors — just log it.
        console.error("maybeAutoBanBuyer error:", e);
      }
    }

    const messages = await db.ticketMessage.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages, buyerAutoBanned });
  } catch (e) {
    console.error("Admin reply error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
