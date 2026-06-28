import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

const GAME_IDS = {
  brainrot: "cmqkfdrgi0005i604gduz9elh",
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

// Listings to create for sellers with 0 listings
const SELLER_LISTINGS: Record<string, { gameId: string; items: [string, number][] }> = {
  "vendeurlegit@robloxboutik.sn": {
    gameId: GAME_IDS.jailbreak,
    items: [
      ["Jailbreak - Voiture de police", 2500],
      ["Jailbreak - Hélicoptère", 5000],
      ["Jailbreak - Compte niveau 50", 15000],
      ["Jailbreak - Bank Heist Pack", 8000],
      ["Jailbreak - Bugatti", 12000],
      ["Blade Ball - Épée légendaire", 3000],
      ["Blade Ball - Skins rares", 4500],
      ["Blade Ball - Compte complet", 20000],
      ["Arsenal - Skin AK-47", 1800],
      ["Arsenal - Pack armes complètes", 6000],
      ["Arsenal - Compte niveau 100", 10000],
    ],
  },
  "hibouthebest@robloxboutik.sn": {
    gameId: GAME_IDS.beeSwarm,
    items: [
      ["Bee Swarm - Royal Jelly x10", 2000],
      ["Bee Swarm - Event Bees Pack", 5000],
      ["Bee Swarm - Honey Pack 1M", 3500],
      ["Bee Swarm - Mythic Bee", 8000],
      ["Bee Swarm - Compte complet", 25000],
      ["Murder Mystery 2 - Godly Knife", 4500],
      ["Murder Mystery 2 - Vintage Knife", 7000],
      ["Murder Mystery 2 - Pack 5 knives", 6000],
      ["Murder Mystery 2 - Compte rare", 18000],
      ["Anime Defenders - Unité légendaire", 3500],
      ["Anime Defenders - Pack diamants", 4000],
      ["Anime Defenders - Compte complet", 15000],
    ],
  },
};

export async function POST(req: NextRequest) {
  const { user: admin, error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const results: string[] = [];

  for (const [email, config] of Object.entries(SELLER_LISTINGS)) {
    const seller = await db.user.findUnique({ where: { email } });
    if (!seller) {
      results.push(`Seller ${email} not found, skipping`);
      continue;
    }

    // Check current listing count
    const currentCount = await db.listing.count({
      where: { sellerId: seller.id },
    });

    let created = 0;
    for (const [title, price] of config.items) {
      // Skip if a listing with the same title already exists for this seller
      const existing = await db.listing.findFirst({
        where: { sellerId: seller.id, title },
        select: { id: true },
      });
      if (existing) continue;

      const description = `Item Roblox : ${title}\n\nLivraison rapide après paiement Wave. Indique ton pseudo Roblox lors de la commande.`;
      const sellerNet = price; // what seller receives
      const buyerPrice = Math.round(price * 1.16); // displayed price (+16%)

      await db.listing.create({
        data: {
          sellerId: seller.id,
          gameId: config.gameId,
          title,
          description,
          sellerNetPrice: sellerNet,
          price: buyerPrice,
          stock: 1,
          active: true,
        },
      });
      created++;
    }

    results.push(
      `${seller.username}: ${created} new listings created (had ${currentCount})`
    );
  }

  return NextResponse.json({ ok: true, results });
}
