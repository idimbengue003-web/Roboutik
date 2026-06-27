import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, errorResponse, createOrderSchema } from "@/lib/validation";
import { isFictionalSeller } from "@/lib/fictional-sellers";

// GET /api/orders?buyerId=...    or  ?sellerId=...    or  ?userId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buyerId = searchParams.get("buyerId");
  const sellerId = searchParams.get("sellerId");
  const userId = searchParams.get("userId");

  // If userId is provided, return orders where the user is either buyer OR seller.
  // If the user is an admin, also include orders where the seller is a fictional seller
  // (so the admin can see and handle all orders placed on fictional accounts' listings).
  if (userId && !buyerId && !sellerId) {
    // Check if the user is an admin and should see fictional sellers' orders
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, isAdmin: true },
    });

    let whereClause: { OR: Array<{ buyerId?: string; sellerId?: string }> } = {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    };

    if (user?.isAdmin) {
      // Find all fictional seller IDs
      const fictionalSellers = await db.user.findMany({
        where: {
          email: { endsWith: "@robloxboutik.sn" },
          isSeller: true,
        },
        select: { id: true },
      });
      const fictionalSellerIds = fictionalSellers.map((s) => s.id);
      whereClause = {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
          ...(fictionalSellerIds.length > 0
            ? [{ sellerId: { in: fictionalSellerIds } } as any]
            : []),
        ],
      };
    }

    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        listing: { include: { game: true, ratings: true } },
        seller: true,
        buyer: true,
        messages: { orderBy: { createdAt: "asc" } },
        rating: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  }

  if (!buyerId && !sellerId) {
    return NextResponse.json({ error: "buyerId, sellerId or userId required" }, { status: 400 });
  }

  const where = buyerId ? { buyerId } : { sellerId };

  const orders = await db.order.findMany({
    where,
    include: {
      listing: { include: { game: true, ratings: true } },
      seller: true,
      buyer: true,
      messages: { orderBy: { createdAt: "asc" } },
      rating: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // No auto-validation anymore — buyer must manually validate to release payment.
  // This prevents scams where sellers deliver nothing and wait for the 24h auto-validation.
  return NextResponse.json({ orders });
}

// POST /api/orders  - create a new order from a listing
// body: { listingId, buyerId }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const [data, error] = parseBody(createOrderSchema, body);
    if (error) return errorResponse(error);
    const { listingId, buyerId } = data!;

    const buyer = await db.user.findUnique({ where: { id: buyerId } });
    if (!buyer) {
      return NextResponse.json({ error: "Connecte-toi avec Google d'abord" }, { status: 400 });
    }

    // ANTI-FRAUD: banned users cannot buy
    if (buyer.isBanned) {
      return NextResponse.json(
        {
          error: `Ton compte est banni${buyer.banReason ? ` : ${buyer.banReason}` : ""}. Contacte le support.`,
          banned: true,
        },
        { status: 403 }
      );
    }

    const listing = await db.listing.findUnique({
      where: { id: listingId },
      include: { game: true, seller: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // ANTI-FRAUD: cannot buy inactive listing
    if (!listing.active) {
      return NextResponse.json(
        { error: "Cette annonce n'est plus disponible" },
        { status: 400 }
      );
    }

    // ANTI-FRAUD: cannot buy own listing
    if (listing.sellerId === buyer.id) {
      return NextResponse.json(
        { error: "Tu ne peux pas acheter ton propre annonce" },
        { status: 400 }
      );
    }

    // ANTI-FRAUD: cannot buy from a banned seller
    if (listing.seller?.isBanned) {
      return NextResponse.json(
        { error: "Ce vendeur n'est plus disponible" },
        { status: 400 }
      );
    }

    // ANTI-FRAUD: price sanity check
    if (listing.price < 100 || listing.price > 1_000_000) {
      return NextResponse.json(
        { error: "Prix invalide sur cette annonce" },
        { status: 400 }
      );
    }

    // ANTI-FRAUD: prevent multiple pending orders for the same listing by the same buyer
    const existing = await db.order.findFirst({
      where: { listingId, buyerId: buyer.id, status: "PENDING_PAYMENT" },
    });

    if (existing) {
      return NextResponse.json({ order: existing, alreadyExists: true });
    }

    // ANTI-FRAUD: limit to 5 active orders per buyer (prevent spam)
    const activeOrdersCount = await db.order.count({
      where: {
        buyerId: buyer.id,
        status: { in: ["PENDING_PAYMENT", "PAID", "DELIVERED"] },
      },
    });
    if (activeOrdersCount >= 10) {
      return NextResponse.json(
        { error: "Trop de commandes en cours. Termine-en quelques-unes d'abord." },
        { status: 429 }
      );
    }

    const order = await db.order.create({
      data: {
        listingId,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        amount: listing.price, // total paid by buyer (incl. commission)
        sellerNetAmount: listing.sellerNetPrice, // net amount seller will receive (snapshot)
        status: "PENDING_PAYMENT",
      },
      include: {
        listing: { include: { game: true } },
        seller: true,
      },
    });

    return NextResponse.json({ order });
  } catch (e) {
    console.error("Create order error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
