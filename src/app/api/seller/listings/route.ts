import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, errorResponse, createListingSchema } from "@/lib/validation";
import { sanitizePlainText } from "@/lib/sanitize";

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
    const body = await req.json().catch(() => null);
    const [data, error] = parseBody(createListingSchema, body);
    if (error) return errorResponse(error);
    const { userId, gameId, sellerNetPrice } = data!;
    const title = sanitizePlainText(data!.title);
    const description = sanitizePlainText(data!.description);

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ANTI-FRAUD: banned users cannot create listings
    if (user.isBanned) {
      return NextResponse.json(
        { error: `Ton compte est banni. Contacte le support.`, banned: true },
        { status: 403 }
      );
    }

    if (!user.isSeller) {
      return NextResponse.json(
        { error: "Deviens vendeur d'abord" },
        { status: 400 }
      );
    }

    // ANTI-FRAUD: limit listings per seller (prevent spam)
    const listingCount = await db.listing.count({
      where: { sellerId: userId },
    });
    if (listingCount >= 50) {
      return NextResponse.json(
        { error: "Tu as atteint la limite de 50 annonces. Supprime-en pour en créer de nouvelles." },
        { status: 429 }
      );
    }

    // ANTI-SPAM: limit new listings per seller to 10 per rolling 24h window.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentListingCount = await db.listing.count({
      where: { sellerId: userId, createdAt: { gt: oneDayAgo } },
    });
    if (recentListingCount >= 50) {
      return NextResponse.json(
        { error: "Tu as créé 10 annonces aujourd'hui. Reviens demain." },
        { status: 429 }
      );
    }

    // Seller enters the displayed price (what buyer pays).
    // We apply 16% commission: seller receives 84% of the displayed price.
    const buyerPrice = sellerNetPrice; // displayed price = what buyer pays
    const sellerNet = Math.round(sellerNetPrice * 0.84); // seller receives 84%
    const commission = buyerPrice - sellerNet;

    // Extract stock (default 1, min 0, max 9999)
    const rawStock = (body as Record<string, unknown>)?.stock;
    let stock = 1;
    if (typeof rawStock === "number" && Number.isFinite(rawStock)) {
      stock = Math.max(0, Math.min(9999, Math.floor(rawStock)));
    } else if (typeof rawStock === "string" && rawStock.trim() !== "") {
      const parsed = Number(rawStock);
      if (Number.isFinite(parsed)) {
        stock = Math.max(0, Math.min(9999, Math.floor(parsed)));
      }
    }

    // Extract images (JSON string of base64 data URLs array)
    const rawImages = (body as Record<string, unknown>)?.images;
    let imagesJson: string | null = null;
    if (typeof rawImages === "string" && rawImages.length > 0) {
      // Validate it's a valid JSON array of strings, max 4 items
      try {
        const parsed = JSON.parse(rawImages);
        if (Array.isArray(parsed) && parsed.length <= 1) {
          // Each item must be a data URL (starts with "data:image/")
          const valid = parsed.filter(
            (item) => typeof item === "string" && item.startsWith("data:image/")
          );
          if (valid.length > 0) {
            imagesJson = JSON.stringify(valid.slice(0, 1));
          }
        }
      } catch {
        // Invalid JSON — ignore images
      }
    }

    const listing = await db.listing.create({
      data: {
        sellerId: userId,
        gameId,
        title,
        description,
        sellerNetPrice: sellerNet, // 84% of displayed price (16% commission)
        price: buyerPrice,
        images: imagesJson,
        stock,
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
