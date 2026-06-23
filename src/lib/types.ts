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
  email: string;
  username: string;
  avatar: string | null;
  googleSub: string | null;
  isSeller: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  isBanned: boolean;
  bannedAt: string | null;
  banReason: string | null;
  balance: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportTicket = {
  id: string;
  openerId: string;
  subject: string;
  category: "PAYMENT" | "DELIVERY" | "SELLER" | "BUG" | "ACCOUNT" | "OTHER";
  status: "OPEN" | "BOT_HANDLED" | "ADMIN_HANDLED" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  opener?: User;
  messages?: TicketMessage[];
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  senderId: string | null;
  senderRole: "USER" | "BOT" | "ADMIN";
  content: string;
  isAuto: boolean;
  createdAt: string;
  sender?: User | null;
};

export type AuditLog = {
  id: string;
  actorId: string | null;
  targetId: string | null;
  action: string;
  metadata: string | null;
  createdAt: string;
  actor?: User | null;
  target?: User | null;
};

export type Conversation = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  listing?: Listing & { game?: Game };
  buyer?: User;
  seller?: User;
  messages?: ConversationMessage[];
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isAuto: boolean;
  createdAt: string;
  sender?: User;
};

export type Rating = {
  id: string;
  orderId: string;
  listingId: string;
  fromUserId: string;
  toUserId: string;
  stars: number;
  comment: string | null;
  createdAt: string;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  // sellerNetPrice: amount the seller wants to receive (net)
  sellerNetPrice: number;
  // price: amount the buyer pays (incl. 20% commission, = sellerNetPrice * 1.2)
  price: number;
  // images: JSON string array of base64 data URLs (max 4)
  images: string | null;
  active: boolean;
  createdAt: string;
  sellerId: string;
  gameId: string;
  seller?: User;
  game?: Game;
  ratings?: Rating[];
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
  // amount: total paid by buyer (incl. 20% commission)
  amount: number;
  // sellerNetAmount: net amount the seller receives (snapshot at order time)
  sellerNetAmount: number;
  status: OrderStatus;
  paidAt: string | null;
  deliveredAt: string | null;
  autoValidateAt: string | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  listing?: Listing & { game?: Game; ratings?: Rating[] };
  seller?: User;
  buyer?: User;
  messages?: Message[];
  rating?: Rating | null;
};

// Helper: compute commission for an order (= amount - sellerNetAmount)
export function commissionOf(order: { amount: number; sellerNetAmount: number }): number {
  return order.amount - order.sellerNetAmount;
}

// Helper: compute buyer price from seller net price (sellerNet * 1.2, rounded)
export function buyerPriceFromSellerNet(sellerNetPrice: number): number {
  return Math.round(sellerNetPrice * 1.2);
}

// Helper: compute commission from seller net price (= buyerPrice - sellerNet)
export function commissionFromSellerNet(sellerNetPrice: number): number {
  return buyerPriceFromSellerNet(sellerNetPrice) - sellerNetPrice;
}

export type Withdrawal = {
  id: string;
  sellerId: string;
  amount: number;
  waveNumber: string;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
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

/**
 * Parse the images JSON string from a Listing into an array of data URLs.
 * Returns empty array if no images.
 */
export function getListingImages(listing: { images: string | null }): string[] {
  if (!listing.images) return [];
  try {
    const parsed = JSON.parse(listing.images);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) => typeof item === "string" && item.startsWith("data:image/")
      );
    }
  } catch {
    /* invalid JSON */
  }
  return [];
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Terminé";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}min ${s}s`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}
