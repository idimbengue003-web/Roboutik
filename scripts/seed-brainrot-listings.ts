// One-shot script to bulk-insert Steal a Brainrot listings.
// Run with: npx tsx scripts/seed-brainrot-listings.ts
//
// This script bypasses the /api/seller/listings endpoint (which has a 50-listing cap)
// and inserts directly via Prisma. It uses the admin's seller account.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ADMIN_ID = "cmqqyxk010000jo04ci1x7aku";
const GAME_ID = "cmqkfdrgi0005i604gduz9elh"; // Steal a Brainrot

// Parsed listings: [title, priceFcfa, statNote]
const listings: [string, number, string][] = [
  ["Esok sekolah", 500, "30M/s"],
  ["Secret combinasion", 2400, "125M/s"],
  ["Spaghetti Tualetti", 1000, "60M/s"],
  ["Garama and Madundung", 1900, "50M/s"],
  ["Cooki and Milki", 8000, "155M/s"],
  ["Tictac Sahur", 3450, "37.5M/s"],
  ["Dragon Cannelloni", 19500, "250M/s"],
  ["Mieteteira Bicicleteira", 900, "26M/s"],
  ["Los Mobilis", 1000, "22M/s"],
  ["Los Puggies", 1500, "30M/s"],
  ["W or L", 3000, "30M/s"],
  ["Gold La Spooky Grande", 1800, "30M/s"],
  ["Capitano Moby", 4600, "160M/s"],
  ["La Grande Combinasion", 1500, "10M/s"],
  ["La Jolly Grande", 3000, "30M/s"],
  ["Gobblino Uniciclino", 5000, "27M/s"],
  ["67", 1000, "7.5M/s"],
  ["Orcaledon", 3700, "360M/s"],
  ["Los 67", 1500, "22.5M/s"],
  ["La Taco Combinasion", 5000, "35M/s"],
  ["Los Combinasionas", 600, "15M/s"],
  ["Los Nooo My Hotspotsitos", 1100, "22M/s"],
  ["Tralaledon", 7000, "27.5M/s"],
  ["Los Bros", 3900, "24M/s"],
  ["Las Sis", 2000, "17.5M/s"],
  ["Las Tralaleritas", 500, "2.6M/s"],
  ["Burrito Bandito", 900, "4M/s"],
  ["Admin Command", 30000, "Bonus"],
  ["Gold Garama and Madundung", 5000, "62.5M/s"],
  ["Fragrama and Chocrama", 8000, "100M/s"],
  ["Diamond Chipso and Queso", 4200, "37.5M/s"],
  ["Headless Horseman", 500000, "400M/s"],
  ["Eviledon", 3000, "31.5M/s"],
  ["Rainbow Garama and Madundung", 5000, "350M/s"],
  ["Yin Yang Mieteteira Bicicleteira", 2500, "195M/s"],
  ["La Ginger Sekolah", 3100, "75M/s"],
  ["Los Spooky Combanasionias", 2000, "20M/s"],
  ["Swaggy Bros", 5000, "200M/s"],
  ["Chicleteira Noelteira", 1000, "15M/s"],
  ["Festive 67", 15000, "67M/s"],
  ["Rainbow Los Mobilis", 6300, "220M/s"],
  ["Los Primos", 6000, "31M/s"],
  ["Flying Carpet", 4000, "1M/s"],
  ["Ketupat Kepat", 1600, "35M/s"],
  ["La Extinct Grande", 3000, "23.5M/s"],
  ["La Casa Boo", 25000, "150M/s"],
  ["Chipso and Queso", 4000, "25M/s"],
  ["Los Chicleteiras", 2000, "7M/s"],
  ["Mariachi Corazoni", 2000, "12.5M/s"],
  ["Chillin Chili", 7000, "100M/s"],
  ["Lavadorito Spinito", 1500, "56.2M/s"],
  ["Gold Los Hotspotsitos", 5000, "25M/s"],
  ["Spooky and Pumpky", 7200, "80M/s"],
  ["Galaxy Garama and Madundung", 7200, "350M/s"],
  ["La Supreme Combinasion", 60000, "40M/s"],
  ["Rainbow Nuclearo Dinossauro", 5400, "150M/s"],
  ["Los Tacoritas", 5000, "32M/s"],
  ["Nooo My Hotspot", 2500, "1.5M/s"],
  ["Gold Ketupat Kepat", 3000, "100M/s"],
  ["Yin Yang La Taco Combinasion", 9800, "700M/s"],
  ["Candy Chicleteira Noelteira", 3000, "60M/s"],
  ["Radioactive Esok Sekolah", 2100, "255M/s"],
  ["Los Spaghettis", 40000, "1.5B/s"],
  ["Tang Tang Keletang", 3000, "33.5M/s"],
  ["Gold La Secret Combinasion", 6000, "400M/s"],
  ["Rainbow Tang Tang Keletang", 4200, "335M/s"],
  ["Radioactive Spaghetti Tualetti", 3500, "500M/s"],
  ["Chimnino", 1000, "14M/s"],
  ["Admin Lucky Block", 500, "Bonus"],
  ["Burguro And Fryuro", 2500, "150M/s"],
  ["Spooky Lucky Block", 2000, "Bonus"],
  ["Swag Soda", 5000, "13M/s"],
  ["Los Burritos", 1000, "8.5M/s"],
  ["Fishino Clownino", 45000, "15M/s"],
  ["Gold La Taco Combinasion", 6000, "358M/s"],
  ["Rainbow La Taco Combinasion", 10900, "1.3B/s"],
  ["Gold La Jolly Grande", 5000, "352M/s"],
  ["Strawberry Elephant", 600000, "500M/s"],
  ["Gold Meowl", 300000, "500M/s"],
  ["Galaxy Los Bros", 8200, "216M/s"],
  ["Candy Burguro And Fryuro", 14000, "1B/s"],
  ["Candy Ketchuru and Musturu", 6000, "170M/s"],
  ["Radioactive Chicleteira Noelteira", 5000, "307.5M/s"],
  ["Yin Yang Ketchuru and Musturu", 9000, "318M/s"],
  ["Radioactive Secret Lucky Block", 5000, "Bonus"],
  ["Los 25", 7000, "100M/s"],
  ["Yin Yang Chillin Chili", 9000, "262.5M/s"],
  ["Los Planitos", 7000, "18.5M/s"],
  ["Rainbow Tralaledon", 12000, "275M/s"],
  ["Gold Los Planitos", 20000, "60M/s"],
  ["Chicleteira Bicicleteira", 2000, "3.5M/s"],
  ["Yin Yang La Spooky Grande", 25000, "248M/s"],
  ["Rainbow W or L", 13000, "630M/s"],
  ["Lava Celularcini Viciosini", 30000, "450M/s"],
  ["Rainbow Mariachi Corazoni", 20000, "125M/s"],
  ["Yin Yang La Casa Boo", 70000, "750M/s"],
  ["Candy La Grande Combinasion", 5000, "40M/s"],
  ["Rainbow La Secret Combinasion", 15000, "1.2B/s"],
  ["Yin Yang Eviledon", 10000, "236.2M/s"],
  ["Radioactive Orcaledon", 10000, "340M/s"],
  ["Diamond La Supreme Combinasion", 80000, "60M/s"],
  ["VIP", 3000, "Bonus"],
  ["Gold Los Tacoritas", 10000, "40M/s"],
  ["Yin Yang Burguro And Fryuro", 80000, "1.1B/s"],
  ["Candy W or L", 25000, "240M/s"],
  ["Nuclearo Dinossauro", 8000, "15M/s"],
  ["Money Money Puggy", 1800, "21M/s"],
  ["Diamond Capitano Moby", 75000, "1B/s"],
  ["Radioactive La Secret Combinasion", 10000, "1B/s"],
  ["Rainbow Money Money Puggy", 10000, "400M/s"],
  ["Guest 666", 35000, "90M/s"],
  ["Gold Guest 666", 40000, "60M/s"],
  ["Cerberus", 10000, "175M/s"],
  ["Gold Los Spaghettis", 10000, "87.5M/s"],
  ["Ketchuru and Musturu", 5000, "42.5M/s"],
  ["Rainbow Ketchuru and Musturu", 6000, "425M/s"],
  ["Candy Popcuru and Fizzuru", 12000, "1.5B/s"],
  ["Dragon Gingerini", 130000, "350M/s"],
  ["Los Chillis", 10000, "375M/s"],
  ["Radioactive Dragon Cannelloni", 75000, "2.8M/s"],
  ["Candy Dragon Cannelloni", 58000, "1B/s"],
  ["Rubrikiko", 19000, "70M/s"],
  ["Popcuru and Fizzuru", 4000, "170M/s"],
  ["John Doe", 4000, "7.5M/s"],
  ["Diamond John Doe", 7000, "33.7M/s"],
  ["Garama x Capitano Gold", 10000, "Combo"],
  ["Drag Can x Hydra Dragon", 65000, "250M/s"],
  ["Bacuru and Egguru", 1000, "24M/s"],
  ["Fragola La La La", 8000, "32.5M/s"],
  ["Bundle Fragrama+Popcuru+Ginger Sekolah", 20000, "Pack"],
  ["Celestial Pegasus", 4900, "175M/s"],
];

