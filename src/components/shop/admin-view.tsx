"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import {
  Shield,
  Users,
  Ban,
  CheckCircle2,
  TrendingUp,
  Wallet,
  HeadphonesIcon,
  Search,
  X,
  Clock,
  AlertTriangle,
  Package,
  ArrowDownToLine,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import type { AuditLog, User, Withdrawal } from "@/lib/types";
import { formatFCFA } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

type AdminStats = {
  users: { total: number; sellers: number; banned: number };
  listings: { total: number; active: number };
  orders: {
    total: number;
    pendingPayment: number;
    paid: number;
    delivered: number;
    validated: number;
  };
  withdrawals: { pending: number; completed: number; rejected: number };
  tickets: { open: number; botHandled: number; adminHandled: number };
  revenue: { totalGmv: number; totalCommission: number; totalSellerPayouts: number };
};

type AdminUser = User & {
  _count: {
    listings: number;
    buyerOrders: number;
    sellerOrders: number;
    withdrawals: number;
  };
};

export function AdminView() {
  const { me } = useAppStore();

  if (!me?.isAdmin) {
    return (
      <div className="mx-3 sm:mx-6 py-12">
        <div className="rounded-3xl border bg-white p-8 sm:p-12 text-center max-w-md mx-auto">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-rose-50 mb-4">
            <Shield className="size-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Accès refusé</h2>
          <p className="text-slate-500 mt-2">
            Cette page est réservée aux administrateurs de Roboutik.
          </p>
        </div>
      </div>
    );
  }

  return <AdminDashboard adminId={me.id} />;
}

function AdminDashboard({ adminId }: { adminId: string }) {
  const [tab, setTab] = useState<"overview" | "users" | "withdrawals" | "tickets" | "audit">(
    "overview"
  );
  const [stats, setStats] = useState<AdminStats | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/stats?adminId=${adminId}`);
      if (!r.ok) return;
      const d = await r.json();
      setStats(d);
    } catch {
      /* noop */
    }
  }, [adminId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadStats();
    })();
    const t = setInterval(loadStats, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [loadStats]);

  return (
    <div className="mx-3 sm:mx-6 py-6 pb-12 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Shield className="size-7 text-rose-500" />
            Admin Roboutik
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gère les utilisateurs, les retraits, le support et surveille la plateforme.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {[
          { id: "overview", label: "Vue d'ensemble", icon: TrendingUp },
          { id: "users", label: "Utilisateurs", icon: Users },
          { id: "withdrawals", label: "Retraits", icon: ArrowDownToLine },
          { id: "tickets", label: "Support", icon: HeadphonesIcon },
          { id: "audit", label: "Journal", icon: Clock },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <Button
              key={t.id}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t.id as typeof tab)}
              className={`h-9 rounded-full px-4 text-sm font-semibold shrink-0 ${
                active
                  ? "bg-gradient-to-r from-rose-600 to-orange-500 text-white"
                  : ""
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </Button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab stats={stats} />}
      {tab === "users" && <UsersTab adminId={adminId} />}
      {tab === "withdrawals" && <WithdrawalsTab adminId={adminId} />}
      {tab === "tickets" && <TicketsTab adminId={adminId} />}
      {tab === "audit" && <AuditTab adminId={adminId} />}
    </div>
  );
}

