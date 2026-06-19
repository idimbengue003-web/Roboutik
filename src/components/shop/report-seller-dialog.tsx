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
import { AlertTriangle, Flag, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const REPORT_REASONS = [
  { id: "NO_DELIVERY", label: "N'a pas livré après paiement", icon: "📦" },
  { id: "SCAM", label: "Arnaque avérée", icon: "🚨" },
  { id: "FAKE_ITEM", label: "Objet différent de l'annonce", icon: "🎭" },
  { id: "RUDE", label: "Comportement abusif / insultes", icon: "⚠️" },
  { id: "SPAM", label: "Spam ou harcèlement", icon: "📵" },
  { id: "OTHER", label: "Autre raison", icon: "❓" },
];

export function ReportSellerDialog() {
  const { reportOrderId, setReportOrderId, me, setLoginOpen, setActiveTicketId, setActiveTab } =
    useAppStore();
  const { toast } = useToast();
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  function close() {
    setReportOrderId(null);
    setReason("");
    setDetails("");
  }

  async function submit() {
    if (!me) {
      setLoginOpen(true);
      return;
    }
    if (!reportOrderId || !reason) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/orders/${reportOrderId}/report`, {
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
        title: "Signalement envoyé 🚨",
        description:
          "Les administrateurs ont été notifiés. Tu peux suivre le ticket dans le Support.",
      });
      close();
      // Open the ticket
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
    <Dialog open={!!reportOrderId} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <Flag className="size-5" />
            Signaler le vendeur
          </DialogTitle>
          <DialogDescription>
            Un signalement est pris très au sérieux. Un admin va examiner ton cas
            en priorité. Ne signale que pour de vraies raisons.
          </DialogDescription>
        </DialogHeader>

        {/* Warning banner */}
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2">
          <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-800">
            <strong>Important :</strong> Ne valide PAS ta commande si tu signales
            un problème. Garde toutes les captures d'écran de la conversation.
          </p>
        </div>

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
              placeholder="Explique ce qui s'est passé…"
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
                Signaler maintenant
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
