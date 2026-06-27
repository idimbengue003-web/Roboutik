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
import { CATEGORY_ICON } from "@/lib/support-bot";

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
  const [tab, setTab] = useState<
    "overview" | "users" | "orders" | "categories" | "appearance" | "withdrawals" | "tickets" | "audit"
  >("overview");
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
          { id: "orders", label: "Commandes", icon: Package },
          { id: "categories", label: "Catégories", icon: CheckCircle2 },
          { id: "appearance", label: "Apparence", icon: Shield },
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
      {tab === "orders" && <OrdersTab adminId={adminId} />}
      {tab === "categories" && <CategoriesTab adminId={adminId} />}
      {tab === "appearance" && <AppearanceTab adminId={adminId} />}
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
          Gains plateforme
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

      {/* DB usage card */}
      <DbUsageCard />
    </div>
  );
}

function DbUsageCard() {
  const [usage, setUsage] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/admin/db-usage?adminId=cmqqyxk010000jo04ci1x7aku`);
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setUsage(d);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!usage) {
    return (
      <div className="rounded-2xl border bg-white p-4">
        <p className="text-sm text-slate-500">Chargement de l'espace DB…</p>
      </div>
    );
  }

  const pct = usage.percentUsed;
  const barColor =
    pct > 90 ? "bg-rose-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
  const statusText =
    pct > 90
      ? "⚠️ Quasi saturé — migre vers Cloudinary ou passe Neon payant"
      : pct > 70
      ? "Attention — surveille la consommation"
      : "Espace suffisant";

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
          <Package className="size-4 text-fuchsia-600" />
          Espace base de données
        </h3>
        <span className="text-xs text-slate-500">
          Neon free: 500 MB
        </span>
      </div>

      {/* Big number */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-extrabold text-slate-900">
          {usage.totalMB} MB
        </span>
        <span className="text-sm text-slate-500">
          / 500 MB ({pct}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden mb-3">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <p className="text-xs text-slate-600 mb-3">{statusText}</p>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-slate-500">Annonces total</p>
          <p className="font-bold text-slate-900">{usage.listings.total}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-slate-500">Avec photo</p>
          <p className="font-bold text-slate-900">{usage.listings.withImages}</p>
          <p className="text-[10px] text-slate-400">
            ({usage.listings.imageMB} MB)
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2 col-span-2">
          <p className="text-emerald-700">Annonces avec photo encore possibles</p>
          <p className="font-bold text-emerald-900 text-lg">
            ~{usage.remainingListingsWithImages.toLocaleString("fr-FR")}
          </p>
        </div>
      </div>

      {/* Top tables */}
      {usage.tables && usage.tables.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
            Détail par table ({usage.tables.length} tables)
          </summary>
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {usage.tables.slice(0, 10).map((t: any) => (
              <div
                key={t.table}
                className="flex items-center justify-between text-[11px] py-0.5"
              >
                <span className="text-slate-600">{t.table}</span>
                <span className="font-mono text-slate-500">
                  {t.sizeMB} MB
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
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
  const [listingsTarget, setListingsTarget] = useState<AdminUser | null>(null);
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

    try {
      const r = await fetch(`/api/admin/users/${banTarget.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, reason }),
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
                  {u.isVerified && (
                    <span className="bg-sky-100 text-sky-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                      ✓ Vérifié
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
              <div className="shrink-0 flex flex-col gap-1">
                {u._count.listings > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setListingsTarget(u)}
                    className="h-8 text-xs rounded-full text-fuchsia-600 border-fuchsia-300 hover:bg-fuchsia-50"
                  >
                    <Package className="size-3.5" />
                    Annonces ({u._count.listings})
                  </Button>
                )}
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
                {/* Verify/Unverify button */}
                {u.isSeller && !u.isBanned && (
                  u.isVerified ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          const r = await fetch(`/api/admin/users/${u.id}/verify?adminId=${adminId}`, { method: "DELETE" });
                          if (!r.ok) throw new Error("Échec");
                          toast({ title: "Vendeur dé-vérifié" });
                          load();
                        } catch (e) {
                          toast({ title: "Erreur", description: e instanceof Error ? e.message : "?", variant: "destructive" });
                        }
                      }}
                      className="h-7 text-[10px] rounded-full text-slate-500"
                    >
                      Retirer ✓
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const r = await fetch(`/api/admin/users/${u.id}/verify`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ adminId }),
                          });
                          if (!r.ok) throw new Error("Échec");
                          toast({ title: "Vendeur vérifié ✓" });
                          load();
                        } catch (e) {
                          toast({ title: "Erreur", description: e instanceof Error ? e.message : "?", variant: "destructive" });
                        }
                      }}
                      className="h-7 text-[10px] rounded-full text-sky-600 border-sky-300 hover:bg-sky-50"
                    >
                      ✓ Vérifier
                    </Button>
                  )
                )}
                {/* Promote/Demote admin button */}
                {u.isAdmin ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm(`Retirer le rôle admin de ${u.username} ?`)) return;
                      try {
                        const r = await fetch(`/api/admin/users/${u.id}/promote-admin?adminId=${adminId}`, { method: "DELETE" });
                        if (!r.ok) {
                          const e = await r.json().catch(() => ({}));
                          throw new Error(e.error ?? "Échec");
                        }
                        toast({ title: `${u.username} n'est plus admin` });
                        load();
                      } catch (e) {
                        toast({ title: "Erreur", description: e instanceof Error ? e.message : "?", variant: "destructive" });
                      }
                    }}
                    className="h-7 text-[10px] rounded-full text-rose-600"
                  >
                    Retirer admin
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!confirm(`Promouvoir ${u.username} en administrateur ?\n\nIl/elle pourra bannir, valider des retraits, etc.`)) return;
                      try {
                        const r = await fetch(`/api/admin/users/${u.id}/promote-admin`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ adminId }),
                        });
                        if (!r.ok) {
                          const e = await r.json().catch(() => ({}));
                          throw new Error(e.error ?? "Échec");
                        }
                        toast({ title: `${u.username} est maintenant admin ✓` });
                        load();
                      } catch (e) {
                        toast({ title: "Erreur", description: e instanceof Error ? e.message : "?", variant: "destructive" });
                      }
                    }}
                    className="h-7 text-[10px] rounded-full text-fuchsia-600 border-fuchsia-300 hover:bg-fuchsia-50"
                  >
                    🛡️ Rendre admin
                  </Button>
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
      <UserListingsDialog
        user={listingsTarget}
        adminId={adminId}
        onClose={() => setListingsTarget(null)}
      />
    </div>
  );
}

