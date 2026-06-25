"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { notifyNewMessage } from "@/components/shop/notification-permission";

/**
 * Hook that polls all the user's conversations + orders every 8 seconds,
 * detects new incoming messages (not sent by the current user), and fires
 * a native browser notification when one arrives.
 *
 * Mount this hook once at the app root (page.tsx, admin, seller/[id]).
 * It auto-disables when the user is not logged in.
 */
export function useMessageNotifications() {
  const me = useAppStore((s) => s.me);
  const lastMessageIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!me?.id) return;

    let cancelled = false;

    async function checkForNewMessages() {
      if (cancelled || !me) return;
      try {
        // 1. Poll all conversations (pre-sale messages)
        const convRes = await fetch(`/api/conversations?userId=${me.id}`);
        if (!convRes.ok) return;
        const convData = await convRes.json();
        const conversations = convData.conversations ?? [];

        for (const conv of conversations) {
          const messages = conv.messages ?? [];
          for (const msg of messages) {
            // Skip our own messages — only notify about messages from the other party
            if (msg.senderId === me.id) continue;
            // Skip auto messages (system notifications)
            if (msg.isAuto) continue;

            const msgKey = `conv-${msg.id}`;
            if (!lastMessageIdsRef.current.has(msgKey)) {
              // First time we see this message
              if (initializedRef.current) {
                // Only fire notification if we've already initialized (not on first load)
                const otherParty =
                  conv.buyerId === me.id ? conv.seller : conv.buyer;
                const otherName = otherParty?.username ?? "Quelqu'un";
                notifyNewMessage(
                  `💬 Nouveau message de ${otherName}`,
                  `${(msg.content ?? "").slice(0, 80)}${
                    msg.content?.length > 80 ? "…" : ""
                  }`
                );
              }
              lastMessageIdsRef.current.add(msgKey);
            }
          }
        }

        // 2. Poll all orders (chat after purchase) — buyer OR seller
        const ordersRes = await fetch(`/api/orders?userId=${me.id}`);
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          const orders = ordersData.orders ?? [];
          for (const order of orders) {
            const messages = order.messages ?? [];
            for (const msg of messages) {
              if (msg.senderId === me.id) continue;
              if (msg.isAuto) continue;

              const msgKey = `order-${msg.id}`;
              if (!lastMessageIdsRef.current.has(msgKey)) {
                if (initializedRef.current) {
                  const otherParty =
                    order.buyerId === me.id ? order.seller : order.buyer;
                  const otherName = otherParty?.username ?? "Quelqu'un";
                  notifyNewMessage(
                    `💬 ${otherName} — commande`,
                    `${(msg.content ?? "").slice(0, 80)}${
                      msg.content?.length > 80 ? "…" : ""
                    }`
                  );
                }
                lastMessageIdsRef.current.add(msgKey);
              }
            }
          }
        }

        // Mark as initialized after the first poll completes
        initializedRef.current = true;
      } catch {
        /* ignore — retry next poll */
      }
    }

    // Run immediately, then every 8 seconds
    checkForNewMessages();
    const interval = setInterval(checkForNewMessages, 8000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [me?.id]);
}
