import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

const GAME_ID = "cmqkfdrgi0005i604gduz9elh"; // Steal a Brainrot

// Convert USD to FCFA: 1 USD = 1000 FCFA, + 1000F site margin, rounded to 100
function usdToFcfa(usd: number): number {
  return Math.round((usd * 1000 + 1000) / 100) * 100;
}

// [title, priceUSD]
const items: [string, number][] = [
  ["Globa Steppa 27.5M/s", 8.61],
  ["Yin Yang Lamp", 0.92],
  ["Galaxy Fragola La La La 227.5M/s", 7.82],
  ["Gold Nacho Spyder 750M/s", 2.34],
  ["Rainbow Nuclearo Dinossauro 442.5M/s", 1.96],
  ["Diamond Caylusaurus 962.5M/s", 2.65],
  ["La Summer Grande 1.6B/s", 4.31],
  ["La Summer Grande 1.2B/s", 3.12],
  ["La Summer Grande 1B/s", 3.12],
  ["Cursed La Anniversary Grande 1.2B/s", 3.68],
  ["La Anniversary Grande 1B/s", 3.12],
  ["La Easter Grande 1.2B/s", 3.12],
  ["Gold La Easter Grande 1.9B/s", 4.69],
  ["Divine Ventoliero Pavonero 1B/s", 3.12],
  ["Ventoliero Pavonero 1.1B/s", 3.12],
  ["Rainbow La Lucky Grande 1.2B/s", 3.90],
  ["Gold La Lucky Grande 1.3B/s", 3.53],
  ["La Lucky Grande 1B/s", 3.12],
  ["Cerberus 700M/s", 5.16],
  ["Money Money Reindeer 150M/s", 1.41],
  ["Los Chillis 1B/s", 6.25],
  ["Rubrikiko 875M/s", 10.17],
  ["Phantom Cash or Card 2.1B/s", 6.25],
  ["Popcuru and Fizzuru 2.9B/s", 10.17],
  ["Gold Garama and Madundung 62.5M/s", 1.33],
  ["Cash or Card 400M/s", 1.96],
  ["Chipso and Queso 412.5M/s", 1.96],
  ["Rainbow Garama and Madundung 500M/s", 4.69],
  ["Garama and Madundung 350M/s", 1.88],
  ["Diamond Garama and Madundung 425M/s", 2.12],
  ["Abyssaloco 33.3M/s", 1.33],
  ["Tictac Sahur 37.5M/s", 1.33],
];

export async function POST(req: NextRequest) {
  const { user: admin, error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  let created = 0;
  let skipped = 0;

  for (const [title, usdPrice] of items) {
    const fcfaPrice = usdToFcfa(usdPrice);

    const existing = await db.listing.findFirst({
      where: { sellerId: admin!.id, gameId: GAME_ID, title },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const description = `Item Roblox Steal a Brainrot : ${title}\n\nLivraison rapide après paiement Wave. Indique ton pseudo Roblox lors de la commande.`;

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
    skipped,
    total: created + skipped,
  });
}
