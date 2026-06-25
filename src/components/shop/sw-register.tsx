"use client";

import { useEffect } from "react";

/**
 * Client component that registers the service worker for PWA + notifications.
 * Mount once at the app root (inside AuthProvider).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((e) => console.error("SW registration failed:", e));
    }
  }, []);

  return null;
}
