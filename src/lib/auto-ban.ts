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

/**
 * Reciprocal auto-ban: count "dismissed" SELLER reports opened by a buyer.
 *
 * A report is considered "dismissed" (false / unfounded) when:
 *  - category = "SELLER"
 *  - status = "RESOLVED" (an admin closed it)
 *  - the reported seller (linked via orderId) is NOT currently banned
 *
 * If a buyer reaches AUTO_BAN_THRESHOLD (3) dismissed reports, they get
 * auto-banned with reason "Auto-ban: 3 faux signalements".
 *
 * Pre-sale listing reports (no orderId) are NOT counted here because we
 * can't reliably link them back to a specific seller to check the ban status.
 */
export async function countDismissedBuyerReports(buyerId: string): Promise<number> {
  const tickets = await db.supportTicket.findMany({
    where: {
      openerId: buyerId,
      category: "SELLER",
      status: "RESOLVED",
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
    if (!order) continue;
    const seller = await db.user.findUnique({
      where: { id: order.sellerId },
      select: { isBanned: true },
    });
    // If the seller is NOT banned, the report was unfounded → count it.
    if (seller && !seller.isBanned) count++;
  }
  return count;
}

/**
 * Auto-ban a buyer if they have filed AUTO_BAN_THRESHOLD false reports.
 * Returns true if the buyer was auto-banned, false otherwise.
 */
export async function maybeAutoBanBuyer(buyerId: string): Promise<{
  banned: boolean;
  dismissedCount: number;
}> {
  const user = await db.user.findUnique({ where: { id: buyerId } });
  if (!user) return { banned: false, dismissedCount: 0 };

  // Skip if already banned or is admin
  if (user.isBanned || user.isAdmin) {
    return { banned: false, dismissedCount: 0 };
  }

  const dismissedCount = await countDismissedBuyerReports(buyerId);
  if (dismissedCount < AUTO_BAN_THRESHOLD) {
    return { banned: false, dismissedCount };
  }

  // Auto-ban the buyer for false reporting
  await db.user.update({
    where: { id: buyerId },
    data: {
      isBanned: true,
      bannedAt: new Date(),
      banReason: `Auto-ban : ${dismissedCount} faux signalements. Contacte le support pour faire appel.`,
    },
  });

  await logAdminAction({
    actorId: null,
    targetId: buyerId,
    action: "AUTO_BAN_BUYER",
    metadata: { dismissedCount, threshold: AUTO_BAN_THRESHOLD },
  });

  return { banned: true, dismissedCount };
}

export { AUTO_BAN_THRESHOLD };
