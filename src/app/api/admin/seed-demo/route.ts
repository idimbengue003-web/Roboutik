import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/seed-demo
 *
 * One-shot endpoint that creates demo sales + 12 ratings on the admin's
 * listings so the seller profile looks active at launch.
 *
 * Creates:
 *  - N validated orders (one per listing, max 12)
 *  - 12 ratings spread across the admin's listings (4-5 stars, varied comments)
 *
 * Admin-only.
 */
export async function POST(req: NextRequest) {
  const { user: admin, error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  // 1. Find all active listings owned by the admin
  const listings = await db.listing.findMany({
    where: { sellerId: admin!.id, active: true },
    take: 12,
    orderBy: { createdAt: "desc" },
  });

  if (listings.length === 0) {
    return NextResponse.json(
      { error: "Tu n'as aucune annonce active. Crée d'abord des annonces." },
      { status: 400 }
    );
  }

  // 2. Find or create a few demo buyer users
  const demoBuyerNames = [
    "Acheteur01", "Acheteuse02", "GamerPro03", "RobloxFan04",
    "PlayerOne05", "KidGamer06", "Senegalais07", "Acheteur08",
    "Visiteur09", "BuyerX10", "AcheteurVIP11", "Dofan12",
  ];
  const buyers = [];
  for (const name of demoBuyerNames) {
    const email = `${name.toLowerCase()}@demo.local`;
    let u = await db.user.findUnique({ where: { email } });
    if (!u) {
      u = await db.user.create({
        data: {
          email,
          username: name,
          avatar: "🎮",
          isSeller: false,
          isAdmin: false,
          balance: 0,
        },
      });
    }
    buyers.push(u);
  }

  // 3. Comments pool for ratings
  const commentPool = [
    "Super service, livraison rapide !",
    "Vendeur sérieux, je recommande.",
    "Tout est arrivé comme prévu, merci !",
    "Très bon contact, paiement Wave nickel.",
    "Je reviendrai acheter ici, top !",
    "Vendeur patient et pro.",
    "Item reçu en quelques minutes seulement.",
    "Communication parfaite.",
    "Premier achat et tout s'est bien passé.",
    "Je recommande à 100%.",
    "Rapide, fiable, que demander de plus ?",
    "Expérience d'achat vraiment simple.",
  ];

  // 4. Create validated orders + ratings
  let ordersCreated = 0;
  let ratingsCreated = 0;
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const buyer = buyers[i % buyers.length];

    // Skip if a validated order already exists for this listing+buyer combo
    const existing = await db.order.findFirst({
      where: { listingId: listing.id, buyerId: buyer.id, status: "VALIDATED" },
    });
    if (existing) continue;

    const amount = listing.price;
    const sellerNetAmount = listing.sellerNetPrice;
    const createdAt = new Date(now.getTime() - (i + 1) * oneDayMs * 2);
    const validatedAt = new Date(createdAt.getTime() + oneDayMs);

    const order = await db.order.create({
      data: {
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: admin!.id,
        amount,
        sellerNetAmount,
        status: "VALIDATED",
        paidAt: new Date(createdAt.getTime() + 1000 * 60 * 5),
        deliveredAt: new Date(createdAt.getTime() + 1000 * 60 * 30),
        validatedAt,
        createdAt,
        updatedAt: validatedAt,
        autoValidateAt: validatedAt,
      },
    });

    // Credit seller balance
    await db.user.update({
      where: { id: admin!.id },
      data: { balance: { increment: sellerNetAmount } },
    });

    // Create a rating for this order
    const stars = 4 + (i % 2); // 4 or 5 stars
    const comment = commentPool[i % commentPool.length];
    await db.rating.create({
      data: {
        orderId: order.id,
        listingId: listing.id,
        fromUserId: buyer.id,
        toUserId: admin!.id,
        stars,
        comment,
        createdAt: new Date(validatedAt.getTime() + 1000 * 60 * 60),
      },
    });

    ordersCreated++;
    ratingsCreated++;
  }

  // 5. If we have fewer than 12 ratings, add more ratings on the first listing
  // until we hit 12 total ratings owned by demo buyers
  const existingRatings = await db.rating.count({
    where: { toUserId: admin!.id },
  });
  let extraRatings = 0;
  if (existingRatings < 12) {
    const needed = 12 - existingRatings;
    for (let i = 0; i < needed; i++) {
      const listing = listings[i % listings.length];
      const buyer = buyers[(i + 3) % buyers.length];
      const stars = 4 + (i % 2);
      const comment = commentPool[(i + 5) % commentPool.length];
      // Need a unique orderId — create a hidden "validated" order to satisfy FK
      const fakeCreatedAt = new Date(now.getTime() - (i + 30) * oneDayMs);
      const fakeValidatedAt = new Date(fakeCreatedAt.getTime() + oneDayMs);
      const fakeOrder = await db.order.create({
        data: {
          listingId: listing.id,
          buyerId: buyer.id,
          sellerId: admin!.id,
          amount: listing.price,
          sellerNetAmount: listing.sellerNetPrice,
          status: "VALIDATED",
          paidAt: new Date(fakeCreatedAt.getTime() + 1000 * 60 * 5),
          deliveredAt: new Date(fakeCreatedAt.getTime() + 1000 * 60 * 30),
          validatedAt: fakeValidatedAt,
          createdAt: fakeCreatedAt,
          updatedAt: fakeValidatedAt,
          autoValidateAt: fakeValidatedAt,
        },
      });
      await db.rating.create({
        data: {
          orderId: fakeOrder.id,
          listingId: listing.id,
          fromUserId: buyer.id,
          toUserId: admin!.id,
          stars,
          comment,
          createdAt: new Date(fakeValidatedAt.getTime() + 1000 * 60 * 60),
        },
      });
      extraRatings++;
    }
  }

  return NextResponse.json({
    ok: true,
    ordersCreated,
    ratingsCreated,
    extraRatingsAdded: extraRatings,
    totalRatingsNow: existingRatings + extraRatings,
  });
}
