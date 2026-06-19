import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/orders?buyerId=...   - buyer's orders
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buyerId = searchParams.get("buyerId");

  if (!buyerId) {
    return NextResponse.json({ error: "buyerId required" }, { status: 400 });
  }

  const orders = await db.order.findMany({
    where: { buyerId },
    include: {
      listing: { include: { game: true } },
      seller: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

// POST /api/orders  - create a new order from a listing
// body: { listingId }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { listingId } = body as { listingId?: string };

    if (!listingId) {
      return NextResponse.json({ error: "listingId required" }, { status: 400 });
    }

    const listing = await db.listing.findUnique({
      where: { id: listingId },
      include: { game: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const buyer = await db.user.findUnique({ where: { username: "Moi" } });
    if (!buyer) {
      return NextResponse.json({ error: "Run /api/init first" }, { status: 400 });
    }

    // Prevent ordering own listing
    if (listing.sellerId === buyer.id) {
      return NextResponse.json({ error: "Tu ne peux pas acheter ton propre annonce" }, { status: 400 });
    }

    // Check if there's already a PENDING_PAYMENT order for this listing by this buyer
    const existing = await db.order.findFirst({
      where: {
        listingId,
        buyerId: buyer.id,
        status: "PENDING_PAYMENT",
      },
    });

    if (existing) {
      return NextResponse.json({ order: existing, alreadyExists: true });
    }

    const order = await db.order.create({
      data: {
        listingId,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        amount: listing.price,
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
