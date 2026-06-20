import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, errorResponse, createOrderSchema } from "@/lib/validation";

// GET /api/orders?buyerId=...    or  ?sellerId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buyerId = searchParams.get("buyerId");
  const sellerId = searchParams.get("sellerId");

  if (!buyerId && !sellerId) {
    return NextResponse.json({ error: "buyerId or sellerId required" }, { status: 400 });
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

  // Auto-validate any orders past their autoValidateAt that are PAID or DELIVERED
  const now = new Date();
  for (const o of orders) {
    if (
      o.autoValidateAt &&
      o.autoValidateAt < now &&
      (o.status === "PAID" || o.status === "DELIVERED")
    ) {
      // Credit seller with their NET amount (excl. commission). Commission is kept by the platform.
      const netAmount = o.sellerNetAmount;
      await db.$transaction([
        db.order.update({
          where: { id: o.id },
          data: { status: "VALIDATED", validatedAt: now },
        }),
        db.user.update({
          where: { id: o.sellerId },
          data: { balance: { increment: netAmount } },
        }),
        db.message.create({
          data: {
            orderId: o.id,
            senderId: o.sellerId,
            content: `⏰ Validation automatique : ${netAmount} FCFA (montant net) ont été transférés sur mon solde Wave. Merci pour ta commande !`,
            isAuto: true,
          },
        }),
      ]);
    }
  }

  // Refetch after potential auto-validations
  const finalOrders = await db.order.findMany({
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

  return NextResponse.json({ orders: finalOrders });
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
