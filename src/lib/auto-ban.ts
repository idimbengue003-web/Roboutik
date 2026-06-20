/**
 * Auto-ban logic: if a seller has 3+ confirmed reports (URGENT SELLER tickets),
 * they get auto-banned with reason "Auto-ban: 3 signalements confirmés".
 *
 * This function is called:
 *  - When a new report is created (POST /api/orders/[id]/report)
 *  - When an admin marks a ticket as RESOLVED against the seller
 */

import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/security";

const AUTO_BAN_THRESHOLD = 3;

/**
 * Count confirmed URGENT SELLER reports against a user.
 * "Confirmed" = ticket exists with category=SELLER, status in [ADMIN_HANDLED, RESOLVED]
 */
export async function countConfirmedReports(sellerId: string): Promise<number> {
  // Find all SELLER tickets where this user was the seller of the linked order
  const tickets = await db.supportTicket.findMany({
    where: {
      category: "SELLER",
      status: { in: ["ADMIN_HANDLED", "RESOLVED"] },
      orderId: { not: null },
    },
    select: { orderId: true },
  });

  let count = 0;
  for (const t of tickets) {
    if (!t.orderId) continue;
    const order = await db.order.findUnique({
      where: { id: t.orderId },
      select: { sellerId: true },
    });
    if (order?.sellerId === sellerId) count++;
  }
  return count;
}

/**
 * Auto-ban a seller if they have reached the report threshold.
 * Returns true if the user was auto-banned, false otherwise.
 */
export async function maybeAutoBanSeller(sellerId: string): Promise<{
  banned: boolean;
  reportCount: number;
}> {
  const user = await db.user.findUnique({ where: { id: sellerId } });
  if (!user) return { banned: false, reportCount: 0 };

  // Skip if already banned or is admin
  if (user.isBanned || user.isAdmin) {
    return { banned: false, reportCount: 0 };
  }

  const reportCount = await countConfirmedReports(sellerId);
  if (reportCount < AUTO_BAN_THRESHOLD) {
    return { banned: false, reportCount };
  }

  // Auto-ban!
  await db.user.update({
    where: { id: sellerId },
    data: {
      isBanned: true,
      bannedAt: new Date(),
      banReason: `Auto-ban : ${reportCount} signalements confirmés de vendeur. Contacte le support pour faire appel.`,
    },
  });

  // Log as system action (no actor)
  await logAdminAction({
    actorId: null,
    targetId: sellerId,
    action: "AUTO_BAN_SELLER",
    metadata: { reportCount, threshold: AUTO_BAN_THRESHOLD },
  });

  return { banned: true, reportCount };
}

export { AUTO_BAN_THRESHOLD };
