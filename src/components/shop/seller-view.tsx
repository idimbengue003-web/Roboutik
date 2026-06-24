"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/shop/image-upload";
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
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Switch } from "@/components/ui/switch";
import {
  Wallet,
  Plus,
  TrendingUp,
  ArrowDownToLine,
  Package,
  Star,
  Store,
  CheckCircle2,
  Clock,
  X,
  Percent,
  Pencil,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import type { Listing, Order, User, Withdrawal, Game } from "@/lib/types";
import { formatFCFA } from "@/lib/types";
import { RatingBadge } from "./rating-modal";
import { useToast } from "@/hooks/use-toast";

type SellerData = {
  user: User;
  balance: number;
  totalEarnings: number;
  totalCommission: number;
  totalGross: number;
  withdrawnTotal: number;
  pendingWithdrawals: number;
  available: number;
  validatedOrders: (Order & { rating?: { stars: number } | null })[];
  withdrawals: Withdrawal[];
  listings: (Listing & { ratings: { stars: number }[]; orders: { id: string }[] })[];
};

export function SellerView() {
  const { me, setLoginOpen, games } = useAppStore();
  const { toast } = useToast();

  const [data, setData] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/seller/balance?userId=${me.id}`);
      if (!r.ok) return;
      const d = await r.json();
      setData(d);
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
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-fuchsia-50 mb-4">
            <Store className="size-8 text-fuchsia-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Connecte-toi pour devenir vendeur
          </h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Tu veux vendre des objets Roblox ? Connecte-toi avec Google pour
            créer ton compte vendeur, publier des annonces et encaisser tes
            paiements Wave.
          </p>
          <Button
            onClick={() => setLoginOpen(true)}
            className="mt-5 h-11 rounded-full bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold px-6"
          >
            Se connecter avec Google
          </Button>
        </div>
      </div>
    );
  }

  if (!me.isSeller) {
    return <BecomeSellerCard onDone={load} />;
  }

  if (loading || !data) {
    return (
      <div className="mx-3 sm:mx-6 py-12 text-center text-slate-500">
        Chargement…
      </div>
    );
  }

  return (
    <div className="mx-3 sm:mx-6 py-6 pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            🏪 Mon espace vendeur
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Bienvenue <strong>{me.username}</strong> ! Gère tes annonces, ton solde et tes retraits Wave.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="h-11 rounded-full bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold px-5"
        >
          <Plus className="size-5" />
          Publier une annonce
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          icon={<Wallet className="size-5 text-emerald-600" />}
          label="Solde disponible"
          value={formatFCFA(data.balance)}
          tint="bg-emerald-50"
        />
        <StatCard
          icon={<TrendingUp className="size-5 text-sky-600" />}
          label="Gains nets"
          value={formatFCFA(data.totalEarnings)}
          tint="bg-sky-50"
        />
        <StatCard
          icon={<ArrowDownToLine className="size-5 text-violet-600" />}
          label="Retiré"
          value={formatFCFA(data.withdrawnTotal)}
          tint="bg-violet-50"
        />
        <StatCard
          icon={<Package className="size-5 text-fuchsia-600" />}
          label="Annonces actives"
          value={`${data.listings.filter((l) => l.active).length} / ${data.listings.length}`}
          tint="bg-fuchsia-50"
        />
        <StatCard
          icon={<Star className="size-5 text-amber-600" />}
          label="Ventes & avis"
          value={`${data.validatedOrders.length} ventes · ${
            data.listings.reduce((s, l) => s + l.ratings.length, 0)
          } avis`}
          tint="bg-amber-50"
        />
      </div>

      {/* Withdraw button */}
      {data.balance > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Wallet className="size-6" />
            </div>
            <div>
              <p className="text-xs opacity-90 uppercase tracking-wide font-semibold">
                Solde Wave
              </p>
              <p className="text-2xl font-extrabold">{formatFCFA(data.balance)}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowWithdraw(true)}
            className="bg-white text-emerald-700 hover:bg-white/90 font-bold rounded-full h-11 px-5"
          >
            <ArrowDownToLine className="size-4" />
            Retirer vers Wave
          </Button>
        </div>
      )}

      {/* My listings */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-3">
          📦 Mes annonces ({data.listings.length})
        </h2>
        {data.listings.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-center text-slate-500">
            Tu n'as pas encore d'annonce.
            <br />
            <Button
              variant="ghost"
              onClick={() => setShowCreate(true)}
              className="mt-2 text-fuchsia-600 font-semibold"
            >
              Publier ma première annonce →
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {data.listings.map((l) => (
              <SellerListingCard key={l.id} listing={l} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      {/* Recent earnings */}
      {data.validatedOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            💰 Mes ventes ({data.validatedOrders.length})
          </h2>
          <div className="rounded-2xl border bg-white divide-y max-h-80 overflow-y-auto">
            {data.validatedOrders.slice(0, 10).map((o) => (
              <div key={o.id} className="flex items-center gap-3 p-3">
                <div className="grid size-10 place-items-center rounded-xl bg-emerald-50">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm line-clamp-1">
                    {o.listing?.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {o.buyer?.username} ·{" "}
                    {o.validatedAt
                      ? new Date(o.validatedAt).toLocaleDateString("fr-FR")
                      : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 text-sm">
                    +{formatFCFA(o.amount)}
                  </p>
                  {o.rating && (
                    <div className="flex items-center justify-end gap-0.5 text-amber-400 text-xs">
                      <Star className="size-3 fill-amber-400" />
                      {o.rating.stars}/5
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Withdrawals history */}
      {data.withdrawals.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            🏧 Mes retraits ({data.withdrawals.length})
          </h2>
          <div className="rounded-2xl border bg-white divide-y">
            {data.withdrawals.map((w) => (
              <div key={w.id} className="flex items-center gap-3 p-3">
                <div
                  className={`grid size-10 place-items-center rounded-xl ${
                    w.status === "COMPLETED"
                      ? "bg-emerald-50"
                      : w.status === "REJECTED"
                      ? "bg-rose-50"
                      : "bg-amber-50"
                  }`}
                >
                  {w.status === "COMPLETED" ? (
                    <CheckCircle2 className="size-5 text-emerald-600" />
                  ) : (
                    <Clock className="size-5 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">
                    {formatFCFA(w.amount)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Wave {w.waveNumber} ·{" "}
                    {new Date(w.createdAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${
                    w.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-700"
                      : w.status === "REJECTED"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {w.status === "COMPLETED"
                    ? "Validé"
                    : w.status === "REJECTED"
                    ? "Refusé"
                    : "En cours"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <CreateListingDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        games={games}
        onCreated={() => {
          setShowCreate(false);
          load();
        }}
      />
      <WithdrawDialog
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        maxAmount={data.balance}
        onDone={() => {
          setShowWithdraw(false);
          load();
        }}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className={`grid size-9 place-items-center rounded-lg ${tint} mb-2`}>
        {icon}
      </div>
      <p className="text-[11px] text-slate-500 font-medium">{label}</p>
      <p className="font-bold text-slate-900 text-sm sm:text-base">{value}</p>
    </div>
  );
}

function BecomeSellerCard({ onDone }: { onDone: () => void }) {
  const { me, setMe } = useAppStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function become() {
    if (!me) return;
    setLoading(true);
    try {
      const r = await fetch("/api/seller/become", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me.id }),
      });
      if (!r.ok) throw new Error("Échec");
      const d = await r.json();
      if (d.user) setMe(d.user);
      toast({ title: "Bienvenue vendeur ! 🎉" });
      onDone();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-3 sm:mx-6 py-8">
      <div className="rounded-3xl border bg-gradient-to-br from-fuchsia-50 via-white to-orange-50 p-8 text-center max-w-lg mx-auto">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white mb-4">
          <Store className="size-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">
          Deviens vendeur sur RobloxBoutik
        </h2>
        <p className="text-slate-500 mt-2">
          Publie tes annonces Roblox, reçois tes paiements Wave automatiquement
          quand l'acheteur valide, et retire ton solde quand tu veux.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-2 text-left max-w-sm mx-auto">
          <Perk text="Publie gratuitement tes annonces" />
          <Perk text="Reçois l'argent après validation de l'acheteur (ou auto après 24h)" />
          <Perk text="Retire ton solde vers Wave en 1 clic" />
          <Perk text="Cumule des avis ⭐ pour gagner la confiance des acheteurs" />
        </div>
        <Button
          onClick={become}
          disabled={loading}
          className="mt-6 h-12 rounded-full bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold px-8"
        >
          {loading ? "Activation…" : "Activer mon compte vendeur"}
        </Button>
      </div>
    </div>
  );
}

function Perk({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-slate-700">
      <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function SellerListingCard({
  listing,
  onChanged,
}: {
  listing: Listing & { ratings: { stars: number }[]; orders: { id: string }[] };
  onChanged: () => void;
}) {
  const { me } = useAppStore();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const stock = typeof listing.stock === "number" ? listing.stock : 1;

  async function toggleActive() {
    if (!me) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me.id, active: !listing.active }),
      });
      if (!r.ok) throw new Error("Échec");
      toast({
        title: listing.active ? "Annonce masquée" : "Annonce publiée",
      });
      onChanged();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!me) return;
    if (!confirm("Supprimer définitivement cette annonce ?")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/listings/${listing.id}?userId=${me.id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Échec");
      toast({ title: "Annonce supprimée" });
      onChanged();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm flex gap-3">
      <div className="grid size-16 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-100 to-orange-100 text-3xl shrink-0">
        🎮
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
            {listing.title}
          </h3>
          <span
            className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${
              listing.active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {listing.active ? "Active" : "Masquée"}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
          {listing.game?.name}
        </p>
        <div className="flex items-center justify-between mt-1 gap-2">
          <div className="flex flex-col">
            <span className="font-bold text-fuchsia-600 text-sm tabular-nums">
              {formatFCFA(listing.price)}
              <span className="text-[10px] font-medium text-slate-400 ml-1">
                acheteur
              </span>
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold tabular-nums">
              Net : {formatFCFA(listing.sellerNetPrice ?? Math.round(listing.price / 1.2))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                stock <= 0
                  ? "bg-rose-100 text-rose-700"
                  : stock <= 3
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
              title="Stock disponible"
            >
              {stock <= 0 ? "Rupture" : `${stock} en stock`}
            </span>
            <RatingBadge ratings={listing.ratings} />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {listing.orders.length} commande{listing.orders.length > 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEdit(true)}
            disabled={busy}
            className="h-7 text-xs rounded-full"
          >
            <Pencil className="size-3" />
            Modifier
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleActive}
            disabled={busy}
            className="h-7 text-xs rounded-full"
          >
            {listing.active ? "Masquer" : "Activer"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={remove}
            disabled={busy}
            className="h-7 text-xs rounded-full text-rose-500 hover:bg-rose-50"
          >
            <X className="size-3" />
            Supprimer
          </Button>
        </div>
      </div>

      <EditListingDialog
        open={showEdit}
        onClose={() => setShowEdit(false)}
        listing={listing}
        onSaved={() => {
          setShowEdit(false);
          onChanged();
        }}
      />
    </div>
  );
}

function EditListingDialog({
  open,
  onClose,
  listing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  listing: Listing & { ratings: { stars: number }[]; orders: { id: string }[] };
  onSaved: () => void;
}) {
  const { me } = useAppStore();
  const { toast } = useToast();
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [sellerNetPrice, setSellerNetPrice] = useState(
    String(listing.sellerNetPrice ?? Math.round(listing.price / 1.2))
  );
  const [stock, setStock] = useState(
    String(typeof listing.stock === "number" ? listing.stock : 1)
  );
  const [active, setActive] = useState(listing.active);
  const [saving, setSaving] = useState(false);

  // Reset form fields whenever the dialog opens for a (possibly new) listing
  useEffect(() => {
    if (open) {
      setTitle(listing.title);
      setDescription(listing.description);
      setSellerNetPrice(
        String(listing.sellerNetPrice ?? Math.round(listing.price / 1.2))
      );
      setStock(String(typeof listing.stock === "number" ? listing.stock : 1));
      setActive(listing.active);
    }
  }, [open, listing]);

  async function submit() {
    if (!me) return;
    if (!title.trim() || !description.trim() || !sellerNetPrice) {
      toast({
        title: "Tous les champs sont requis",
        variant: "destructive",
      });
      return;
    }
    const net = Number(sellerNetPrice);
    if (!Number.isFinite(net) || net < 100 || net > 1_000_000) {
      toast({
        title: "Prix entre 100 et 1 000 000 FCFA",
        variant: "destructive",
      });
      return;
    }
    const stockNum = Number(stock);
    if (!Number.isFinite(stockNum) || stockNum < 0 || stockNum > 9999) {
      toast({
        title: "Stock entre 0 et 9999",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: me.id,
          title: title.trim(),
          description: description.trim(),
          sellerNetPrice: net,
          stock: stockNum,
          active,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      toast({ title: "Annonce mise à jour ✅" });
      onSaved();
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
      <DialogContent className="sm:max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'annonce</DialogTitle>
          <DialogDescription>
            Mets à jour les informations de ton annonce.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 rounded-xl"
              maxLength={80}
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 rounded-xl min-h-[80px]"
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold">Prix net (FCFA)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={sellerNetPrice}
                onChange={(e) => setSellerNetPrice(e.target.value)}
                className="mt-1 rounded-xl"
                min={100}
                max={1_000_000}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Stock</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="mt-1 rounded-xl"
                min={0}
                max={9999}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Annonce visible
              </p>
              <p className="text-[11px] text-slate-500">
                Désactive pour masquer temporairement ton annonce.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={saving}
            onClick={submit}
            className="bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold rounded-full"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateListingDialog({
  open,
  onClose,
  games,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  games: Game[];
  onCreated: () => void;
}) {
  const { me } = useAppStore();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sellerNetPrice, setSellerNetPrice] = useState("");
  const [gameId, setGameId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setSellerNetPrice("");
    setGameId("");
    setImages([]);
  }

  // Compute buyer price and commission in real-time
  const sellerNet = Number(sellerNetPrice) || 0;
  const buyerPrice = Math.round(sellerNet * 1.2);
  const commission = buyerPrice - sellerNet;

  async function submit() {
    if (!me) return;
    if (!title.trim() || !description.trim() || !sellerNetPrice || !gameId) {
      toast({
        title: "Tous les champs sont requis",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/seller/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: me.id,
          gameId,
          title: title.trim(),
          description: description.trim(),
          sellerNetPrice: Number(sellerNetPrice),
          images: images.length > 0 ? JSON.stringify(images) : null,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      toast({ title: "Annonce publiée ! 🎉" });
      reset();
      onCreated();
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
      <DialogContent className="sm:max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publier une annonce</DialogTitle>
          <DialogDescription>
            Décris bien ton objet pour attirer les acheteurs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Jeu Roblox</Label>
            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">Choisir un jeu…</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Image upload (Leboncoin-style) */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              📸 Photos
              <span className="text-[10px] font-medium text-slate-500 bg-slate-200 rounded-full px-2 py-0.5">
                optionnel mais recommandé
              </span>
            </Label>
            <div className="mt-2">
              <ImageUpload images={images} onChange={setImages} />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold">Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Compte Blox Fruits niveau max"
              className="mt-1 rounded-xl"
              maxLength={80}
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails, niveau, objets inclus…"
              className="mt-1 rounded-xl min-h-[80px]"
              maxLength={500}
            />
          </div>
          {/* TWO PRICE FIELDS — top: seller net, bottom: buyer price (auto +20%) */}
          <div className="rounded-2xl bg-slate-50 p-3 space-y-3 border border-slate-200">
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                💰 Ton prix net
                <span className="text-[10px] font-medium text-slate-500 bg-slate-200 rounded-full px-2 py-0.5">
                  ce que tu reçois
                </span>
              </Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={sellerNetPrice}
                  onChange={(e) => setSellerNetPrice(e.target.value)}
                  placeholder="Ex : 2000"
                  className="rounded-xl pr-16 text-lg font-bold h-12"
                  min={100}
                  max={1_000_000}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  FCFA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Entre 100 et 1 000 000 FCFA.
              </p>
            </div>

            {/* Auto-computed buyer price (read-only) */}
            <div className="rounded-xl bg-gradient-to-br from-fuchsia-50 to-orange-50 border border-fuchsia-200 p-3">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-fuchsia-700 flex items-center gap-1.5">
                🛒 Prix affiché aux acheteurs
                <span className="text-[10px] font-medium text-fuchsia-600 bg-fuchsia-100 rounded-full px-2 py-0.5 normal-case tracking-normal">
                  +20% commission
                </span>
              </Label>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-fuchsia-700 tabular-nums">
                  {buyerPrice > 0 ? formatFCFA(buyerPrice) : "—"}
                </span>
                {sellerNet > 0 && (
                  <span className="text-[11px] text-slate-500">
                    (commission plateforme : {formatFCFA(commission)})
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                L'acheteur paie ce montant. Tu reçois ton prix net à la validation.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={saving}
            onClick={submit}
            className="bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold rounded-full"
          >
            {saving ? "Publication…" : "Publier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({
  open,
  onClose,
  maxAmount,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  maxAmount: number;
  onDone: () => void;
}) {
  const { me } = useAppStore();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [waveNumber, setWaveNumber] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setAmount("");
    setWaveNumber("");
  }

  async function submit() {
    if (!me) return;
    const amt = Number(amount);
    if (!amt || amt < 500) {
      toast({
        title: "Montant minimum : 500 FCFA",
        variant: "destructive",
      });
      return;
    }
    if (amt > maxAmount) {
      toast({
        title: "Solde insuffisant",
        variant: "destructive",
      });
      return;
    }
    if (!waveNumber.trim()) {
      toast({
        title: "Numéro Wave requis",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/seller/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: me.id,
          amount: amt,
          waveNumber: waveNumber.trim(),
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      toast({
        title: "Retrait demandé 🎉",
        description: `${formatFCFA(amt)} sera envoyé sur ton Wave ${waveNumber.trim()}.`,
      });
      reset();
      onDone();
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
      <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden p-0 gap-0">
        <VisuallyHidden asChild>
          <DialogTitle>Retrait Wave</DialogTitle>
        </VisuallyHidden>
        <div className="bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 px-6 py-5 text-white text-center">
          <img
            src="/wave-logo.png"
            alt="Wave"
            className="mx-auto size-12 object-contain mb-1"
          />
          <h2 className="text-xl font-extrabold">Retrait Wave</h2>
          <p className="text-xs opacity-90">
            Solde disponible : {formatFCFA(maxAmount)}
          </p>
        </div>

        <div className="p-6 space-y-3">
          <div>
            <Label className="text-sm font-semibold">Montant (FCFA)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex : 5000"
              className="mt-1 rounded-xl h-12 text-lg font-bold"
              min={500}
              max={maxAmount}
            />
            <div className="flex gap-2 mt-2">
              {[500, 1000, 5000, maxAmount].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="text-xs px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 font-medium"
                >
                  {v === maxAmount ? "Tout" : formatFCFA(v)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold">Numéro Wave</Label>
            <Input
              inputMode="tel"
              value={waveNumber}
              onChange={(e) => setWaveNumber(e.target.value)}
              placeholder="Ex : 76 123 45 67"
              className="mt-1 rounded-xl h-11"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 rounded-full">
            Annuler
          </Button>
          <Button
            disabled={saving}
            onClick={submit}
            className="flex-1 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold rounded-full"
          >
            {saving ? "Envoi…" : "Confirmer le retrait"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
