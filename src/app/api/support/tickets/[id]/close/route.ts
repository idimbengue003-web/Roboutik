import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";
import { parseBody, adminActionSchema } from "@/lib/validation";

// POST /api/support/tickets/[id]/close
// body: { userId }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawBody = await req.json().catch(() => null) as { userId?: string } | null;
    // The body uses `userId`, but adminActionSchema validates `adminId`.
    // Rename the field at the boundary so we can reuse adminActionSchema.
    const [data, parseErr] = parseBody(adminActionSchema, { adminId: rawBody?.userId });
    if (parseErr) return errorResponse(parseErr);
    const userId = data!.adminId;

    const { user, error } = await getActorById(userId);
    if (error) return errorResponse(error);

    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }
    if (ticket.openerId !== user!.id && !user!.isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    await db.supportTicket.update({
      where: { id },
      data: { status: "CLOSED" },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
