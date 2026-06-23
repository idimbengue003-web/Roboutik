"use client";

import { AdminView } from "@/components/shop/admin-view";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";

export default function AdminPage() {
  const { me } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    (async () => {
      // Wait a bit for the store to populate from useAuth
      if (!me) {
        // Try waiting up to 3 seconds
        let tries = 0;
        while (!me && tries < 10) {
          await new Promise((r) => setTimeout(r, 300));
          tries++;
        }
      }

      if (!me) {
        setReason("not_authenticated");
        setLoading(false);
        return;
      }

      // Double-check admin status from DB via /api/me
      try {
        const r = await fetch(`/api/me?userId=${me.id}`);
        if (!r.ok) {
          setReason("user_not_found");
          setLoading(false);
          return;
        }
        const d = await r.json();
        const user = d.user;
        if (!user) {
          setReason("user_not_found");
        } else if (!user.isAdmin) {
          setReason("not_admin");
        } else {
          setVerifiedUser(user);
        }
      } catch (e) {
        setReason(e instanceof Error ? e.message : "fetch_error");
      } finally {
        setLoading(false);
      }
    })();
  }, [me]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-rose-50 via-white to-orange-50">
        <Loader2 className="size-10 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!verifiedUser) {
    return (
      <div className="min-h-screen grid place-items-center bg-rose-50 p-6">
        <div className="max-w-md text-center">
          <Shield className="size-16 mx-auto text-rose-300 mb-4" />
          <h1 className="text-xl font-bold text-slate-900">Accès refusé</h1>
          <p className="text-slate-500 mt-2">
            Cette page est réservée aux administrateurs de Roboutik.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Raison: {reason || "inconnue"}
            {me && ` | User: ${me.email} | isAdmin: ${String(me.isAdmin)}`}
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
