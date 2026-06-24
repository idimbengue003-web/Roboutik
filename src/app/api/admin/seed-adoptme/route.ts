import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

const GAME_ID = "cmqkfdrhc0008i604j1hwy72w"; // Adopt Me!

// [title, priceFcfa, rarity]
const listings: [string, number, string][] = [
  ["Dragonfruit Fox", 25000, "Common"],
  ["Frost Dragon", 95000, "FR"],
  ["Old King Coal", 3500, "Common"],
  ["Cupid Dragon", 8000, "FR"],
  ["Arctic Dusk Dragon", 7000, "Common"],
  ["Evil Unicorn", 60000, "FR"],
  ["Lava Dragon", 6000, "Common"],
  ["Giant Panda", 60000, "Common"],
  ["Crow", 70000, "FR"],
  ["Frost Fury", 6000, "FR"],
  ["Turtle", 20000, "FR"],
  ["Pink Cat", 8000, "Common"],
  ["Strawberry Shortcake Bat Dragon", 22000, "FR"],
  ["Fairy Bat Dragon", 10000, "FR"],
  ["Cryptid", 26000, "FR"],
  ["Golden Dragon", 5000, "FR"],
  ["Elephant", 12000, "Common"],
  ["Kaijunior", 7000, "NFR"],
  ["Icy Porcupine", 19000, "NFR"],
  ["Water Opossum", 14000, "NFR"],
  ["Arctic Reindeer", 20000, "M"],
  ["Parrot", 78000, "M"],
  ["Balloon Unicorn", 80000, "M"],
  ["Tortoiseshell Guinea Pig", 32000, "M"],
  ["Owl", 85000, "M"],
  ["Rain Cloud Hat", 20000, "M"],
  ["Unicorn Backpack", 10000, "M"],
  ["Peppermint Penguin", 6000, "M"],
  ["Lion", 8000, "M"],
  ["Strawberry Shortcake Bat Dragon Backpack", 8000, "M"],
  ["Chocolate Chip Bat Dragon", 12000, "M"],
  ["Mermicorn", 95000, "M"],
  ["Dalmatian", 40000, "M"],
  ["Unicorn Horn", 25000, "M"],
  ["Egg Stroller", 60000, "M"],
  ["Rainbow Maker", 65000, "M"],
  ["Shadow Dragon", 140000, "M"],
  ["Giraffe", 120000, "M"],
  ["Candy Cannon", 95000, "M"],
  ["Bat Dragon", 245000, "M"],
];

export async function POST(req: NextRequest) {
  const { user: admin, error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  let created = 0;
  let skipped = 0;

  for (const [title, price, rarity] of listings) {
    const existing = await db.listing.findFirst({
      where: { sellerId: admin!.id, gameId: GAME_ID, title },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const description = `Item Roblox Adopt Me : ${title}\nRareté : ${rarity}\n\nLivraison rapide après paiement Wave. Indique ton pseudo Roblox lors de la commande.`;

    await db.listing.create({
      data: {
        sellerId: admin!.id,
        gameId: GAME_ID,
        title,
        description,
        sellerNetPrice: Math.round(price * 0.8), // 80% of buyer price (20% commission)
        price: price,
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
