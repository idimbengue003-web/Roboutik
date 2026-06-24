import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * GET /api/admin/users/[id]/listings?adminId=...
 *
 * Returns all listings (active + inactive) for a given user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const { id } = await params;

  const listings = await db.listing.findMany({
    where: { sellerId: id },
    orderBy: { createdAt: "desc" },
    include: {
      game: true,
      _count: { select: { orders: true, ratings: true } },
    },
  });

  return NextResponse.json({ listings });
}
