import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNotification, buildEmailHtml } from "@/lib/notifications";
import { isFictionalSeller, getAdminForwardUserId } from "@/lib/fictional-sellers";
import { getActor, errorResponse } from "@/lib/security";

/**
 * GET /api/cron/check-sla?adminId=...
 *
 * Called by the admin dashboard polling (every ~15s when admin is online).
 * Finds buyer messages that haven't been answered by the seller within 30 minutes
 * and sends an urgent email to the seller (or admin if fictional).
 *
 * Prevents duplicate alerts by tracking which messages have already been alerted
 * via the NotificationLog table (refType = 'SLA_ALERT', refId = messageId).
 */

const SLA_MINUTES = 30;

export async function GET(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const now = new Date();
  const threshold = new Date(now.getTime() - SLA_MINUTES * 60 * 1000);
  const alerted: string[] = [];

  // 1. Check pre-sale conversations (ConversationMessage)
  // Find conversations where the last message is from the buyer and was sent >30 min ago
  const conversations = await db.conversation.findMany({
    where: {
      updatedAt: { lt: threshold },
    },
    include: {
      listing: { include: { game: true } },
      buyer: true,
      seller: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  for (const conv of conversations) {
    if (conv.messages.length === 0) continue;
    const lastMsg = conv.messages[conv.messages.length - 1];

    // Only alert if the last message is from the BUYER (not from seller/admin)
    if (lastMsg.senderId !== conv.buyerId) continue;
    // Only alert if the message is older than 30 min
    if (new Date(lastMsg.createdAt) > threshold) continue;

    // Check if we already alerted for this message
    const alreadyAlerted = await db.notificationLog.findFirst({
      where: {
        refType: "SLA_ALERT",
        refId: lastMsg.id,
        status: "SENT",
      },
    });
    if (alreadyAlerted) continue;

    // Determine who to notify (seller or admin if fictional)
    const sellerIsFictional = isFictionalSeller(conv.seller?.email);
    const notifyUserId = sellerIsFictional
      ? getAdminForwardUserId()!
      : conv.sellerId;

    const minutesLate = Math.floor(
      (now.getTime() - new Date(lastMsg.createdAt).getTime()) / 60000
    );

    try {
      await sendNotification({
        userId: notifyUserId,
        type: "NEW_MESSAGE",
        subject: `⏰ URGENT — Message sans réponse depuis ${minutesLate} min`,
        body: buildEmailHtml(
          "⏰ Message en attente de réponse",
          `<div style="background:#fef2f2;border-radius:12px;padding:16px;margin:0 0 16px;border-left:4px solid #ef4444;">
            <p style="margin:0;font-size:16px;color:#991b1b;font-weight:bold;">⚠️ Message sans réponse depuis ${minutesLate} minutes</p>
            <p style="margin:4px 0 0;color:#7f1d1d;">L'acheteur <strong>${conv.buyer?.username}</strong> attend ta réponse.</p>
          </div>
          <p style="background:#f8fafc; padding:12px; border-radius:8px; margin:12px 0;">
            <strong>${conv.listing?.title}</strong><br>
            <span style="color:#64748b;">${conv.listing?.game?.name} · ${conv.listing?.price} FCFA</span>
          </p>
          ${sellerIsFictional ? `<p style="background:#ede9fe; padding:8px; border-radius:6px; color:#5b21b6; font-size:12px;">ℹ️ Vendeur virtuel : ${conv.seller?.username}</p>` : ""}
          <p style="background:#fef3c7; padding:12px; border-radius:8px; border-left:3px solid #f59e0b;">
            ${lastMsg.content.slice(0, 200)}
          </p>
          <p style="margin-top:16px;">Connecte-toi MAINTENANT pour répondre.</p>
          <p style="margin-top:24px;"><a href="https://robloxboutik.com" style="background:#dc2626;color:white;padding:14px 28px;border-radius:9999px;text-decoration:none;font-weight:bold;font-size:16px;">Répondre maintenant →</a></p>`
        ),
        whatsappBody: `⏰ URGENT: ${conv.buyer?.username} attend ta réponse depuis ${minutesLate} min. Connecte-toi à RobloxBoutik.`,
        refType: "SLA_ALERT",
        refId: lastMsg.id,
      });
      alerted.push(`conv:${lastMsg.id}`);
    } catch (e) {
      console.error("SLA alert failed:", e);
    }
  }

  // 2. Check order chats (Message)
  const orders = await db.order.findMany({
    where: {
      status: { in: ["PAID", "DELIVERED"] },
      updatedAt: { lt: threshold },
    },
    include: {
      listing: { include: { game: true } },
      buyer: true,
      seller: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  for (const order of orders) {
    if (order.messages.length === 0) continue;
    const lastMsg = order.messages[order.messages.length - 1];

    // Only alert if the last message is from the BUYER
    if (lastMsg.senderId !== order.buyerId) continue;
    // Skip auto messages
    if (lastMsg.isAuto) continue;
    // Only alert if >30 min
    if (new Date(lastMsg.createdAt) > threshold) continue;

    // Check if already alerted
    const alreadyAlerted = await db.notificationLog.findFirst({
      where: {
        refType: "SLA_ALERT",
        refId: lastMsg.id,
        status: "SENT",
      },
    });
    if (alreadyAlerted) continue;

    const sellerIsFictional = isFictionalSeller(order.seller?.email);
    const notifyUserId = sellerIsFictional
      ? getAdminForwardUserId()!
      : order.sellerId;

    const minutesLate = Math.floor(
      (now.getTime() - new Date(lastMsg.createdAt).getTime()) / 60000
    );

    try {
      await sendNotification({
        userId: notifyUserId,
        type: "NEW_MESSAGE",
        subject: `⏰ URGENT — Commande sans réponse depuis ${minutesLate} min`,
        body: buildEmailHtml(
          "⏰ Commande en attente de réponse",
          `<div style="background:#fef2f2;border-radius:12px;padding:16px;margin:0 0 16px;border-left:4px solid #ef4444;">
            <p style="margin:0;font-size:16px;color:#991b1b;font-weight:bold;">⚠️ Message sans réponse depuis ${minutesLate} minutes</p>
            <p style="margin:4px 0 0;color:#7f1d1d;">L'acheteur <strong>${order.buyer?.username}</strong> attend ta réponse sur sa commande.</p>
          </div>
          <p style="background:#f8fafc; padding:12px; border-radius:8px; margin:12px 0;">
            <strong>${order.listing?.title}</strong><br>
            <span style="color:#64748b;">${order.listing?.game?.name} · ${order.amount} FCFA</span>
          </p>
          ${sellerIsFictional ? `<p style="background:#ede9fe; padding:8px; border-radius:6px; color:#5b21b6; font-size:12px;">ℹ️ Vendeur virtuel : ${order.seller?.username}</p>` : ""}
          <p style="background:#fef3c7; padding:12px; border-radius:8px; border-left:3px solid #f59e0b;">
            ${lastMsg.content.slice(0, 200)}
          </p>
          <p style="margin-top:16px;">Connecte-toi MAINTENANT pour répondre.</p>
          <p style="margin-top:24px;"><a href="https://robloxboutik.com" style="background:#dc2626;color:white;padding:14px 28px;border-radius:9999px;text-decoration:none;font-weight:bold;font-size:16px;">Répondre maintenant →</a></p>`
        ),
        whatsappBody: `⏰ URGENT: ${order.buyer?.username} attend ta réponse sur sa commande depuis ${minutesLate} min.`,
        refType: "SLA_ALERT",
        refId: lastMsg.id,
      });
      alerted.push(`order:${lastMsg.id}`);
    } catch (e) {
      console.error("SLA alert (order) failed:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: conversations.length + orders.length,
    alerted: alerted.length,
    alerts: alerted,
  });
}
