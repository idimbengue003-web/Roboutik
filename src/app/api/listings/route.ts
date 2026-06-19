import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/listings?gameId=...&all=true&q=...&minPrice=...&maxPrice=...&sort=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("gameId");
  const all = searchParams.get("all") === "true";
  const q = searchParams.get("q")?.trim().toLowerCase();
  const minPrice = Number(searchParams.get("minPrice") || 0);
  const maxPrice = Number(searchParams.get("maxPrice") || 0);
  const sort = searchParams.get("sort") || "recent"; // recent | price_asc | price_desc

  const where: {
    active?: boolean;
    gameId?: string;
    AND?: { OR: { title?: { contains: string }; description?: { contains: string } } }[];
    price?: { gte?: number; lte?: number };
  } = { active: true };

  if (!all && gameId) where.gameId = gameId;

  if (q) {
    where.AND = [
      {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      },
    ];
  }

  if (minPrice > 0 || maxPrice > 0) {
    where.price = {};
    if (minPrice > 0) where.price.gte = minPrice;
    if (maxPrice > 0) where.price.lte = maxPrice;
  }

  const orderBy =
    sort === "price_asc"
      ? { price: "asc" as const }
      : sort === "price_desc"
      ? { price: "desc" as const }
      : { createdAt: "desc" as const };

  const listings = await db.listing.findMany({
    where,
    include: {
      game: true,
      seller: true,
      ratings: true,
    },
    orderBy,
  });

  return NextResponse.json({ listings });
}
