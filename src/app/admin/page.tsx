"use client";

import { useSession } from "next-auth/react";
import { AdminView } from "@/components/shop/admin-view";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { useMessageNotifications } from "@/lib/use-message-notifications";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { user: authUser, loading: authLoading } = useAuth();
  const setMe = useAppStore((s) => s.setMe);
  const me = useAppStore((s) => s.me);

  // 🔔 Poll all conversations + orders every 8s and fire native notifications
  useMessageNotifications();

  // Hydrate the Zustand store with the full user (AdminView reads from store)
  useEffect(() => {
    if (authUser) setMe(authUser);
  }, [authUser, setMe]);

  // The JWT callback already injects isAdmin into session.user
  // (see src/app/api/auth/[...nextauth]/route.ts → session callback).
  // So we can check it directly, no extra API call needed.
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;

  // Loading states: session loading OR (authenticated but user not yet fetched)
  const isLoading =
    status === "loading" || (status === "authenticated" && authLoading && !me);

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-rose-50 via-white to-orange-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-10 animate-spin text-rose-500" />
          <p className="text-sm text-slate-500">Vérification de l'accès admin...</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || !isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-rose-50 p-6">
        <div className="max-w-md text-center">
          <Shield className="size-16 mx-auto text-rose-300 mb-4" />
          <h1 className="text-xl font-bold text-slate-900">Accès refusé</h1>
          <p className="text-slate-500 mt-2">
            Cette page est réservée aux administrateurs de Roboutik.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Session: {status} | Admin: {isAdmin ? "oui" : "non"}
          </p>
          <Link href="/">
            <Button className="mt-4 rounded-full">
              <ArrowLeft className="size-4" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Guard: wait for `me` to be populated so AdminView can read me.id safely
  if (!me) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-rose-50 via-white to-orange-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-10 animate-spin text-rose-500" />
          <p className="text-sm text-slate-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return <AdminView />;
}
