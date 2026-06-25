// Service Worker for RobloxBoutik
// Handles background notifications when the app is installed as a PWA.
// The actual push delivery requires Web Push API (VAPID + push subscription),
// but this SW also enables basic notification display + click handling.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks — focus or open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus existing window if any
      for (const client of allClients) {
        if (client.url.includes("robloxboutik.com") || client.url === "/") {
          client.focus();
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        await self.clients.openWindow("/");
      }
    })()
  );
});

// Handle push events (when Web Push is configured)
self.addEventListener("push", (event) => {
  let data = { title: "RobloxBoutik", body: "Nouveau message" };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logo-roboutik.png",
      badge: "/favicon-192.png",
      tag: "roboutik-message",
      renotify: true,
      data: { url: data.url || "/" },
    })
  );
});
