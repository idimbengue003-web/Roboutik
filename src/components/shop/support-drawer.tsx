"use client";

import { useAppStore } from "@/lib/store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Loader2,
  Bot,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import type { TicketMessage, SupportTicket } from "@/lib/types";
import { CATEGORY_LABEL, CATEGORY_ICON } from "@/lib/support-bot";
import { useToast } from "@/hooks/use-toast";

export function SupportDrawer() {
  const { activeTicketId, setActiveTicketId, me } = useAppStore();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!activeTicketId || !me) return;
    try {
      const r = await fetch(
        `/api/support/tickets/${activeTicketId}/messages?userId=${me.id}`
      );
      if (!r.ok) return;
      const d = await r.json();
      setTicket(d.ticket);
      setMessages(d.messages ?? []);
    } catch {
      /* noop */
    }
  }, [activeTicketId, me]);

  useEffect(() => {
    if (activeTicketId) {
      load();
    } else {
      setTicket(null);
      setMessages([]);
      setInput("");
    }
  }, [activeTicketId, load]);

  // Poll for new messages every 3s
  useEffect(() => {
    if (!activeTicketId) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [activeTicketId, load]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !activeTicketId || !me) return;
    setSending(true);
    try {
      const r = await fetch(
        `/api/support/tickets/${activeTicketId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: me.id,
            content: input,
          }),
        }
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      const d = await r.json();
      setMessages(d.messages ?? []);
      setInput("");
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleClose() {
    if (!activeTicketId || !me) return;
    setClosing(true);
    try {
      const r = await fetch(
        `/api/support/tickets/${activeTicketId}/close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: me.id }),
        }
      );
      if (!r.ok) throw new Error("Échec");
      toast({ title: "Ticket fermé ✅" });
      setActiveTicketId(null);
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setClosing(false);
    }
  }

  const open = !!activeTicketId;
  const isClosed = ticket?.status === "CLOSED";

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setActiveTicketId(null);
      }}
    >
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        {/* Header */}
        <SheetHeader className="px-4 py-4 border-b bg-gradient-to-br from-sky-50 to-cyan-50 space-y-1">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-white text-xl shadow-sm">
              {ticket ? CATEGORY_ICON[ticket.category] : "🎧"}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-bold truncate">
                {ticket?.subject ?? "Support"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {ticket ? CATEGORY_LABEL[ticket.category] : ""} ·{" "}
                {ticket?.status === "ADMIN_HANDLED"
                  ? "Admin en cours"
                  : ticket?.status === "BOT_HANDLED"
                  ? "Bot actif"
                  : ticket?.status === "RESOLVED"
                  ? "Résolu ✅"
                  : ticket?.status === "CLOSED"
                  ? "Fermé"
                  : "En attente"}
              </SheetDescription>
            </div>
            {!isClosed && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClose}
                disabled={closing}
                className="h-8 text-xs text-slate-500 hover:text-rose-600"
              >
                {closing ? "Fermeture…" : "Fermer"}
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 min-h-0"
        >
          {messages.length === 0 && (
            <div className="text-center text-sm text-slate-400 mt-8">
              <Clock className="size-8 mx-auto mb-2 opacity-50" />
              En attente des messages…
            </div>
          )}
          {messages.map((m) => {
            const mine = m.senderRole === "USER";
            const isBot = m.senderRole === "BOT";
            const isAdmin = m.senderRole === "ADMIN";
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mine
                      ? "bg-gradient-to-br from-fuchsia-600 to-orange-500 text-white rounded-br-md"
                      : isBot
                      ? "bg-sky-50 text-slate-800 border border-sky-200 rounded-bl-md"
                      : "bg-violet-50 text-slate-800 border border-violet-200 rounded-bl-md"
                  }`}
                >
                  {!mine && (
                    <p
                      className={`text-[10px] font-bold mb-0.5 flex items-center gap-1 ${
                        isBot ? "text-sky-600" : "text-violet-600"
                      }`}
                    >
                      {isBot ? (
                        <>
                          <Bot className="size-3" /> RoboutikBot
                        </>
                      ) : (
                        <>
                          <Shield className="size-3" /> Admin
                        </>
                      )}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`text-[9px] mt-1 ${
                      mine ? "text-white/70" : "text-slate-400"
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info banner */}
        {ticket?.status === "ADMIN_HANDLED" && !isClosed && (
          <div className="bg-violet-50 border-t border-violet-200 px-4 py-2 flex items-center gap-2 text-xs text-violet-800">
            <Shield className="size-4 shrink-0" />
            Un admin va te répondre. Sois patient·e.
          </div>
        )}
        {ticket?.status === "BOT_HANDLED" && !isClosed && (
          <div className="bg-sky-50 border-t border-sky-200 px-4 py-2 flex items-center gap-2 text-xs text-sky-800">
            <Bot className="size-4 shrink-0" />
            Le bot répond automatiquement. Pour un humain, écris "arnaque" ou "admin".
          </div>
        )}

        {/* Input */}
        <div className="border-t bg-white p-3 flex items-end gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isClosed ? "Ticket fermé" : "Écris un message…"}
            disabled={isClosed || sending}
            className="flex-1 rounded-full h-11"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending || isClosed}
            className="h-11 w-11 rounded-full p-0 bg-gradient-to-r from-sky-500 to-cyan-500 text-white"
          >
            {sending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Send className="size-5" />
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
