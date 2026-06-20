import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// GET /api/admin/users/[id]/reports?adminId=...
// Returns all URGENT tickets (SELLER reports) opened against this user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  // Find all tickets where this user was reported (they were the seller of the order)
  const tickets = await db.supportTicket.findMany({
    where: {
      category: "SELLER",
      orderId: { not: null },
    },
    include: {
      opener: { select: { id: true, username: true, avatar: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Filter tickets where the reported user is the seller
  // (need to fetch the order to know the seller)
  const ticketsWithSeller = await Promise.all(
    tickets.map(async (t) => {
      if (!t.orderId) return null;
      const order = await db.order.findUnique({
        where: { id: t.orderId },
        select: { sellerId: true },
      });
      if (order?.sellerId !== id) return null;
      return t;
    })
  );

  const filtered = ticketsWithSeller.filter((t) => t !== null) as typeof tickets;

  return NextResponse.json({
    reports: filtered,
    count: filtered.length,
  });
}
