import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/cleanup?adminId=...
 *
 * Deletes all demo/test data from the database:
 * - Demo sellers (vendeur1-4@demo.local)
 * - Demo buyer (moi@demo.local)
 * - All listings created by demo sellers
 * - All orders on demo listings
 * - All conversations on demo listings
 * - All messages on demo orders
 *
 * Keeps: admin account, real users, real listings, real orders.
 */
export async function POST(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  try {
    // Find demo users
    const demoEmails = [
      "moi@demo.local",
      "vendeur1@demo.local",
      "vendeur2@demo.local",
      "vendeur3@demo.local",
      "vendeur4@demo.local",
    ];
    const demoUsers = await db.user.findMany({
      where: { email: { in: demoEmails } },
      select: { id: true, email: true, username: true },
    });

    if (demoUsers.length === 0) {
      return NextResponse.json({ ok: true, message: "Aucune donnée de test trouvée." });
    }

    const demoUserIds = demoUsers.map((u) => u.id);

    // Find all listings by demo sellers
    const demoListings = await db.listing.findMany({
      where: { sellerId: { in: demoUserIds } },
      select: { id: true },
    });
    const demoListingIds = demoListings.map((l) => l.id);

    // Find all orders on demo listings OR by demo buyers
    const demoOrders = await db.order.findMany({
      where: {
        OR: [
          { listingId: { in: demoListingIds } },
          { buyerId: { in: demoUserIds } },
          { sellerId: { in: demoUserIds } },
        ],
      },
      select: { id: true },
    });
    const demoOrderIds = demoOrders.map((o) => o.id);

    // Find all conversations on demo listings
    const demoConversations = await db.conversation.findMany({
      where: {
        OR: [
          { listingId: { in: demoListingIds } },
          { buyerId: { in: demoUserIds } },
          { sellerId: { in: demoUserIds } },
        ],
      },
      select: { id: true },
    });
    const demoConversationIds = demoConversations.map((c) => c.id);

    // Find all support tickets by demo users
    const demoTickets = await db.supportTicket.findMany({
      where: { openerId: { in: demoUserIds } },
      select: { id: true },
    });
    const demoTicketIds = demoTickets.map((t) => t.id);

    // Find all withdrawals by demo sellers
    const demoWithdrawals = await db.withdrawal.findMany({
      where: { sellerId: { in: demoUserIds } },
      select: { id: true },
    });

    // Delete everything in the right order (respecting foreign keys)
    // 1. Ticket messages
    if (demoTicketIds.length > 0) {
      await db.ticketMessage.deleteMany({ where: { ticketId: { in: demoTicketIds } } });
    }
    // 2. Support tickets
    await db.supportTicket.deleteMany({ where: { openerId: { in: demoUserIds } } });

    // 3. Conversation messages
    if (demoConversationIds.length > 0) {
      await db.conversationMessage.deleteMany({ where: { conversationId: { in: demoConversationIds } } });
    }
    // 4. Conversations
    await db.conversation.deleteMany({
      where: {
        OR: [
          { listingId: { in: demoListingIds } },
          { buyerId: { in: demoUserIds } },
          { sellerId: { in: demoUserIds } },
        ],
      },
    });

    // 5. Order messages
    if (demoOrderIds.length > 0) {
      await db.message.deleteMany({ where: { orderId: { in: demoOrderIds } } });
    }
    // 6. Ratings on demo orders
    if (demoOrderIds.length > 0) {
      await db.rating.deleteMany({ where: { orderId: { in: demoOrderIds } } });
    }
    // 7. Orders
    await db.order.deleteMany({
      where: {
        OR: [
          { listingId: { in: demoListingIds } },
          { buyerId: { in: demoUserIds } },
          { sellerId: { in: demoUserIds } },
        ],
      },
    });

    // 8. Ratings on demo listings
    if (demoListingIds.length > 0) {
      await db.rating.deleteMany({ where: { listingId: { in: demoListingIds } } });
    }
    // 9. Listings
    await db.listing.deleteMany({ where: { sellerId: { in: demoUserIds } } });

    // 10. Withdrawals
    await db.withdrawal.deleteMany({ where: { sellerId: { in: demoUserIds } } });

    // 11. Demo users (but NOT admin)
    await db.user.deleteMany({ where: { email: { in: demoEmails } } });

    return NextResponse.json({
      ok: true,
      deleted: {
        users: demoUsers.length,
        listings: demoListings.length,
        orders: demoOrders.length,
        conversations: demoConversations.length,
        tickets: demoTickets.length,
        withdrawals: demoWithdrawals.length,
      },
    });
  } catch (e) {
    console.error("Cleanup error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