async function main() {
  console.log(`Inserting ${listings.length} listings...`);

  // Verify admin + game exist
  const admin = await db.user.findUnique({ where: { id: ADMIN_ID } });
  if (!admin) throw new Error(`Admin ${ADMIN_ID} not found`);
  if (!admin.isSeller) {
    await db.user.update({ where: { id: ADMIN_ID }, data: { isSeller: true } });
    console.log("Admin promoted to seller");
  }

  const game = await db.game.findUnique({ where: { id: GAME_ID } });
  if (!game) throw new Error(`Game ${GAME_ID} not found`);

  let created = 0;
  let skipped = 0;

  for (const [title, price, stat] of listings) {
    // Skip if a listing with the same title already exists for this seller+game
    const existing = await db.listing.findFirst({
      where: { sellerId: ADMIN_ID, gameId: GAME_ID, title },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const description = `Item Roblox Steal a Brainrot : ${title}\nVitesse : ${stat}\n\nLivraison rapide après paiement Wave. Indique ton pseudo Roblox lors de la commande.`;

    await db.listing.create({
      data: {
        sellerId: ADMIN_ID,
        gameId: GAME_ID,
        title,
        description,
        sellerNetPrice: price,
        price: price, // No commission: price = sellerNetPrice
        stock: 1,
        active: true,
      },
    });
    created++;
  }

  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped (already existed): ${skipped}`);
  console.log(`Total in DB now: ${created + skipped}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
