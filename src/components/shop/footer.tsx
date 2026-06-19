"use client";

import { ShieldCheck, Zap, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <span className="font-extrabold bg-gradient-to-r from-fuchsia-600 to-orange-500 bg-clip-text text-transparent">
            RobloxBoutik
          </span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1">
            <Zap className="size-3.5 text-amber-500" />
            Paiement Wave
          </span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            100% sécurisé
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-2 inline-flex items-center gap-1">
          Fait avec <Heart className="size-3 text-rose-500 fill-rose-500" /> pour
          les jeunes joueurs Roblox · 2026
        </p>
      </div>
    </footer>
  );
}
