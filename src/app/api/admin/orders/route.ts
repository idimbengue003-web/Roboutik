import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * GET /api/admin/orders?adminId=...&status=...&q=...
 *
 * Returns all orders, optionally filtered by status or search query.
 */
export async function GET(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // PENDING_PAYMENT | PAID | DELIVERED | VALIDATED | CANCELLED | ALL
  const q = searchParams.get("q")?.toLowerCase().trim();

  const where: {
    status?: string;
    OR?: { listing?: { title?: { contains: string } }; buyer?: { username?: { contains: string } }; seller?: { username?: { contains: string } } }[];
  } = {};
  if (status && status !== "ALL") where.status = status;
  if (q) {
    where.OR = [
      { listing: { title: { contains: q } } },
      { buyer: { username: { contains: q } } },
      { seller: { username: { contains: q } } },
    ];
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      listing: { include: { game: true } },
      buyer: { select: { id: true, username: true, avatar: true, email: true } },
      seller: { select: { id: true, username: true, avatar: true, email: true } },
    },
  });

  return NextResponse.json({ orders });
}
