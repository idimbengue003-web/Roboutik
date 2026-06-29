import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/setup
 *
 * One-shot endpoint to apply schema additions that weren't migrated yet
 * (e.g. SiteConfig table). Safe to call multiple times (uses IF NOT EXISTS).
 *
 * Admin-only.
 */
export async function POST(req: NextRequest) {
  const { user: admin, error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const results: string[] = [];

  // 1. Create SiteConfig table if missing
  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "roboutik"."SiteConfig" (
        "id" TEXT NOT NULL DEFAULT 'default',
        "primaryColor" TEXT NOT NULL DEFAULT 'c026d3',
        "accentColor" TEXT NOT NULL DEFAULT 'f97316',
        "bgColor" TEXT NOT NULL DEFAULT 'ffffff',
        "siteName" TEXT NOT NULL DEFAULT 'RobloxBoutik',
        "heroTitle" TEXT NOT NULL DEFAULT 'Achète tes items Roblox préférés',
        "heroSubtitle" TEXT NOT NULL DEFAULT 'Paiement Wave · Livraison rapide · Paiement sécurisé',
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
      );
    `;
    results.push("SiteConfig table OK");

    await db.$executeRaw`
      INSERT INTO "roboutik"."SiteConfig" ("id")
      VALUES ('default')
      ON CONFLICT ("id") DO NOTHING;
    `;
    results.push("SiteConfig default row OK");
  } catch (e) {
    results.push(`SiteConfig error: ${e instanceof Error ? e.message : "?"}`);
  }

  // 2. Add lastActiveAt column to User table if missing
  try {
    await db.$executeRaw`
      ALTER TABLE "roboutik"."User"
      ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
    `;
    results.push("User.lastActiveAt column OK");
  } catch (e) {
    results.push(`User.lastActiveAt error: ${e instanceof Error ? e.message : "?"}`);
  }

  return NextResponse.json({
    ok: true,
    appliedBy: admin?.username,
    results,
  });
}
