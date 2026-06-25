import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

const GAME_ID = "cmqrgl3ax001old04lrmnrori"; // Grow a Garden 2

// Convert USD to FCFA: 1 USD = 1000 FCFA, + 1000F site margin, rounded to nearest 100
function usdToFcfa(usd: number): number {
  return Math.round((usd * 1000 + 1000) / 100) * 100;
}

// [title, priceUSD] — only items > $2 USD, no seller names
const items: [string, number][] = [
  // Existing items (already seeded — will be skipped, kept for reference)
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
  // NEW items > $2 USD (extracted from the broader listing)
  ["Turtle (Pet)", 2.34],
  ["All Sprinklers Set", 2.34],
  ["Super Watering Can (Premium)", 2.34],
  ["Bear (Mythical)", 2.34],
  ["Unicorn (Premium Mail)", 7.02],
  ["Deer Pet", 2.34],
  ["Legendary Sprinkler", 2.34],
  ["Bench Crate (60k)", 2.34],
  ["Ladder Crate (30k)", 2.34],
  ["Robin Legendary Pet", 2.34],
  ["Owl Pet", 2.34],
  ["Frog Pet (Premium)", 2.34],
  ["Deer Pet (50k)", 2.34],
  ["Bamboo Seed (Premium Trade)", 2.34],
  ["Carrot Seeds (Bulk)", 2.34],
  ["Mushroom Seeds (Premium)", 2.34],
  ["1 Million Shekels (Bulk)", 4.68],
  ["Super Sprinkler Set", 2.34],
  ["Super Watering Can (Mythic)", 2.34],
  ["Bear (Mail Delivery)", 2.34],
  ["Venus Fly Trap Seed", 2.34],
  ["Venom Spitter Seed (Bulk)", 2.34],
  ["Poison Apple Seed (Bulk)", 2.34],
  ["Dragonfly (Premium)", 2.34],
  ["Raccoon (Premium Mail)", 14.01],
  ["Unicorn (Trade Fast)", 7.02],
  ["Bee Legendary Pet (Premium)", 2.34],
  ["Deer (Trade)", 2.34],
  ["Big Frog", 2.04],
  ["150k Shekels Account", 4.68],
  ["500k Shekels Account", 4.68],
  ["Bee Legendary Pet", 1.86],
  ["Mango Seed", 1.86],
  ["Garden Upgrade 500k Coins", 2.34],
  ["Garden Upgrade 100k Coins", 2.34],
  ["Venom Splitter Seed (Premium)", 2.34],
  ["Moon Bloom Seed (Premium)", 3.45],
  ["Sunflower Seed (Premium)", 2.34],
  ["Turtle (Fast Trade)", 2.34],
  ["Super Watering Can (1M Fast)", 2.34],
  ["Bear Mythical (Fast)", 2.34],
  ["Unicorn Fast Cheap Reliable", 7.02],
  ["Bee Pet (Protection)", 2.34],
  ["Deer (Bulk)", 2.34],
  ["Legendary Sprinkler (Premium)", 2.34],
  ["100 Bamboo Seeds (Profitable)", 2.34],
  ["Bamboo Seed Instant Delivery", 2.34],
  ["Robin (Parrot) Fast Mail", 2.34],
  ["Pomegranate Seed", 2.04],
  ["Huge Teleport Pad", 2.04],
  ["Teleport Pad", 2.04],
  ["Sunflower Seed", 2.04],
  ["Poison Apple", 2.04],
  ["Venus Fly Trap Seed (Premium)", 2.04],
  ["Bear (Bulk)", 2.34],
  ["Super Watering Can (Bulk)", 2.34],
  ["Super Sprinkler (Bulk)", 2.34],
  ["Venus Fly Trap Seed (Bulk)", 2.34],
  ["Venom Spitter Seed (Trade)", 3.27],
  ["Poison Apple Seed (Trade)", 2.79],
  ["Poison Ivy Seed (Bulk)", 14.01],
  ["Dragon Breath Seed (Bulk)", 5.37],
  ["Moon Bloom Seed (Bulk)", 4.20],
  ["Ghost Pepper Seed (Bulk)", 3.51],
  ["Dragonfly (Bulk)", 2.34],
  ["Raccoon (Bulk)", 14.01],
  ["Unicorn (Bulk)", 2.34],
  ["Moon Bloom Fruit", 1.86],
  ["Ghost Pepper 10+kg Fruit", 1.86],
  ["Unicorn + Bonus Gift", 7.02],
  ["Golden Dragonfly Pet (Premium)", 4.68],
  ["Raccoon (Premium)", 18.69],
  ["Robin (Fast Mail)", 2.34],
  ["Legendary Sprinkler (Fast)", 2.34],
  ["Bee Grow a Garden 2", 2.34],
  ["Bamboo Seed 100 pcs", 2.34],
  ["Bamboo Seed 50 pcs", 2.34],
  ["Moon Bloom Seed (Premium Mail)", 11.70],
  ["Raccoon Grow a Garden 2", 11.19],
  ["Fence Crate", 2.34],
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

    const description = `Item Roblox Grow a Garden 2 : ${title}\n\nLivraison rapide après paiement Wave. Indique ton pseudo Roblox lors de la commande.`;

    await db.listing.create({
      data: {
        sellerId: admin!.id,
        gameId: GAME_ID,
        title,
        description,
        sellerNetPrice: fcfaPrice, // what seller receives (= input price)
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
    samplePrice: `${items[0][0]} = ${usdToFcfa(items[0][1])} FCFA`,
  });
}
