import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * GET /api/admin/errors?adminId=...&severity=high&unresolved=true&limit=50
 *
 * Returns error logs for the admin panel.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const severity = searchParams.get("severity"); // low|medium|high|critical|all
  const unresolvedOnly = searchParams.get("unresolved") === "true";
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const where: {
    severity?: string;
    resolved?: boolean;
  } = {};
  if (severity && severity !== "all") where.severity = severity;
  if (unresolvedOnly) where.resolved = false;

  const errors = await db.errorLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Stats
  const total = await db.errorLog.count({ where: unresolvedOnly ? { resolved: false } : {} });
  const critical = await db.errorLog.count({
    where: { severity: "critical", resolved: false },
  });
  const high = await db.errorLog.count({
    where: { severity: "high", resolved: false },
  });

  return NextResponse.json({
    errors,
    stats: {
      total,
      critical,
      high,
      unresolved: critical + high,
    },
  });
}

/**
 * PATCH /api/admin/errors
 * body: { adminId, errorId, resolved: true }
 * Mark an error as resolved.
 */
export async function PATCH(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const body = await req.json().catch(() => ({}));
  const { errorId, resolved } = body as { errorId?: string; resolved?: boolean };

  if (!errorId) {
    return NextResponse.json({ error: "errorId requis" }, { status: 400 });
  }

  const updated = await db.errorLog.update({
    where: { id: errorId },
    data: { resolved: resolved ?? true },
  });

  return NextResponse.json({ error: updated });
}
