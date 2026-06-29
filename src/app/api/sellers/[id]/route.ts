import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/sellers/[id]
 *
 * Public endpoint: returns the seller's public profile.
 * Includes:
 *   - user info (id, username, avatar, isVerified, isSeller, createdAt)
 *   - total sales count (validated orders)
 *   - average rating across all their listings
 *   - total ratings count
 *   - all active listings with their ratings
 *   - latest 20 reviews (rating + comment + reviewer username + listing title)
 *
 * No balance, no email, no admin info exposed.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const seller = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      avatar: true,
      isVerified: true,
      isSeller: true,
      isBanned: true,
      createdAt: true,
      lastActiveAt: true,
    },
  });

  if (!seller || seller.isBanned) {
    return NextResponse.json(
      { error: "Vendeur introuvable" },
      { status: 404 }
    );
  }

  // Get validated orders count + total gross
  const validatedOrders = await db.order.findMany({
    where: { sellerId: id, status: "VALIDATED" },
    select: {
      id: true,
      amount: true,
      sellerNetAmount: true,
      validatedAt: true,
      listingId: true,
      rating: {
        select: {
          stars: true,
          comment: true,
          createdAt: true,
          fromUser: { select: { username: true, avatar: true } },
        },
      },
      listing: { select: { title: true, game: { select: { name: true } } } },
      buyer: { select: { username: true, avatar: true } },
    },
    orderBy: { validatedAt: "desc" },
    take: 50,
  });

  const totalSales = validatedOrders.length;
  const totalGross = validatedOrders.reduce((s, o) => s + o.amount, 0);

  // Get all ratings for this seller (across all their listings)
  const allRatings = await db.rating.findMany({
    where: { toUserId: id },
    select: {
      id: true,
      stars: true,
      comment: true,
      createdAt: true,
      fromUser: { select: { username: true, avatar: true } },
      listing: { select: { title: true, game: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalRatings = allRatings.length;
  const avgRating =
    totalRatings > 0
      ? allRatings.reduce((s, r) => s + r.stars, 0) / totalRatings
      : 0;

  // Get active listings with their ratings
  const listings = await db.listing.findMany({
    where: { sellerId: id, active: true },
    include: {
      game: true,
      ratings: { select: { stars: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Determine online status: active within last 2 minutes = online
  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
  const isOnline = seller.lastActiveAt
    ? new Date(seller.lastActiveAt) > twoMinutesAgo
    : false;

  // Format last seen for display
  let lastSeen: string | null = null;
  if (seller.lastActiveAt) {
    const diff = now.getTime() - new Date(seller.lastActiveAt).getTime();
    if (diff < 2 * 60 * 1000) lastSeen = "En ligne";
    else if (diff < 60 * 60 * 1000) lastSeen = `Vu il y a ${Math.floor(diff / 60000)} min`;
    else if (diff < 24 * 60 * 60 * 1000) lastSeen = `Vu il y a ${Math.floor(diff / 3600000)} h`;
    else lastSeen = `Vu ${new Date(seller.lastActiveAt).toLocaleDateString("fr-FR")}`;
  }

  return NextResponse.json({
    seller: { ...seller, isOnline, lastSeen },
    stats: {
      totalSales,
      totalGross,
      totalRatings,
      avgRating: Math.round(avgRating * 10) / 10,
      totalListings: listings.length,
    },
    listings: listings.map((l) => ({
      ...l,
      _count: { ratings: l.ratings.length },
    })),
    reviews: allRatings,
    recentSales: validatedOrders.slice(0, 10),
  });
}
