import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/clean-listing-descriptions
 *
 * Removes the "Prix original : ~$X USD" line from all listings' descriptions.
 * One-shot cleanup after the supplier price leak was identified.
 */
export async function POST(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  // Find all listings that contain the leaked price pattern
  const listings = await db.listing.findMany({
    where: {
      description: { contains: "Prix original" },
    },
    select: { id: true, description: true },
  });

  let updated = 0;
  for (const listing of listings) {
    // Remove the "Prix original : ~$X USD\n" line
    const cleaned = listing.description
      .replace(/Prix original\s*:\s*~?\$[\d.]+\s*USD\n?/gi, "")
      .replace(/\n\n\n+/g, "\n\n") // collapse triple newlines
      .trim();
    await db.listing.update({
      where: { id: listing.id },
      data: { description: cleaned },
    });
    updated++;
  }

  return NextResponse.json({
    ok: true,
    cleaned: updated,
    message: `Retiré la mention de prix USD de ${updated} annonce(s)`,
  });
}
