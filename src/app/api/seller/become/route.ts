import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, errorResponse, becomeSellerSchema } from "@/lib/validation";

// POST /api/seller/become  body: { userId }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const [data, error] = parseBody(becomeSellerSchema, body);
    if (error) return errorResponse(error);
    const { userId } = data!;
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
