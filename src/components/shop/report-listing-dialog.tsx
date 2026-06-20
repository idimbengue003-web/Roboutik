"use client";

import { useAppStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Flag, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const REPORT_REASONS = [
  { id: "SUSPECT", label: "Annonce suspecte / arnaque probable", icon: "🚨" },
  { id: "FAKE_ITEM", label: "Objet impossible / faux", icon: "🎭" },
  { id: "IMPOSSIBLE_PRICE", label: "Prix abusif ou impossible", icon: "💸" },
  { id: "RUDE", label: "Vendeur abusif en messages", icon: "⚠️" },
  { id: "SPAM", label: "Spam / annonce en double", icon: "📵" },
  { id: "OTHER", label: "Autre raison", icon: "❓" },
];

export function ReportListingDialog() {
  const { reportListingId, setReportListingId, me, setLoginOpen, setActiveTicketId, setActiveTab } =
    useAppStore();
  const { toast } = useToast();
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  function close() {
    setReportListingId(null);
    setReason("");
    setDetails("");
  }

  async function submit() {
    if (!me) {
      setLoginOpen(true);
      return;
    }
    if (!reportListingId || !reason) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/listings/${reportListingId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: me.id,
          reason: REPORT_REASONS.find((x) => x.id === reason)?.label || reason,
          details: details.trim(),
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      const d = await r.json();
      toast({
        title: "Signalement envoyé 🚩",
        description:
          "Les administrateurs ont été notifiés. Tu peux suivre le ticket dans le Support.",
      });
      close();
      if (d.ticket) {
        setActiveTicketId(d.ticket.id);
        setActiveTab("support");
      }
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
    <Dialog open={!!reportListingId} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <Flag className="size-5" />
            Signaler cette annonce
          </DialogTitle>
          <DialogDescription>
            Tu signales cette annonce avant tout achat. Un admin va examiner
            le vendeur. Ne signale que pour de vraies raisons : les faux
            signalements peuvent entraîner un bannissement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Motif du signalement</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                    reason === r.id
                      ? "border-rose-400 bg-rose-50 ring-2 ring-rose-200"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-xl">{r.icon}</span>
                  <span className="text-sm font-medium text-slate-800">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold">
              Détails <span className="text-slate-400 font-normal">(optionnel)</span>
            </Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explique pourquoi cette annonce te semble suspecte…"
              className="mt-1 rounded-xl min-h-[80px]"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button
            disabled={saving || !reason}
            onClick={submit}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-full"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Envoi…
              </>
            ) : (
              <>
                <Flag className="size-4" />
                Signaler l'annonce
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
