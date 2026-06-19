"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/shop/header";
import { Footer } from "@/components/shop/footer";
import { HomeView } from "@/components/shop/home-view";
import { GamesView } from "@/components/shop/games-view";
import { OrdersView } from "@/components/shop/orders-view";
import { SellerView } from "@/components/shop/seller-view";
import { PaymentView } from "@/components/shop/payment-view";
import { ChatDrawer } from "@/components/shop/chat-drawer";
import { GoogleLoginModal } from "@/components/shop/google-login";
import { RatingModal } from "@/components/shop/rating-modal";
import { SupportView } from "@/components/shop/support-view";
import { SupportDrawer } from "@/components/shop/support-drawer";
import { AdminView } from "@/components/shop/admin-view";
import { MessagesView } from "@/components/shop/messages-view";
import { ConversationsDrawer } from "@/components/shop/conversations-drawer";
import { ReportSellerDialog } from "@/components/shop/report-seller-dialog";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { activeTab, setGames, pendingListingId, setActiveTab, setMe } = useAppStore();
  const { user: authUser, loading: authLoading } = useAuth();
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Init seed + load games
  useEffect(() => {
    (async () => {
      try {
        await fetch("/api/init");
        const gamesRes = await fetch("/api/games");
        if (gamesRes.ok) {
          const d = await gamesRes.json();
          setGames(d.games ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur d'initialisation");
      } finally {
        setBooting(false);
      }
    })();
  }, [setGames]);

  // Sync useAuth user → Zustand store (so existing components keep working)
  useEffect(() => {
    setMe(authUser);
  }, [authUser, setMe]);

  // When pendingListingId is set, force-switch to a "payment" pseudo-tab
  useEffect(() => {
    if (pendingListingId && activeTab !== "home" && activeTab !== "games" && activeTab !== "orders" && activeTab !== "seller") {
      setActiveTab("home");
    }
  }, [pendingListingId, activeTab, setActiveTab]);

  if (booting || authLoading) {
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

  // Payment view takes over the screen when pendingListingId is set
  const showPayment = !!pendingListingId;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-fuchsia-50/40 via-white to-orange-50/40">
      <Header />
      <main className="flex-1 w-full">
        {showPayment ? (
          <PaymentView />
        ) : (
          <>
            {activeTab === "home" && <HomeView />}
            {activeTab === "games" && <GamesView />}
            {activeTab === "orders" && <OrdersView />}
            {activeTab === "messages" && <MessagesView />}
            {activeTab === "seller" && <SellerView />}
            {activeTab === "support" && <SupportView />}
            {activeTab === "admin" && <AdminView />}
          </>
        )}
      </main>
      {!showPayment && <Footer />}

      {/* Global overlays */}
      <GoogleLoginModal />
      <ChatDrawer />
      <RatingModal />
      <SupportDrawer />
      <ConversationsDrawer />
      <ReportSellerDialog />
    </div>
  );
}
