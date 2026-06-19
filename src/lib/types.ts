// Shared types

export type Game = {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
};

export type User = {
  id: string;
  username: string;
  avatar: string | null;
  isSeller: boolean;
  balance: number;
  createdAt: string;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string | null;
  active: boolean;
  createdAt: string;
  sellerId: string;
  gameId: string;
  seller?: User;
  game?: Game;
};

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "DELIVERED"
  | "VALIDATED"
  | "CANCELLED";

export type Message = {
  id: string;
  orderId: string;
  senderId: string;
  content: string;
  isAuto: boolean;
  createdAt: string;
  sender?: User;
};

export type Order = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  listing?: Listing & { game?: Game };
  seller?: User;
  buyer?: User;
  messages?: Message[];
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Paiement en attente",
  PAID: "Paiement reçu · en attente de livraison",
  DELIVERED: "Livré · en attente de ta validation",
  VALIDATED: "Commande validée ✅",
  CANCELLED: "Annulée",
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800 border-amber-300",
  PAID: "bg-sky-100 text-sky-800 border-sky-300",
  DELIVERED: "bg-violet-100 text-violet-800 border-violet-300",
  VALIDATED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CANCELLED: "bg-rose-100 text-rose-800 border-rose-300",
};

export function formatFCFA(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}
