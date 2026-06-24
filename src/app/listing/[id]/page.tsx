"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { formatFCFA, getListingImages } from "@/lib/types";
import type { Listing } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  MessageCircle,
  Loader2,
  Store,
  BadgeCheck,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const {
    me,
    setLoginOpen,
    setContactListing,
    setPendingListingId,
  } = useAppStore();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [enlarged, setEnlarged] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [gameName, setGameName] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/listings?all=true&sort=recent");
        if (!r.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const d = await r.json();
        const found: Listing | undefined = (d.listings ?? []).find(
          (l: Listing) => l.id === id
        );
        if (cancelled) return;
        if (!found) {
          setNotFound(true);
        } else {
          setListing(found);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function buy() {
    if (!me) {
      setLoginOpen(true);
      return;
    }
    setPendingListingId(id);
  }

  function contact() {
    if (!me) {
      setLoginOpen(true);
      return;
    }
    setContactListing({
      id,
      title: listing?.title ?? "Annonce",
      sellerName: listing?.seller?.username ?? "Vendeur",
    });
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="size-8 animate-spin text-fuchsia-500" />
          <p className="text-sm font-medium">Chargement de l'annonce…</p>
        </div>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="mx-3 sm:mx-6 py-10 max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Link>
        <div className="rounded-3xl border bg-white p-10 text-center">
          <p className="text-4xl mb-2">😕</p>
          <h1 className="text-xl font-bold text-slate-900">
            Annonce introuvable
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Cette annonce a peut-être été supprimée ou n'existe plus.
          </p>
          <Button asChild className="mt-5 rounded-full">
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </div>
    );
  }

  const images = getListingImages(listing);
  const seller = listing.seller;
  const game = listing.game;

  return (
    <div className="mx-3 sm:mx-6 py-6 pb-16 max-w-5xl mx-auto">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="size-4" />
        Retour
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square sm:aspect-video rounded-2xl overflow-hidden border bg-slate-100">
            {images.length > 0 ? (
              <img
                src={images[activeIdx] ?? images[0]}
                alt={listing.title}
                className="size-full object-cover cursor-zoom-in"
                onClick={() => setEnlarged(images[activeIdx] ?? images[0])}
              />
            ) : (
              <div className="size-full bg-gradient-to-br from-fuchsia-100 via-rose-50 to-orange-100 grid place-items-center p-8">
                <span className="text-6xl">🎮</span>
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Image précédente"
                  onClick={() =>
                    setActiveIdx((i) => (i - 1 + images.length) % images.length)
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 grid size-9 place-items-center rounded-full bg-white/85 hover:bg-white shadow-md text-slate-700"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Image suivante"
                  onClick={() =>
                    setActiveIdx((i) => (i + 1) % images.length)
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid size-9 place-items-center rounded-full bg-white/85 hover:bg-white shadow-md text-slate-700"
                >
                  <ChevronRight className="size-5" />
                </button>
                <span className="absolute bottom-2 right-2 rounded-full bg-black/60 text-white text-[10px] font-bold px-2 py-0.5">
                  {activeIdx + 1} / {images.length}
                </span>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`size-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    i === activeIdx
                      ? "border-fuchsia-500 ring-2 ring-fuchsia-200"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={src}
                    alt={`${listing.title} - photo ${i + 1}`}
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info column */}
        <div className="flex flex-col">
          {game && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-bold text-fuchsia-700 mb-2">
              <Store className="size-3.5" />
              {game.name}
            </span>
          )}

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            {listing.title}
          </h1>

          <div className="mt-3">
            <span className="text-3xl font-extrabold text-fuchsia-600">
              {formatFCFA(listing.price)}
            </span>
          </div>

          {/* Seller info */}
          {seller && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border bg-white p-3">
              <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-fuchsia-100 to-orange-100 text-lg font-bold text-fuchsia-700">
                {seller.avatar ?? "🛒"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 truncate">
                    {seller.username}
                  </span>
                  {seller.isVerified && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-600 bg-sky-50 rounded-full px-1.5 py-0.5">
                      <BadgeCheck className="size-3" />
                      Vérifié
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">Vendeur</p>
              </div>
              <Store className="size-5 text-emerald-500" />
            </div>
          )}

          {/* Description */}
          <div className="mt-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1.5">
              Description
            </h2>
            <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
              {listing.description}
            </p>
          </div>

          {/* Buy section: game name input + Wave button */}
          <div className="mt-6 rounded-2xl border-2 border-sky-100 bg-sky-50/50 p-4 space-y-3">
            <div>
              <Label htmlFor="gameName" className="text-sm font-semibold text-slate-700">
                Ton nom dans le jeu <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="gameName"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="Ex : MonPseudoRoblox"
                className="mt-1 rounded-xl h-11"
                maxLength={50}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Le vendeur a besoin de ton pseudo pour te livrer.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                onClick={contact}
                variant="outline"
                className="flex-1 h-12 rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold"
              >
                <MessageCircle className="size-5" />
                Message
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!gameName.trim()) {
                    // Focus the input
                    document.getElementById("gameName")?.focus();
                    return;
                  }
                  buy();
                }}
                className="flex-1 h-12 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold shadow-md hover:shadow-lg"
              >
                <ShieldCheck className="size-5" />
                Payer avec Wave
              </Button>
            </div>
            <p className="text-center text-[11px] text-slate-400">
              🔒 Paiement sécurisé via Wave. Le vendeur recevra ton pseudo pour la livraison.
            </p>
          </div>
        </div>
      </div>

      {/* Enlarged image lightbox */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setEnlarged(null)}
        >
          <button
            type="button"
            aria-label="Fermer"
            className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
            onClick={() => setEnlarged(null)}
          >
            <X className="size-5" />
          </button>
          <img
            src={enlarged}
            alt={listing.title}
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
