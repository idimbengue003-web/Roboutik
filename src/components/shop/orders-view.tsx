"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";
import { formatFCFA, STATUS_LABEL, STATUS_COLOR, formatCountdown } from "@/lib/types";
import { MessageCircle, Package, RefreshCw, ShoppingBag, Zap, Star, Clock, CheckCircle2 } from "lucide-react";

export function OrdersView() {
  const me = useAppStore((s) => s.me);
  const ordersVersion = useAppStore((s) => s.ordersVersion);
  const setActiveOrderId = useAppStore((s) => s.setActiveOrderId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const bumpOrders = useAppStore((s) => s.bumpOrders);
  const setRateOrderId = useAppStore((s) => s.setRateOrderId);
  const setPendingListingId = useAppStore((s) => s.setPendingListingId);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const fetchOrders = async () => {
    if (!me) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Use userId to fetch orders where user is buyer OR seller
      const r = await fetch(`/api/orders?userId=${me.id}`);
      if (!r.ok) return;
      const d = await r.json();
      setOrders(d.orders ?? []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [me, ordersVersion]);

  // Poll for status updates + countdown tick
  useEffect(() => {
    const t = setInterval(() => {
      bumpOrders();
      setNow(Date.now());
    }, 2000);
    return () => clearInterval(t);
  }, [bumpOrders]);

  if (!me) {
    return (
      <div className="mx-3 sm:mx-6 py-12">
        <div className="rounded-3xl border bg-white p-8 sm:p-12 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-fuchsia-50 mb-4">
            <ShoppingBag className="size-8 text-fuchsia-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Connecte-toi pour voir tes commandes
          </h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Tes commandes sont liées à ton compte Google. Connecte-toi pour les
            retrouver et discuter avec tes vendeurs.
          </p>
        </div>
      </div>
    );
  }

  const pending = orders.filter(
    (o) => o.status !== "VALIDATED" && o.status !== "CANCELLED"
  );
  const done = orders.filter((o) => o.status === "VALIDATED");

  if (!loading && orders.length === 0) {
    return (
      <div className="mx-3 sm:mx-6 py-12">
        <div className="rounded-3xl border bg-white p-8 sm:p-12 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-fuchsia-50 mb-4">
            <ShoppingBag className="size-8 text-fuchsia-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Tu n'as pas encore de commande
          </h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Va voir les jeux Roblox et clique sur "Payer avec Wave" pour passer ta
            première commande. Le vendeur te livrera et tu pourras valider !
          </p>
          <Button
            onClick={() => setActiveTab("games")}
            className="mt-5 h-11 rounded-full bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold px-6"
          >
            <Zap className="size-5" />
            Voir les jeux Roblox
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 sm:mx-6 py-6 pb-12 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          🛍️ Mes commandes
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchOrders}
          className="text-slate-500"
        >
          <RefreshCw className="size-4" />
          Actualiser
        </Button>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            ⏳ En cours ({pending.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {pending.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                now={now}
                onOpen={() => setActiveOrderId(o.id)}
                onRate={() => setRateOrderId(o.id)}
                currentUserId={me.id}
              />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            ✅ Terminées ({done.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {done.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                now={now}
                onOpen={() => setActiveOrderId(o.id)}
                onRate={() => setRateOrderId(o.id)}
                currentUserId={me.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OrderCard({
  order,
  now,
  onOpen,
  onRate,
  currentUserId,
}: {
  order: Order;
  now: number;
  onOpen: () => void;
  onRate: () => void;
  currentUserId: string;
}) {
  const statusLabel = STATUS_LABEL[order.status];
  const statusColor = STATUS_COLOR[order.status];
  const lastMsg = order.messages?.[order.messages.length - 1];

  // Is the current user the buyer or the seller of this order?
  const isSeller = order.sellerId === currentUserId;
  const isBuyer = order.buyerId === currentUserId;

  // Countdown to auto-validation
  const autoMs =
    order.autoValidateAt && (order.status === "PAID" || order.status === "DELIVERED")
      ? new Date(order.autoValidateAt).getTime() - now
      : null;

  const canRate = order.status === "VALIDATED" && !order.rating && isBuyer;
  const hasRating = order.status === "VALIDATED" && order.rating;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-100 to-orange-100 text-2xl shrink-0">
          {isSeller ? "🛒" : "🎮"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 line-clamp-1">
              {order.listing?.title}
            </h3>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {order.listing?.game?.name} · {formatFCFA(order.amount)}
          </p>
          {/* Role badge: Vente (seller) or Achat (buyer) */}
          <div className="mt-1.5 flex items-center gap-1.5">
            {isSeller && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                🛒 Vente — acheteur : {order.buyer?.username ?? "—"}
              </span>
            )}
            {isBuyer && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-700 bg-sky-100 rounded-full px-2 py-0.5">
                🛍️ Achat — vendeur : {order.seller?.username ?? "—"}
              </span>
            )}
          </div>

          {/* Rating display */}
          {hasRating && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600 bg-amber-50 rounded-full px-2 py-0.5">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              <span className="font-bold">{order.rating?.stars}/5</span>
              {order.rating?.comment && (
                <span className="text-slate-500 line-clamp-1 max-w-[180px]">
                  · {order.rating.comment}
                </span>
              )}
            </div>
          )}

          {/* Auto-validation countdown */}
          {autoMs !== null && autoMs > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100 rounded-full px-2 py-1">
              <Clock className="size-3 text-amber-500" />
              <span>
                Validation auto dans <strong>{formatCountdown(autoMs)}</strong>
              </span>
            </div>
          )}
          {autoMs !== null && autoMs <= 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100 rounded-full px-2 py-1">
              <CheckCircle2 className="size-3 text-emerald-500" />
              <span>Validation auto en cours…</span>
            </div>
          )}

          {lastMsg && (
            <button
              onClick={onOpen}
              className="mt-2 w-full flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg p-2 text-left transition-colors"
            >
              <MessageCircle className="size-3.5 mt-0.5 shrink-0 text-fuchsia-500" />
              <span className="line-clamp-2">
                <strong className="text-slate-700">
                  {lastMsg.senderId === order.sellerId
                    ? order.seller?.username
                    : "Toi"}
                  :
                </strong>{" "}
                {lastMsg.content}
              </span>
            </button>
          )}

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {/* PENDING_PAYMENT: show Pay + Cancel buttons for the buyer */}
            {order.status === "PENDING_PAYMENT" && isBuyer && (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    // Re-trigger payment flow
                    if (order.listingId) {
                      setPendingListingId(order.listingId);
                    }
                  }}
                  className="h-8 text-xs rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold px-4"
                >
                  <Zap className="size-3.5" />
                  Payer maintenant
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!confirm("Annuler cette commande ? Le paiement sera annulé.")) return;
                    try {
                      const r = await fetch(`/api/orders/${order.id}/cancel`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: currentUserId, reason: "Annulé par l'acheteur" }),
                      });
                      if (!r.ok) throw new Error("Échec");
                      bumpOrders();
                    } catch {}
                  }}
                  className="h-8 text-xs rounded-full text-rose-600 border-rose-300 hover:bg-rose-50 px-3"
                >
                  Annuler
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onOpen}
              className="h-7 text-xs rounded-full text-fuchsia-600 hover:text-fuchsia-700 hover:bg-fuchsia-50 px-2"
            >
              {order.status === "DELIVERED" ? (
                <>
                  <Package className="size-3.5" />
                  Valider la commande
                </>
              ) : (
                <>
                  <MessageCircle className="size-3.5" />
                  Ouvrir la discussion
                </>
              )}
              →
            </Button>
            {canRate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRate}
                className="h-7 text-xs rounded-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2"
              >
                <Star className="size-3.5" />
                Noter le vendeur
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
