"use client";

import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User as UserIcon,
  Trash2,
  AlertTriangle,
  Loader2,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const AVATAR_OPTIONS = ["🎮", "🧒", "👑", "🛡️", "💰", "🛒", "🚀", "⚡", "🎯", "🏆", "💎", "🔥", "⭐", "👾", "🤖", "🐱"];

export function ProfileModal() {
  const { me, setMe, profileOpen, setProfileOpen } = useAppStore();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("🎮");
  const [saving, setSaving] = useState(false);

  // Delete account flow
  const [confirmUsername, setConfirmUsername] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (me) {
      setUsername(me.username);
      setAvatar(me.avatar ?? "🎮");
    }
  }, [me]);

  // Reset delete screen when modal closes
  useEffect(() => {
    if (!profileOpen) {
      setShowDeleteConfirm(false);
      setConfirmUsername("");
    }
  }, [profileOpen]);

  async function handleSave() {
    if (!me) return;
    if (username.trim() !== me.username || avatar !== (me.avatar ?? "🎮")) {
      setSaving(true);
      try {
        const r = await fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: me.id,
            username: username.trim(),
            avatar,
          }),
        });
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error ?? "Échec");
        }
        const d = await r.json();
        setMe(d.user);
        toast({ title: "Profil mis à jour ✅" });
      } catch (e) {
        toast({
          title: "Erreur",
          description: e instanceof Error ? e.message : "Erreur",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }
    setProfileOpen(false);
  }

  async function handleDelete() {
    if (!me) return;
    setDeleting(true);
    try {
      const r = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: me.id,
          confirmUsername: confirmUsername.trim(),
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      toast({ title: "Compte supprimé 👋" });
      await signOut();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  if (!me) return null;

  return (
    <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="size-5 text-fuchsia-600" />
            Mon profil
          </DialogTitle>
          <DialogDescription>
            Modifie ton pseudo et ton avatar, ou supprime ton compte (RGPD).
          </DialogDescription>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <>
            <div className="space-y-4">
              {/* Email (read-only) */}
              <div>
                <Label className="text-sm font-semibold">Email Google</Label>
                <Input
                  value={me.email}
                  disabled
                  className="mt-1 rounded-xl bg-slate-50 text-slate-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  L'email vient de ton compte Google. Il n'est pas modifiable.
                </p>
              </div>

              {/* Username */}
              <div>
                <Label className="text-sm font-semibold">Pseudo</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 rounded-xl"
                  maxLength={30}
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Entre 2 et 30 caractères. Unique sur Roboutik.
                </p>
              </div>

              {/* Avatar */}
              <div>
                <Label className="text-sm font-semibold">Avatar</Label>
                <div className="grid grid-cols-8 gap-2 mt-2">
                  {AVATAR_OPTIONS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`grid size-10 place-items-center rounded-xl text-xl transition-all ${
                        avatar === a
                          ? "bg-fuchsia-100 ring-2 ring-fuchsia-400 scale-110"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="rounded-xl bg-slate-50 p-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500">Compte créé le</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(me.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Statut</p>
                  <p className="font-semibold text-slate-900">
                    {me.isAdmin
                      ? "🛡️ Administrateur"
                      : me.isSeller
                      ? "🛒 Vendeur"
                      : "🧒 Acheteur"}
                  </p>
                </div>
              </div>

              {/* Delete account button */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl p-2 transition-colors"
              >
                <Trash2 className="size-4" />
                Supprimer mon compte (RGPD)
              </button>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setProfileOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold rounded-full"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Enregistrer
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Delete confirmation screen */}
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2">
              <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 space-y-1">
                <p>
                  <strong>Action irréversible.</strong> Tes conversations,
                  tickets support et annonces seront supprimés.
                </p>
                <p>
                  Tes commandes passées seront conservées 5 ans (obligation comptable)
                  mais ton pseudo sera remplacé par « Utilisateur supprimé ».
                </p>
                <p>
                  <strong>Conditions</strong> : solde à 0, aucune commande en cours,
                  aucun retrait en attente.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-rose-700">
                Pour confirmer, tape ton pseudo : <strong>{me.username}</strong>
              </Label>
              <Input
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                placeholder={me.username}
                className="mt-1 rounded-xl"
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmUsername("");
                }}
              >
                Annuler
              </Button>
              <Button
                disabled={deleting || confirmUsername.trim() !== me.username}
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-full"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Supprimer définitivement
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
