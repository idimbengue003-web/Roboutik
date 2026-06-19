"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Clock,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Listing, Order } from "@/lib/types";
import { formatFCFA, formatCountdown } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

export function PaymentView() {
  const {
    pendingListingId,
    setPendingListingId,
    me,
    setActiveTab,
    setActiveOrderId,
    bumpOrders,
  } = useAppStore();
  const { toast } = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [wavePhone, setWavePhone] = useState("");
  const [step, setStep] = useState<"form" | "processing" | "done">("form");
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [now, setNow] = useState(Date.now());

  // Fetch listing
  useEffect(() => {
    if (!pendingListingId) {
      setListing(null);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/listings?all=true`);
        if (!r.ok) return;
        const d = await r.json();
        const l = (d.listings ?? []).find((x: Listing) => x.id === pendingListingId);
        setListing(l ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [pendingListingId]);

  // Live countdown tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function close() {
    setPendingListingId(null);
    setStep("form");
    setWavePhone("");
    setCreatedOrder(null);
  }

  async function handlePay() {
    if (!listing || !me) return;
    setStep("processing");
    try {
      const createRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, buyerId: me.id }),
      });
      if (!createRes.ok) {
        const e = await createRes.json().catch(() => ({}));
        throw new Error(e.error ?? "Création échouée");
      }
      const created = await createRes.json();
      const orderId = created.order.id;

      const payRes = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wavePhone: wavePhone || undefined }),
      });
      if (!payRes.ok) throw new Error("Paiement Wave échoué");
      const paid = await payRes.json();

      setCreatedOrder(paid.order);
      setStep("done");
      bumpOrders();
      toast({
        title: "Paiement réussi 🎉",
        description: `Wave a débité ${formatFCFA(paid.order.amount)}. Le vendeur prépare ta commande.`,
      });
    } catch (e) {
      setStep("form");
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue",
        variant: "destructive",
      });
    }
  }

  if (!pendingListingId) return null;

  // Auto-validation countdown (only when paid)
  const autoMs =
    createdOrder?.autoValidateAt
      ? new Date(createdOrder.autoValidateAt).getTime() - now
      : null;

  return (
    <div className="min-h-[calc(100vh-150px)] bg-gradient-to-b from-sky-50 via-white to-cyan-50">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={close}
          className="mb-4 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Button>

        {/* Wave branded card */}
        <div className="rounded-3xl overflow-hidden shadow-xl border border-sky-100">
          {/* Top brand bar */}
          <div className="bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 px-6 py-6 text-white text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/20 backdrop-blur text-3xl font-black mb-2">
              W
            </div>
            <h1 className="text-2xl font-extrabold">Wave</h1>
            <p className="text-xs opacity-90 mt-0.5">Paiement sécurisé</p>
          </div>

          <div className="bg-white p-6">
            {/* Listing recap */}
            {loading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="size-8 animate-spin text-sky-500" />
              </div>
            ) : listing ? (
              <>
                <div className="rounded-2xl bg-slate-50 p-3 mb-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                    {listing.game?.name}
                  </p>
                  <p className="font-bold text-slate-900 mt-0.5">{listing.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {listing.description}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Vendeur : <strong>{listing.seller?.username}</strong>
                  </p>
                </div>

                {/* Amount - HUGE */}
                <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 p-5 text-center mb-5">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Montant à payer
                  </p>
                  <p className="text-4xl font-extrabold text-sky-700 mt-1">
                    {formatFCFA(listing.price)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Le montant est déjà inscrit, tu n'as qu'à valider.
                  </p>
                </div>

                {step === "form" && (
                  <>
                    <div className="space-y-2 mb-4">
                      <label className="text-sm font-semibold text-slate-700">
                        Numéro Wave <span className="text-slate-400 font-normal">(optionnel)</span>
                      </label>
                      <Input
                        inputMode="tel"
                        placeholder="Ex : 76 123 45 67"
                        value={wavePhone}
                        onChange={(e) => setWavePhone(e.target.value)}
                        className="h-12 rounded-xl text-center text-lg font-semibold"
                      />
                    </div>

                    <Button
                      onClick={handlePay}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold text-lg shadow-md"
                    >
                      <ShieldCheck className="size-6" />
                      Payer avec Wave
                    </Button>

                    <p className="text-center text-[11px] text-slate-400 mt-3 leading-relaxed">
                      🔒 Paiement protégé. En payant, tu ouvres une commande et un
                      canal de discussion avec le vendeur.
                    </p>
                  </>
                )}

                {step === "processing" && (
                  <div className="py-10 flex flex-col items-center gap-3">
                    <Loader2 className="size-12 text-sky-500 animate-spin" />
                    <p className="font-semibold text-slate-700">
                      Connexion à Wave…
                    </p>
                    <p className="text-xs text-slate-400">Ne ferme pas cette page.</p>
                  </div>
                )}

                {step === "done" && createdOrder && (
                  <div className="py-4 flex flex-col items-center gap-3 text-center">
                    <div className="grid size-16 place-items-center rounded-full bg-emerald-100">
                      <CheckCircle2 className="size-10 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      Paiement réussi !
                    </h3>
                    <p className="text-sm text-slate-500 max-w-xs">
                      Ta commande est en attente de livraison. Le vendeur te contacte
                      dans le canal de discussion.
                    </p>
                    <Button
                      onClick={() => {
                        setActiveOrderId(createdOrder.id);
                        setActiveTab("orders");
                        close();
                      }}
                      className="mt-2 h-12 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold px-6 w-full"
                    >
                      <MessageCircle className="size-5" />
                      Ouvrir la discussion
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-slate-500">
                Annonce introuvable.
              </div>
            )}
          </div>

          {/* Bottom: auto-validation timer */}
          {step === "done" && createdOrder && autoMs !== null && (
            <div className="bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-white/10">
                  <Clock className="size-5 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                    Validation automatique
                  </p>
                  <p className="text-sm font-bold">
                    {autoMs > 0
                      ? `Dans ${formatCountdown(autoMs)}`
                      : "En cours…"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold tabular-nums bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
                    {autoMs > 0 ? formatCountdown(autoMs).split(" ")[0] : "✓"}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-snug">
                Si tu ne valides pas avant ce délai, la commande se valide
                automatiquement et le vendeur reçoit son paiement.
              </p>
            </div>
          )}

          {step === "form" && (
            <div className="bg-slate-100 px-6 py-3 text-center">
              <p className="text-[11px] text-slate-500">
                ⏱️ Après paiement : validation auto dans 24h si tu ne valides pas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
