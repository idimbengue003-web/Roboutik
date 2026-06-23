"use client";

import { Button } from "@/components/ui/button";
import { useSyncExternalStore, useState } from "react";

const STORAGE_KEY = "rb_age_verified";

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

export function AgeGate() {
  const verified = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [showDenied, setShowDenied] = useState(false);

  if (verified === "true") return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-800 p-4">
      <div className="max-w-md text-center text-white">
        <img
          src="/logo-roboutik.png"
          alt="RobloxBoutik"
          className="mx-auto size-20 rounded-2xl shadow-lg mb-4"
        />
        <h1 className="text-3xl font-extrabold mb-3">
          Bienvenue sur RobloxBoutik 🎮
        </h1>
        <p className="text-sm text-white/90 mb-6">
          RobloxBoutik est un site d'achat pour les jeux Roblox. Pour utiliser le site,
          tu dois avoir au moins 13 ans ou l'autorisation de tes parents.
        </p>

        {!showDenied ? (
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => {
                localStorage.setItem(STORAGE_KEY, "true");
                window.dispatchEvent(new Event("storage"));
              }}
              className="h-12 rounded-full bg-white text-fuchsia-700 hover:bg-white/90 font-bold text-base"
            >
              J'ai 13 ans ou plus
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => setShowDenied(true)}
              className="h-12 rounded-full text-white/70 hover:text-white hover:bg-white/10 font-medium"
            >
              J'ai moins de 13 ans
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-white/90 bg-white/10 rounded-xl p-4">
              Désolé, tu dois avoir 13 ans ou plus ou être accompagné d'un parent
              pour utiliser RobloxBoutik.
            </p>
            <Button
              size="lg"
              onClick={() => {
                window.location.href = "https://www.google.com";
              }}
              className="h-12 rounded-full bg-white text-fuchsia-700 hover:bg-white/90 font-bold"
            >
              Quitter
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
