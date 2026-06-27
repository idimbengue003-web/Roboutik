"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { MessagesSquare, MessageCircle, Store, ShoppingBag, ArrowLeft, Send, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import type { Conversation } from "@/lib/types";
import { formatFCFA } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function MessagesView() {
  const me = useAppStore((s) => s.me);
  const setLoginOpen = useAppStore((s) => s.setLoginOpen);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const ordersVersion = useAppStore((s) => s.ordersVersion);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!me) {
      setConversations([]);
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`/api/conversations?userId=${me.id}`);
      if (!r.ok) return;
      const d = await r.json();
      setConversations(d.conversations ?? []);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    load();
  }, [load, ordersVersion]);

  if (!me) {
    return (
      <div className="mx-3 sm:mx-6 py-12">
        <div className="rounded-3xl border bg-white p-8 sm:p-12 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 mb-4">
            <MessagesSquare className="size-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Connecte-toi pour voir tes messages
          </h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Contacte les vendeurs avant d'acheter, retrouve tes conversations et
            reste en contact avec eux.
          </p>
          <Button
            onClick={() => setLoginOpen(true)}
            className="mt-5 h-11 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold px-6"
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 sm:mx-6 py-6 pb-12 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          💬 Messagerie
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Discute avec les vendeurs avant d'acheter. Réponds vite pour ne pas rater une vente.
        </p>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-8">Chargement…</div>
      ) : conversations.length === 0 ? (
        <div className="rounded-3xl border bg-white p-8 text-center text-slate-500">
          <MessageCircle className="size-10 mx-auto mb-3 text-slate-300" />
          Aucune conversation pour le moment.
          <br />
          Va sur une annonce et clique sur "Contacter le vendeur" pour démarrer.
          <Button
            variant="ghost"
            onClick={() => setActiveTab("games")}
            className="mt-2 text-fuchsia-600 font-semibold"
          >
            Parcourir les annonces →
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((c) => (
            <ConversationCard
              key={c.id}
              conversation={c}
              currentUserId={me.id}
              onOpen={() => setActiveConversationId(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationCard({
  conversation,
  currentUserId,
  onOpen,
}: {
  conversation: Conversation;
  currentUserId: string;
  onOpen: () => void;
}) {
  const isBuyer = conversation.buyerId === currentUserId;
  const otherParty = isBuyer ? conversation.seller : conversation.buyer;
  const lastMsg = conversation.messages?.[conversation.messages.length - 1];
  const lastMine = lastMsg?.senderId === currentUserId;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-2xl shrink-0">
          {otherParty?.avatar ?? "💬"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 line-clamp-1">
                {otherParty?.username}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {isBuyer ? (
                  <>
                    <Store className="size-3" /> Vendeur
                  </>
                ) : (
                  <>
                    <ShoppingBag className="size-3" /> Acheteur
                  </>
                )}
                <span>·</span>
                <span className="line-clamp-1">{conversation.listing?.title}</span>
              </p>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0">
              {new Date(conversation.updatedAt).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            {conversation.listing && (
              <span className="text-xs font-bold text-fuchsia-600">
                {formatFCFA(conversation.listing.price)}
              </span>
            )}
            {lastMsg && (
              <span className="text-xs text-slate-500 line-clamp-1 flex-1 text-right">
                {lastMine ? "Toi : " : ""}
                {lastMsg.content}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// "Contacter le vendeur" dialog — used from listing cards
export function ContactSellerDialog({
  listingId,
  listingTitle,
  sellerName,
  open,
  onClose,
  onStarted,
}: {
  listingId: string;
  listingTitle: string;
  sellerName: string;
  open: boolean;
  onClose: () => void;
  onStarted: (conversationId: string) => void;
}) {
  const { me, setLoginOpen } = useAppStore();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setMessage("");
  }

  async function submit() {
    if (!me) {
      setLoginOpen(true);
      return;
    }
    if (!message.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: me.id,
          listingId,
          firstMessage: message.trim(),
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      const d = await r.json();
      toast({
        title: "Message envoyé 💬",
        description: `${sellerName} recevra une notification.`,
      });
      reset();
      onStarted(d.conversation.id);
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Contacter {sellerName}</DialogTitle>
          <DialogDescription>
            Pose ta question avant d'acheter « {listingTitle} ». Le vendeur recevra
            une notification email et WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Ton message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Bonjour ${sellerName}, je suis intéressé·e par "${listingTitle}". Est-ce que...`}
              className="mt-1 rounded-xl min-h-[100px]"
              maxLength={1000}
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Sois poli et précis. Évite de partager ton numéro Wave ici.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={saving || !message.trim()}
            onClick={submit}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-full"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Envoi…
              </>
            ) : (
              <>
                <Send className="size-4" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
