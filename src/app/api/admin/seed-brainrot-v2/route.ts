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
  ["Coco and Mango 569M/s", 1.94, "item"],
  ["Coco and Mango 452M/s", 1.94, "item"],
  ["Fragola La La La 32M/s", 3.25, "item"],
  ["Los Primos 310M/s", 2.20, "item"],
  ["Garama and Madundung 300M/s (Lava)", 5.21, "item"],
  ["Garama and Madundung 200M/s (Candy)", 5.21, "item"],
  ["Popcuru and Fizzuru 170M/s", 2.60, "item"],
  ["Celestial Pegasus 170M/s", 2.60, "item"],
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
