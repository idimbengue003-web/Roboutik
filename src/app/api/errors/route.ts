import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { captureError } from "@/lib/error-tracking";

/**
 * POST /api/errors
 *
 * Client-side error capture endpoint.
 * Called by the global error handler in app/client-error-tracker.ts.
 *
 * Body: {
 *   message: string,
 *   stack?: string,
 *   severity?: 'low' | 'medium' | 'high' | 'critical',
 *   path?: string,
 *   userAgent?: string,
 *   metadata?: Record<string, unknown>,
 *   userId?: string,
 * }
 *
 * Rate limited: 10 errors per IP per minute (via middleware).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "message requis" },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") ?? undefined;
    const ip =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim();

    await captureError({
      message: String(body.message).slice(0, 1000),
      stack: body.stack ? String(body.stack).slice(0, 4000) : undefined,
      severity: ["low", "medium", "high", "critical"].includes(body.severity)
        ? body.severity
        : "medium",
      userId: body.userId ? String(body.userId) : undefined,
      path: body.path ? String(body.path).slice(0, 500) : undefined,
      method: "CLIENT",
      userAgent,
      metadata: {
        ...(body.metadata ?? {}),
        ip: ip ? String(ip).slice(0, 50) : "unknown",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to capture client error:", e);
    return NextResponse.json(
      { error: "Capture failed" },
      { status: 500 }
    );
  }
}
