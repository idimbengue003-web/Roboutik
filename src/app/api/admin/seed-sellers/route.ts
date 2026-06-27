import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/seed-sellers?adminId=...
 *
 * Creates 7 fictional seller accounts with Senegalese-credible usernames,
 * distributes existing listings among them based on game category, and
 * seeds a few demo sales + reviews so they look active.
 *
 * Each seller has:
 * - A Senegalese-style username + emoji avatar
 * - isSeller = true, isVerified = true (green badge)
 * - A specialty (one or two games)
 * - 5-15 demo validated sales with ratings
 *
 * The admin (caller) keeps their own listings (premium items).
 *
 * Idempotent: if a seller with the same email already exists, reuses them.
 */

type SellerSpec = {
  email: string;
  username: string;
  avatar: string;
  // Game IDs this seller specializes in. Listings in these games go to them.
  gameIds: string[];
  // Number of demo sales + ratings to seed
  demoSalesCount: number;
};

const GAME_IDS = {
  brainrot: "cmqkfdrgi0005i604gduz9elh", // Steal a Brainrot
  bloxFruits: "cmqkfdrgu0006i604tyyytgnl",
  brookhaven: "cmqkfdrh00007i604tgz5p3si",
  adoptMe: "cmqkfdrhc0008i604j1hwy72w",
  towerDefense: "cmqkfdrhj0009i604g1ukhq7k",
  garden2: "cmqrgl3ax001old04lrmnrori",
  petSim: "cmqkfdrhp000ai604h3381mky",
  growGarden: "cmqpeog320007le04vg0pt9cj",
  doors: "cmqpeog3i0008le04ol3fqdou",
  beeSwarm: "cmqpeog3v0009le045s9m4d6q",
  murder: "cmqpeog47000ale04nfp5mal2",
  anime: "cmqpeog4i000ble04mqbw3plt",
  jailbreak: "cmqpeog4x000cle04o6hpa217",
  bladeBall: "cmqpeog5d000dle04q36pfeop",
  arsenal: "cmqpeog5o000ele04ppo0b4bs",
  ragdoll: "cmqpeog60000fle04esftrbcr",
};

const SELLERS: SellerSpec[] = [
  {
    email: "sengameshop@robloxboutik.sn",
    username: "SenGameShop",
    avatar: "🎮",
    gameIds: [GAME_IDS.brookhaven, GAME_IDS.bloxFruits],
    demoSalesCount: 8,
  },
  {
    email: "robloxdakar@robloxboutik.sn",
    username: "RobloxDakar",
    avatar: "🛒",
    gameIds: [GAME_IDS.adoptMe, GAME_IDS.growGarden],
    demoSalesCount: 12,
  },
  {
    email: "gaming221@robloxboutik.sn",
    username: "Gaming221",
    avatar: "💎",
    gameIds: [GAME_IDS.towerDefense, GAME_IDS.doors],
    demoSalesCount: 15,
  },
  {
    email: "pixelstore@robloxboutik.sn",
    username: "PixelStore",
    avatar: "🚀",
    gameIds: [GAME_IDS.garden2, GAME_IDS.petSim],
    demoSalesCount: 6,
  },
  {
    email: "fastitemssn@robloxboutik.sn",
    username: "FastItemsSN",
    avatar: "⚡",
    gameIds: [GAME_IDS.beeSwarm, GAME_IDS.murder, GAME_IDS.anime],
    demoSalesCount: 5,
  },
  {
    email: "dakargaming@robloxboutik.sn",
    username: "DakarGaming",
    avatar: "🦁",
    gameIds: [GAME_IDS.jailbreak, GAME_IDS.bladeBall, GAME_IDS.arsenal],
    demoSalesCount: 4,
  },
  {
    email: "brainrotking@robloxboutik.sn",
    username: "BrainrotKing",
    avatar: "👑",
    gameIds: [GAME_IDS.brainrot, GAME_IDS.ragdoll],
    demoSalesCount: 20,
  },
];

// Demo buyer pool for seeding sales
const DEMO_BUYERS = [
  "acheteur01@demo.local", "acheteuse02@demo.local", "gamerpro03@demo.local",
  "robloxfan04@demo.local", "playerone05@demo.local", "kidgamer06@demo.local",
  "senegalais07@demo.local", "acheteur08@demo.local", "visiteur09@demo.local",
  "buyerx10@demo.local", "acheteurvip11@demo.local", "dofan12@demo.local",
];

const COMMENT_POOL = [
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
  "Vendeur de confiance, item conforme.",
  "Paiement sécurisé, livraison immédiate.",
  "Top vendeur, à recommander vivement.",
];

function usdToFcfa(usd: number): number {
  return Math.round((usd * 1000 + 1000) / 100) * 100;
}

