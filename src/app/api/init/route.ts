import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/init
 *
 * Seeds ONLY games + admin account. No demo sellers/listings.
 * Safe to call multiple times (idempotent).
 *
 * The admin email is idimbengue003@gmail.com (the real Google account).
 */
export async function GET() {
  try {
    // 1. Admin account (real Google email)
    await db.user.upsert({
      where: { email: "idimbengue003@gmail.com" },
      update: { isAdmin: true },
      create: {
        email: "idimbengue003@gmail.com",
        username: "Admin",
        avatar: "🛡️",
        isSeller: false,
        isAdmin: true,
        balance: 0,
      },
    });

    // 2. Games (always seeded)
    const games = [
      { name: "Steal a Brainrot", slug: "steal-a-brainrot", image: "/games/steal-brainrot.png", description: "Le jeu culte où tu dérobes les brainrots les plus drôles !", isFavorite: true, sortOrder: 1 },
      { name: "Blox Fruits", slug: "blox-fruits", image: "/games/blox-fruits.png", description: "Deviens le plus grand pirate des mers de Roblox !", isFavorite: true, sortOrder: 2 },
      { name: "Brookhaven RP", slug: "brookhaven-rp", image: "/games/brookhaven.png", description: "Vis ta vie de rêve dans la plus belle ville de Roblox !", isFavorite: true, sortOrder: 3 },
      { name: "Adopt Me!", slug: "adopt-me", image: "/games/adopt-me.png", description: "Adopte des bébés et des animaux trop mignons !", isFavorite: true, sortOrder: 4 },
      { name: "Tower Defense Simulator", slug: "tower-defense", image: "/games/tower-defense.png", description: "Défends ta base contre des vagues de monstres !", isFavorite: true, sortOrder: 5 },
      { name: "Pet Simulator 99", slug: "pet-simulator-99", image: "/games/pet-simulator.png", description: "Collectionne des centaines d'animaux magiques !", isFavorite: true, sortOrder: 6 },
      { name: "Grow a Garden", slug: "grow-a-garden", image: "/games/grow-a-garden.png", description: "Cultive ton jardin et vends tes récoltes !", isFavorite: true, sortOrder: 7 },
      { name: "Doors", slug: "doors", image: "/games/doors.png", description: "Survis dans un hôtel hanté rempli de monstres !", isFavorite: true, sortOrder: 8 },
      { name: "Bee Swarm Simulator", slug: "bee-swarm-simulator", image: "/games/bee-swarm.png", description: "Collecte du pollen avec tes abeilles et deviens le plus riche !", isFavorite: true, sortOrder: 9 },
      { name: "Murder Mystery 2", slug: "murder-mystery-2", image: "/games/murder-mystery-2.png", description: "Innocent, shérif ou meurtrier ? À toi de découvrir !", isFavorite: true, sortOrder: 10 },
      { name: "Anime Defenders", slug: "anime-defenders", image: "/games/anime-defenders.png", description: "Défends ta base avec tes héros anime préférés !", isFavorite: true, sortOrder: 11 },
      { name: "Jailbreak", slug: "jailbreak", image: "/games/jailbreak.png", description: "Évade-toi de prison ou attrape les fugitifs !", isFavorite: true, sortOrder: 12 },
      { name: "Blade Ball", slug: "blade-ball", image: "/games/blade-ball.png", description: "Renvoie la balle à tes adversaires avec ton épée !", isFavorite: true, sortOrder: 13 },
      { name: "Arsenal", slug: "arsenal", image: "/games/arsenal.png", description: "FPS rapide et fun avec plein d'armes différentes !", isFavorite: true, sortOrder: 14 },
      { name: "Ragdoll Universe", slug: "ragdoll-universe", image: "/games/ragdoll-universe.png", description: "S'amuser en mode ragdoll avec tes amis !", isFavorite: true, sortOrder: 15 },
    ];

    const gameRecords = [];
    for (const g of games) {
      const game = await db.game.upsert({
        where: { slug: g.slug },
        update: {},
        create: g,
      });
      gameRecords.push(game);
    }

    return NextResponse.json({
      ok: true,
      games: gameRecords,
    });
  } catch (e) {
    console.error("Init error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