function UserListingsDialog({
  user,
  adminId,
  onClose,
}: {
  user: AdminUser | null;
  adminId: string;
  onClose: () => void;
}) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setListings([]);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(
          `/api/admin/users/${user.id}/listings?adminId=${adminId}`
        );
        if (!r.ok) throw new Error("Échec");
        const d = await r.json();
        setListings(d.listings ?? []);
      } catch (e) {
        toast({
          title: "Erreur",
          description: e instanceof Error ? e.message : "?",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, adminId, toast]);

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5 text-fuchsia-600" />
            Annonces de {user?.username}
          </DialogTitle>
          <DialogDescription>
            {user?._count?.listings ?? 0} annonce(s) au total — cliquez sur une ligne pour l'ouvrir.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-6 text-slate-500 text-sm">Chargement…</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            Aucune annonce.
          </div>
        ) : (
          <div className="space-y-2">
            {listings.map((l) => (
              <a
                key={l.id}
                href={`/listing/${l.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2 rounded-xl border hover:bg-slate-50 transition-colors"
              >
                <div className="grid size-12 place-items-center rounded-lg bg-slate-100 text-xl shrink-0 overflow-hidden">
                  {l.images ? (
                    <img
                      src={JSON.parse(l.images)[0]}
                      alt={l.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    "🎮"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 line-clamp-1">
                    {l.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {l.game?.name ?? "—"} · Stock : {l.stock} ·{" "}
                    {l.active ? (
                      <span className="text-emerald-600 font-medium">Active</span>
                    ) : (
                      <span className="text-slate-400">Inactive</span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {l._count?.orders ?? 0} commande(s) · {l._count?.ratings ?? 0} avis
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-fuchsia-600">
                    {formatFCFA(l.price)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

    if (!confirm(action === "validate" ? `Valider le retrait de ${formatFCFA(w.amount)} pour ${w.seller.username} ?` : `Refuser le retrait de ${formatFCFA(w.amount)} ?`)) {
      return;
    }

    try {
      const r = await fetch(`/api/admin/withdrawals/${w.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          reason: reason || undefined,
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

/* ────────────────────────────────────────────────────────────────────── */
/* Orders tab — admin can view all orders, cancel, force-validate          */
/* ────────────────────────────────────────────────────────────────────── */

function OrdersTab({ adminId }: { adminId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ adminId });
      if (filter !== "ALL") params.set("status", filter);
      if (q) params.set("q", q);
      const r = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!r.ok) return;
      const d = await r.json();
      setOrders(d.orders ?? []);
    } finally {
      setLoading(false);
    }
  }, [adminId, filter, q]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function handleAction(orderId: string, action: "cancel" | "validate") {
    if (!confirm(action === "cancel" ? "Annuler cette commande ?" : "Forcer la validation ?")) return;
    try {
      const r = await fetch(`/api/admin/orders/${orderId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      toast({
        title: action === "cancel" ? "Commande annulée" : "Commande validée ✅",
      });
      load();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "?",
        variant: "destructive",
      });
    }
  }

  const filters = [
    { id: "ALL", label: "Toutes" },
    { id: "PENDING_PAYMENT", label: "Paiement en attente" },
    { id: "PAID", label: "Payées" },
    { id: "DELIVERED", label: "Livraisons en cours" },
    { id: "VALIDATED", label: "Validées" },
    { id: "CANCELLED", label: "Annulées" },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-white p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Rechercher par titre, acheteur ou vendeur…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 pl-9 rounded-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "outline"}
            onClick={() => setFilter(f.id)}
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
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          Aucune commande dans ce filtre.
        </div>
      ) : (
        <div className="rounded-2xl border bg-white divide-y">
          {orders.map((o) => (
            <div key={o.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-fuchsia-50 shrink-0">
                  <Package className="size-5 text-fuchsia-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 line-clamp-1">
                        {o.listing?.title ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {o.listing?.game?.name ?? "—"} ·{" "}
                        <strong>{formatFCFA(o.amount)}</strong>
                        {o.sellerNetAmount != null && o.sellerNetAmount !== o.amount && (
                          <span className="text-slate-400">
                            {" "}(net vendeur : {formatFCFA(o.sellerNetAmount)})
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${
                        o.status === "VALIDATED"
                          ? "bg-emerald-100 text-emerald-700"
                          : o.status === "CANCELLED"
                          ? "bg-rose-100 text-rose-700"
                          : o.status === "DELIVERED"
                          ? "bg-violet-100 text-violet-700"
                          : o.status === "PAID"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                    <span>
                      🛒 Vendeur : <strong>{o.seller?.username ?? "—"}</strong>
                    </span>
                    <span>
                      🧑 Acheteur : <strong>{o.buyer?.username ?? "—"}</strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(o.createdAt).toLocaleString("fr-FR")}
                  </p>
                  {(o.status === "PAID" || o.status === "DELIVERED" || o.status === "PENDING_PAYMENT") && (
                    <div className="flex gap-2 mt-2">
                      {(o.status === "PAID" || o.status === "DELIVERED") && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(o.id, "validate")}
                          className="h-7 text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="size-3" />
                          Valider
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(o.id, "cancel")}
                        className="h-7 text-xs rounded-full text-rose-600 border-rose-300 hover:bg-rose-50"
                      >
                        <X className="size-3" />
                        Annuler
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

/* ────────────────────────────────────────────────────────────────────── */
/* Categories tab — admin can create / edit / delete games                 */
/* ────────────────────────────────────────────────────────────────────── */

function CategoriesTab({ adminId }: { adminId: string }) {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/games");
      if (!r.ok) return;
      const d = await r.json();
      setGames(d.games ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(g: any) {
    if (!confirm(`Supprimer la catégorie « ${g.name} » ?`)) return;
    try {
      const r = await fetch(`/api/admin/games/${g.id}?adminId=${adminId}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      toast({ title: "Catégorie supprimée" });
      load();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "?",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {games.length} catégorie(s). Les nouvelles catégories apparaissent immédiatement dans la liste des jeux.
        </p>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          className="rounded-full bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white"
        >
          + Nouvelle catégorie
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-8">Chargement…</div>
      ) : games.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          Aucune catégorie.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {games.map((g) => (
            <div
              key={g.id}
              className="rounded-2xl border bg-white p-3 flex flex-col items-center text-center"
            >
              <div className="grid size-14 place-items-center rounded-xl bg-slate-100 text-2xl overflow-hidden mb-2">
                {g.image?.startsWith("data:image/") || g.image?.startsWith("http") ? (
                  <img src={g.image} alt={g.name} className="size-full object-cover" />
                ) : (
                  <span>{g.image || "🎮"}</span>
                )}
              </div>
              <p className="font-bold text-slate-900 text-sm line-clamp-1">{g.name}</p>
              {g.isFavorite && (
                <span className="text-[10px] text-amber-600 font-bold mt-0.5">⭐ Favori</span>
              )}
              <p className="text-[10px] text-slate-400 mt-0.5">
                Ordre : {g.sortOrder}
              </p>
              <div className="flex gap-1 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(g)}
                  className="h-7 text-[11px] rounded-full"
                >
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(g)}
                  className="h-7 text-[11px] rounded-full text-rose-600 border-rose-300 hover:bg-rose-50"
                >
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryEditDialog
        open={creating || !!editing}
        game={editing}
        adminId={adminId}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          setCreating(false);
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}

function CategoryEditDialog({
  open,
  game,
  adminId,
  onClose,
  onSaved,
}: {
  open: boolean;
  game: any | null;
  adminId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (game) {
      setName(game.name ?? "");
      setImage(game.image ?? "");
      setDescription(game.description ?? "");
      setIsFavorite(game.isFavorite ?? false);
      setSortOrder(game.sortOrder ?? 0);
    } else if (open) {
      setName("");
      setImage("");
      setDescription("");
      setIsFavorite(false);
      setSortOrder(0);
    }
  }, [game, open]);

  async function submit() {
    if (!name.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        image: image.trim() || "🎮",
        description: description.trim(),
        isFavorite,
        sortOrder: Number(sortOrder) || 0,
      };
      const url = game
        ? `/api/admin/games/${game.id}?adminId=${adminId}`
        : `/api/admin/games?adminId=${adminId}`;
      const method = game ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      toast({ title: game ? "Catégorie mise à jour" : "Catégorie créée ✅" });
      onSaved();
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "?",
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
          <DialogTitle>
            {game ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
          <DialogDescription>
            Les catégories apparaissent dans la liste des jeux sur la page d'accueil.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Nom du jeu *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Pet Simulator 99"
              className="rounded-xl mt-1"
              maxLength={80}
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">Image (emoji ou URL)</Label>
            <Input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="Ex : 🐾 ou https://..."
              className="rounded-xl mt-1"
              maxLength={5000}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Mets un emoji (ex : 🐾) ou l'URL d'une image.
            </p>
          </div>
          <div>
            <Label className="text-sm font-semibold">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Courte description du jeu…"
              className="w-full min-h-[60px] rounded-xl border bg-background p-2 text-sm mt-1"
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold">Ordre</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
                className="rounded-xl mt-1"
              />
            </div>
            <label className="flex items-end gap-2 text-sm pb-2">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="size-4 rounded"
              />
              ⭐ Favori (en haut)
            </label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={saving || !name.trim()}
            onClick={submit}
            className="bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold rounded-full"
          >
            {saving ? "Enregistrement…" : game ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Appearance tab — admin can change theme colors + hero text              */
/* ────────────────────────────────────────────────────────────────────── */

function AppearanceTab({ adminId }: { adminId: string }) {
  const [config, setConfig] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/site-config");
        if (!r.ok) return;
        const d = await r.json();
        setConfig(d.config);
      } catch {
        /* noop */
      }
    })();
  }, []);

  async function save(patch: Record<string, string>) {
    setSaving(true);
    try {
      const r = await fetch(`/api/site-config?adminId=${adminId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Échec");
      }
      const d = await r.json();
      setConfig(d.config);
      toast({ title: "Apparence mise à jour ✅", description: "Recharge la page pour voir le résultat." });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "?",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return <div className="text-center text-slate-500 py-8">Chargement…</div>;
  }

  const presets = [
    { name: "Fuchsia / Orange (défaut)", primary: "c026d3", accent: "f97316", bg: "ffffff" },
    { name: "Violet / Cyan", primary: "7c3aed", accent: "06b6d4", bg: "ffffff" },
    { name: "Rose / Jaune", primary: "ec4899", accent: "eab308", bg: "ffffff" },
    { name: "Bleu / Vert", primary: "2563eb", accent: "16a34a", bg: "ffffff" },
    { name: "Rouge / Or", primary: "dc2626", accent: "d97706", bg: "ffffff" },
    { name: "Noir / Violet (sombre)", primary: "8b5cf6", accent: "ec4899", bg: "0f172a" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <h3 className="font-bold text-slate-900">🎨 Thème du site</h3>
        <p className="text-xs text-slate-500">
          Les couleurs sont appliquées sur tout le site via des variables CSS. Choisis un préréglage ou personnalise chaque couleur.
        </p>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Préréglages rapides</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.name}
                onClick={() => save({ primaryColor: p.primary, accentColor: p.accent, bgColor: p.bg })}
                disabled={saving}
                className="text-left rounded-xl border hover:border-slate-400 transition-colors overflow-hidden"
              >
                <div
                  className="h-10 flex"
                  style={{
                    backgroundImage: `linear-gradient(135deg, #${p.primary} 0%, #${p.accent} 100%)`,
                  }}
                />
                <p className="text-xs font-medium text-slate-700 p-2 line-clamp-1">{p.name}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <ColorField
            label="Couleur primaire"
            value={config.primaryColor}
            onSave={(v) => save({ primaryColor: v })}
            disabled={saving}
          />
          <ColorField
            label="Couleur accent"
            value={config.accentColor}
            onSave={(v) => save({ accentColor: v })}
            disabled={saving}
          />
          <ColorField
            label="Couleur de fond"
            value={config.bgColor}
            onSave={(v) => save({ bgColor: v })}
            disabled={saving}
          />
        </div>

        <div className="pt-3 border-t">
          <div
            className="h-16 rounded-xl flex items-center justify-center text-white font-bold"
            style={{
              backgroundImage: `linear-gradient(135deg, #${config.primaryColor} 0%, #${config.accentColor} 100%)`,
            }}
          >
            Aperçu du dégradé
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <h3 className="font-bold text-slate-900">📝 Textes de la page d'accueil</h3>
        <div>
          <Label className="text-sm font-semibold">Nom du site</Label>
          <Input
            defaultValue={config.siteName}
            onBlur={(e) => {
              if (e.target.value !== config.siteName) save({ siteName: e.target.value });
            }}
            className="rounded-xl mt-1"
            maxLength={50}
          />
        </div>
        <div>
          <Label className="text-sm font-semibold">Titre principal (hero)</Label>
          <Input
            defaultValue={config.heroTitle}
            onBlur={(e) => {
              if (e.target.value !== config.heroTitle) save({ heroTitle: e.target.value });
            }}
            className="rounded-xl mt-1"
            maxLength={120}
          />
        </div>
        <div>
          <Label className="text-sm font-semibold">Sous-titre (hero)</Label>
          <Input
            defaultValue={config.heroSubtitle}
            onBlur={(e) => {
              if (e.target.value !== config.heroSubtitle) save({ heroSubtitle: e.target.value });
            }}
            className="rounded-xl mt-1"
            maxLength={200}
          />
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onSave,
  disabled,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          defaultValue={`#${value}`}
          onChange={(e) => {
            const v = e.target.value.replace(/^#/, "");
            // Save on change (debounced via blur on text input below is complex; immediate save is fine)
          }}
          onBlur={(e) => {
            const v = e.target.value.replace(/^#/, "");
            if (v !== value) onSave(v);
          }}
          className="size-10 rounded-lg border cursor-pointer"
          disabled={disabled}
        />
        <Input
          defaultValue={value}
          onBlur={(e) => {
            const v = e.target.value.replace(/^#/, "").toLowerCase();
            if (/^[0-9a-f]{6}$/.test(v) && v !== value) onSave(v);
          }}
          className="rounded-lg text-xs font-mono"
          maxLength={7}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
