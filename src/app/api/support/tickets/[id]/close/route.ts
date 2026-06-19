import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// POST /api/support/tickets/[id]/close
// body: { userId }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { user, error } = await getActor(
      new NextRequest(req, {
        headers: new Headers({ ...Object.fromEntries(req.headers), "x-user-id": userId }),
      })
    );
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
