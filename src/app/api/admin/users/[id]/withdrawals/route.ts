import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// GET /api/admin/users/[id]/withdrawals?adminId=...
// Get a specific user's withdrawals (for admin review)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const adminId = searchParams.get("adminId");

  const reqWithHeader = new NextRequest(req, {
    headers: new Headers(req.headers),
  });
  reqWithHeader.headers.set("x-user-id", adminId ?? "");

  const { error } = await getActor(reqWithHeader, { requireAdmin: true });
  if (error) return errorResponse(error);

  const withdrawals = await db.withdrawal.findMany({
    where: { sellerId: id },
    include: { seller: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ withdrawals });
}
