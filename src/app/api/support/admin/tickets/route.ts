import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// GET /api/support/admin/tickets?adminId=...&status=OPEN
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminId = searchParams.get("adminId");
  const status = searchParams.get("status") || "ADMIN_HANDLED";

  const reqWithHeader = new NextRequest(req, {
    headers: new Headers(req.headers),
  });
  reqWithHeader.headers.set("x-user-id", adminId ?? "");

  const { error } = await getActor(reqWithHeader, { requireAdmin: true });
  if (error) return errorResponse(error);

  const tickets = await db.supportTicket.findMany({
    where: status === "ALL" ? {} : { status },
    include: {
      opener: {
        select: { id: true, username: true, avatar: true, email: true, isBanned: true },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [
      { priority: "desc" },
      { updatedAt: "desc" },
    ],
    take: 200,
  });

  return NextResponse.json({ tickets });
}
