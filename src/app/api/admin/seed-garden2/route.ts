import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

const GAME_ID = "cmqrgl3ax001old04lrmnrori"; // Grow a Garden 2

// Convert USD to FCFA: 1 USD = 1000 FCFA, + 1000F site margin, rounded to nearest 100
function usdToFcfa(usd: number): number {
  return Math.round((usd * 1000 + 1000) / 100) * 100;
}

// [title, priceUSD] — only items > $1 USD, no seller names
const items: [string, number][] = [
  ["Moon Bloom Seed", 3.90],
  ["1000 Bamboo Seeds", 1.56],
  ["Unicorn", 7.79],
  ["50kk Shekels", 6.76],
  ["30kk+ Shekels", 4.06],
  ["40kk+ Shekels", 5.40],
  ["10kk+ Shekels", 1.69],
  ["20kk+ Shekels", 12.47],
  ["Super Watering Can (1 Million)", 1.35],
  ["Sign Crate (150k)", 1.56],
  ["Light Crate (90k)", 1.17],
  ["400k Sheckles", 1.56],
  ["1 Million Shekels", 1.56],
  ["Bamboo Seed Pack (250 pcs)", 1.69],
  ["Bamboo Seed Pack (500 pcs)", 3.39],
  ["Unicorn (No Dupe)", 3.10],
  ["Big Bee (Legendary)", 2.26],
  ["Dragonfly (No Dupe)", 2.42],
  ["Venom Spitter Seed", 1.22],
  ["Poison Apple Seed", 1.15],
  ["Ghost Pepper Seed", 1.76],
  ["Mushroom Seed (50 pcs)", 1.56],
  ["Bamboo Seed (Premium)", 1.87],
  ["Big Bunny", 1.56],
  ["Moon Bloom Gamepass", 10.51],
  ["Dragon's Breath Gamepass", 11.68],
  ["Power Hose Gamepass", 2.33],
  ["Vine Wrapper Gamepass", 3.89],
  ["Rainbow Carpet Gamepass", 4.67],
  ["Freeze Ray Gamepass", 5.84],
  ["Ghost Pepper Pack (50 Rolls)", 27.26],
  ["Ghost Pepper Pack (10 Rolls)", 6.23],
  ["Ghost Pepper Pack (3 Rolls)", 1.94],
  ["Shekels 10M", 1.40],
  ["Dragon Breath Seed", 2.34],
  ["50M Ghost Pepper", 1.95],
  ["Raccoon", 23.37],
  ["200M Ghost Pepper", 5.84],
  ["33M Ghost Pepper", 1.25],
  ["100M Ghost Pepper", 3.12],
  ["Ice Serpent", 35.06],
  ["Poison Ivy Seed", 4.67],
  ["Golden Dragonfly Pet", 1.56],
  ["Unicorn + Gift", 2.34],
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

    const description = `Item Roblox Grow a Garden 2 : ${title}\nPrix original : ~$${usdPrice.toFixed(2)} USD\n\nLivraison rapide après paiement Wave. Indique ton pseudo Roblox lors de la commande.`;

    await db.listing.create({
      data: {
        sellerId: admin!.id,
        gameId: GAME_ID,
        title,
        description,
        sellerNetPrice: fcfaPrice,
        price: fcfaPrice,
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
    samplePrice: `${items[0][0]} = ${usdToFcfa(items[0][1])} FCFA`,
  });
}
