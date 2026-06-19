import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// GET /api/admin/stats?adminId=...
// Global platform statistics
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminId = searchParams.get("adminId");

  const reqWithHeader = new NextRequest(req, {
    headers: new Headers(req.headers),
  });
  reqWithHeader.headers.set("x-user-id", adminId ?? "");

  const { error } = await getActor(reqWithHeader, { requireAdmin: true });
  if (error) return errorResponse(error);

  const [
    totalUsers,
    totalSellers,
    totalBanned,
    totalListings,
    activeListings,
    totalOrders,
    pendingPaymentOrders,
    paidOrders,
    deliveredOrders,
    validatedOrders,
    pendingWithdrawals,
    completedWithdrawals,
    rejectedWithdrawals,
    openTickets,
    botHandledTickets,
    adminHandledTickets,
    ordersWithCommission,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isSeller: true } }),
    db.user.count({ where: { isBanned: true } }),
    db.listing.count(),
    db.listing.count({ where: { active: true } }),
    db.order.count(),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.order.count({ where: { status: "PAID" } }),
    db.order.count({ where: { status: "DELIVERED" } }),
    db.order.count({ where: { status: "VALIDATED" } }),
    db.withdrawal.count({ where: { status: "PENDING" } }),
    db.withdrawal.count({ where: { status: "COMPLETED" } }),
    db.withdrawal.count({ where: { status: "REJECTED" } }),
    db.supportTicket.count({ where: { status: "OPEN" } }),
    db.supportTicket.count({ where: { status: "BOT_HANDLED" } }),
    db.supportTicket.count({ where: { status: "ADMIN_HANDLED" } }),
    db.order.findMany({
      where: { status: "VALIDATED" },
      select: { amount: true, sellerNetAmount: true },
    }),
  ]);

  const totalGmv = ordersWithCommission.reduce((s, o) => s + o.amount, 0);
  const totalCommission = ordersWithCommission.reduce(
    (s, o) => s + (o.amount - (o.sellerNetAmount ?? 0)),
    0
  );
  const totalSellerPayouts = ordersWithCommission.reduce(
    (s, o) => s + (o.sellerNetAmount ?? 0),
    0
  );

  return NextResponse.json({
    users: { total: totalUsers, sellers: totalSellers, banned: totalBanned },
    listings: { total: totalListings, active: activeListings },
    orders: {
      total: totalOrders,
      pendingPayment: pendingPaymentOrders,
      paid: paidOrders,
      delivered: deliveredOrders,
      validated: validatedOrders,
    },
    withdrawals: {
      pending: pendingWithdrawals,
      completed: completedWithdrawals,
      rejected: rejectedWithdrawals,
    },
    tickets: {
      open: openTickets,
      botHandled: botHandledTickets,
      adminHandled: adminHandledTickets,
    },
    revenue: {
      totalGmv,
      totalCommission,
      totalSellerPayouts,
    },
  });
}
