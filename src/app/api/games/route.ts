import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/games - all games sorted, favorites first
export async function GET() {
  const games = await db.game.findMany({
    orderBy: [{ sortOrder: "asc" }],
  });
  return NextResponse.json({ games });
}
