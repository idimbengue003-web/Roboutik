import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/cleanup-all?adminId=...
 *
 * Nuclear cleanup: deletes ALL listings, orders, conversations, messages,
 * tickets, withdrawals. Keeps admin accounts only.
 */
export async function POST(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  try {
    // Delete in order to respect foreign key constraints
    await db.ticketMessage.deleteMany({});
    await db.supportTicket.deleteMany({});
    await db.conversationMessage.deleteMany({});
    await db.conversation.deleteMany({});
    await db.message.deleteMany({});
    await db.rating.deleteMany({});
    await db.order.deleteMany({});
    await db.listing.deleteMany({});
    await db.withdrawal.deleteMany({});
    // Keep admin accounts, delete everyone else
    const deletedUsers = await db.user.deleteMany({
      where: { isAdmin: false },
    });

    return NextResponse.json({
      ok: true,
      deleted: {
        users: deletedUsers.count,
        listings: "all",
        orders: "all",
        conversations: "all",
        tickets: "all",
        withdrawals: "all",
      },
    });
  } catch (e) {
    console.error("Cleanup-all error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
