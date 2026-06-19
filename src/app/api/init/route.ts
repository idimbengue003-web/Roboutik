import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/init - seed demo data (idempotent)
export async function GET() {
  try {
    // 1. Users
    const buyer = await db.user.upsert({
      where: { email: "moi@demo.local" },
      update: {},
      create: {
        email: "moi@demo.local",
        username: "Moi",
        avatar: "🧒",
        isSeller: false,
        balance: 0,
      },
    });

    // Admin demo account
    const admin = await db.user.upsert({
      where: { email: "admin@roboutik.sn" },
      update: { isAdmin: true },
      create: {
        email: "admin@roboutik.sn",
        username: "Admin",
        avatar: "🛡️",
        isSeller: false,
        isAdmin: true,
        balance: 0,
      },
    });

    const sellers = [
      { username: "Vendeur ProMax", email: "vendeur1@demo.local", avatar: "🎮", balance: 12500 },
      { username: "Roblox King", email: "vendeur2@demo.local", avatar: "👑", balance: 8500 },
      { username: "GameShop SN", email: "vendeur3@demo.local", avatar: "🛒", balance: 0 },
      { username: "Toko Jeux", email: "vendeur4@demo.local", avatar: "💰", balance: 3000 },
    ];

    const sellerRecords = [];
    for (const s of sellers) {
      const u = await db.user.upsert({
        where: { email: s.email },
        update: {},
        create: { ...s, isSeller: true },
      });
      sellerRecords.push(u);
    }

    // 2. Games (popular Roblox games)
    const games = [
      {
        name: "Steal a Brainrot",
        slug: "steal-a-brainrot",
        image: "/games/steal-brainrot.png",
        description: "Le jeu culte où tu dérobes les brainrots les plus drôles !",
        isFavorite: true,
        sortOrder: 1,
      },
      {
        name: "Blox Fruits",
        slug: "blox-fruits",
        image: "/games/blox-fruits.png",
        description: "Deviens le plus grand pirate des mers de Roblox !",
        isFavorite: true,
        sortOrder: 2,
      },
      {
        name: "Brookhaven RP",
        slug: "brookhaven-rp",
        image: "/games/brookhaven.png",
        description: "Vis ta vie de rêve dans la plus belle ville de Roblox !",
        isFavorite: true,
        sortOrder: 3,
      },
      {
        name: "Adopt Me!",
        slug: "adopt-me",
        image: "/games/adopt-me.png",
        description: "Adopte des bébés et des animaux trop mignons !",
        isFavorite: true,
        sortOrder: 4,
      },
      {
        name: "Tower Defense Simulator",
        slug: "tower-defense",
        image: "/games/tower-defense.png",
        description: "Défends ta base contre des vagues de monstres !",
        isFavorite: true,
        sortOrder: 5,
      },
      {
        name: "Pet Simulator 99",
        slug: "pet-simulator-99",
        image: "/games/pet-simulator.png",
        description: "Collectionne des centaines d'animaux magiques !",
        isFavorite: true,
        sortOrder: 6,
      },
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

    // 3. Listings - varied items for each game
    const listingsData = [
      // Steal a Brainrot
      {
        gameSlug: "steal-a-brainrot",
        sellerIdx: 0,
        title: "Brainrot Légendaire Tralalero",
        description: "Le brainrot requin le plus rare du jeu ! Niveau max.",
        price: 2500,
      },
      {
        gameSlug: "steal-a-brainrot",
        sellerIdx: 1,
        title: "Pack 10 Brainrots Rares",
        description: "10 brainrots différents dont 3 épiques.",
        price: 1500,
      },
      {
        gameSlug: "steal-a-brainrot",
        sellerIdx: 2,
        title: "Boost Vitesse +50%",
        description: "Active un boost de vitesse pour 24h en jeu.",
        price: 800,
      },
      // Blox Fruits
      {
        gameSlug: "blox-fruits",
        sellerIdx: 0,
        title: "Fruit du Dragon Légendaire",
        description: "Le fruit le plus puissant du jeu, max level.",
        price: 5000,
      },
      {
        gameSlug: "blox-fruits",
        sellerIdx: 3,
        title: "Compte Niveau Max",
        description: "Compte Blox Fruits niveau 2550 avec tous les fruits.",
        price: 12000,
      },
      {
        gameSlug: "blox-fruits",
        sellerIdx: 1,
        title: "1 000 000 Beli",
        description: "Monnaie du jeu transférée directement sur ton compte.",
        price: 2000,
      },
      // Brookhaven
      {
        gameSlug: "brookhaven-rp",
        sellerIdx: 2,
        title: "Maison de Luxe VIP",
        description: "Débloque la plus grande villa avec piscine !",
        price: 3000,
      },
      {
        gameSlug: "brookhaven-rp",
        sellerIdx: 0,
        title: "Voiture Sport Premium",
        description: "La voiture la plus rapide de Brookhaven.",
        price: 1800,
      },
      // Adopt Me
      {
        gameSlug: "adopt-me",
        sellerIdx: 1,
        title: "Bébé Dragon Légendaire",
        description: "Un dragon néon brillant, ultra rare !",
        price: 4500,
      },
      {
        gameSlug: "adopt-me",
        sellerIdx: 3,
        title: "Pack 5 Animaux Rares",
        description: "5 animaux dont un legendaire et 2 épiques.",
        price: 2200,
      },
      // Tower Defense
      {
        gameSlug: "tower-defense",
        sellerIdx: 0,
        title: "Tour Légendaire Dorée",
        description: "La tour la plus puissante du jeu !",
        price: 3500,
      },
      {
        gameSlug: "tower-defense",
        sellerIdx: 2,
        title: "50 000 Gemmes",
        description: "Gemmes pour débloquer des tours et des boosts.",
        price: 1500,
      },
      // Pet Simulator 99
      {
        gameSlug: "pet-simulator-99",
        sellerIdx: 1,
        title: "Animal Titanic Géant",
        description: "Le plus gros animal du jeu, ultra rare !",
        price: 6000,
      },
      {
        gameSlug: "pet-simulator-99",
        sellerIdx: 3,
        title: "100 000 Diamants",
        description: "Monnaie premium pour acheter tout ce que tu veux.",
        price: 2500,
      },
    ];

    let listingsCreated = 0;
    for (const l of listingsData) {
      const game = gameRecords.find((g) => g.slug === l.gameSlug);
      if (!game) continue;
      const existing = await db.listing.findFirst({
        where: { title: l.title, gameId: game.id },
      });
      if (existing) continue;
      // l.price is the seller's net price; compute buyer price with 20% commission
      const sellerNetPrice = l.price;
      const buyerPrice = Math.round(sellerNetPrice * 1.2);
      await db.listing.create({
        data: {
          title: l.title,
          description: l.description,
          sellerNetPrice,
          price: buyerPrice,
          sellerId: sellerRecords[l.sellerIdx].id,
          gameId: game.id,
          active: true,
        },
      });
      listingsCreated++;
    }

    return NextResponse.json({
      ok: true,
      buyer,
      sellers: sellerRecords,
      games: gameRecords,
      listingsCreated,
    });
  } catch (e) {
    console.error("Init error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
