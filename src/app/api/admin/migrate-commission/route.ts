import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/migrate-commission
 *
 * Recomputes sellerNetPrice for all existing listings so the 20% commission
 * is applied retroactively.
 *
 * Before: sellerNetPrice = price (no commission)
 * After:  sellerNetPrice = round(price * 0.84) (seller receives 84%, platform keeps 16%)
 *
 * The displayed `price` stays the same — only the seller's net share changes.
 * Existing VALIDATED orders are NOT touched (they're already paid out).
 */
export async function POST(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  // Find all listings where sellerNetPrice == price (no commission applied yet)
  const listings = await db.listing.findMany({
    select: { id: true, price: true, sellerNetPrice: true },
  });

  let updated = 0;
  let skipped = 0;
  for (const l of listings) {
    const expectedNet = Math.round(l.price * 0.84);
    if (l.sellerNetPrice === expectedNet) {
      skipped++;
      continue;
    }
    await db.listing.update({
      where: { id: l.id },
      data: { sellerNetPrice: expectedNet },
    });
    updated++;
  }

  return NextResponse.json({
    ok: true,
    updated,
    skipped,
    total: listings.length,
    message: `${updated} annonce(s) mises à jour avec commission 16% (${skipped} déjà OK)`,
  });
}
