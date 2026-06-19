import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// GET /api/admin/users/[id]/withdrawals?adminId=...
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const withdrawals = await db.withdrawal.findMany({
    where: { sellerId: id },
    include: { seller: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ withdrawals });
}
