import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

const GAME_ID = "cmqkfdrhj0009i604g1ukhq7k"; // Tower Defense Simulator

// Convert USD to FCFA: 1 USD = 1000 FCFA, + 1000F site margin, rounded to nearest 100
function usdToFcfa(usd: number): number {
  return Math.round((usd * 1000 + 1000) / 100) * 100;
}

// [title, priceUSD] — items > $3 USD, no seller names
const items: [string, number][] = [
  ["NEW |💔500+ PREMIUM SCRIPTS 💔| 5 INJECTORS | 4 SCRIPT HUBS💔PC/MOBILE🗽 ▸ INSTANT DELIVERY!💔", 3.01],
  ["I WILL PASS VOIDCORE/VOIDCORE🔥 🎮WITH ENTRY🎮", 3.01],
  ["farm 20", 3.01],
  ["Tower Defense Simulator🎭🎭I'm playing Hardcore. Price per game.🎭🎭", 3.01],
  ["GIFT Premium Pass Spring Frenzy Battle Pass Spring Frenzy Pass 399 Robux", 3.01],
  ["[ GIFT GAMEPASS ] Tower Crook Boss | Tower Boss of the Crook 🎭🎭", 3.03],
  ["Up 50 lvl", 3.05],
  ["5000 coins", 3.06],
  ["BATTLEPASS - GIFT PREMIUM - EASTER 2026 - BATTLE PASS 🔥 | ⏰ 24/7 | 399rb", 3.07],
  ["Gift | Gamepass | Mortar | Instant Delivery of Roblox 🎁", 3.09],
  ["Tower Defense💠|🎁Gift🎁|🥇Premium Null & Void🥇", 3.09],
  ["farm money 50K/50.000🟡 One gold Crate🟡 FAST", 3.11],
  ["CHEAP🤑🟨) ✨MORTAR TOWER✨ + FAST DELIVERY✨CLEAN ROBUX", 3.13],
  ["Tower Defense Simulator 🛡️⚔️Premium Pass ⚔️🛡️ | 🎁 GAMEPASS 🎁", 3.16],
  ["[TDS] Fast Accelerator Farming", 3.17],
  ["NEW Premium Pass Battle Pass Spring Pass 399 RB", 3.17],
  ["TOWER DEFENCE SIMULATOR🔻🔺 2.500 COINS🔻🔺 GIFT🔻🔺", 3.17],
  ["I will farm for you on the accelerator 2500 ⚡️🌪️🤩 with the entrance to the account + present 🎁", 3.17],
  ["Gift | Gamepass | Battle Pass | The Final Act", 3.17],
  ["Gift | Gamepass | Cowboy", 3.17],
  ["LEVEL UP SERVICE | LEVEL UP TO LEVEL 40 🤍 WITH OR WITHOUT ACCOUNT ACCESS 🤍", 3.17],
  ["farm 10.000 (GEMS) ⚡", 3.17],
  ["TDS GEMS FARMING | FAST & RELIABLE 💎 4000", 3.17],
  ["I'll upgrade from lvl 1 to lvl 20 operator💯💥🔥+2000 gems", 3.17],
  ["[Gift🎁] 🎫 Tower Defense | Tower Cowboy | 🎫", 3.17],
  ["[Gift🎁] 🎫 Tower Defense | BATTLEPASS 🎫", 3.17],
  ["Game Pass Gift 🎁⎪🔫 Cowboy 🔫⎪", 3.17],
  ["Tower Defense Simulator】🔵 Level 11 + 2800 Coins 🔵 Good Account 🔵 Instant Delivery 🔵", 3.17],
  ["ACCOUNT UPGRADE UP TO BGN 10 🎃 FAST AND RELIABLE 🎃 with/without account login", 3.17],
  ["Farm on Brawler🥵 🧠1.250gems🧠 💸Low Price💸", 3.17],
  ["𝙧𝙤𝙗𝙡𝙤𝙭🔮COMPLETING VOIDCORE🔮FAST AND CHEAP✅", 3.17],
  ["I'll farm you gems and coins for Operator 🔥", 3.17],
  ["I'll farm you gems for a hacker", 3.17],
  ["farm lvl Juggernaut/Miniganer", 3.17],
  ["MINIGANER LEVEL UP✅ 0-20 LVLS", 3.17],
  ["TDS |💎 ACEEL FARMING💎 | WITH LOGIN😇", 3.17],
  ["farming for engineer loy prase", 3.17],
  ["Farm for engineer👷‍♂️", 3.17],
  ["I'll farm 10", 3.17],
  ["I'll farm 2500 gems (for Accelerator) 🟩FAST🔱SAFE 🔴MUST BE LVL 50", 3.17],
  ["Triumph Hardcore & Voidcore (with account transfer)😈🔮", 3.17],
  ["Boost to Accelerator + farm Minigunner level", 3.17],
  ["BEAT 💚💚💚PW2💚💚💚", 3.17],
  ["𝓣𝓓𝓢 𝓑𝓞𝓞𝓢𝓣」✔️I CAN COMPLETE ANY 3-STAGE MISSION.️|🔐 WITH ENTRY/WITHOUT ENTRY| 《💲》CHEAP!", 3.17],
  ["Premium Pass🎴⎪📗Gift gamepass️ 📗⎦", 3.17],
  ["TDS GEM FARMING 🟣 💎 3000 GEMS 💎", 3.17],
  ["30 LVL 4500 COINS ⚡AUTODELIVERY⚡", 3.17],
  ["VoidCore Walkthrough!", 3.17],
  ["Farm Necromancer", 3.17],
  ["[TDS]🌵🤠Help to complete BadLands2🤠🌵", 3.17],
  ["FULL FARM FOR OPERATOR | WITH ACCOUNT LOGIN |💎💍💎", 3.17],
  ["[💰Farm💰] 50k gold / Golden crate", 3.18],
  ["I'll farm you some for an accelerator", 3.2],
  ["Gift | Gamepass | COINS $5", 3.22],
  ["Mortar Tower🎁✨💫BONUS🎁✨💫CHECK DESCRIPTION🎁✨💫", 3.25],
  ["Engineer — Gem Farming for Engineer 🟣⚙️", 3.25],
  ["MORTAR GAMEPASS 💣 | 🎯 395 ROBUX GAMEPASS 🔥⭐🔷- ◀【GIFT🎁】", 3.25],
  ["Fallen Missions🔮★3️⃣Category Hard3️⃣★📝Missions in the description📝", 3.25],
  ["𝘉𝘌𝘚𝘛 𝘗𝘙𝘐𝘊𝘌 💎 🤠 Cowboy Tower 🤠 🎁 Gift 🎁", 3.25],
  ["𝓣𝓓𝓢 𝓑𝓞𝓞𝓢𝓣\"✔️FARM GEMS/GEMS// WITH A VISIT/WITHOUT A VISIT/THE PRICE IS FOR 600|《🕒》FAST!", 3.28],
  ["crook boss GamePass ❤️‍🔥CHECK DESCRIPTION 🔻", 3.33],
  ["Gift | Gamepass | Turret | Instant Delivery of Roblox 🎁", 3.33],
  ["〣STEAM〣╏✚ ╏▶︎DIY◀︎╏✚╏🔺🩸 BLOOD POINTS FARM", 3.35],
  ["500 Gems (375rbx)💎🎁 GIFT GAMEPASS 🎁", 3.37],
  ["GIFT Tower Turret Tower turret 450 Robux", 3.38],
  ["GIFT ☢️ Mortar | Mortar ☢️ 395 RBX 🚀 FAST 🚀", 3.39],
  ["Missions/Quests ⚙️ - Phantom Skins", 3.39],
  ["I'LL GO - 🔮💜VOIDCORE/VOIDCORE💜🔮 |🔐 iam must join your acc", 3.39],
  ["𝙧𝙤𝙗𝙡𝙤𝙭 ✨🎀LEVEL FARMING ON MINIGUNNER/MINIGUNNER PRICE FOR 20 LEVELS🔮FAST AND CHEAP✅", 3.39],
  ["𝙧𝙤𝙗𝙡𝙤𝙭🔮 LEVEL FARMING FOR JUGGERNAUT PRICE FOR 20 LEVELS 🔮 FAST AND CHEAP ✅", 3.39],
  ["𝐡𝐮𝐧𝐝𝐫𝐞𝐝 𝐬𝐡𝐨𝐩💸| Passing 🟣𝐇𝐚𝐫𝐝𝐂𝐨𝐫𝐞🟣", 3.39],
  ["GEM FARMING 2500】➣ Booster💜 Gift for feedback🎁", 3.39],
  ["I will upgrade any account for 250₽🔥🔥 check description", 3.41],
  ["GIFT 🎫 Premium Battlepass | Premium Battlepass | Spring Frenzy Battlepass 🎫 399 RBX 🚀 FAST 🚀", 3.43],
  ["farm money 65K/65.000🟡 One gold Crate🟡 FAST", 3.45],
  ["Mortar | Mortar", 3.45],
  ["I'll farm you for an engineer🟣(4500 gems) engineer🟣", 3.47],
  ["Yin Yang GUERRIRO DIGITALE 🐸4", 3.49],
  ["Tower Cowboy for TDS | GIFT 🎁 Check description ⬇️ ⚡ 340 R$ 💵", 3.49],
  ["I'll level up a Juggernaut from lvl 1-20 💯💥🔥+ 2500 gems", 3.49],
  ["Account upgrade to 40 lvl ( from scratch )⚫🔴", 3.51],
  ["[ GIFT GAMEPASS ] Tower Cowboy 🎭🎭", 3.51],
  ["GOOD ACCOUNT FOR A BEGINNER LVL 61 🎥", 3.52],
  ["Farm coins + exp💠1 item = 50000 coins + ~15000 exp💰", 3.52],
  ["I WILL FARM 2000 GEMS FOR YOU 💜⭐", 3.54],
  ["[ GIFT GAMEPASS ] Tower Cowboy | Tower Cowboy 🎭🎭", 3.54],
  ["Walkthrough⏐DUCKY REVENGE Hard Mode Ducky Event Easter Spring Event", 3.57],
  ["CHEAP🤑🟨) ✨TURRET TOWER✨ + FAST DELIVERY✨CLEAN ROBUX", 3.57],
  ["[Gift🎁] 🎫 Tower Defense | Tower Turret | 🎫", 3.57],
  ["I will give you gems and coins for juggirnaut (juggernaut)", 3.57],
  ["hacker im farm hacker in 4-5 hiurs in you acc", 3.57],
  ["Gift Game Pass🌠 | 💎Premium Pass💎", 3.61],
  ["Gift Game Pass🥩 | 🥩 Premium Pass🥩", 3.61],
  ["Farming 4", 3.61],
  ["𝙧𝙤𝙗𝙡𝙤𝙭🔮FARM FOR ACCELERATOR🔮FAST AND CHEAP✅", 3.65],
  ["TDS 🎈| 🥊 VOIDCORE COMPLETING 🥊 | WITH LOGIN😇", 3.65],
  ["NEW TOWER !!!!", 3.65],
  ["Gamepad Gift🎁 The Final Act ( Premium Pass ) 🔥 The Final Act (Premium Pass) 🔥", 3.65],
  ["5000 COINS / 5000 MONEY 💰 | 💵 + 5000$ MONEY / COINS 🔥⭐🔷- ◀【GIFT🎁】", 3.65],
  ["FARMING GEMS FOR ACCELERATOR 💎🎆🔥[2.5K GEMS] 🔥", 3.65],
  ["Warden ┃ Warden– 600RB🍀🌸🧿", 3.81],
  ["farm max operator lvl", 3.97],
  ["ENGINEER | ENGINEER'S FARM [💜4500 Gems💜] + Bonus💜 TOP PRICE!💜 DETAILED DESCRIPTION", 3.97],
  ["I'll farm you: Golden Crate 🏆 or 50k coins 💰!", 3.97],
  ["Fallen Warden Mission with account login!👮‍♂️🌠", 4.0],
  ["[ GIFT GAMEPASS ] Premium - Spring Frenzy / Easter 2026 pass 🎭", 4.12],
  ["BATTLEPASS| BATTLEPASS🔥 [Gift🎁]", 4.47],
  ["Game Pass Gift 🎁⎪ ✨ ARCHER ✨⎪", 4.6],
  ["hacker gems farm📱 || FAST⚡", 4.76],
  ["Farm on Brawler ★ 1250 gems💎★", 4.76],
  ["[MORTAR]🔫 - 🎁GIFT DELIVERY|✅FAST AND HIGH-QUALITY", 4.76],
  ["Crook Boss Tower gamepass", 4.76],
  ["Iedkfnd", 4.76],
  ["saboteur tower🎁✨💫BONUS🎁✨💫CHECK DESCRIPTION🎁✨💫", 4.93],
  ["10000 COINS / 10000 MONEY 💰 | 💵 + 10000$ FOR 650 ROBUX 🔥⭐🔷- ◀【GIFT🎁】", 5.18],
  ["Roblox🌌 Farm 💰50.000 coins💰 🟡gold create🟡✅FAST AND CHEAP✅", 5.51],
  ["𝘉𝘌𝘚𝘛 𝘗𝘙𝘐𝘊𝘌 💎 🏹 Archer Tower🏹 👑 𝖤𝗑𝖼𝗅𝗎𝗌𝗂𝗏𝖾 👑 🎁 Gift 🎁", 5.82],
  ["GIFT】🎁 |❗ Tower Warden /❗", 5.95],
  ["CHEAP🤑🟨) ✨SWARMER TOWER✨ + FAST DELIVERY✨CLEAN ROBUX", 6.34],
  ["tower defence 🔥 🔥 🔥 upgrade you and buy units", 6.34],
  ["Gift gamepass️🎁⎪🌻Tower Biologist🌻 ⎪", 6.73],
  ["CHEAP🤑🟨) ✨BIOLOGIST TOWER✨ + FAST DELIVERY✨CLEAN ROBUX", 6.73],
  ["Biologist☣️⎪📗Gift gamepass️ 📗⎦", 6.74],
  ["GIFT 🧬 Biologist 🧬 849 RBX 🏖️ PROFITABLE 📉", 6.74],
  ["Operator🎯Farm lvl 20 for operator🎯Operator evolution🎯🎁+ gift of farm gems while farming operator🎁", 6.95],
  ["Warden | Gift (600rbx)", 7.28],
  ["Engineer ⭐ 4500 gems 💜 I will farm it on your account ⭐", 7.86],
  ["Farm 50", 7.93],
  ["GIFT🎁 🐝 Swarmer🐝 | 🐝Swarmer 🐝 | 799 RBX | 🚀 FAST DELIVERY⚡", 7.93],
  ["𝘉𝘌𝘚𝘛 𝘗𝘙𝘐𝘊𝘌 💎 🍀 Biologist Tower 🍀 👑 𝖤𝗑𝖼𝗅𝗎𝗌𝗂𝗏𝖾 👑 🎁 Gift 🎁", 8.13],
  ["1500 GEMS / 1500 GEMS 💎 | 💎 + 1500$ GEMS / GEMS ♥gamepass♥【GIFT🎁】", 10.31],
  ["Farm all hard towers💎", 10.63],
  ["Only with VIP❗🗡️ Juggernaut from scratch! 💥❗DESCRIPTION❗🔥", 10.83],
  ["Mercenary Base – 1800RB🍀🌸🧿", 11.42],
  ["2500 GEMS 🔥 | ⏰ 24/7 | 1500rb", 11.54],
  ["Pursuit tower🎁✨💫BONUS🎁✨💫CHECK DESCRIPTION🎁✨💫", 12.36],
  ["PURSUIT GAMEPASS 🚁 | 🎯 1500 ROBUX GAMEPASS 🔥⭐🔷- ◀【GIFT🎁】", 12.39],
  ["Farm on Hacker★ 5500 Gems💎★", 15.85],
  ["[GIFT] Pursuit Tower", 15.86],
  ["CHEAP🤑🟨) ✨ENGINEER TOWER✨ + FAST DELIVERY✨CLEAN ROBUX", 17.84],
  ["Gatling Gun🤑FAST🤑💸GIFT💸", 18.56],
  ["CHEAP🤑🟨) ✨HACKER TOWER✨ + FAST DELIVERY✨CLEAN ROBUX", 23.78],
  ["Hacker 💻 tower gamepass", 28.55],
  ["[💎HARDCORE TDS] (🟪ALL HC TOWERS) FARM 🟪SO FAST HOW I CAN", 31.72],
  ["Admin | Admin Mode | Admin Mode 🛠️", 40.62],
  ["ADMIN MODE ‼️ADMIN MODE ‼️🎁GIFT🎁💲7.999 R$💲", 53.29],
  ["Gamepass Gift🎁｣💎⚙️ Admin Mode ⚙️💎│⚡FAST⚡", 63.43],
  ["Admin mode / Admin mode 7999RB [ GIFT ] 🌟", 71.25],
  ["Gamepass 🎥 Admin panel | 🔑 7999 (Rob) 🔑", 71.78],
  ["[ADMIN MODE]💪 - 🎁GIFT DELIVERY|✅FAST AND HIGH-QUALITY", 103.09],
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

    const description = `Item Roblox Tower Defense Simulator : ${title}\n\nLivraison rapide après paiement Wave. Indique ton pseudo Roblox lors de la commande.`;

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
  });
}

