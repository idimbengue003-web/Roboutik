"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Home, Gamepad2, ShoppingBag, Sparkles, Store, HeadphonesIcon, Shield, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { UserChip } from "./google-login";
import { useSession } from "@/lib/session";

export function Header() {
  const { activeTab, setActiveTab, me, ordersVersion } = useAppStore();
  const { loading } = useSession();
  const [orderCount, setOrderCount] = useState(0);

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

  const tabs: { id: typeof activeTab; label: string; icon: typeof Home; needsAuth?: boolean; needsAdmin?: boolean }[] = [
    { id: "home", label: "Accueil", icon: Home },
    { id: "games", label: "Jeux Roblox", icon: Gamepad2 },
    { id: "orders", label: "Commandes", icon: ShoppingBag, needsAuth: true },
    { id: "messages", label: "Messages", icon: MessagesSquare, needsAuth: true },
    { id: "seller", label: "Vendeur", icon: Store, needsAuth: true },
    { id: "support", label: "Support", icon: HeadphonesIcon },
    { id: "admin", label: "Admin", icon: Shield, needsAdmin: true },
  ];

  const visibleTabs = tabs.filter(
    (t) => (!t.needsAuth || me) && (!t.needsAdmin || me?.isAdmin)
  );
  const displayCount = me ? orderCount : 0;

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
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <Button
                key={t.id}
                variant={active ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "relative h-10 rounded-full px-2.5 sm:px-4 text-sm font-semibold transition-all shrink-0",
                  active
                    ? t.id === "admin"
                      ? "bg-gradient-to-r from-rose-600 to-orange-500 text-white shadow-md"
                      : t.id === "support"
                      ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md"
                      : t.id === "messages"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                      : "bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white shadow-md"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden lg:inline">{t.label}</span>
                {t.id === "orders" && displayCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {displayCount}
                  </span>
                )}
              </Button>
            );
          })}

          {/* User chip / login */}
          {!loading && <UserChip />}
        </nav>
      </div>
    </header>
  );
}
