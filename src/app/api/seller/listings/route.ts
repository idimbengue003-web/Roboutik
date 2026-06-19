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

// POST /api/seller/listings
// body: { userId, gameId, title, description, sellerNetPrice }
// The buyer price (price) is automatically computed = sellerNetPrice * 1.2 (20% commission)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, gameId, title, description, sellerNetPrice } = body as {
      userId?: string;
      gameId?: string;
      title?: string;
      description?: string;
      sellerNetPrice?: number;
    };

    if (!userId || !gameId || !title || !description || !sellerNetPrice) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    if (sellerNetPrice < 100 || sellerNetPrice > 1_000_000) {
      return NextResponse.json(
        { error: "Prix net entre 100 et 1 000 000 FCFA" },
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

    // Compute buyer price: sellerNetPrice + 20% commission
    const buyerPrice = Math.round(sellerNetPrice * 1.2);
    const commission = buyerPrice - sellerNetPrice;

    const listing = await db.listing.create({
      data: {
        sellerId: userId,
        gameId,
        title: title.trim(),
        description: description.trim(),
        sellerNetPrice,
        price: buyerPrice,
        active: true,
      },
      include: { game: true, seller: true },
    });

    return NextResponse.json({ listing, commission, buyerPrice });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
