import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse, logAdminAction } from "@/lib/security";

// GET /api/admin/withdrawals?adminId=...&status=PENDING
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminId = searchParams.get("adminId");
  const status = searchParams.get("status") || "PENDING";

  const reqWithHeader = new NextRequest(req, {
    headers: new Headers(req.headers),
  });
  reqWithHeader.headers.set("x-user-id", adminId ?? "");

  const { error } = await getActor(reqWithHeader, { requireAdmin: true });
  if (error) return errorResponse(error);

  const withdrawals = await db.withdrawal.findMany({
    where: status === "ALL" ? {} : { status },
    include: { seller: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ withdrawals });
}
