"use client";

import { ShieldCheck, Zap, Heart, Scale, FileText, Lock } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
            <span className="font-extrabold bg-gradient-to-r from-fuchsia-600 to-orange-500 bg-clip-text text-transparent">
              Roboutik
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

          {/* Legal links */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <Link
              href="/legal/terms"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-fuchsia-600 transition-colors"
            >
              <FileText className="size-3.5" />
              Conditions générales
            </Link>
            <span className="text-slate-300">·</span>
            <Link
              href="/legal/privacy"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-fuchsia-600 transition-colors"
            >
              <Lock className="size-3.5" />
              Confidentialité
            </Link>
            <span className="text-slate-300">·</span>
            <Link
              href="/legal/notices"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-fuchsia-600 transition-colors"
            >
              <Scale className="size-3.5" />
              Mentions légales
            </Link>
          </div>

          <p className="text-xs text-slate-400 inline-flex items-center gap-1">
            Fait avec <Heart className="size-3 text-rose-500 fill-rose-500" /> pour
            les jeunes joueurs Roblox · 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
