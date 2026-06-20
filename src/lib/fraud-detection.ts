/**
 * Fraud detection helpers.
 *
 * Currently detects:
 *  - Same IP for buyer and seller on an order (suspicious — could be self-dealing)
 *
 * Future improvements:
 *  - Multiple accounts from same IP
 *  - Unusual order patterns (high frequency, similar amounts)
 *  - New account + immediate high-value withdrawal
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

type FraudCheckResult = {
  flagged: boolean;
  reason?: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

/**
 * Check if the buyer and seller have the same recent IP.
 * Uses the Order's buyerId/sellerId and the current request IP.
 *
 * This is a soft check — it logs a warning but does NOT block the order.
 * The admin can review flagged orders in the admin panel.
 */
export async function checkSameIpFraud(
  buyerId: string,
  sellerId: string,
  currentIp: string
): Promise<FraudCheckResult> {
  if (currentIp === "unknown" || !currentIp) {
    return { flagged: false, severity: "LOW" };
  }

  // We don't currently store IPs on User (privacy). To implement this fully,
  // we'd need to add a `lastIp` field to User and update it on each request.
  // For now, just flag if buyer and seller are the same user.
  if (buyerId === sellerId) {
    return {
      flagged: true,
      reason: "Buyer and seller are the same user",
      severity: "HIGH",
    };
  }

  // Future: compare with stored IPs from AuditLog or a new IPLog table.
  return { flagged: false, severity: "LOW" };
}

/**
 * Check if a user is creating too many listings in a short time.
 * Returns true if the rate is suspicious (e.g., > 10 listings in 1 hour).
 */
export async function checkListingSpamRate(sellerId: string): Promise<FraudCheckResult> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentListings = await db.listing.count({
    where: {
      sellerId,
      createdAt: { gt: oneHourAgo },
    },
  });

  if (recentListings >= 10) {
    return {
      flagged: true,
      reason: `${recentListings} annonces créées en 1h`,
      severity: "MEDIUM",
    };
  }

  return { flagged: false, severity: "LOW" };
}

/**
 * Check if a new account is immediately trying to withdraw a large amount.
 * Returns true if suspicious (account < 24h + withdrawal > 50k FCFA).
 */
export async function checkNewAccountHighWithdrawal(
  sellerId: string,
  amount: number
): Promise<FraudCheckResult> {
  if (amount < 50_000) {
    return { flagged: false, severity: "LOW" };
  }

  const user = await db.user.findUnique({
    where: { id: sellerId },
    select: { createdAt: true },
  });
  if (!user) return { flagged: false, severity: "LOW" };

  const accountAgeMs = Date.now() - user.createdAt.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (accountAgeMs < oneDayMs) {
    return {
      flagged: true,
      reason: `Compte récent (< 24h) demande un retrait de ${amount} FCFA`,
      severity: "HIGH",
    };
  }

  return { flagged: false, severity: "LOW" };
}
