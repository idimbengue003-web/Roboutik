"use client";

import { useSession } from "next-auth/react";
import { AdminView } from "@/components/shop/admin-view";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { User } from "@/lib/types";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (status !== "authenticated") {
      if (status === "unauthenticated") {
        setReason("not_authenticated");
        setChecked(true);
      }
      return;
    }

    const email = (session?.user as { email?: string })?.email;
    if (!email) {
      setReason("no_email_in_session");
      setChecked(true);
      return;
    }

    // Look up user by email to get isAdmin from DB
    (async () => {
      try {
        // Find user via a simple approach: try /api/me with known admin email
        // We need to find the userId. Let's use a dedicated endpoint.
        const r = await fetch(`/api/auth/check-admin`);
        const d = await r.json();
        if (d.isAdmin && d.user) {
          setUser(d.user);
        } else {
          setReason(d.reason || `isAdmin=${d.isAdmin}`);
        }
      } catch (e) {
        setReason(e instanceof Error ? e.message : "fetch_error");
      } finally {
        setChecked(true);
      }
    })();
  }, [session, status]);

  if (status === "loading" || !checked) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-rose-50 via-white to-orange-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-10 animate-spin text-rose-500" />
          <p className="text-sm text-slate-500">Vérification de l'accès admin...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-rose-50 p-6">
        <div className="max-w-md text-center">
          <Shield className="size-16 mx-auto text-rose-300 mb-4" />
          <h1 className="text-xl font-bold text-slate-900">Accès refusé</h1>
          <p className="text-slate-500 mt-2">
            Cette page est réservée aux administrateurs de Roboutik.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Raison: {reason} | Session: {status}
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
