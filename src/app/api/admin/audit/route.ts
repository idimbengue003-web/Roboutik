import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// GET /api/admin/audit?adminId=...&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const logs = await db.auditLog.findMany({
    include: {
      actor: { select: { id: true, username: true, avatar: true } },
      target: { select: { id: true, username: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ logs });
}
