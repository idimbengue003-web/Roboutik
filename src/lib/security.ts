// Shared security helpers used by all API routes

import { db } from "@/lib/db";
import type { NextRequest } from "next/server";

/**
 * Get the acting user from the request, check ban status, optionally check admin.
 * Returns { user, error } where error is a NextResponse-ready JSON.
 *
 * The userId can be passed via:
 *   - x-user-id header
 *   - userId query param
 *   - userId field in JSON body (only if body is JSON)
 */
export async function getActor(
  req: NextRequest,
  options: { requireAdmin?: boolean; requireSeller?: boolean } = {}
): Promise<{
  user: Awaited<ReturnType<typeof db.user.findUnique>>;
  error: null | { status: number; body: Record<string, unknown> };
}> {
  const { requireAdmin = false, requireSeller = false } = options;

  // Try header first
  let userId: string | null = req.headers.get("x-user-id");

  // Try query param (userId or adminId as alias)
  if (!userId) {
    const sp = new URL(req.url).searchParams;
    userId = sp.get("userId") || sp.get("adminId");
  }

  // Try JSON body (only if not GET/DELETE and content-type is JSON)
  if (!userId && req.method !== "GET" && req.method !== "DELETE") {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        const body = await req.json();
        if (typeof body?.userId === "string") userId = body.userId;
        else if (typeof body?.adminId === "string") userId = body.adminId;
      } catch {
        /* not JSON or already parsed */
      }
    }
  }

  if (!userId || typeof userId !== "string") {
    return {
      user: null,
      error: { status: 401, body: { error: "Connecte-toi d'abord" } },
    };
  }

  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    return {
      user: null,
      error: { status: 401, body: { error: "Utilisateur introuvable" } },
    };
  }

  if (user.isBanned) {
    return {
      user: null,
      error: {
        status: 403,
        body: {
          error: `Ton compte est banni${user.banReason ? ` : ${user.banReason}` : ""}. Contacte le support.`,
          banned: true,
        },
      },
    };
  }

  if (requireAdmin && !user.isAdmin) {
    return {
      user: null,
      error: { status: 403, body: { error: "Accès réservé aux administrateurs" } },
    };
  }

  if (requireSeller && !user.isSeller) {
    return {
      user: null,
      error: { status: 403, body: { error: "Réservé aux vendeurs" } },
    };
  }

  return { user, error: null };
}

/**
 * Variant of getActor that takes a userId directly (already extracted from body).
 * Useful for POST routes that need to parse the body themselves.
 */
export async function getActorById(
  userId: string | null | undefined,
  options: { requireAdmin?: boolean; requireSeller?: boolean } = {}
): Promise<{
  user: Awaited<ReturnType<typeof db.user.findUnique>>;
  error: null | { status: number; body: Record<string, unknown> };
}> {
  const { requireAdmin = false, requireSeller = false } = options;

  if (!userId || typeof userId !== "string") {
    return {
      user: null,
      error: { status: 401, body: { error: "Connecte-toi d'abord" } },
    };
  }

  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    return {
      user: null,
      error: { status: 401, body: { error: "Utilisateur introuvable" } },
    };
  }

  if (user.isBanned) {
    return {
      user: null,
      error: {
        status: 403,
        body: {
          error: `Ton compte est banni${user.banReason ? ` : ${user.banReason}` : ""}. Contacte le support.`,
          banned: true,
        },
      },
    };
  }

  if (requireAdmin && !user.isAdmin) {
    return {
      user: null,
      error: { status: 403, body: { error: "Accès réservé aux administrateurs" } },
    };
  }

  if (requireSeller && !user.isSeller) {
    return {
      user: null,
      error: { status: 403, body: { error: "Réservé aux vendeurs" } },
    };
  }

  return { user, error: null };
}
export function errorResponse(error: {
  status: number;
  body: Record<string, unknown>;
}) {
  return Response.json(error.body, { status: error.status });
}

/**
 * Validate a price: must be a positive integer within [min, max].
 */
export function validatePrice(
  price: unknown,
  min = 100,
  max = 1_000_000
): { ok: boolean; error?: string; value?: number } {
  if (typeof price !== "number" || !Number.isFinite(price) || !Number.isInteger(price)) {
    return { ok: false, error: "Prix invalide" };
  }
  if (price < min) return { ok: false, error: `Prix minimum : ${min} FCFA` };
  if (price > max) return { ok: false, error: `Prix maximum : ${max} FCFA` };
  return { ok: true, value: price };
}

/**
 * Validate a Wave phone number (Senegalese format: 7X XXX XX XX).
 */
export function validateWavePhone(phone: string | undefined): {
  ok: boolean;
  value?: string;
} {
  if (!phone) return { ok: true, value: undefined };
  const cleaned = phone.replace(/\s+/g, "");
  // 9 digits starting with 7 (Senegal Orange/Wave/Free)
  if (!/^7\d{8}$/.test(cleaned)) {
    return { ok: false };
  }
  return { ok: true, value: cleaned };
}

/**
 * Log an admin action to the audit trail.
 */
export async function logAdminAction(params: {
  actorId: string;
  targetId?: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId,
        targetId: params.targetId ?? null,
        action: params.action,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (e) {
    console.error("Failed to log admin action:", e);
  }
}