function OverviewTab({ stats }: { stats: AdminStats | null }) {
  if (!stats) {
    return <div className="text-center text-slate-500 py-8">Chargement…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Revenue card */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400 p-5 text-white shadow-lg">
        <p className="text-xs opacity-90 uppercase tracking-wide font-semibold">
          Commission plateforme (20%)
        </p>
        <p className="text-4xl font-extrabold mt-1">
          {formatFCFA(stats.revenue.totalCommission)}
        </p>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-[11px] opacity-80 uppercase">GMV total</p>
            <p className="text-lg font-bold">{formatFCFA(stats.revenue.totalGmv)}</p>
          </div>
          <div>
            <p className="text-[11px] opacity-80 uppercase">Versé vendeurs</p>
            <p className="text-lg font-bold">{formatFCFA(stats.revenue.totalSellerPayouts)}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="size-5 text-sky-600" />}
          label="Utilisateurs"
          value={String(stats.users.total)}
          sub={`${stats.users.sellers} vendeurs`}
          tint="bg-sky-50"
        />
        <StatCard
          icon={<Ban className="size-5 text-rose-600" />}
          label="Bannis"
          value={String(stats.users.banned)}
          tint="bg-rose-50"
        />
        <StatCard
          icon={<Package className="size-5 text-fuchsia-600" />}
          label="Annonces"
          value={String(stats.listings.total)}
          sub={`${stats.listings.active} actives`}
          tint="bg-fuchsia-50"
        />
        <StatCard
          icon={<TrendingUp className="size-5 text-emerald-600" />}
          label="Commandes"
          value={String(stats.orders.total)}
          sub={`${stats.orders.validated} validées`}
          tint="bg-emerald-50"
        />
        <StatCard
          icon={<ArrowDownToLine className="size-5 text-violet-600" />}
          label="Retraits en attente"
          value={String(stats.withdrawals.pending)}
          tint="bg-amber-50"
        />
        <StatCard
          icon={<HeadphonesIcon className="size-5 text-cyan-600" />}
          label="Tickets support"
          value={String(stats.tickets.open + stats.tickets.adminHandled)}
          sub={`${stats.tickets.adminHandled} à traiter`}
          tint="bg-cyan-50"
        />
      </div>

      {/* Orders breakdown */}
      <div className="rounded-2xl border bg-white p-4">
        <h3 className="font-bold text-slate-900 mb-3">📊 Répartition des commandes</h3>
        <div className="space-y-2 text-sm">
          <OrderRow label="Paiement en attente" count={stats.orders.pendingPayment} color="bg-amber-400" />
          <OrderRow label="Payées" count={stats.orders.paid} color="bg-sky-400" />
          <OrderRow label="Livraisons en cours" count={stats.orders.delivered} color="bg-violet-400" />
          <OrderRow label="Validées" count={stats.orders.validated} color="bg-emerald-400" />
        </div>
      </div>
    </div>
  );
}

