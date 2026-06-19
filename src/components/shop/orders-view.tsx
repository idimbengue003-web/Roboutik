"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";
import { formatFCFA, STATUS_LABEL, STATUS_COLOR } from "@/lib/types";
import { MessageCircle, Package, RefreshCw, ShoppingBag, Zap } from "lucide-react";

export function OrdersView() {
  const { me, ordersVersion, setActiveOrderId, setActiveTab, bumpOrders } =
    useAppStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!me) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/orders?buyerId=${me.id}`);
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

  // Poll every 4s for status updates (auto-delivery, etc.)
  useEffect(() => {
    const t = setInterval(() => {
      bumpOrders();
    }, 5000);
    return () => clearInterval(t);
  }, [bumpOrders]);

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

      {/* Pending orders */}
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
                onOpen={() => setActiveOrderId(o.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Validated orders */}
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
                onOpen={() => setActiveOrderId(o.id)}
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
  onOpen,
}: {
  order: Order;
  onOpen: () => void;
}) {
  const statusLabel = STATUS_LABEL[order.status];
  const statusColor = STATUS_COLOR[order.status];
  const lastMsg = order.messages?.[order.messages.length - 1];

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-100 to-orange-100 text-2xl shrink-0">
          🎮
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

          {lastMsg && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg p-2 line-clamp-2">
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
            </div>
          )}

          <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-600">
            {order.status === "DELIVERED" ? (
              <>
                <Package className="size-3.5" />
                Valider la commande →
              </>
            ) : (
              <>
                <MessageCircle className="size-3.5" />
                Ouvrir la discussion →
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
