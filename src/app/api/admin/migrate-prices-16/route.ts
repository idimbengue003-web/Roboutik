import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/migrate-prices-16
 *
 * Recomputes the displayed price for all listings so that:
 *   price = round(sellerNetPrice × 1.16)
 *
 * The sellerNetPrice is left unchanged (it represents what the seller
 * wants to receive). Only the displayed buyer price changes.
 *
 * This aligns existing listings with the new model where the seller
 * enters their net amount and we add 16% on top for the buyer.
 */
export async function POST(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const listings = await db.listing.findMany({
    select: { id: true, price: true, sellerNetPrice: true },
  });

  let updated = 0;
  let skipped = 0;
  for (const l of listings) {
    const expectedPrice = Math.round(l.sellerNetPrice * 1.16);
    if (l.price === expectedPrice) {
      skipped++;
      continue;
    }
    await db.listing.update({
      where: { id: l.id },
      data: { price: expectedPrice },
    });
    updated++;
  }

  return NextResponse.json({
    ok: true,
    updated,
    skipped,
    total: listings.length,
    message: `${updated} annonce(s) mises à jour (prix affiché = net × 1.16). ${skipped} déjà OK.`,
  });
}
