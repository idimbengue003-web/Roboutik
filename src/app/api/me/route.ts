import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/me?userId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  const me = await db.user.findUnique({ where: { id: userId } });
  if (!me) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user: me });
}
