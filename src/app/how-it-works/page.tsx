"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, MessageCircle, Zap, ShieldCheck, Store, Wallet, Star, Clock, Package } from "lucide-react";
import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50/40 via-white to-orange-50/40">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4 text-slate-600">
            <ArrowLeft className="size-4" />
            Retour à Roboutik
          </Button>
        </Link>

        <div className="space-y-8">
          <header className="text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Comment ça marche ? 🎮
            </h1>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              Roboutik te permet d'acheter et vendre des objets Roblox en toute sécurité avec Wave.
            </p>
          </header>

          <section className="rounded-3xl border bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-fuchsia-600 mb-4 flex items-center gap-2">
              <ShoppingBag className="size-6" />
              Pour les acheteurs
            </h2>
            <div className="space-y-4">
              <Step num={1} icon={<Zap className="size-5 text-fuchsia-500" />} title="Choisis ton jeu" text="Parcours les 16 jeux Roblox populaires et trouve l'annonce qui te plaît." />
              <Step num={2} icon={<MessageCircle className="size-5 text-emerald-500" />} title="Contacte le vendeur (optionnel)" text="Clique sur 'Message' pour poser tes questions avant d'acheter. Le vendeur reçoit une notification immédiate." />
              <Step num={3} icon={<Zap className="size-5 text-sky-500" />} title="Paie avec Wave" text="Clique sur 'Payer avec Wave', paie en 1 clic sur l'app Wave. Le montant est déjà inscrit." />
              <Step num={4} icon={<MessageCircle className="size-5 text-fuchsia-500" />} title="Discute avec le vendeur" text="Après ton paiement, un canal de discussion s'ouvre. Donne ton pseudo Roblox au vendeur pour la livraison." />
              <Step num={5} icon={<ShieldCheck className="size-5 text-emerald-500" />} title="Reçois ton item puis valide" text="Dès que tu as reçu ton item dans le jeu, clique sur 'Valider la commande'. Le vendeur reçoit son argent." />
            </div>
          </section>

          {/* Delivery commitments */}
          <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-amber-700 mb-4 flex items-center gap-2">
              <Zap className="size-6" />
              Nos engagements livraison ⚡
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="grid size-14 place-items-center rounded-2xl bg-white shadow-sm mx-auto mb-2">
                  <Clock className="size-7 text-amber-600" />
                </div>
                <p className="font-bold text-slate-900">⏱️ Réponse rapide</p>
                <p className="text-xs text-slate-500 mt-1">
                  Le vendeur répond en moins de 30 minutes en moyenne
                </p>
              </div>
              <div className="text-center">
                <div className="grid size-14 place-items-center rounded-2xl bg-white shadow-sm mx-auto mb-2">
                  <Package className="size-7 text-emerald-600" />
                </div>
                <p className="font-bold text-slate-900">📦 Livraison</p>
                <p className="text-xs text-slate-500 mt-1">
                  Item livré en moins de 1h en moyenne sur ton compte Roblox
                </p>
              </div>
              <div className="text-center">
                <div className="grid size-14 place-items-center rounded-2xl bg-white shadow-sm mx-auto mb-2">
                  <ShieldCheck className="size-7 text-sky-600" />
                </div>
                <p className="font-bold text-slate-900">🔒 Argent protégé</p>
                <p className="text-xs text-slate-500 mt-1">
                  Le vendeur n'est payé qu'après que TU valides la réception
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-white/60 p-3 text-center">
              <p className="text-xs text-slate-600">
                💡 <strong>Si le vendeur ne répond pas dans les 30 minutes</strong>, reçois une alerte et un remboursement est possible. Contacte le support si besoin.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-emerald-600 mb-4 flex items-center gap-2">
              <Store className="size-6" />
              Pour les vendeurs
            </h2>
            <div className="space-y-4">
              <Step num={1} icon={<Store className="size-5 text-fuchsia-500" />} title="Active ton compte vendeur" text="Va dans l'onglet 'Vendeur' et clique sur 'Activer mon compte vendeur'. C'est gratuit." />
              <Step num={2} icon={<ShoppingBag className="size-5 text-emerald-500" />} title="Publie tes annonces" text="Ajoute un titre, une description, des photos et ton prix. Tu peux publier jusqu'à 10 annonces par jour." />
              <Step num={3} icon={<MessageCircle className="size-5 text-sky-500" />} title="Réponds aux messages" text="Quand un acheteur t'écrit, tu reçois un email. Réponds vite pour ne pas rater une vente !" />
              <Step num={4} icon={<Wallet className="size-5 text-emerald-500" />} title="Reçois ton argent" text="Quand l'acheteur valide la commande, ton solde est crédité. Retrait vers Wave à partir de 5 000 FCFA ou le samedi." />
              <Step num={5} icon={<Star className="size-5 text-amber-500" />} title="Cumule des avis" text="Plus tu as d'avis positifs, plus les acheteurs te font confiance. Sois sérieux et rapide !" />
            </div>
          </section>

          <section className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-emerald-700 mb-4 flex items-center gap-2">
              <ShieldCheck className="size-6" />
              Sécurité
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SecurityItem text="Paiement Wave sécurisé" />
              <SecurityItem text="Connexion Google" />
              <SecurityItem text="Argent protégé jusqu'à validation" />
              <SecurityItem text="Signalement de vendeur" />
              <SecurityItem text="Support bot 24/7" />
              <SecurityItem text="Bannissement des fraudeurs" />
              <SecurityItem text="Données chiffrées (HTTPS)" />
              <SecurityItem text="Pages légales (CGU + RGPD)" />
            </div>
          </section>

          <div className="text-center pb-8">
            <Link href="/">
              <Button size="lg" className="h-12 rounded-full bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold px-8">
                <Zap className="size-5" />
                Commencer maintenant
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ num, icon, title, text }: { num: number; icon: React.ReactNode; title: string; text: string; }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-700 font-bold">{num}</div>
        {num < 5 && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
      </div>
      <div className="pb-2">
        <div className="flex items-center gap-2 mb-0.5">{icon}<h3 className="font-bold text-slate-900">{title}</h3></div>
        <p className="text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function SecurityItem({ text }: { text: string; }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700">
      <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
      {text}
    </div>
  );
}
