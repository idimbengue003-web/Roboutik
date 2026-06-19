import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/listings?gameId=...   or   ?all=true
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("gameId");
  const all = searchParams.get("all") === "true";

  const where: { active?: boolean; gameId?: string } = { active: true };
  if (!all && gameId) where.gameId = gameId;

  const listings = await db.listing.findMany({
    where,
    include: {
      game: true,
      seller: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ listings });
}
