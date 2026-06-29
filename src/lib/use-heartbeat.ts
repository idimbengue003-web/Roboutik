"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

/**
 * Hook that sends a heartbeat to the server every 30 seconds
 * when the user is logged in. This updates the lastActiveAt timestamp
 * which is used to determine online/offline status.
 *
 * Also sends a heartbeat on page visibility change (when the user
 * comes back to the tab).
 */
export function useHeartbeat() {
  const me = useAppStore((s) => s.me);

  useEffect(() => {
    if (!me?.id) return;

    const sendHeartbeat = () => {
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me.id }),
        keepalive: true,
      }).catch(() => {});
    };

    // Send immediately on mount
    sendHeartbeat();

    // Then every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000);

    // Also send when the tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [me?.id]);
}
