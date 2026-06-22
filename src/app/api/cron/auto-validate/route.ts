import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/cron/auto-validate
 *
 * Cron job called by Vercel Cron every hour.
 * Auto-validates orders that have passed their autoValidateAt (paidAt + 24h)
 * and are still in PAID or DELIVERED status.
 *
 * Security: protected by CRON_SECRET header — Vercel Cron sends this
 * automatically when configured in vercel.json.
 *
 * Configure in vercel.json:
 *   "crons": [{ "path": "/api/cron/auto-validate", "schedule": "0 * * * *" }]
 */
export async function GET(req: NextRequest) {
  // Verify CRON_SECRET to prevent public abuse
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let validatedCount = 0;
  const errors: string[] = [];

  try {
    // Find orders past their autoValidateAt that are still PAID or DELIVERED
    const expiredOrders = await db.order.findMany({
      where: {
        autoValidateAt: { lt: now },
        status: { in: ["PAID", "DELIVERED"] },
      },
      include: {
        listing: { include: { game: true } },
        seller: true,
        buyer: true,
      },
      take: 50, // batch limit
    });

    for (const order of expiredOrders) {
      try {
        // Credit seller with NET amount (excl. commission)
        const netAmount = order.sellerNetAmount;
        await db.$transaction([
          db.order.update({
            where: { id: order.id },
            data: {
              status: "VALIDATED",
              validatedAt: now,
            },
          }),
          db.user.update({
            where: { id: order.sellerId },
            data: { balance: { increment: netAmount } },
          }),
          db.message.create({
            data: {
              orderId: order.id,
              senderId: order.sellerId,
              content: `⏰ Validation automatique : ${netAmount} FCFA (montant net) ont été transférés sur mon solde Wave. Merci pour ta commande !`,
              isAuto: true,
            },
          }),
        ]);
        validatedCount++;
      } catch (e) {
        errors.push(
          `Order ${order.id}: ${e instanceof Error ? e.message : "unknown"}`
        );
      }
    }

    // Also handle order cancellation: PENDING_PAYMENT orders older than 1h
    // should be cancelled (buyer never paid)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const stalePendingOrders = await db.order.findMany({
      where: {
        status: "PENDING_PAYMENT",
        createdAt: { lt: oneHourAgo },
      },
      take: 50,
    });

    let cancelledCount = 0;
    for (const order of stalePendingOrders) {
      try {
        await db.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });
        cancelledCount++;
      } catch (e) {
        errors.push(
          `Cancel ${order.id}: ${e instanceof Error ? e.message : "unknown"}`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      validated: validatedCount,
      cancelled: cancelledCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    });
  } catch (e) {
    console.error("Cron auto-validate error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
        errors,
      },
      { status: 500 }
    );
  }
}
