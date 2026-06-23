"use client";

import { useSession } from "next-auth/react";
import { AdminView } from "@/components/shop/admin-view";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-rose-50 via-white to-orange-50">
        <Loader2 className="size-10 animate-spin text-rose-500" />
      </div>
    );
  }

  // Check isAdmin from the JWT session (set by NextAuth jwt callback)
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-rose-50 p-6">
        <div className="max-w-md text-center">
          <Shield className="size-16 mx-auto text-rose-300 mb-4" />
          <h1 className="text-xl font-bold text-slate-900">Accès refusé</h1>
          <p className="text-slate-500 mt-2">
            Cette page est réservée aux administrateurs de Roboutik.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Session: {session ? "connecté" : "non connecté"} · Admin: {String(isAdmin ?? false)}
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

  return <AdminView />;
}
