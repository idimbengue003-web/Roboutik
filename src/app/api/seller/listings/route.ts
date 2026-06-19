import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/seller/listings?userId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  const listings = await db.listing.findMany({
    where: { sellerId: userId },
    include: { game: true, ratings: true, orders: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ listings });
}

// POST /api/seller/listings  body: { userId, gameId, title, description, price }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, gameId, title, description, price } = body as {
      userId?: string;
      gameId?: string;
      title?: string;
      description?: string;
      price?: number;
    };

    if (!userId || !gameId || !title || !description || !price) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    if (price < 100 || price > 1_000_000) {
      return NextResponse.json(
        { error: "Prix entre 100 et 1 000 000 FCFA" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.isSeller) {
      return NextResponse.json(
        { error: "Deviens vendeur d'abord" },
        { status: 400 }
      );
    }

    const listing = await db.listing.create({
      data: {
        sellerId: userId,
        gameId,
        title: title.trim(),
        description: description.trim(),
        price,
        active: true,
      },
      include: { game: true, seller: true },
    });

    return NextResponse.json({ listing });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
