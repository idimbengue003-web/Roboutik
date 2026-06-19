import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/setup - one-time setup: pushes schema + seeds data
// Use this on first deployment to initialize the Neon database.
export async function GET() {
  const log: string[] = [];
  try {
    log.push("Connecting to database...");

    // Test connection
    await db.$queryRaw`SELECT 1`;
    log.push("✓ Database connection OK");

    // Try to count users - if fails, schema not pushed yet
    let userCount = 0;
    try {
      const result = await db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count FROM "User"
      `;
      userCount = Number(result[0]?.count ?? 0);
      log.push(`✓ Schema exists, ${userCount} users found`);
    } catch (e) {
      log.push(
        `⚠ Schema missing: ${e instanceof Error ? e.message.slice(0, 100) : "unknown"}`
      );
      log.push(
        `→ Run "prisma db push" with DATABASE_URL to create tables, then call /api/init to seed.`
      );
      return NextResponse.json({ ok: false, needsDbPush: true, log });
    }

    // If empty, seed
    if (userCount === 0) {
      log.push("→ Database empty, seeding...");
      const initRes = await fetch(`${process.env.NEXT_PUBLIC_URL || ""}/api/init`);
      if (initRes.ok) {
        const initData = await initRes.json();
        log.push(
          `✓ Seeded: ${initData.games?.length ?? 0} games, ${initData.listingsCreated ?? 0} new listings`
        );
      } else {
        log.push("→ /api/init failed, call it directly");
      }
    } else {
      log.push("✓ Database already seeded");
    }

    return NextResponse.json({ ok: true, log });
  } catch (e) {
    console.error("Setup error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
        log,
      },
      { status: 500 }
    );
  }
}