export async function POST(req: NextRequest) {
  const { user: admin, error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const results: string[] = [];

  // 1. Create (or reuse) the 7 sellers
  const sellers = [];
  for (const spec of SELLERS) {
    let seller = await db.user.findUnique({ where: { email: spec.email } });
    if (!seller) {
      seller = await db.user.create({
        data: {
          email: spec.email,
          username: spec.username,
          avatar: spec.avatar,
          isSeller: true,
          isAdmin: false,
          isVerified: true, // green badge
          balance: 0,
        },
      });
      results.push(`Created seller: ${spec.username}`);
    } else {
      // Ensure isSeller + isVerified
      if (!seller.isSeller || !seller.isVerified) {
        seller = await db.user.update({
          where: { id: seller.id },
          data: { isSeller: true, isVerified: true },
        });
      }
      results.push(`Reused seller: ${spec.username}`);
    }
    sellers.push({ spec, user: seller });
  }

  // 2. Reassign listings: each listing is moved to the seller who specializes
  // in its game. Listings whose game doesn't match any seller stay with admin.
  let reassigned = 0;
  let keptByAdmin = 0;
  for (const { spec, user } of sellers) {
    for (const gameId of spec.gameIds) {
      const result = await db.listing.updateMany({
        where: { gameId, sellerId: admin!.id },
        data: { sellerId: user.id },
      });
      reassigned += result.count;
    }
  }
  // Count remaining admin listings
  const adminListings = await db.listing.count({
    where: { sellerId: admin!.id },
  });
  keptByAdmin = adminListings;
  results.push(`Reassigned ${reassigned} listings to sellers`);
  results.push(`Admin kept ${keptByAdmin} listings (premium items)`);

  // 3. Seed demo sales + ratings for each seller so they look active
  // Create or reuse demo buyers
  const demoBuyers = [];
  for (const email of DEMO_BUYERS) {
    let b = await db.user.findUnique({ where: { email } });
    if (!b) {
      b = await db.user.create({
        data: {
          email,
          username: email.split("@")[0],
          avatar: "🧒",
          isSeller: false,
          isAdmin: false,
          balance: 0,
        },
      });
    }
    demoBuyers.push(b);
  }

  let totalDemoOrders = 0;
  let totalDemoRatings = 0;
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const { spec, user } of sellers) {
    // Get this seller's listings
    const sellerListings = await db.listing.findMany({
      where: { sellerId: user.id, active: true },
      take: spec.demoSalesCount,
    });

    if (sellerListings.length === 0) continue;

    for (let i = 0; i < Math.min(spec.demoSalesCount, sellerListings.length); i++) {
      const listing = sellerListings[i];
      const buyer = demoBuyers[i % demoBuyers.length];

      // Skip if a validated order already exists for this listing+buyer
      const existing = await db.order.findFirst({
        where: { listingId: listing.id, buyerId: buyer.id, status: "VALIDATED" },
      });
      if (existing) continue;

      const createdAt = new Date(now.getTime() - (i + 1) * oneDayMs * 3);
      const validatedAt = new Date(createdAt.getTime() + oneDayMs);
      const amount = listing.price;
      const sellerNetAmount = listing.sellerNetPrice;

      const order = await db.order.create({
        data: {
          listingId: listing.id,
          buyerId: buyer.id,
          sellerId: user.id,
          amount,
          sellerNetAmount,
          status: "VALIDATED",
          paidAt: new Date(createdAt.getTime() + 1000 * 60 * 5),
          deliveredAt: new Date(createdAt.getTime() + 1000 * 60 * 30),
          validatedAt,
          createdAt,
          updatedAt: validatedAt,
          autoValidateAt: validatedAt, // legacy field, kept for compatibility
        },
      });

      // Credit seller balance
      await db.user.update({
        where: { id: user.id },
        data: { balance: { increment: sellerNetAmount } },
      });

      // Create a rating
      const stars = 4 + (i % 2); // 4 or 5 stars
      const comment = COMMENT_POOL[(i + 3) % COMMENT_POOL.length];
      await db.rating.create({
        data: {
          orderId: order.id,
          listingId: listing.id,
          fromUserId: buyer.id,
          toUserId: user.id,
          stars,
          comment,
          createdAt: new Date(validatedAt.getTime() + 1000 * 60 * 60),
        },
      });

      totalDemoOrders++;
      totalDemoRatings++;
    }
  }

  results.push(`Seeded ${totalDemoOrders} demo validated orders`);
  results.push(`Seeded ${totalDemoRatings} demo ratings`);

  // 4. Final stats
  const totalSellers = await db.user.count({ where: { isSeller: true } });
  const totalListings = await db.listing.count();
  results.push(`Total sellers now: ${totalSellers}`);
  results.push(`Total listings now: ${totalListings}`);

  return NextResponse.json({
    ok: true,
    results,
    summary: {
      sellersCreated: sellers.length,
      listingsReassigned: reassigned,
      listingsKeptByAdmin: keptByAdmin,
      demoOrdersSeeded: totalDemoOrders,
      demoRatingsSeeded: totalDemoRatings,
      totalSellers,
      totalListings,
    },
  });
}
