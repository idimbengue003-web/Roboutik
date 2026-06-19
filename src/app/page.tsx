"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Header } from "@/components/shop/header";
import { Footer } from "@/components/shop/footer";
import { HomeView } from "@/components/shop/home-view";
import { GamesView } from "@/components/shop/games-view";
import { OrdersView } from "@/components/shop/orders-view";
import { WavePaymentModal } from "@/components/shop/wave-payment-modal";
import { ChatDrawer } from "@/components/shop/chat-drawer";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { activeTab, me, setMe, games, setGames } = useAppStore();
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Init on first load: seed data, fetch me + games
  useEffect(() => {
    (async () => {
      try {
        // 1. Init seed
        await fetch("/api/init");

        // 2. Load games + me in parallel
        const [gamesRes, meRes] = await Promise.all([
          fetch("/api/games"),
          fetch("/api/me"),
        ]);

        if (gamesRes.ok) {
          const d = await gamesRes.json();
          setGames(d.games ?? []);
        }
        if (meRes.ok) {
          const d = await meRes.json();
          setMe(d.user ?? null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur d'initialisation");
      } finally {
        setBooting(false);
      }
    })();
  }, [setGames, setMe]);

  if (booting) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-fuchsia-50 via-white to-orange-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-10 animate-spin text-fuchsia-500" />
          <p className="text-slate-500 font-medium">Préparation de RobloxBoutik…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-rose-50 p-6">
        <div className="max-w-md rounded-2xl bg-white p-6 shadow-md text-center">
          <p className="text-3xl mb-2">⚠️</p>
          <h2 className="font-bold text-slate-900">Erreur d'initialisation</h2>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-fuchsia-50/40 via-white to-orange-50/40">
      <Header />
      <main className="flex-1 w-full">
        {activeTab === "home" && <HomeView />}
        {activeTab === "games" && <GamesView />}
        {activeTab === "orders" && <OrdersView />}
      </main>
      <Footer />

      {/* Global overlays */}
      <WavePaymentModal />
      <ChatDrawer />
    </div>
  );
}
