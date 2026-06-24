"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { ContactSellerDialog } from "@/components/shop/messages-view";
import { formatFCFA, getListingImages } from "@/lib/types";
import {
  ArrowLeft,
  Loader2,
  Store,
  BadgeCheck,
  Star,
  Package,
  TrendingUp,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

type SellerProfile = {
  seller: {
    id: string;
    username: string;
    avatar: string | null;
    isVerified: boolean;
    isSeller: boolean;
    createdAt: string;
  };
  stats: {
    totalSales: number;
    totalGross: number;
    totalRatings: number;
    avgRating: number;
    totalListings: number;
  };
  listings: any[];
  reviews: any[];
  recentSales: any[];
};

export default function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { me, setLoginOpen } = useAppStore();
  const [data, setData] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<"listings" | "reviews" | "sales">("listings");
  const [contactTarget, setContactTarget] = useState<{
    listingId: string;
    listingTitle: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/sellers/${id}`);
        if (!r.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const d = await r.json();
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="size-8 animate-spin text-fuchsia-500" />
          <p className="text-sm font-medium">Chargement du profil vendeur…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
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
            Vendeur introuvable
          </h1>
          <Button asChild className="mt-5 rounded-full">
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { seller, stats, listings, reviews, recentSales } = data;
  const isOwn = me?.id === seller.id;

  return (
    <div className="mx-3 sm:mx-6 py-6 pb-16 max-w-5xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="size-4" />
        Retour à l'accueil
      </Link>

      {/* Profile header */}
      <div className="rounded-3xl bg-gradient-to-br from-fuchsia-600 via-fuchsia-500 to-orange-500 p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="grid size-20 place-items-center rounded-2xl bg-white/20 backdrop-blur text-4xl shrink-0">
            {seller.avatar ?? "🛒"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold truncate">
                {seller.username}
              </h1>
              {seller.isVerified && (
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-white bg-white/25 backdrop-blur rounded-full px-2 py-0.5">
                  <BadgeCheck className="size-3.5" />
                  Vérifié
                </span>
              )}
              {isOwn && (
                <span className="text-[10px] font-bold uppercase bg-white/25 backdrop-blur rounded-full px-2 py-0.5">
                  Ton profil
                </span>
              )}
            </div>
            <p className="text-white/80 text-sm mt-0.5 flex items-center gap-1.5">
              <Store className="size-4" />
              Vendeur depuis le{" "}
              {new Date(seller.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        {/* Quick stats (no revenue shown publicly) */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/20">
          <div>
            <p className="text-[11px] opacity-80 uppercase tracking-wide">
              Ventes
            </p>
            <p className="text-xl font-extrabold">{stats.totalSales}</p>
          </div>
          <div>
            <p className="text-[11px] opacity-80 uppercase tracking-wide">
              Note moyenne
            </p>
            <p className="text-xl font-extrabold flex items-center gap-1">
              <Star className="size-4 fill-amber-300 text-amber-300" />
              {stats.avgRating || "—"}
              {stats.totalRatings > 0 && (
                <span className="text-xs opacity-80 font-medium">
                  ({stats.totalRatings})
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] opacity-80 uppercase tracking-wide">
              Annonces
            </p>
            <p className="text-xl font-extrabold">{stats.totalListings}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mt-6">
        {[
          { id: "listings", label: `Annonces (${listings.length})`, icon: Package },
          { id: "reviews", label: `Avis (${reviews.length})`, icon: Star },
          { id: "sales", label: `Ventes (${stats.totalSales})`, icon: TrendingUp },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <Button
              key={t.id}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t.id as typeof tab)}
              className={`h-9 rounded-full px-4 text-sm font-semibold shrink-0 ${
                active
                  ? "bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white"
                  : ""
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </Button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "listings" && (
        <div className="mt-4">
          {listings.length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
              Aucune annonce active.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {listings.map((l) => {
                const images = getListingImages(l);
                const avgStars =
                  l.ratings.length > 0
                    ? l.ratings.reduce((s: number, r: { stars: number }) => s + r.stars, 0) /
                      l.ratings.length
                    : 0;
                return (
                  <Link
                    key={l.id}
                    href={`/listing/${l.id}`}
                    className="rounded-2xl border bg-white overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-video bg-slate-100 relative">
                      {images.length > 0 ? (
                        <img
                          src={images[0]}
                          alt={l.title}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="size-full grid place-items-center bg-gradient-to-br from-fuchsia-100 to-orange-100">
                          <span className="text-4xl">🎮</span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold text-fuchsia-700 px-2 py-0.5">
                        {l.game?.name ?? "—"}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-slate-900 line-clamp-1">
                        {l.title}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="font-extrabold text-fuchsia-600">
                          {formatFCFA(l.price)}
                        </p>
                        {l.ratings.length > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {avgStars.toFixed(1)} ({l.ratings.length})
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "reviews" && (
        <div className="mt-4 space-y-3">
          {reviews.length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
              Aucun avis pour le moment.
            </div>
          ) : (
            <>
              {/* Rating summary */}
              {stats.totalRatings > 0 && (
                <div className="rounded-2xl border bg-white p-4 flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-amber-500">
                      {stats.avgRating}
                    </p>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-4 ${
                            i < Math.round(stats.avgRating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {stats.totalRatings} avis
                    </p>
                  </div>
                  <div className="flex-1 border-l pl-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      Répartition
                    </p>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews.filter(
                        (r) => r.stars === star
                      ).length;
                      const pct =
                        stats.totalRatings > 0
                          ? (count / stats.totalRatings) * 100
                          : 0;
                      return (
                        <div
                          key={star}
                          className="flex items-center gap-2 text-xs mb-1"
                        >
                          <span className="w-3 text-slate-600 font-semibold">
                            {star}
                          </span>
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-slate-500 w-5 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-slate-100 text-lg shrink-0">
                      {r.fromUser?.avatar ?? "👤"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {r.fromUser?.username ?? "Anonyme"}
                        </p>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3.5 ${
                                i < r.stars
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {r.listing && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Avis sur :{" "}
                          <Link
                            href={`/listing/${r.listingId ?? ""}`}
                            className="text-fuchsia-600 hover:underline font-medium"
                          >
                            {r.listing.title}
                          </Link>{" "}
                          · {r.listing.game?.name}
                        </p>
                      )}
                      {r.comment && (
                        <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                          {r.comment}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        {new Date(r.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === "sales" && (
        <div className="mt-4 space-y-3">
          {recentSales.length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
              Aucune vente validée pour le moment.
            </div>
          ) : (
            <div className="rounded-2xl border bg-white divide-y">
              {recentSales.map((o) => (
                <div key={o.id} className="flex items-center gap-3 p-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 shrink-0">
                    <TrendingUp className="size-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm line-clamp-1">
                      {o.listing?.title ?? "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {o.listing?.game?.name ?? "—"} ·{" "}
                      {o.buyer?.username ?? "Anonyme"}
                      {o.validatedAt && (
                        <>
                          {" · "}
                          {new Date(o.validatedAt).toLocaleDateString("fr-FR")}
                        </>
                      )}
                    </p>
                    {o.rating && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3 ${
                              i < o.rating.stars
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-200"
                            }`}
                          />
                        ))}
                        {o.rating.comment && (
                          <span className="text-xs text-slate-500 ml-1 line-clamp-1">
                            — {o.rating.comment}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">
                      <TrendingUp className="size-3" />
                      Vendu
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contact button (only if not own profile) — opens local dialog */}
      {!isOwn && listings.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4">
          <Button
            onClick={() => {
              if (!me) {
                setLoginOpen(true);
                return;
              }
              const first = listings[0];
              setContactTarget({
                listingId: first.id,
                listingTitle: first.title,
              });
            }}
            className="w-full h-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-lg"
          >
            <MessageCircle className="size-5" />
            Contacter {seller.username}
          </Button>
        </div>
      )}

      {/* Local ContactSellerDialog — mounted here so it works on this route */}
      <ContactSellerDialog
        listingId={contactTarget?.listingId ?? ""}
        listingTitle={contactTarget?.listingTitle ?? ""}
        sellerName={seller.username}
        open={!!contactTarget}
        onClose={() => setContactTarget(null)}
        onStarted={() => setContactTarget(null)}
      />
    </div>
  );
}
