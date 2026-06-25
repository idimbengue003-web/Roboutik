import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * GET /api/admin/notification-logs?adminId=...&limit=50
 *
 * Returns the latest notification log entries so the admin can see
 * whether emails are being SENT, SKIPPED, or FAILED.
 */
export async function GET(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

  const logs = await db.notificationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      channel: true,
      type: true,
      recipientEmail: true,
      recipientPhone: true,
      subject: true,
      status: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ logs });
}
