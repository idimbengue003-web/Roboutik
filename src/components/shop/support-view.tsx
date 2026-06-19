"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Bot,
  HeadphonesIcon,
  MessageSquare,
  Plus,
  Send,
  X,
  Clock,
  CheckCircle2,
  User as UserIcon,
  Shield,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import type { SupportTicket, TicketMessage } from "@/lib/types";
import { CATEGORY_LABEL, CATEGORY_ICON } from "@/lib/support-bot";
import { useToast } from "@/hooks/use-toast";

export function SupportView() {
  const { me, setLoginOpen, activeTicketId, setActiveTicketId } = useAppStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!me) {
      setTickets([]);
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`/api/support/tickets?userId=${me.id}`);
      if (!r.ok) return;
      const d = await r.json();
      setTickets(d.tickets ?? []);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

  if (!me) {
    return (
      <div className="mx-3 sm:mx-6 py-12">
        <div className="rounded-3xl border bg-white p-8 sm:p-12 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-sky-50 mb-4">
            <HeadphonesIcon className="size-8 text-sky-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Connecte-toi pour contacter le support
          </h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Notre bot et nos administrateurs sont là pour t'aider. Connecte-toi
            avec Google pour ouvrir un ticket.
          </p>
          <Button
            onClick={() => setLoginOpen(true)}
            className="mt-5 h-11 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold px-6"
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 sm:mx-6 py-6 pb-12 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            🎧 Service clientèle
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Notre bot te répond instantanément. Un admin prend le relais si besoin.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="h-11 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold px-5"
        >
          <Plus className="size-5" />
          Nouveau ticket
        </Button>
      </div>

      {/* Bot banner */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200 p-4 flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-white shadow-sm">
          <Bot className="size-6 text-sky-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-slate-900">RoboutikBot</p>
          <p className="text-sm text-slate-600">
            Répond en quelques secondes. Pour les arnaques ou problèmes graves,
            un admin intervient en priorité.
          </p>
        </div>
      </div>

      {/* Tickets list */}
      {loading ? (
        <div className="text-center text-slate-500 py-8">Chargement…</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          <MessageSquare className="size-10 mx-auto mb-3 text-slate-300" />
          Aucun ticket pour le moment.
          <br />
          <Button
            variant="ghost"
            onClick={() => setShowCreate(true)}
            className="mt-2 text-sky-600 font-semibold"
          >
            Ouvrir mon premier ticket →
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              onOpen={() => setActiveTicketId(t.id)}
            />
          ))}
        </div>
      )}

      <CreateTicketDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          load();
        }}
      />
    </div>
  );
}

function TicketCard({
  ticket,
  onOpen,
}: {
  ticket: SupportTicket;
  onOpen: () => void;
}) {
  const lastMsg = ticket.messages?.[ticket.messages.length - 1];
  const statusColor =
    ticket.status === "OPEN"
      ? "bg-amber-100 text-amber-700"
      : ticket.status === "BOT_HANDLED"
      ? "bg-sky-100 text-sky-700"
      : ticket.status === "ADMIN_HANDLED"
      ? "bg-violet-100 text-violet-700"
      : ticket.status === "RESOLVED"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-100 text-slate-600";

  const statusLabel =
    ticket.status === "OPEN"
      ? "En attente"
      : ticket.status === "BOT_HANDLED"
      ? "Bot a répondu"
      : ticket.status === "ADMIN_HANDLED"
      ? "Admin en cours"
      : ticket.status === "RESOLVED"
      ? "Résolu ✅"
      : "Fermé";

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-xl shrink-0">
          {CATEGORY_ICON[ticket.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 line-clamp-1">
              {ticket.subject}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
            <span className="font-semibold">{CATEGORY_LABEL[ticket.category]}</span>
            <span>·</span>
            <span>
              {new Date(ticket.updatedAt).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {ticket.priority === "URGENT" && (
              <span className="bg-rose-100 text-rose-700 rounded-full px-1.5 py-0.5 font-bold">
                URGENT
              </span>
            )}
          </div>
          {lastMsg && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
              {lastMsg.senderRole === "BOT" ? (
                <Bot className="size-3.5 mt-0.5 shrink-0 text-sky-500" />
              ) : lastMsg.senderRole === "ADMIN" ? (
                <Shield className="size-3.5 mt-0.5 shrink-0 text-violet-500" />
              ) : (
                <UserIcon className="size-3.5 mt-0.5 shrink-0 text-fuchsia-500" />
              )}
              <span className="line-clamp-2">{lastMsg.content}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function CreateTicketDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { me, setActiveTicketId } = useAppStore();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setSubject("");
    setMessage("");
  }

  async function submit() {
    if (!me) return;
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Sujet et message requis",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: me.id,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      const d = await r.json();
      toast({
        title: "Ticket créé ! 🤖",
        description: d.escalate
          ? "Un admin va te répondre en priorité."
          : "Le bot t'a répondu. Tu peux continuer la discussion.",
      });
      reset();
      onCreated();
      if (d.ticket) setActiveTicketId(d.ticket.id);
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
          <DialogTitle>Nouveau ticket support</DialogTitle>
          <DialogDescription>
            Décris ton problème. Le bot te répond instantanément.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Sujet</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex : Paiement Wave non reçu"
              className="mt-1 rounded-xl"
              maxLength={100}
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explique ton problème en détail…"
              className="mt-1 rounded-xl min-h-[120px]"
              maxLength={1000}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Plus tu donnes de détails, plus on peut t'aider vite.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={saving}
            onClick={submit}
            className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold rounded-full"
          >
            {saving ? "Création…" : "Envoyer au bot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
