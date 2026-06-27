import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/recalc-prices-850
 *
 * Recalculates ALL listings' prices using the new rate: 1 USD = 850 FCFA
 * (instead of the old 1000). This is for listings that were seeded with
 * USD prices converted at the old rate.
 *
 * Strategy: we can't reverse-engineer the original USD price from the FCFA
 * price, so we use a ratio. Old rate was (usd * 1000 + 1000), new rate is
 * (usd * 850 + 1000). The ratio is approximately 850/1000 = 0.85 for the
 * USD portion, but the +1000 flat margin stays the same.
 *
 * Formula: new_price = (old_price - 1000) * 0.85 + 1000
 *
 * This is applied to sellerNetPrice, then price = round(sellerNetPrice * 1.16).
 *
 * Listings created by users manually (not from seeds) are also recalculated
 * since we can't distinguish them. This is acceptable because the user wants
 * all prices to reflect the new rate.
 */
export async function POST(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const listings = await db.listing.findMany({
    select: { id: true, sellerNetPrice: true, price: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const l of listings) {
    // Reverse the old formula: old_net = usd * 1000 + 1000
    // So: usd = (old_net - 1000) / 1000
    // New net = usd * 850 + 1000 = (old_net - 1000) * 0.85 + 1000
    const oldNet = l.sellerNetPrice;
    if (oldNet <= 1000) {
      // Very small price — can't reverse the formula reliably, skip
      skipped++;
      continue;
    }

    const usd = (oldNet - 1000) / 1000;
    const newNet = Math.round((usd * 850 + 1000) / 100) * 100;
    const newPrice = Math.round(newNet * 1.16);

    if (newNet === oldNet && newPrice === l.price) {
      skipped++;
      continue;
    }

    await db.listing.update({
      where: { id: l.id },
      data: {
        sellerNetPrice: newNet,
        price: newPrice,
      },
    });
    updated++;
  }

  return NextResponse.json({
    ok: true,
    updated,
    skipped,
    total: listings.length,
    rate: "1 USD = 850 FCFA (was 1000)",
    formula: "new_net = (old_net - 1000) * 0.85 + 1000, then price = round(new_net * 1.16)",
  });
}
