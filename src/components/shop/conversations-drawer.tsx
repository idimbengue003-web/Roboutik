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
  MessageCircle,
  ShoppingBag,
  Store,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Conversation, ConversationMessage } from "@/lib/types";
import { formatFCFA } from "@/lib/types";

export function ConversationsDrawer() {
  const { activeConversationId, setActiveConversationId, me, setPendingListingId } =
    useAppStore();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!activeConversationId || !me) return;
    try {
      const r = await fetch(
        `/api/conversations/${activeConversationId}/messages?userId=${me.id}`
      );
      if (!r.ok) return;
      const d = await r.json();
      setConversation(d.conversation);
      setMessages(d.conversation?.messages ?? []);
    } catch {
      /* noop */
    }
  }, [activeConversationId, me]);

  useEffect(() => {
    if (activeConversationId) {
      load();
    } else {
      setConversation(null);
      setMessages([]);
      setInput("");
    }
  }, [activeConversationId, load]);

  useEffect(() => {
    if (!activeConversationId) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [activeConversationId, load]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !activeConversationId || !me) return;
    setSending(true);
    try {
      const r = await fetch(
        `/api/conversations/${activeConversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: me.id, content: input }),
        }
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      const d = await r.json();
      setMessages(d.messages ?? []);
      if (d.conversation) setConversation(d.conversation);
      setInput("");
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  const open = !!activeConversationId;
  const isBuyer = conversation?.buyerId === me?.id;
  const otherParty = isBuyer ? conversation?.seller : conversation?.buyer;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setActiveConversationId(null);
      }}
    >
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        {/* Header */}
        <SheetHeader className="px-4 py-4 border-b bg-gradient-to-br from-emerald-50 to-teal-50 space-y-1">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-white text-xl shadow-sm">
              {otherParty?.avatar ?? "💬"}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-bold truncate">
                {otherParty?.username ?? "..."}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {isBuyer ? "Vendeur" : "Acheteur intéressé"} ·{" "}
                {conversation?.listing?.game?.name}
              </SheetDescription>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">
            📦 {conversation?.listing?.title} ·{" "}
            <strong className="text-emerald-600">
              {conversation ? formatFCFA(conversation.listing?.price ?? 0) : ""}
            </strong>
          </p>
        </SheetHeader>

        {/* Buy CTA for buyer */}
        {isBuyer && conversation?.listing && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between gap-2">
            <p className="text-xs text-emerald-800">
              💡 Discussion avant achat. Prêt·e à acheter ?
            </p>
            <Button
              size="sm"
              onClick={() => {
                setPendingListingId(conversation.listing!.id);
                setActiveConversationId(null);
              }}
              className="h-8 text-xs rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold"
            >
              <ShoppingBag className="size-3.5" />
              Acheter
            </Button>
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 min-h-0"
        >
          {messages.length === 0 && (
            <div className="text-center text-sm text-slate-400 mt-8">
              <MessageCircle className="size-8 mx-auto mb-2 opacity-50" />
              Démarre la conversation…
            </div>
          )}
          {messages.map((m) => {
            const mine = m.senderId === me?.id;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mine
                      ? "bg-gradient-to-br from-fuchsia-600 to-orange-500 text-white rounded-br-md"
                      : "bg-white text-slate-800 rounded-bl-md border"
                  }`}
                >
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
            placeholder="Écris un message…"
            className="flex-1 rounded-full h-11"
            maxLength={1000}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-11 w-11 rounded-full p-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
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
