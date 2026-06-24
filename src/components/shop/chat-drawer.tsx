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
  CheckCircle2,
  Package,
  Clock,
  ShieldCheck,
  Star,
  Flag,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Order, Message } from "@/lib/types";
import { formatFCFA, STATUS_LABEL, STATUS_COLOR, formatCountdown } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function ChatDrawer() {
  const { activeOrderId, setActiveOrderId, me, bumpOrders, setRateOrderId, setReportOrderId } = useAppStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [validating, setValidating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!activeOrderId) return;
    try {
      const r = await fetch(`/api/orders?buyerId=${me?.id ?? ""}`);
      if (!r.ok) return;
      const d = await r.json();
      const o = (d.orders ?? []).find((x: Order) => x.id === activeOrderId);
      if (o) {
        setOrder(o);
        setMessages(o.messages ?? []);
      }
    } catch {
      /* noop */
    }
  }, [activeOrderId, me]);

  useEffect(() => {
    if (activeOrderId) {
      load();
    } else {
      setOrder(null);
      setMessages([]);
      setInput("");
    }
  }, [activeOrderId, load]);

  // Poll for new messages + countdown tick
  useEffect(() => {
    if (!activeOrderId) return;
    const t = setInterval(() => {
      load();
      setNow(Date.now());
    }, 2500);
    return () => clearInterval(t);
  }, [activeOrderId, load]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !activeOrderId) return;
    setSending(true);
    try {
      const r = await fetch(`/api/orders/${activeOrderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      });
      if (!r.ok) throw new Error("Échec envoi message");
      const d = await r.json();
      setMessages(d.messages ?? []);
      if (d.order) setOrder(d.order);
      setInput("");
      bumpOrders();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleValidate() {
    if (!activeOrderId) return;
    setValidating(true);
    try {
      const r = await fetch(`/api/orders/${activeOrderId}/validate`, {
        method: "POST",
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Échec validation");
      }
      const d = await r.json();
      if (d.order) setOrder(d.order);
      setMessages(d.order?.messages ?? []);
      bumpOrders();
      toast({
        title: "Commande validée 🎉",
        description: `Le vendeur a reçu ${formatFCFA(order?.amount ?? 0)}.`,
      });
    } catch (e) {
      toast({
        title: "Validation impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  }

  const open = !!activeOrderId;
  const status = order?.status;
  const canValidate = status === "DELIVERED";
  const canRate = status === "VALIDATED" && !order?.rating;

  const autoMs =
    order?.autoValidateAt && (status === "PAID" || status === "DELIVERED")
      ? new Date(order.autoValidateAt).getTime() - now
      : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setActiveOrderId(null);
      }}
    >
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        {/* Header */}
        <SheetHeader className="px-4 py-4 border-b bg-gradient-to-br from-fuchsia-50 to-orange-50 space-y-1">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-white text-xl shadow-sm">
              {order?.seller?.avatar ?? "🛒"}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-bold truncate">
                {order?.seller?.username ?? "Vendeur"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {order?.listing?.game?.name} ·{" "}
                <strong className="text-fuchsia-600">
                  {order ? formatFCFA(order.amount) : ""}
                </strong>
              </SheetDescription>
            </div>
            {/* Report seller button — always visible while order is active */}
            {order && order.status !== "VALIDATED" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReportOrderId(order.id);
                }}
                className="h-8 text-xs rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 shrink-0"
                title="Signaler le vendeur"
              >
                <Flag className="size-3.5" />
                <span className="hidden sm:inline">Signaler</span>
              </Button>
            )}
            {status && (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[status]}`}
              >
                {STATUS_LABEL[status]}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">
            📦 {order?.listing?.title}
          </p>
        </SheetHeader>

        {/* Status banner */}
        {status === "DELIVERED" && (
          <div className="bg-violet-50 border-b border-violet-200 px-4 py-3 flex items-center gap-3">
            <Package className="size-5 text-violet-600 shrink-0" />
            <div className="flex-1 text-xs text-violet-800">
              <strong>Le vendeur a livré ta commande !</strong> Vérifie que tu as
              bien reçu, puis valide pour libérer le paiement.
            </div>
            <Button
              size="sm"
              onClick={handleValidate}
              disabled={validating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full"
            >
              {validating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Valider
            </Button>
          </div>
        )}
        {status === "PAID" && (
          <div className="bg-sky-50 border-b border-sky-200 px-4 py-2.5 flex items-center gap-2 text-xs text-sky-800">
            <Clock className="size-4 shrink-0" />
            En attente de livraison. Écris au vendeur pour qu'il livre ta commande.
          </div>
        )}
        {status === "VALIDATED" && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0" />
              Commande terminée. Le vendeur a reçu son paiement.
            </div>
            {canRate && order && (
              <button
                onClick={() => {
                  setRateOrderId(order.id);
                  setActiveOrderId(null);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-2 py-1"
              >
                <Star className="size-3 fill-amber-500 text-amber-500" />
                Noter
              </button>
            )}
          </div>
        )}

        {/* Auto-validation countdown banner */}
        {autoMs !== null && autoMs > 0 && (
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-300" />
              <span>Validation automatique dans</span>
            </div>
            <span className="font-bold tabular-nums text-amber-300">
              {formatCountdown(autoMs)}
            </span>
          </div>
        )}

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
            const mine = m.senderId === me?.id;
            const isSystem = !mine && m.isAuto && m.content.startsWith("🛡️ ROBLOX BOUTIK");
            if (isSystem) {
              return (
                <div key={m.id} className="flex justify-center my-1">
                  <div className="max-w-[92%] rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <ShieldCheck className="size-3.5 text-fuchsia-600" />
                      <span className="text-[10px] font-bold tracking-wide text-fuchsia-600 uppercase">
                        ROBLOX BOUTIK
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-xs text-slate-700 leading-relaxed">
                      {m.content.replace(/^🛡️ ROBLOX BOUTIK\s*—?\s*/, "")}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1.5">
                      {new Date(m.createdAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            }
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
                  {!mine && m.isAuto && (
                    <p className="text-[10px] font-bold text-fuchsia-500 mb-0.5">
                      {order?.seller?.username}
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

        {/* Quick reply chips when status is PAID */}
        {status === "PAID" && (
          <div className="px-3 py-2 bg-white border-t flex gap-2 overflow-x-auto">
            <QuickChip label="Bonjour 👋" onClick={() => setInput("Bonjour 👋")} />
            <QuickChip
              label="Je suis prêt·e"
              onClick={() => setInput("Je suis prêt·e, tu peux livrer !")}
            />
            <QuickChip
              label="Mon pseudo Roblox"
              onClick={() => setInput("Mon pseudo Roblox est : ")}
            />
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
            placeholder="Écris un message…"
            className="flex-1 rounded-full h-11"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-11 w-11 rounded-full p-0 bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white"
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

function QuickChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors"
    >
      {label}
    </button>
  );
}
