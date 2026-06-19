import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// GET /api/admin/audit?adminId=...&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminId = searchParams.get("adminId");
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

  const reqWithHeader = new NextRequest(req, {
    headers: new Headers(req.headers),
  });
  reqWithHeader.headers.set("x-user-id", adminId ?? "");

  const { error } = await getActor(reqWithHeader, { requireAdmin: true });
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
