"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Store, ChevronRight, MessageCircle, Flag } from "lucide-react";
import type { Listing } from "@/lib/types";
import { formatFCFA, getListingImages } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ListingSearch, emptyFilter, type FilterState } from "./search-and-rating";
import { RatingBadge } from "./rating-modal";

export function GamesView() {
  const { games, selectedGameId, setSelectedGameId, setPendingListingId, setLoginOpen, me, setContactListing, setReportListingId } =
    useAppStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterState>(emptyFilter);

  const selectedGame = games.find((g) => g.id === selectedGameId) ?? null;

  const fetchListings = useCallback(async () => {
    if (!selectedGameId) {
      setListings([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("gameId", selectedGameId);
      if (filter.q) params.set("q", filter.q);
      if (filter.minPrice) params.set("minPrice", filter.minPrice);
      if (filter.maxPrice) params.set("maxPrice", filter.maxPrice);
      params.set("sort", filter.sort);

      const r = await fetch(`/api/listings?${params.toString()}`);
      if (!r.ok) return;
      const d = await r.json();
      setListings(d.listings ?? []);
    } finally {
      setLoading(false);
    }
  }, [selectedGameId, filter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  function buy(l: Listing) {
    if (!me) {
      setLoginOpen(true);
      return;
    }
    setPendingListingId(l.id);
  }

  function openContact(l: Listing) {
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

  function reportListing(l: Listing) {
    if (!me) {
      setLoginOpen(true);
      return;
    }
    setReportListingId(l.id);
  }

  // View: a game is selected — show its listings
  if (selectedGame) {
    return (
      <div className="mx-3 sm:mx-6 py-6 pb-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedGameId(null)}
          className="mb-4 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Retour aux jeux
        </Button>

        <div className="flex items-center gap-4 mb-6">
          <img
            src={selectedGame.image}
            alt={selectedGame.name}
            className="size-16 sm:size-20 rounded-2xl object-cover shadow-md"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {selectedGame.name}
            </h1>
            <p className="text-slate-500 text-sm">{selectedGame.description}</p>
          </div>
        </div>

        <div className="mb-4">
          <ListingSearch value={filter} onChange={setFilter} />
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-3">
          📦 {listings.length} annonce{listings.length > 1 ? "s" : ""} disponible
          {listings.length > 1 ? "s" : ""}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
            Aucune annonce ne correspond à ta recherche.
            <br />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter(emptyFilter)}
              className="mt-2 text-fuchsia-600 font-semibold"
            >
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                onBuy={() => buy(l)}
                onContact={() => openContact(l)}
                onReport={() => reportListing(l)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // View: no game selected — show all games
  return (
    <div className="mx-3 sm:mx-6 py-6 pb-12">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
        🎮 Tous les jeux Roblox
      </h1>
      <p className="text-slate-500 mb-6">
        Choisis un jeu pour voir les annonces des vendeurs.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGameId(g.id)}
            className="group flex items-center gap-4 rounded-2xl border-2 border-transparent bg-white p-3 shadow-sm transition-all hover:shadow-md hover:border-fuchsia-300 text-left"
          >
            <img
              src={g.image}
              alt={g.name}
              className="size-20 rounded-xl object-cover shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 line-clamp-1">{g.name}</h3>
                {g.isFavorite && (
                  <span className="text-amber-400 text-sm">⭐</span>
                )}
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">
                {g.description}
              </p>
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-600">
                Voir les annonces
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ListingCard({
  listing,
  onBuy,
  onContact,
  onReport,
}: {
  listing: Listing;
  onBuy: () => void;
  onContact: () => void;
  onReport: () => void;
}) {
  const images = getListingImages(listing);
  const firstImage = images[0];
  const stock = typeof listing.stock === "number" ? listing.stock : 1;
  const outOfStock = stock <= 0;
  const lowStock = stock > 0 && stock <= 3;

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="flex flex-col rounded-2xl border bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Image area: show first uploaded photo, or fallback gradient + emoji */}
      <div className="aspect-video relative overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage}
            alt={listing.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-fuchsia-100 via-rose-50 to-orange-100 grid place-items-center p-4">
            <span className="text-4xl">🎮</span>
          </div>
        )}
        {/* Game badge (top-left) */}
        {listing.game && (
          <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {listing.game.name}
          </span>
        )}
        {/* Photo count badge (bottom-right) if multiple images */}
        {images.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">
            📷 {images.length}
          </span>
        )}
        {/* Discreet report button (top-right) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReport();
          }}
          title="Signaler cette annonce"
          className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-white/80 hover:bg-rose-50 text-rose-500 hover:text-rose-600 shadow-sm transition-colors"
          aria-label="Signaler cette annonce"
        >
          <Flag className="size-3.5" />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold text-slate-900 line-clamp-1">{listing.title}</h3>
        <p className="text-sm text-slate-500 mt-1 line-clamp-2 flex-1">
          {listing.description}
        </p>

        {listing.ratings && listing.ratings.length > 0 && (
          <div className="mt-2">
            <RatingBadge ratings={listing.ratings} />
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <div className="grid size-7 place-items-center rounded-full bg-slate-100 text-sm">
            {listing.seller?.avatar ?? "🛒"}
          </div>
          <span className="font-medium">{listing.seller?.username}</span>
          {listing.seller?.isVerified && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-600 bg-sky-50 rounded-full px-1.5 py-0.5">
              ✓ Vérifié
            </span>
          )}
          <Store className="size-3.5 text-emerald-500" />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <span className="font-extrabold text-fuchsia-600 text-lg">
            {formatFCFA(listing.price)}
          </span>
          {/* Stock indicator */}
          {outOfStock ? (
            <span className="text-[11px] font-bold text-rose-600">
              Rupture de stock
            </span>
          ) : lowStock ? (
            <span className="text-[11px] font-bold text-amber-600">
              Plus que {stock} en stock !
            </span>
          ) : (
            <span className="text-[11px] font-bold text-emerald-600">
              {stock} en stock
            </span>
          )}
        </div>

        {/* Two buttons: Contact seller + Buy */}
        <div className="mt-2 flex gap-2">
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContact();
            }}
            variant="outline"
            className="flex-1 h-10 rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold text-sm"
          >
            <MessageCircle className="size-4" />
            Message
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBuy();
            }}
            disabled={outOfStock}
            className="flex-1 h-10 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold shadow-md hover:shadow-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="size-4 rounded-full bg-white/20 grid place-items-center text-[10px] font-bold">
              W
            </span>
            {outOfStock ? "Rupture" : "Acheter"}
          </Button>
        </div>
      </div>
    </Link>
  );
}
