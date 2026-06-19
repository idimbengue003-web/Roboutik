"use client";

import { create } from "zustand";
import type { Game, Listing, Order, User } from "@/lib/types";

type Tab = "home" | "games" | "orders";

type AppState = {
  // navigation
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;

  // selected game for "games" tab
  selectedGameId: string | null;
  setSelectedGameId: (id: string | null) => void;

  // data
  me: User | null;
  setMe: (u: User | null) => void;
  games: Game[];
  setGames: (g: Game[]) => void;

  // listing to purchase (opens Wave modal)
  pendingListing: Listing | null;
  setPendingListing: (l: Listing | null) => void;

  // active order chat (opens chat drawer)
  activeOrderId: string | null;
  setActiveOrderId: (id: string | null) => void;

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
  games: [],
  setGames: (g) => set({ games: g }),

  pendingListing: null,
  setPendingListing: (l) => set({ pendingListing: l }),

  activeOrderId: null,
  setActiveOrderId: (id) => set({ activeOrderId: id }),

  ordersVersion: 0,
  bumpOrders: () => set((s) => ({ ordersVersion: s.ordersVersion + 1 })),
}));
