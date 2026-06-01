import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, CalendarCheck, CreditCard, ChevronRight,
  AlertCircle, Clock, User,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getManagerDashboard } from '@/api/manager';
import { getMySubscription } from '@/api/subscriptions';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '—';
  return new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}
function fmtTime(t) { return t ? String(t).slice(0, 5) : '—'; }
function fmtAmount(v) { return v ? `${Number(v).toLocaleString('fr-FR')} FCFA` : '—'; }

const PAYMENT_LABELS = {
  on_arrival: 'Sur place', card: 'Carte', wave: 'Wave',
  orange_money: 'Orange Money', balance: 'Solde',
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
      <div className="h-10 rounded-xl bg-muted animate-pulse" />
      <div className="space-y-3">
        {[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${accent ? 'bg-primary/[0.03] border-primary/20' : 'bg-card border-border'}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{label}</p>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${accent ? 'bg-primary/10' : 'bg-muted'}`}>
          <Icon className={`h-3.5 w-3.5 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
      </div>
      <p className="text-xl font-bold text-foreground leading-none">{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Subscription status chip ──────────────────────────────────────────────────
function SubChip({ sub }) {
  if (!sub) return null;
  const { status, days_remaining } = sub;
  const cfg = {
    active:    { cls: 'bg-green-50  text-green-800  border-green-200',  label: 'Actif'    },
    trial:     { cls: 'bg-amber-50  text-amber-800  border-amber-200',  label: 'Essai'    },
    suspended: { cls: 'bg-red-50    text-red-800    border-red-200',    label: 'Suspendu' },
  }[status] ?? { cls: 'bg-muted text-foreground border-border', label: status };

  const urgent = status !== 'suspended' && days_remaining <= 7;

  return (
    <Link
      to="/manager/profile"
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${cfg.cls} transition-opacity hover:opacity-80`}
    >
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold">Abonnement · {cfg.label}</span>
        {status !== 'suspended' && (
          <span className={`text-xs font-medium ${urgent ? 'text-red-600' : 'opacity-70'}`}>
            {days_remaining}j restants
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 opacity-60 shrink-0" />
    </Link>
  );
}

// ── Booking row ───────────────────────────────────────────────────────────────
function BookingRow({ b }) {
  const playerName = [b.player_first_name, b.player_last_name].filter(Boolean).join(' ')
    || b.player_email?.split('@')[0] || 'Joueur';
  const initials = playerName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {b.player_photo
          ? <img src={b.player_photo} alt={playerName} className="h-full w-full rounded-full object-cover" />
          : <span className="text-xs font-bold text-primary">{initials}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{playerName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {b.venue_name} · {fmt(b.slot_date)} · {fmtTime(b.start_time)}–{fmtTime(b.end_time)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-foreground">{fmtAmount(b.price)}</p>
        <p className="text-[10px] text-muted-foreground">{PAYMENT_LABELS[b.payment_method] ?? b.payment_method}</p>
      </div>
    </div>
  );
}

// ── ManagerHome page ──────────────────────────────────────────────────────────
export default function ManagerHome() {
  const { user } = useAuth();
  const [data,    setData]    = useState(null);
  const [sub,     setSub]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!user?.organization_id) { setLoading(false); return; }
    Promise.all([
      getManagerDashboard(),
      getMySubscription().catch(() => null),
    ])
      .then(([{ stats, recent_bookings }, subResult]) => {
        setData({ stats, recent_bookings: recent_bookings ?? [] });
        setSub(subResult?.subscription ?? null);
      })
      .catch((err) => setError(err.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [user?.organization_id]);

  const greeting = user?.first_name || user?.email?.split('@')[0];

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />{error}
      </div>
    );
  }

  const { stats, recent_bookings } = data ?? {};

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-primary mb-0.5">Espace gérant</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bonjour, {greeting} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Voici un aperçu de votre activité.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Revenus aujourd'hui"
          value={`${(stats?.revenue_today ?? 0).toLocaleString('fr-FR')} FCFA`}
          sub="créneaux réservés ce jour"
          icon={TrendingUp}
          accent
        />
        <StatCard
          label="Revenus cette semaine"
          value={`${(stats?.revenue_week ?? 0).toLocaleString('fr-FR')} FCFA`}
          sub="7 prochains jours"
          icon={TrendingUp}
        />
        <StatCard
          label="Réservés cette semaine"
          value={stats?.bookings_week ?? 0}
          sub="créneaux sur 7 jours"
          icon={CalendarCheck}
          accent
        />
        <StatCard
          label="Total réservations"
          value={stats?.bookings_total ?? 0}
          sub="depuis le début"
          icon={CalendarCheck}
        />
      </div>

      {/* Subscription chip */}
      <SubChip sub={sub} />

      {/* Recent bookings */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Dernières réservations</p>
          </div>
          <Link
            to="/manager/bookings"
            className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
          >
            Voir tout <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="px-4 divide-y divide-border/50">
          {!recent_bookings?.length ? (
            <div className="py-8 flex flex-col items-center gap-2 text-center">
              <User className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucune réservation pour le moment.</p>
            </div>
          ) : (
            recent_bookings.map((b) => <BookingRow key={b.id} b={b} />)
          )}
        </div>
      </div>
    </div>
  );
}
