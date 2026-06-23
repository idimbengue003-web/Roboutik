"use client";

import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

export function GoogleLoginModal() {
  const { loginOpen, setLoginOpen } = useAppStore();
  const { signInWithGoogle } = useAuth();

  const [loading, setLoading] = useState(false);

  function reset() {
    setLoading(false);
    setLoginOpen(false);
  }

  // Real Google OAuth via NextAuth — redirects to Google
  function handleGoogleLogin() {
    setLoading(true);
    signInWithGoogle();
  }

  return (
    <Dialog open={loginOpen} onOpenChange={(o) => !o && reset()}>
      <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden p-0 gap-0">
        <VisuallyHidden asChild>
          <DialogTitle>Se connecter avec Google</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden asChild>
          <DialogDescription>
            Connecte-toi avec ton compte Google pour acheter et discuter.
          </DialogDescription>
        </VisuallyHidden>
        {/* Google-style header */}
        <div className="bg-white px-6 pt-8 pb-4 text-center border-b">
          <div className="flex items-center justify-center gap-2 mb-3">
            <GoogleLogo />
            <span className="text-[11px] text-slate-500 font-medium ml-1">
              Se connecter avec Google
            </span>
          </div>
          <h2 className="text-xl font-normal text-slate-800">
            Bienvenue sur RobloxBoutik
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Connecte-toi pour acheter et discuter avec les vendeurs.
          </p>
        </div>

        <div className="p-6 bg-slate-50">
          {loading ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="size-10 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500">Redirection vers Google…</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 text-center mb-3">
                Clique pour te connecter avec ton compte Google
              </p>
              <Button
                onClick={handleGoogleLogin}
                variant="outline"
                className="w-full h-12 rounded-xl bg-white hover:bg-slate-50 border-slate-300 text-slate-700 font-medium justify-center gap-3"
              >
                <GoogleLogo />
                Se connecter avec Google
              </Button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                En continuant, tu acceptes les règles simples de RobloxBoutik :
                sois sympa, paie avec Wave, et valide tes commandes.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoogleLogo() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function UserChip() {
  const { me, setLoginOpen, setActiveTab, setProfileOpen } = useAppStore();
  const { signOut } = useAuth();
  const { toast } = useToast();

  if (!me) {
    return (
      <Button
        onClick={() => setLoginOpen(true)}
        className="h-10 rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-3 sm:px-4"
      >
        <GoogleLogo />
        <span className="hidden sm:inline">Se connecter</span>
        <span className="sm:hidden">Connexion</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setProfileOpen(true)}
        className="flex items-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200 pl-1 pr-3 py-1 transition-colors"
        title="Mon profil"
      >
        <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white text-sm font-bold">
          {me.avatar ?? "🎮"}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-slate-800 leading-tight">
            {me.username}
          </p>
          {me.isSeller ? (
            <p className="text-[10px] text-emerald-600 leading-tight">
              {me.isVerified && "✓ "}Vendeur · {me.balance.toLocaleString("fr-FR")} F
            </p>
          ) : (
            <p className="text-[10px] text-slate-500 leading-tight">Acheteur</p>
          )}
        </div>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50"
        onClick={async () => {
          await signOut();
          toast({ title: "Déconnecté·e 👋" });
        }}
        title="Se déconnecter"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
