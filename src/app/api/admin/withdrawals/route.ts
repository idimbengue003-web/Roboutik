import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// GET /api/admin/withdrawals?adminId=...&status=PENDING
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "PENDING";

  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const withdrawals = await db.withdrawal.findMany({
    where: status === "ALL" ? {} : { status },
    include: { seller: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ withdrawals });
}
