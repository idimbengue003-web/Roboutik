"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Clock,
  MessageCircle,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Listing, Order } from "@/lib/types";
import { formatFCFA } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

type PayState =
  | { kind: "loading" }
  | { kind: "form"; listing: Listing | null }
  | { kind: "redirecting"; checkoutUrl: string; orderId: string }
  | { kind: "waiting"; orderId: string }
  | { kind: "confirmed"; orderId: string }
  | { kind: "error"; message: string };

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

  const [state, setState] = useState<PayState>({ kind: "loading" });
  const [wavePhone, setWavePhone] = useState("");
  const [waitingSeconds, setWaitingSeconds] = useState(0);

  // Fetch the listing
  useEffect(() => {
    if (!pendingListingId) {
      setState({ kind: "loading" });
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/listings?all=true`);
        if (!r.ok) throw new Error("Échec");
        const d = await r.json();
        const l = (d.listings ?? []).find((x: Listing) => x.id === pendingListingId);
        if (l) setState({ kind: "form", listing: l });
        else setState({ kind: "error", message: "Annonce introuvable" });
      } catch (e) {
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Erreur",
        });
      }
    })();
  }, [pendingListingId]);

  // Create order + get Wave checkout URL
  async function handlePay() {
    if (state.kind !== "form" || !state.listing || !me) return;
    setState({ kind: "loading" });
    try {
      // Create the order
      const createRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: state.listing.id, buyerId: me.id }),
      });
      if (!createRes.ok) {
        const e = await createRes.json().catch(() => ({}));
        throw new Error(e.error ?? "Création échouée");
      }
      const created = await createRes.json();
      const orderId = created.order.id as string;

      // Initiate payment (get Wave URL)
      const payRes = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me.id, wavePhone: wavePhone || undefined }),
      });
      if (!payRes.ok) {
        const e = await payRes.json().catch(() => ({}));
        throw new Error(e.error ?? "Paiement échoué");
      }
      const pay = await payRes.json();

      // Open Wave checkout in a new tab
      window.open(pay.checkoutUrl, "_blank", "noopener,noreferrer");

      // Switch to waiting state — start polling
      setState({ kind: "waiting", orderId });
      toast({
        title: "Paiement Wave ouvert 🌊",
        description: "Une fois ton paiement validé sur Wave, on te redirige automatiquement.",
      });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Erreur",
      });
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    }
  }

  // Poll for payment confirmation
  // Uses recursive setTimeout (not setInterval) so we can adapt the interval
  // based on the server's suggested pollIntervalMs (backoff).
  // Stops automatically after 10 minutes (MAX_POLL_MINUTES on the server).
  useEffect(() => {
    if (state.kind !== "waiting" || !me) return;
    setWaitingSeconds(0);

    const startTime = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const poll = async () => {
      if (stopped) return;

      setWaitingSeconds(Math.floor((Date.now() - startTime) / 1000));

      try {
        const r = await fetch(
          `/api/orders/${state.orderId}/poll?userId=${me.id}`
        );
        if (!r.ok) return;
        const d = await r.json();

        if (d.status === "PAID") {
          stopped = true;
          setState({ kind: "confirmed", orderId: state.orderId });
          bumpOrders();
          toast({
            title: "Paiement confirmé 🎉",
            description: `${formatFCFA(d.waveTransaction?.amount ?? 0)} reçu sur Wave.`,
          });
          return;
        }

        if (d.status === "DELIVERED" || d.status === "VALIDATED") {
          stopped = true;
          setActiveOrderId(state.orderId);
          setActiveTab("orders");
          setPendingListingId(null);
          return;
        }

        if (d.status === "TIMEOUT" || d.shouldStopPolling) {
          stopped = true;
          setState({
            kind: "error",
            message: d.message || "Délai de paiement dépassé. Si tu as payé, contacte le support.",
          });
          toast({
            title: "Délai dépassé ⏰",
            description: "Si tu as payé, contacte le support avec ta preuve de paiement.",
            variant: "destructive",
          });
          return;
        }

        // Still pending — schedule next poll with server-suggested interval
        // (backoff: 3s → 5s → 10s as time passes)
        const nextDelay = d.pollIntervalMs || 3000;
        timeoutId = setTimeout(poll, nextDelay);
      } catch {
        // Network error — retry after 5s (don't spam)
        timeoutId = setTimeout(poll, 5000);
      }
    };

    // Start polling immediately (first call)
    timeoutId = setTimeout(poll, 1000);

    // Cleanup on unmount (buyer closes the page or navigates away)
    return () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [state, me, bumpOrders, toast, setActiveOrderId, setActiveTab, setPendingListingId]);

  function close() {
    setPendingListingId(null);
    setWavePhone("");
  }

  function openChat() {
    if (state.kind !== "confirmed") return;
    setActiveOrderId(state.orderId);
    setActiveTab("orders");
    close();
  }

  if (!pendingListingId) return null;

  return (
    <div className="min-h-[calc(100vh-150px)] bg-gradient-to-b from-sky-50 via-white to-cyan-50">
      <div className="mx-auto max-w-md px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={close}
          className="mb-4 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Button>

        <div className="rounded-3xl overflow-hidden shadow-xl border border-sky-100">
          {/* Wave brand bar */}
          <div className="bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 px-6 py-6 text-white text-center">
            <img
              src="/wave-logo.png"
              alt="Wave"
              className="mx-auto size-14 object-contain mb-2"
            />
            <h1 className="text-2xl font-extrabold">Wave</h1>
            <p className="text-xs opacity-90 mt-0.5">Paiement sécurisé</p>
          </div>

          <div className="bg-white p-6">
            {state.kind === "loading" && (
              <div className="py-10 flex justify-center">
                <Loader2 className="size-10 animate-spin text-sky-500" />
              </div>
            )}

            {state.kind === "error" && (
              <div className="py-8 text-center">
                <AlertCircle className="size-12 mx-auto mb-3 text-rose-500" />
                <p className="font-semibold text-slate-900">Erreur</p>
                <p className="text-sm text-slate-500 mt-1">{state.message}</p>
                <Button onClick={close} className="mt-4 rounded-full">
                  Retour
                </Button>
              </div>
            )}

            {state.kind === "form" && state.listing && (
              <>
                <div className="rounded-2xl bg-slate-50 p-3 mb-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                    {state.listing.game?.name}
                  </p>
                  <p className="font-bold text-slate-900 mt-0.5">{state.listing.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {state.listing.description}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Vendeur : <strong>{state.listing.seller?.username}</strong>
                  </p>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 p-5 text-center mb-5">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Montant à payer
                  </p>
                  <p className="text-4xl font-extrabold text-sky-700 mt-1">
                    {formatFCFA(state.listing.price)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tu seras redirigé vers Wave pour payer.
                  </p>
                </div>

                <div className="space-y-2 mb-4">
                  <label className="text-sm font-semibold text-slate-700">
                    Numéro Wave <span className="text-slate-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex : 76 123 45 67"
                    value={wavePhone}
                    onChange={(e) => setWavePhone(e.target.value)}
                    className="w-full h-12 rounded-xl border border-input bg-background px-3 text-center text-lg font-semibold"
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
                  🔒 Un onglet Wave s'ouvre. Une fois ton paiement validé, tu reviens
                  automatiquement ici (en moins de 10s).
                </p>
              </>
            )}

            {state.kind === "waiting" && (
              <div className="py-6 flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  <div className="grid size-20 place-items-center rounded-full bg-sky-100">
                    <Loader2 className="size-10 text-sky-500 animate-spin" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-emerald-500 text-white text-xs">
                    <Clock className="size-3.5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    En attente de paiement…
                  </h3>
                  <p className="text-sm text-slate-500 max-w-xs mt-1">
                    Effectue ton paiement dans l'onglet Wave qui s'est ouvert.
                    On te redirige automatiquement dès qu'on reçoit la confirmation.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 px-4 py-2 text-center">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">
                    Temps écoulé
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-slate-900">
                    {Math.floor(waitingSeconds / 60)}:
                    {String(waitingSeconds % 60).padStart(2, "0")}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    / 10:00 max
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  ⚡ Détection automatique en moins de 10 secondes après ton paiement.
                  {waitingSeconds < 120
                    ? " Vérification toutes les 3s..."
                    : waitingSeconds < 300
                    ? " Vérification toutes les 5s..."
                    : " Vérification toutes les 10s..."}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={close}
                  className="text-slate-500"
                >
                  Annuler
                </Button>
              </div>
            )}

            {state.kind === "confirmed" && (
              <div className="py-6 flex flex-col items-center gap-3 text-center">
                <div className="grid size-16 place-items-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="size-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Paiement confirmé !
                </h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  Le vendeur a été notifié et prépare ta commande.
                  Discute avec lui pour la livraison.
                </p>
                <Button
                  onClick={openChat}
                  className="mt-2 h-12 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold px-6 w-full"
                >
                  <MessageCircle className="size-5" />
                  Ouvrir la discussion
                </Button>
              </div>
            )}
          </div>

          {state.kind === "waiting" && (
            <div className="bg-slate-900 px-6 py-3 text-center">
              <p className="text-[11px] text-slate-400">
                ⏱️ Si tu ne paies pas, ta commande sera annulée automatiquement.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
