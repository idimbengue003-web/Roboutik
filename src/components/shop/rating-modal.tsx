"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarsInput, StarsDisplay } from "./search-and-rating";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/lib/types";
import { useAppStore } from "@/lib/store";

export function RatingModal() {
  const { rateOrderId, setRateOrderId, me, bumpOrders, ordersVersion } =
    useAppStore();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch the order to rate
  useEffect(() => {
    if (!rateOrderId || !me) {
      setOrder(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/orders?buyerId=${me.id}`);
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        const o = (d.orders ?? []).find((x: Order) => x.id === rateOrderId);
        setOrder(o ?? null);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rateOrderId, me, ordersVersion]);

  function close() {
    setRateOrderId(null);
    setStars(0);
    setComment("");
    setOrder(null);
  }

  async function submit() {
    if (!order || stars === 0) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/orders/${order.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stars,
          comment: comment.trim() || undefined,
          userId: order.buyerId,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      toast({ title: "Merci pour ton avis ! ⭐" });
      bumpOrders();
      close();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!rateOrderId} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center">Note le vendeur</DialogTitle>
          <DialogDescription className="text-center">
            Comment s'est passée ta commande chez{" "}
            <strong>{order?.seller?.username}</strong> ?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-4">
          <StarsInput value={stars} onChange={setStars} />
          <p className="text-sm text-slate-500">
            {stars === 0
              ? "Choisis une note"
              : stars === 5
              ? "Excellent ! 🎉"
              : stars === 4
              ? "Très bien 👍"
              : stars === 3
              ? "Correct"
              : stars === 2
              ? "Déçu·e"
              : "À éviter"}
          </p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Laisse un commentaire (optionnel)…"
            className="rounded-xl min-h-[80px]"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={close}>
            Plus tard
          </Button>
          <Button
            disabled={stars === 0 || saving}
            onClick={submit}
            className="bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold rounded-full"
          >
            {saving ? "Publication…" : "Publier mon avis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RatingBadge({
  ratings,
}: {
  ratings: { stars: number }[];
}) {
  if (ratings.length === 0) {
    return (
      <span className="text-[11px] text-slate-400 font-medium">
        Nouveau vendeur
      </span>
    );
  }
  const avg = ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
  return (
    <div className="inline-flex items-center gap-1">
      <StarsDisplay stars={avg} size="sm" />
      <span className="text-[11px] text-slate-500 font-semibold">
        {avg.toFixed(1)} ({ratings.length})
      </span>
    </div>
  );
}
