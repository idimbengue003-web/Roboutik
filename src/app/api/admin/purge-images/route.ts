import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/purge-images
 *
 * EMERGENCY: removes ALL base64 images from listings to free up
 * DB storage (Neon) and bandwidth (Vercel).
 *
 * Sets listing.images = null for all listings that have images.
 * The listings keep their title, description, price, etc.
 */
export async function POST(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const result = await db.listing.updateMany({
    where: {
      NOT: { images: null },
    },
    data: { images: null },
  });

  // Also purge old notification logs (keep only last 100)
  const oldLogs = await db.notificationLog.count();
  if (oldLogs > 100) {
    await db.notificationLog.deleteMany({
      where: {
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
  }

  // Purge old error logs (keep only last 50)
  const oldErrors = await db.errorLog.count();
  if (oldErrors > 50) {
    await db.errorLog.deleteMany({
      where: {
        createdAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      },
    });
  }

  return NextResponse.json({
    ok: true,
    imagesPurged: result.count,
    notificationLogsBefore: oldLogs,
    errorLogsBefore: oldErrors,
    message: `${result.count} annonce(s) ont vu leurs images supprimées. DB + bandwidth libérés.`,
  });
}
