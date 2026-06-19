import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/seller/become  body: { userId }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body as { userId?: string };
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    const user = await db.user.update({
      where: { id: userId },
      data: { isSeller: true },
    });
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
