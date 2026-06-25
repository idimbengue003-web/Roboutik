"use client";

import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { useSyncExternalStore, useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store";

const STORAGE_KEY = "rb_notif_prompted";

function getPermissionSnapshot(): string {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}
function getServerSnapshot(): string {
  return "default";
}
function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function NotificationPermission() {
  const { me } = useAppStore();
  const [showBanner, setShowBanner] = useState(false);
  const permission = useSyncExternalStore(subscribe, getPermissionSnapshot, getServerSnapshot);

  // Show the banner 1.5s after the user logs in (if permission is still "default")
  useEffect(() => {
    if (!me) return;
    if (permission !== "default") return;
    const alreadyPrompted = localStorage.getItem(STORAGE_KEY);
    if (alreadyPrompted) return;
    const t = setTimeout(() => setShowBanner(true), 1500);
    return () => clearTimeout(t);
  }, [me, permission]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    localStorage.setItem(STORAGE_KEY, "true");
    const result = await Notification.requestPermission();
    setShowBanner(false);
    window.dispatchEvent(new Event("storage"));
    if (result === "granted") {
      try {
        // Prefer service worker registration so notifications work in background
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification("RobloxBoutik 🎮", {
            body: "Notifications activées ! Tu seras prévenu·e quand tu reçois un message ou une commande.",
            icon: "/logo-roboutik.png",
            badge: "/favicon-192.png",
            tag: "robloxboutik-welcome",
          });
        } else {
          new Notification("RobloxBoutik 🎮", {
            body: "Notifications activées ! Tu seras prévenu·e quand tu reçois un message ou une commande.",
            icon: "/logo-roboutik.png",
          });
        }
      } catch {
        /* noop */
      }
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShowBanner(false);
  }, []);

  if (!showBanner || !me) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-sm rounded-2xl bg-white border shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-fuchsia-100 shrink-0">
          <Bell className="size-5 text-fuchsia-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 text-sm">Active les notifications 🔔</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sois prévenu·e quand un acheteur t'écrit ou quand un vendeur te répond.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={requestPermission} className="h-8 rounded-full bg-fuchsia-600 text-white text-xs font-bold">
              <Bell className="size-3.5" />
              Activer
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} className="h-8 text-xs text-slate-400">
              Plus tard
            </Button>
          </div>
        </div>
        <button onClick={dismiss} className="text-slate-300 hover:text-slate-500">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function notifyNewMessage(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    // Prefer service worker registration so notifications work even when
    // the tab is in the background (and persist on Android via PWA).
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: "/logo-roboutik.png",
          badge: "/favicon-192.png",
          tag: "robloxboutik-message",
          renotify: true,
        });
      }).catch(() => {
        // Fallback: direct Notification API
        new Notification(title, { body, icon: "/logo-roboutik.png" });
      });
    } else {
      new Notification(title, { body, icon: "/logo-roboutik.png" });
    }
  } catch {
    /* noop */
  }
}
