import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// GET /api/admin/users?adminId=...&q=...&banned=true
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminId = searchParams.get("adminId");
  const q = searchParams.get("q")?.toLowerCase().trim();
  const banned = searchParams.get("banned") === "true";
  const sellersOnly = searchParams.get("sellers") === "true";

  // Use header for admin auth
  const reqWithHeader = new NextRequest(req, {
    headers: new Headers(req.headers),
  });
  reqWithHeader.headers.set("x-user-id", adminId ?? "");

  const { user: admin, error } = await getActor(reqWithHeader, {
    requireAdmin: true,
  });
  if (error) return errorResponse(error);

  const where: {
    isBanned?: boolean;
    isSeller?: boolean;
    OR?: { username?: { contains: string }; email?: { contains: string } }[];
  } = {};
  if (banned) where.isBanned = true;
  if (sellersOnly) where.isSeller = true;
  if (q) {
    where.OR = [
      { username: { contains: q } },
      { email: { contains: q } },
    ];
  }

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      isSeller: true,
      isAdmin: true,
      isBanned: true,
      bannedAt: true,
      banReason: true,
      balance: true,
      createdAt: true,
      _count: {
        select: {
          listings: true,
          buyerOrders: true,
          sellerOrders: true,
          withdrawals: true,
        },
      },
    },
  });

  return NextResponse.json({ users });
}
