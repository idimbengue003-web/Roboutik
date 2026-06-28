import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";
import { isFictionalSeller } from "@/lib/fictional-sellers";

/**
 * GET /api/admin/fictional-orders?adminId=...
 *
 * Returns all orders where the seller is a fictional seller
 * (i.e. orders placed on listings owned by the 7 fictional accounts).
 * This lets the admin see and handle all orders placed on fictional
 * sellers' listings, even though they're not the official sellerId.
 */
export async function GET(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  // Find all fictional sellers
  const fictionalSellers = await db.user.findMany({
    where: {
      email: { endsWith: "@robloxboutik.sn" },
      isSeller: true,
    },
    select: { id: true, username: true, avatar: true, email: true },
  });

  const sellerIds = fictionalSellers.map((s) => s.id);
  if (sellerIds.length === 0) {
    return NextResponse.json({ orders: [], sellers: [] });
  }

  // Get all orders where the seller is a fictional seller
  const orders = await db.order.findMany({
    where: { sellerId: { in: sellerIds } },
    include: {
      listing: { include: { game: true } },
      seller: { select: { id: true, username: true, avatar: true, email: true } },
      buyer: { select: { id: true, username: true, avatar: true, email: true } },
      messages: { orderBy: { createdAt: "asc" } },
      rating: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Also get all conversations where the seller is fictional
  const conversations = await db.conversation.findMany({
    where: { sellerId: { in: sellerIds } },
    include: {
      listing: { include: { game: true } },
      seller: { select: { id: true, username: true, avatar: true } },
      buyer: { select: { id: true, username: true, avatar: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    sellers: fictionalSellers,
    orders,
    conversations,
    stats: {
      totalOrders: orders.length,
      pendingOrders: orders.filter(
        (o) =>
          o.status === "PAID" ||
          o.status === "DELIVERED" ||
          o.status === "PENDING_PAYMENT"
      ).length,
      totalConversations: conversations.length,
    },
  });
}
