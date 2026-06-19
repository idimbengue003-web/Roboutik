"use client";

import { create } from "zustand";
import type { Game, User } from "@/lib/types";

type Tab = "home" | "games" | "orders" | "seller" | "admin" | "support" | "messages";

type AppState = {
  // navigation
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;

  // selected game for "games" tab
  selectedGameId: string | null;
  setSelectedGameId: (id: string | null) => void;

  // auth
  me: User | null;
  setMe: (u: User | null) => void;
  loginOpen: boolean;
  setLoginOpen: (b: boolean) => void;

  // games data
  games: Game[];
  setGames: (g: Game[]) => void;

  // listing to purchase (opens payment page)
  pendingListingId: string | null;
  setPendingListingId: (id: string | null) => void;

  // active order chat (opens chat drawer)
  activeOrderId: string | null;
  setActiveOrderId: (id: string | null) => void;

  // order to rate (opens rating modal)
  rateOrderId: string | null;
  setRateOrderId: (id: string | null) => void;

  // support: ticket currently open in support drawer
  activeTicketId: string | null;
  setActiveTicketId: (id: string | null) => void;

  // conversations: pre-sale chat between buyer and seller
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // report: order id to report (opens report dialog)
  reportOrderId: string | null;
  setReportOrderId: (id: string | null) => void;

  // orders refresh trigger
  ordersVersion: number;
  bumpOrders: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  activeTab: "home",
  setActiveTab: (t) => set({ activeTab: t }),

  selectedGameId: null,
  setSelectedGameId: (id) => set({ selectedGameId: id }),

  me: null,
  setMe: (u) => set({ me: u }),
  loginOpen: false,
  setLoginOpen: (b) => set({ loginOpen: b }),

  games: [],
  setGames: (g) => set({ games: g }),

  pendingListingId: null,
  setPendingListingId: (id) => set({ pendingListingId: id }),

  activeOrderId: null,
  setActiveOrderId: (id) => set({ activeOrderId: id }),

  rateOrderId: null,
  setRateOrderId: (id) => set({ rateOrderId: id }),

  activeTicketId: null,
  setActiveTicketId: (id) => set({ activeTicketId: id }),

  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  reportOrderId: null,
  setReportOrderId: (id) => set({ reportOrderId: id }),

  ordersVersion: 0,
  bumpOrders: () => set((s) => ({ ordersVersion: s.ordersVersion + 1 })),
}));
