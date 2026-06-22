import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";

// GET /api/support/my-reports?userId=...
// Returns all SELLER reports opened by this user (against sellers or listings),
// with order/listing info included for display.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { user, error } = await getActorById(userId);
  if (error) return errorResponse(error);

  const tickets = await db.supportTicket.findMany({
    where: {
      openerId: user!.id,
      category: "SELLER",
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Hydrate the linked order + listing when present (pre-sale reports have no order).
  const hydrated = await Promise.all(
    tickets.map(async (t) => {
      let order: {
        id: string;
        status: string;
        amount: number;
        listing: {
          id: string;
          title: string;
          gameId: string;
          game?: { id: string; name: string } | null;
        } | null;
      } | null = null;
      if (t.orderId) {
        const o = await db.order.findUnique({
          where: { id: t.orderId },
          select: {
            id: true,
            status: true,
            amount: true,
            listing: {
              select: {
                id: true,
                title: true,
                gameId: true,
                game: { select: { id: true, name: true } },
              },
            },
          },
        });
        order = o;
      }
      return { ...t, order };
    })
  );

  return NextResponse.json({ tickets: hydrated });
}
