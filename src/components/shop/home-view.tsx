"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Gamepad2, ShoppingBag, Zap, ShieldCheck, MessageCircle, Star } from "lucide-react";
import type { Game, Listing } from "@/lib/types";
import { formatFCFA, getListingImages } from "@/lib/types";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RatingBadge } from "./rating-modal";

export function HomeView() {
  const { games, setActiveTab, setSelectedGameId, setPendingListingId, setLoginOpen, me, setContactListing } =
    useAppStore();
  const [featured, setFeatured] = useState<Listing[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/listings?all=true&sort=recent");
        if (!r.ok) return;
        const d = await r.json();
        setFeatured((d.listings ?? []).slice(0, 8));
      } catch {
        /* noop */
      }
    })();
  }, []);

  function buy(l: Listing) {
    if (!me) {
      setLoginOpen(true);
      return;
    }
    setPendingListingId(l.id);
  }

  function contact(l: Listing) {
    if (!me) {
      setLoginOpen(true);
      return;
    }
    setContactListing({
      id: l.id,
      title: l.title,
      sellerName: l.seller?.username ?? "Vendeur",
    });
  }

  return (
    <div className="space-y-12 pb-12">
      {/* HERO - Steal a Brainrot */}
      <section className="relative overflow-hidden rounded-3xl mx-3 sm:mx-6 mt-4 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600 via-rose-500 to-orange-400" />
        <img
          src="/steal-a-brainrot-hero.webp"
          alt="Steal a Brainrot - le jeu Roblox culte"
          className="absolute inset-0 size-full object-cover opacity-80 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="relative px-5 py-10 sm:px-12 sm:py-16 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-fuchsia-700 shadow-md">
            <Zap className="size-3.5 fill-fuchsia-600" />
            Nouveau jeu culte
          </span>
          <h1 className="mt-3 text-4xl sm:text-6xl font-extrabold text-white drop-shadow-lg tracking-tight">
            Steal a Brainrot
          </h1>
          <p className="mt-3 text-base sm:text-lg text-white/90 max-w-lg drop-shadow">
            Bienvenue sur <strong>RobloxBoutik</strong> — le site le plus simple pour
            acheter des objets, comptes et boosters Roblox. Choisis ton jeu, paie en 1
            clic avec <strong>Wave</strong>, discute avec le vendeur et valide ta commande
            en toute sécurité.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={() => {
                const g = games.find((x) => x.slug === "steal-a-brainrot");
                if (g) {
                  setSelectedGameId(g.id);
                  setActiveTab("games");
                } else {
                  setActiveTab("games");
                }
              }}
              className="h-12 rounded-full bg-white text-fuchsia-700 hover:bg-white/90 px-6 text-base font-bold shadow-lg"
            >
              <Gamepad2 className="size-5" />
              Voir les annonces
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setActiveTab("orders")}
              className="h-12 rounded-full bg-white/10 text-white border-white/40 hover:bg-white/20 px-6 text-base font-bold backdrop-blur"
            >
              <ShoppingBag className="size-5" />
              Mes commandes
            </Button>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="mx-3 sm:mx-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FeatureCard
          icon={<Zap className="size-6 text-fuchsia-600" />}
          title="Paiement Wave en 1 clic"
          text="Le montant est déjà inscrit, tu valides et c'est tout."
        />
        <FeatureCard
          icon={<MessageCircle className="size-6 text-rose-600" />}
          title="Discussion directe"
          text="Un canal de discussion avec le vendeur pour chaque commande."
        />
        <FeatureCard
          icon={<ShieldCheck className="size-6 text-emerald-600" />}
          title="Argent protégé"
          text="Tu valides la commande, le vendeur est payé. Simple et sûr."
        />
      </section>

      {/* FAVORITES - popular Roblox games */}
      <section className="mx-3 sm:mx-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              ⭐ Jeux Roblox favoris
            </h2>
            <p className="text-slate-500 mt-1">
              Les jeux les plus populaires du moment. Choisis-en un !
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("games")}
            className="text-fuchsia-600 font-semibold hover:text-fuchsia-700"
          >
            Voir tout →
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {games.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              onClick={() => {
                setSelectedGameId(g.id);
                setActiveTab("games");
              }}
            />
          ))}
        </div>
      </section>

      {/* Featured listings */}
      {featured.length > 0 && (
        <section className="mx-3 sm:mx-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4">
            🔥 Annonces du moment
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            {featured.map((l) => (
              <ListingMiniCard
                key={l.id}
                listing={l}
                onBuy={() => buy(l)}
                onContact={() => contact(l)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="grid size-10 place-items-center rounded-xl bg-slate-50 mb-2">
        {icon}
      </div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-0.5">{text}</p>
    </div>
  );
}

function GameCard({ game, onClick }: { game: Game; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border-2 border-transparent bg-slate-100 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-fuchsia-400"
    >
      <div className="aspect-square overflow-hidden">
        <img
          src={game.image}
          alt={game.name}
          className="size-full object-cover transition-transform group-hover:scale-110"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 sm:p-3">
        <p className="text-xs sm:text-sm font-bold text-white line-clamp-2 drop-shadow">
          {game.name}
        </p>
      </div>
      {game.isFavorite && (
        <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-amber-400 text-xs shadow-md">
          ⭐
        </span>
      )}
    </button>
  );
}

function ListingMiniCard({
  listing,
  onBuy,
  onContact,
}: {
  listing: Listing;
  onBuy: () => void;
  onContact: () => void;
}) {
  const images = getListingImages(listing);
  const firstImage = images[0];

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="flex flex-col rounded-2xl border bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="aspect-video relative overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage}
            alt={listing.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-fuchsia-100 to-orange-100 grid place-items-center p-3">
            <div className="text-center">
              <p className="text-2xl">🎮</p>
              <p className="text-xs text-slate-500 mt-1 font-medium line-clamp-2">
                {listing.game?.name}
              </p>
            </div>
          </div>
        )}
        {/* Photo count badge */}
        {images.length > 1 && (
          <span className="absolute bottom-1 right-1 rounded-full bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5">
            📷 {images.length}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
          {listing.title}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 flex-1">
          {listing.description}
        </p>
        {listing.ratings && listing.ratings.length > 0 && (
          <div className="mt-1">
            <RatingBadge ratings={listing.ratings} />
          </div>
        )}
        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
          <span className="font-extrabold text-fuchsia-600 text-base">
            {formatFCFA(listing.price)}
          </span>
        </div>

        {/* Two buttons: Message + Buy */}
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContact();
            }}
            className="flex-1 h-8 rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs"
          >
            <MessageCircle className="size-3.5" />
            Message
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBuy();
            }}
            className="flex-1 h-8 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-bold"
          >
            <span className="size-3.5 rounded-full bg-white/20 grid place-items-center text-[8px] font-bold">
              W
            </span>
            Acheter
          </Button>
        </div>
      </div>
    </Link>
  );
}
