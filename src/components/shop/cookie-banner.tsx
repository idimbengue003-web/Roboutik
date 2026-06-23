"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useSyncExternalStore, useState } from "react";

const STORAGE_KEY = "rb_cookie_consent";

function getSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}
function getServerSnapshot(): string | null {
  return null;
}
function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function CookieBanner() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [showRefused, setShowRefused] = useState(false);

  if (consent !== null) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-sm text-white p-4">
      <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
        <p className="text-xs sm:text-sm">
          Roboutik utilise des cookies nécessaires au fonctionnement (session Google). Aucun cookie publicitaire.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, "accepted");
              window.dispatchEvent(new Event("storage"));
            }}
            className="h-8 rounded-full bg-fuchsia-600 text-white text-xs font-bold"
          >
            Accepter
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, "refused");
              window.dispatchEvent(new Event("storage"));
              setShowRefused(true);
            }}
            className="h-8 text-xs text-slate-400"
          >
            Refuser
          </Button>
        </div>
      </div>
      {showRefused && (
        <p className="text-[11px] text-amber-400 mt-2 max-w-4xl mx-auto">
          ⚠️ Sans cookies, certaines fonctionnalités (connexion, panier) peuvent ne pas fonctionner.
        </p>
      )}
    </div>
  );
}
