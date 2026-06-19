"use client";

import { useAppStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { formatFCFA } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function WavePaymentModal() {
  const { pendingListing, setPendingListing, me, bumpOrders, setActiveOrderId, setActiveTab } =
    useAppStore();
  const { toast } = useToast();

  const [step, setStep] = useState<"form" | "processing" | "done">("form");
  const [wavePhone, setWavePhone] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const open = !!pendingListing;

  function reset() {
    setStep("form");
    setWavePhone("");
    setCreatedOrderId(null);
    setPendingListing(null);
  }

  async function handlePay() {
    if (!pendingListing || !me) return;
    setStep("processing");
    try {
      // 1. Create the order
      const createRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: pendingListing.id }),
      });
      if (!createRes.ok) throw new Error("Création commande échouée");
      const created = await createRes.json();
      const orderId = created.order.id;

      // 2. Pay via Wave
      const payRes = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wavePhone: wavePhone || undefined }),
      });
      if (!payRes.ok) throw new Error("Paiement Wave échoué");
      const paid = await payRes.json();

      setCreatedOrderId(orderId);
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

  function handleViewDiscussion() {
    if (!createdOrderId) return;
    setActiveOrderId(createdOrderId);
    setActiveTab("orders");
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden p-0 gap-0">
        {/* Wave header banner */}
        <div className="bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20 backdrop-blur text-2xl font-black">
              W
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider opacity-90">
                Paiement sécurisé
              </p>
              <h2 className="text-xl font-extrabold">Wave</h2>
            </div>
          </div>
        </div>

        <div className="p-6">
          {pendingListing && (
            <DialogHeader className="mb-4 space-y-1">
              <DialogTitle className="text-lg">
                {pendingListing.title}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {pendingListing.game?.name} · Vendeur :{" "}
                <strong>{pendingListing.seller?.username}</strong>
              </DialogDescription>
            </DialogHeader>
          )}

          {step === "form" && (
            <>
              <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 p-4 mb-4">
                <p className="text-xs text-slate-500 font-medium">Montant à payer</p>
                <p className="text-3xl font-extrabold text-sky-700">
                  {pendingListing ? formatFCFA(pendingListing.price) : ""}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Le montant est déjà inscrit, tu n'as plus qu'à valider.
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <Label htmlFor="wave-phone" className="text-sm font-semibold">
                  Numéro Wave (optionnel)
                </Label>
                <Input
                  id="wave-phone"
                  inputMode="tel"
                  placeholder="Ex : 76 123 45 67"
                  value={wavePhone}
                  onChange={(e) => setWavePhone(e.target.value)}
                  className="h-11 rounded-xl"
                />
                <p className="text-[11px] text-slate-400">
                  Sans numéro, le vendeur te demandera comment livrer.
                </p>
              </div>

              <Button
                onClick={handlePay}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold text-base shadow-md"
              >
                <ShieldCheck className="size-5" />
                Payer {pendingListing ? formatFCFA(pendingListing.price) : ""} avec Wave
              </Button>
              <p className="text-center text-[11px] text-slate-400 mt-3">
                En payant, tu ouvres une commande et un canal de discussion avec le vendeur.
              </p>
            </>
          )}

          {step === "processing" && (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="size-12 text-sky-500 animate-spin" />
              <p className="font-semibold text-slate-700">
                Connexion à Wave en cours…
              </p>
              <p className="text-xs text-slate-400">
                Ne ferme pas la fenêtre.
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
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
                onClick={handleViewDiscussion}
                className="mt-2 h-12 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold px-6"
              >
                Voir la discussion
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
