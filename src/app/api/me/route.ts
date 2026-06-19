import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/me - returns the demo buyer
export async function GET() {
  const me = await db.user.findUnique({ where: { username: "Moi" } });
  if (!me) {
    return NextResponse.json({ error: "Run /api/init first" }, { status: 400 });
  }
  return NextResponse.json({ user: me });
}
