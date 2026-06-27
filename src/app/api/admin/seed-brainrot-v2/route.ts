import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

const GAME_ID = "cmqkfdrgi0005i604gduz9elh"; // Steal a Brainrot

// Convert USD to FCFA: 1 USD = 850 FCFA (user's rate), + 1000F site margin, rounded to 100
function usdToFcfa(usd: number): number {
  return Math.round((usd * 850 + 1000) / 100) * 100;
}

// [title, priceUSD, type] — type is used as sub-category prefix
// "item" = single item (trade), "account" = full account
const items: [string, number, "item" | "account"][] = [
  ["Globa Steppa 27.5M/s", 8.61, "item"],
  ["Yin Yang Lamp", 0.92, "item"],
  ["Galaxy Fragola La La La 227.5M/s", 7.82, "item"],
  ["Gold Nacho Spyder 750M/s", 2.34, "item"],
  ["Rainbow Nuclearo Dinossauro 442.5M/s", 1.96, "item"],
  ["Diamond Caylusaurus 962.5M/s", 2.65, "item"],
  ["La Summer Grande 1.6B/s", 4.31, "item"],
  ["La Summer Grande 1.2B/s", 3.12, "item"],
  ["La Summer Grande 1B/s", 3.12, "item"],
  ["Cursed La Anniversary Grande 1.2B/s", 3.68, "item"],
  ["La Anniversary Grande 1B/s", 3.12, "item"],
  ["La Easter Grande 1.2B/s", 3.12, "item"],
  ["Gold La Easter Grande 1.9B/s", 4.69, "item"],
  ["Divine Ventoliero Pavonero 1B/s", 3.12, "item"],
  ["Ventoliero Pavonero 1.1B/s", 3.12, "item"],
  ["Rainbow La Lucky Grande 1.2B/s", 3.90, "item"],
  ["Gold La Lucky Grande 1.3B/s", 3.53, "item"],
  ["La Lucky Grande 1B/s", 3.12, "item"],
  ["Cerberus 700M/s", 5.16, "item"],
  ["Money Money Reindeer 150M/s", 1.41, "item"],
  ["Los Chillis 1B/s", 6.25, "item"],
  ["Rubrikiko 875M/s", 10.17, "item"],
  ["Phantom Cash or Card 2.1B/s", 6.25, "item"],
  ["Popcuru and Fizzuru 2.9B/s", 10.17, "item"],
  ["Gold Garama and Madundung 62.5M/s", 1.33, "item"],
  ["Cash or Card 400M/s", 1.96, "item"],
  ["Chipso and Queso 412.5M/s", 1.96, "item"],
  ["Rainbow Garama and Madundung 500M/s", 4.69, "item"],
  ["Garama and Madundung 350M/s", 1.88, "item"],
  ["Diamond Garama and Madundung 425M/s", 2.12, "item"],
  ["Abyssaloco 33.3M/s", 1.33, "item"],
  ["Tictac Sahur 37.5M/s", 1.33, "item"],
];

export async function POST(req: NextRequest) {
  const { user: admin, error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const [title, usdPrice, type] of items) {
    const fcfaPrice = usdToFcfa(usdPrice);
    const description = `Item Roblox Steal a Brainrot : ${title}\nType : ${type === "account" ? "Compte" : "Item"}\n\nLivraison rapide après paiement Wave. Indique ton pseudo Roblox lors de la commande.`;

    // Check if listing already exists — if so, UPDATE the price (don't skip)
    const existing = await db.listing.findFirst({
      where: { sellerId: admin!.id, gameId: GAME_ID, title },
      select: { id: true },
    });

    if (existing) {
      // Update price to match the new conversion rate (1$ = 850 FCFA)
      await db.listing.update({
        where: { id: existing.id },
        data: {
          sellerNetPrice: fcfaPrice,
          price: Math.round(fcfaPrice * 1.16),
          description,
        },
      });
      updated++;
      continue;
    }

    // Create new listing
    await db.listing.create({
      data: {
        sellerId: admin!.id,
        gameId: GAME_ID,
        title,
        description,
        sellerNetPrice: fcfaPrice, // what admin receives
        price: Math.round(fcfaPrice * 1.16), // displayed price (+16%)
        stock: 1,
        active: true,
      },
    });
    created++;
  }

  return NextResponse.json({
    ok: true,
    created,
    updated,
    skipped,
    total: created + updated + skipped,
    rate: "1 USD = 850 FCFA",
  });
}
