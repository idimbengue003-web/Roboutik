import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";
import { sanitizePlainText } from "@/lib/sanitize";

/**
 * POST /api/admin/bulk-import
 * Body: { adminId, gameId, items: [{ title, priceUsd, type }] }
 *
 * Creates or updates listings in bulk from a parsed text input.
 * - If a listing with the same title already exists for this seller+game,
 *   it updates the price (USD rate: 1$ = 850 FCFA + 1000F margin + 16% commission)
 * - If it doesn't exist, it creates a new listing
 *
 * The 'items' array is pre-parsed by the admin UI from the pasted text.
 */

const USD_TO_FCFA_RATE = 850;
const SITE_MARGIN_FCFA = 1000;
const COMMISSION_MULTIPLIER = 1.16;

function usdToFcfa(usd: number): number {
  return Math.round((usd * USD_TO_FCFA_RATE + SITE_MARGIN_FCFA) / 100) * 100;
}

type ImportItem = {
  title: string;
  priceUsd: number;
  type?: "item" | "account";
};

export async function POST(req: NextRequest) {
  const { user: admin, error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const body = await req.json();
  const { gameId, items } = body as { gameId?: string; items?: ImportItem[] };

  if (!gameId) {
    return NextResponse.json({ error: "gameId requis" }, { status: 400 });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Aucun item à importer" }, { status: 400 });
  }
  if (items.length > 500) {
    return NextResponse.json({ error: "Maximum 500 items par import" }, { status: 400 });
  }

  // Verify game exists
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) {
    return NextResponse.json({ error: "Jeu introuvable" }, { status: 404 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const title = sanitizePlainText(item.title).trim();
      if (title.length < 3 || title.length > 80) {
        errors.push(`Ligne ${i + 1}: titre invalide (3-80 caractères)`);
        skipped++;
        continue;
      }
      if (!item.priceUsd || item.priceUsd < 0.01 || item.priceUsd > 1000) {
        errors.push(`Ligne ${i + 1}: prix USD invalide (${item.priceUsd})`);
        skipped++;
        continue;
      }

      const type = item.type === "account" ? "Compte" : "Item";
      const fcfaPrice = usdToFcfa(item.priceUsd);
      const description = `Item Roblox ${game.name} : ${title}\nType : ${type}\n\nLivraison rapide après paiement Wave. Indique ton pseudo Roblox lors de la commande.`;

      // Check if listing already exists
      const existing = await db.listing.findFirst({
        where: { sellerId: admin!.id, gameId, title },
        select: { id: true },
      });

      if (existing) {
        await db.listing.update({
          where: { id: existing.id },
          data: {
            sellerNetPrice: fcfaPrice,
            price: Math.round(fcfaPrice * COMMISSION_MULTIPLIER),
            description,
            active: true,
          },
        });
        updated++;
      } else {
        await db.listing.create({
          data: {
            sellerId: admin!.id,
            gameId,
            title,
            description,
            sellerNetPrice: fcfaPrice,
            price: Math.round(fcfaPrice * COMMISSION_MULTIPLIER),
            stock: 1,
            active: true,
          },
        });
        created++;
      }
    } catch (e) {
      errors.push(`Ligne ${i + 1}: ${e instanceof Error ? e.message : "erreur"}`);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    updated,
    skipped,
    errors: errors.slice(0, 20),
    total: created + updated + skipped,
    rate: `1 USD = ${USD_TO_FCFA_RATE} FCFA (+ ${SITE_MARGIN_FCFA}F marge, +16% commission)`,
  });
}
