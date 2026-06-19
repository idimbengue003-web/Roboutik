import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/seller/become  - body: { userId }
// Marks user as seller
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body as { userId?: string };
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    const user = await db.user.update({
      where: { id: userId },
      data: { isSeller: true },
    });
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET /api/seller/balance?userId=...
// Returns seller balance, earnings history (validated orders), withdrawals
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [validatedOrders, withdrawals, listings] = await Promise.all([
    db.order.findMany({
      where: { sellerId: userId, status: "VALIDATED" },
      include: { listing: { include: { game: true } }, buyer: true, rating: true },
      orderBy: { validatedAt: "desc" },
    }),
    db.withdrawal.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
    }),
    db.listing.findMany({
      where: { sellerId: userId },
      include: { game: true, ratings: true, orders: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalEarnings = validatedOrders.reduce((s, o) => s + o.amount, 0);
  const withdrawnTotal = withdrawals
    .filter((w) => w.status === "COMPLETED")
    .reduce((s, w) => s + w.amount, 0);
  const pendingWithdrawals = withdrawals
    .filter((w) => w.status === "PENDING")
    .reduce((s, w) => s + w.amount, 0);

  return NextResponse.json({
    user,
    balance: user.balance,
    totalEarnings,
    withdrawnTotal,
    pendingWithdrawals,
    available: user.balance,
    validatedOrders,
    withdrawals,
    listings,
  });
}
