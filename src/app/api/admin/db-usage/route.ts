import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * GET /api/admin/db-usage?adminId=...
 *
 * Returns the estimated DB storage used by key tables (in bytes).
 * Uses pg_total_relation_size on the main tables.
 */
export async function GET(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  // Sum the size of all main tables in the roboutik schema
  const rows = await db.$queryRaw<Array<{ table_name: string; size_bytes: bigint }>>`
    SELECT
      relname AS table_name,
      pg_total_relation_size(relid) AS size_bytes
    FROM pg_catalog.pg_statio_user_tables
    WHERE schemaname = 'roboutik'
    ORDER BY size_bytes DESC;
  `;

  const tables = rows.map((r) => ({
    table: r.table_name,
    sizeBytes: Number(r.size_bytes),
    sizeMB: Math.round((Number(r.size_bytes) / 1024 / 1024) * 100) / 100,
  }));

  const totalBytes = tables.reduce((s, t) => s + t.sizeBytes, 0);

  // Estimate listings-with-images count + their image storage
  const listings = await db.listing.findMany({
    where: { NOT: { images: null } },
    select: { images: true },
  });
  const listingsWithImages = listings.filter((l) => l.images && l.images.length > 0).length;
  const imageBytes = listings.reduce(
    (s, l) => s + (l.images ? l.images.length : 0),
    0
  );

  // Total listings count
  const totalListings = await db.listing.count();

  return NextResponse.json({
    tables,
    totalBytes,
    totalMB: Math.round((totalBytes / 1024 / 1024) * 100) / 100,
    totalGB: Math.round((totalBytes / 1024 / 1024 / 1024) * 1000) / 1000,
    neonFreeLimitMB: 500,
    percentUsed: Math.round((totalBytes / (500 * 1024 * 1024)) * 1000) / 10,
    listings: {
      total: totalListings,
      withImages: listingsWithImages,
      withoutImages: totalListings - listingsWithImages,
      imageBytes,
      imageMB: Math.round((imageBytes / 1024 / 1024) * 100) / 100,
    },
    // Remaining capacity assuming ~200 KB per image
    remainingListingsWithImages: Math.max(
      0,
      Math.floor((500 * 1024 * 1024 - totalBytes) / (200 * 1024))
    ),
  });
}
