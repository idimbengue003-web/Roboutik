import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// GET /api/support/admin/tickets?adminId=...&status=OPEN
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "ADMIN_HANDLED";

  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const tickets = await db.supportTicket.findMany({
    where: status === "ALL" ? {} : { status },
    include: {
      opener: {
        select: { id: true, username: true, avatar: true, email: true, isBanned: true },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ tickets });
}
