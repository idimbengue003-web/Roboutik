"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Home, Gamepad2, ShoppingBag, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function Header() {
  const { activeTab, setActiveTab, me, ordersVersion } = useAppStore();
  const [orderCount, setOrderCount] = useState(0);

  // Fetch pending orders count for the badge
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/orders?buyerId=${me.id}`);
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        const pending = (d.orders ?? []).filter(
          (o: { status: string }) =>
            o.status === "PENDING_PAYMENT" ||
            o.status === "PAID" ||
            o.status === "DELIVERED"
        );
        setOrderCount(pending.length);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, ordersVersion]);

  const tabs: { id: typeof activeTab; label: string; icon: typeof Home }[] = [
    { id: "home", label: "Accueil", icon: Home },
    { id: "games", label: "Jeux Roblox", icon: Gamepad2 },
    { id: "orders", label: "Mes Commandes", icon: ShoppingBag },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 sm:px-6 py-3">
        {/* Logo */}
        <button
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-2 font-extrabold text-lg sm:text-xl"
        >
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white shadow-md">
            <Sparkles className="size-5" />
          </div>
          <span className="bg-gradient-to-r from-fuchsia-600 via-rose-500 to-orange-500 bg-clip-text text-transparent">
            RobloxBoutik
          </span>
        </button>

        {/* Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <Button
                key={t.id}
                variant={active ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "relative h-10 rounded-full px-3 sm:px-4 text-sm font-semibold transition-all",
                  active
                    ? "bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white shadow-md"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{t.label}</span>
                {t.id === "orders" && orderCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {orderCount}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