function OrderRow({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${color}`} />
      <span className="flex-1 text-slate-700">{label}</span>
      <span className="font-bold text-slate-900">{count}</span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className={`grid size-9 place-items-center rounded-lg ${tint} mb-2`}>
        {icon}
      </div>
      <p className="text-[11px] text-slate-500 font-medium">{label}</p>
      <p className="font-bold text-slate-900 text-base">{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

function UsersTab({ adminId }: { adminId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [bannedOnly, setBannedOnly] = useState(false);
  const [sellersOnly, setSellersOnly] = useState(false);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ adminId });
      if (q) params.set("q", q);
      if (bannedOnly) params.set("banned", "true");
      if (sellersOnly) params.set("sellers", "true");
      const r = await fetch(`/api/admin/users?${params.toString()}`);
      if (!r.ok) return;
      const d = await r.json();
      setUsers(d.users ?? []);
    } finally {
      setLoading(false);
    }
  }, [adminId, q, bannedOnly, sellersOnly]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function handleBan(reason: string) {
    if (!banTarget) return;
    // 2FA: request a code by email, then prompt the admin to type it.
    let twoFactorCode = "";
    try {
      const sendR = await fetch(`/api/admin/2fa/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });
      if (!sendR.ok) {
        const e = await sendR.json().catch(() => ({}));
        throw new Error(e.error ?? "Impossible d'envoyer le code 2FA");
      }
      toast({
        title: "🔒 Code 2FA envoyé par email",
        description: "Regarde ta boîte mail (valable 10 min).",
      });
      twoFactorCode = window.prompt(
        "🔒 Code de sécurité admin\n\nUn code à 6 chiffres a été envoyé à ton email. Saisis-le pour confirmer le bannissement :",
        ""
      )?.trim() ?? "";
      if (!twoFactorCode) {
        toast({ title: "Action annulée", description: "Code 2FA requis." });
        return;
      }
    } catch (e) {
      toast({
        title: "Erreur 2FA",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
      return;
    }

    try {
      const r = await fetch(`/api/admin/users/${banTarget.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, reason, twoFactorCode }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      toast({
        title: "Utilisateur banni",
        description: banTarget.username,
      });
      setBanTarget(null);
      load();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    }
  }

  async function handleUnban(u: AdminUser) {
    if (!confirm(`Débannir ${u.username} ?`)) return;
    try {
      const r = await fetch(`/api/admin/users/${u.id}/unban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });
      if (!r.ok) throw new Error("Échec");
      toast({ title: "Utilisateur débanni" });
      load();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-white p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Rechercher par pseudo ou email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 pl-9 rounded-full"
          />
        </div>
        <Button
          size="sm"
          variant={bannedOnly ? "default" : "outline"}
          onClick={() => setBannedOnly(!bannedOnly)}
          className="h-9 rounded-full"
        >
          <Ban className="size-4" />
          Bannis
        </Button>
        <Button
          size="sm"
          variant={sellersOnly ? "default" : "outline"}
          onClick={() => setSellersOnly(!sellersOnly)}
          className="h-9 rounded-full"
        >
          Vendeurs
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-8">Chargement…</div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          Aucun utilisateur.
        </div>
      ) : (
        <div className="rounded-2xl border bg-white divide-y">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-xl shrink-0">
                {u.avatar ?? "👤"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 line-clamp-1">
                    {u.username}
                  </p>
                  {u.isAdmin && (
                    <span className="bg-rose-100 text-rose-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                      ADMIN
                    </span>
                  )}
                  {u.isSeller && (
                    <span className="bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                      VENDEUR
                    </span>
                  )}
                  {u.isBanned && (
                    <span className="bg-rose-100 text-rose-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                      BANNI
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-1">{u.email}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span>{u._count.listings} annonces</span>
                  <span>·</span>
                  <span>{u._count.buyerOrders} achats</span>
                  <span>·</span>
                  <span>{u._count.sellerOrders} ventes</span>
                  {u.balance > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-600 font-semibold">
                        Solde : {formatFCFA(u.balance)}
                      </span>
                    </>
                  )}
                </div>
                {u.banReason && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    Raison du ban : {u.banReason}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                {u.isBanned ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnban(u)}
                    className="h-8 text-xs rounded-full"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Débannir
                  </Button>
                ) : (
                  !u.isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBanTarget(u)}
                      className="h-8 text-xs rounded-full text-rose-600 border-rose-300 hover:bg-rose-50"
                    >
                      <Ban className="size-3.5" />
                      Bannir
                    </Button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BanDialog
        user={banTarget}
        onClose={() => setBanTarget(null)}
        onConfirm={handleBan}
      />
    </div>
  );
}

function BanDialog({
  user,
  onClose,
  onConfirm,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Reset reason when the target user changes
  if (user && user.id !== lastUserId) {
    setLastUserId(user.id);
    if (reason !== "") setReason("");
  }
  if (!user && lastUserId !== null) {
    setLastUserId(null);
  }

  async function submit() {
    setSaving(true);
    await onConfirm(reason.trim());
    setSaving(false);
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="size-5 text-rose-500" />
            Bannir {user?.username}
          </DialogTitle>
          <DialogDescription>
            L'utilisateur ne pourra plus acheter, vendre, ni retirer. Il verra le motif.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Motif du bannissement</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex : Arnaque avérée, spam, comportement abusif…"
            className="rounded-xl"
            maxLength={200}
          />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              "Arnaque avérée",
              "Spam d'annonces",
              "Comportement abusif",
              "Faux paiement",
            ].map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className="text-xs px-2 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 font-medium text-slate-700"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={saving || !reason.trim()}
            onClick={submit}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-full"
          >
            {saving ? "Bannissement…" : "Confirmer le ban"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawalsTab({ adminId }: { adminId: string }) {
  const [withdrawals, setWithdrawals] = useState<(Withdrawal & { seller: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"PENDING" | "COMPLETED" | "REJECTED" | "ALL">("PENDING");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/admin/withdrawals?adminId=${adminId}&status=${filter}`
      );
      if (!r.ok) return;
      const d = await r.json();
      setWithdrawals(d.withdrawals ?? []);
    } finally {
      setLoading(false);
    }
  }, [adminId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(w: Withdrawal & { seller: User }, action: "validate" | "reject") {
    const reason = action === "reject" ? prompt("Raison du refus ?") ?? "" : "";

    // 2FA: request a code by email, then prompt the admin to type it.
    let twoFactorCode = "";
    try {
      const sendR = await fetch(`/api/admin/2fa/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });
      if (!sendR.ok) {
        const e = await sendR.json().catch(() => ({}));
        throw new Error(e.error ?? "Impossible d'envoyer le code 2FA");
      }
      toast({
        title: "🔒 Code 2FA envoyé par email",
        description: "Regarde ta boîte mail (valable 10 min).",
      });
      twoFactorCode = window.prompt(
        `🔒 Code de sécurité admin\n\nUn code à 6 chiffres a été envoyé à ton email. Saisis-le pour confirmer ${action === "validate" ? "la validation" : "le refus"} du retrait :`,
        ""
      )?.trim() ?? "";
      if (!twoFactorCode) {
        toast({ title: "Action annulée", description: "Code 2FA requis." });
        return;
      }
    } catch (e) {
      toast({
        title: "Erreur 2FA",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
      return;
    }

    try {
      const r = await fetch(`/api/admin/withdrawals/${w.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          reason: reason || undefined,
          twoFactorCode,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      toast({
        title: action === "validate" ? "Retrait validé ✅" : "Retrait refusé",
        description:
          action === "validate"
            ? `${formatFCFA(w.amount)} envoyés à ${w.seller.username}`
            : `${formatFCFA(w.amount)} remboursés à ${w.seller.username}`,
      });
      load();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto">
        {[
          { id: "PENDING", label: "En attente" },
          { id: "COMPLETED", label: "Validés" },
          { id: "REJECTED", label: "Refusés" },
          { id: "ALL", label: "Tous" },
        ].map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "outline"}
            onClick={() => setFilter(f.id as typeof filter)}
            className={`h-9 rounded-full shrink-0 ${
              filter === f.id
                ? "bg-gradient-to-r from-rose-600 to-orange-500 text-white"
                : ""
            }`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-8">Chargement…</div>
      ) : withdrawals.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          Aucun retrait dans cette catégorie.
        </div>
      ) : (
        <div className="rounded-2xl border bg-white divide-y">
          {withdrawals.map((w) => (
            <div key={w.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-violet-50 shrink-0">
                  <Wallet className="size-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900">{formatFCFA(w.amount)}</p>
                    <span
                      className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
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
                        : "En attente"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Vendeur : <strong>{w.seller.username}</strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    Wave : <strong>{w.waveNumber}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(w.createdAt).toLocaleString("fr-FR")}
                  </p>
                  {w.status === "PENDING" && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(w, "validate")}
                        className="h-8 text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(w, "reject")}
                        className="h-8 text-xs rounded-full text-rose-600 border-rose-300 hover:bg-rose-50"
                      >
                        <X className="size-3.5" />
                        Refuser (rembourser)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TicketsTab({ adminId }: { adminId: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ADMIN_HANDLED" | "OPEN" | "RESOLVED" | "ALL">("ADMIN_HANDLED");
  const [replyTarget, setReplyTarget] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/support/admin/tickets?adminId=${adminId}&status=${filter}`
      );
      if (!r.ok) return;
      const d = await r.json();
      setTickets(d.tickets ?? []);
    } finally {
      setLoading(false);
    }
  }, [adminId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto">
        {[
          { id: "ADMIN_HANDLED", label: "À traiter" },
          { id: "OPEN", label: "Ouverts" },
          { id: "RESOLVED", label: "Résolus" },
          { id: "ALL", label: "Tous" },
        ].map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "outline"}
            onClick={() => setFilter(f.id as typeof filter)}
            className={`h-9 rounded-full shrink-0 ${
              filter === f.id
                ? "bg-gradient-to-r from-rose-600 to-orange-500 text-white"
                : ""
            }`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-8">Chargement…</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          Aucun ticket dans cette catégorie. 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-xl shrink-0">
                  {CATEGORY_ICON[t.category as keyof typeof CATEGORY_ICON] ?? "❓"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 line-clamp-1">
                      {t.subject}
                    </h3>
                    {t.priority === "URGENT" && (
                      <span className="bg-rose-100 text-rose-700 rounded-full px-2 py-0.5 text-[10px] font-bold">
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Par <strong>{t.opener?.username}</strong> ·{" "}
                    {new Date(t.updatedAt).toLocaleString("fr-FR")}
                  </p>
                  {t.messages?.[t.messages.length - 1] && (
                    <div className="mt-2 bg-slate-50 rounded-lg p-2 text-xs text-slate-600">
                      <span className="font-semibold">
                        {t.messages[t.messages.length - 1].senderRole === "BOT"
                          ? "🤖 Bot"
                          : t.messages[t.messages.length - 1].senderRole === "ADMIN"
                          ? "🛡️ Admin"
                          : "👤 " + t.opener?.username}
                        :
                      </span>{" "}
                      {t.messages[t.messages.length - 1].content.slice(0, 120)}
                      {t.messages[t.messages.length - 1].content.length > 120 ? "…" : ""}
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setReplyTarget(t)}
                    className="h-8 mt-2 text-xs rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white"
                  >
                    <HeadphonesIcon className="size-3.5" />
                    Répondre
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminReplyDialog
        ticket={replyTarget}
        adminId={adminId}
        onClose={() => setReplyTarget(null)}
        onDone={load}
      />
    </div>
  );
}

function AdminReplyDialog({
  ticket,
  adminId,
  onClose,
  onDone,
}: {
  ticket: any | null;
  adminId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [resolve, setResolve] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setContent("");
    setResolve(false);
  }, [ticket]);

  async function submit() {
    if (!ticket || !content.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/support/admin/tickets/${ticket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          content: content.trim(),
          resolve,
        }),
      });
      if (!r.ok) throw new Error("Échec");
      toast({ title: "Réponse envoyée ✅" });
      onClose();
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
    <Dialog open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Répondre à {ticket?.opener?.username}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {ticket?.subject}
          </DialogDescription>
        </DialogHeader>

        {ticket?.messages && (
          <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-50 p-2 space-y-1">
            {ticket.messages.map((m: any) => (
              <div key={m.id} className="text-xs">
                <span className="font-semibold text-slate-700">
                  {m.senderRole === "BOT" ? "🤖 Bot" : m.senderRole === "ADMIN" ? "🛡️ Admin" : "👤 " + ticket.opener?.username}:
                </span>{" "}
                <span className="text-slate-600">{m.content}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Ta réponse</Label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Écris ta réponse à l'utilisateur…"
            className="w-full min-h-[100px] rounded-xl border border-input bg-background p-3 text-sm"
            maxLength={1000}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={resolve}
              onChange={(e) => setResolve(e.target.checked)}
              className="size-4 rounded"
            />
            Marquer comme résolu
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={saving || !content.trim()}
            onClick={submit}
            className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold rounded-full"
          >
            {saving ? "Envoi…" : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuditTab({ adminId }: { adminId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/admin/audit?adminId=${adminId}&limit=100`);
        if (!r.ok) return;
        const d = await r.json();
        setLogs(d.logs ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [adminId]);

  if (loading) {
    return <div className="text-center text-slate-500 py-8">Chargement…</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
        Aucune action enregistrée.
      </div>
    );
  }

  const actionLabel: Record<string, string> = {
    BAN_USER: "Bannir utilisateur",
    UNBAN_USER: "Débannir utilisateur",
    VALIDATE_WITHDRAWAL: "Valider retrait",
    REJECT_WITHDRAWAL: "Refuser retrait",
    REPLY_TICKET: "Répondre ticket",
  };

  return (
    <div className="rounded-2xl border bg-white divide-y">
      {logs.map((l) => (
        <div key={l.id} className="flex items-start gap-3 p-3">
          <div className="grid size-8 place-items-center rounded-lg bg-slate-100 text-sm shrink-0">
            {l.action.includes("BAN") ? (
              <Ban className="size-4 text-rose-500" />
            ) : l.action.includes("WITHDRAWAL") ? (
              <Wallet className="size-4 text-violet-500" />
            ) : (
              <Clock className="size-4 text-slate-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {actionLabel[l.action] ?? l.action}
            </p>
            <p className="text-xs text-slate-500">
              Par <strong>{l.actor?.username ?? "Système"}</strong>
              {l.target && (
                <>
                  {" · "}
                  Cible : <strong>{l.target.username}</strong>
                </>
              )}
            </p>
            {l.metadata && (
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                {l.metadata}
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              {new Date(l.createdAt).toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
