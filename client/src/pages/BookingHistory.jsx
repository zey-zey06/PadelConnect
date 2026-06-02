import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, CalendarDays,
  CheckCircle2, XCircle, AlertCircle, CreditCard,
} from 'lucide-react';
import { getMyBookings } from '@/api/bookings';
import { cn } from '@/lib/utils';
import PageSkeleton from '@/components/PageSkeleton';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtTime(t) {
  return t ? String(t).slice(0, 5).replace(':', 'h') : '';
}

function fmtAmount(v) {
  const n = Number(v ?? 0);
  if (!n) return null;
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

function isPast(dateStr) {
  if (!dateStr) return false;
  return new Date(String(dateStr).slice(0, 10) + 'T23:59:59') < new Date();
}

const PAYMENT_META = {
  wave:         { label: 'Wave',         emoji: '📱' },
  orange_money: { label: 'Orange Money', emoji: '🟠' },
  mtn_money:    { label: 'MTN Money',    emoji: '📲' },
  card:         { label: 'Carte',        emoji: '💳' },
  on_arrival:   { label: 'Sur place',    emoji: '💵' },
  balance:      { label: 'Solde',        emoji: '💰' },
};

// ── Status chip ───────────────────────────────────────────────────────────────

const STATUS_CFG = {
  confirmed: { label: 'Confirmée',  cls: 'bg-green-50  text-green-700  border-green-200'  },
  cancelled: { label: 'Annulée',    cls: 'bg-red-50    text-red-700    border-red-200'    },
  completed: { label: 'Terminée',   cls: 'bg-slate-50  text-slate-600  border-slate-200'  },
  pending:   { label: 'En attente', cls: 'bg-amber-50  text-amber-700  border-amber-200'  },
};

// ── BookingCard ───────────────────────────────────────────────────────────────

function BookingCard({ b }) {
  const dateStr    = b.session_date ?? b.slot_date ?? b.date;
  const past       = isPast(dateStr);
  const cfg        = STATUS_CFG[b.status] ?? STATUS_CFG.confirmed;
  const isCancelled = b.status === 'cancelled';
  const venueName    = b.venue_name ?? '—';
  const clubName     = b.club_name;
  const start        = fmtTime(b.start_time);
  const end          = fmtTime(b.end_time);
  const amount       = fmtAmount(b.total_price ?? b.price);
  const paymentMeta  = PAYMENT_META[b.payment_method] ?? null;

  return (
    <div className={cn(
      'rounded-xl border bg-card overflow-hidden transition-opacity',
      isCancelled ? 'border-red-100 opacity-70' : 'border-border',
    )}>
      {/* Left accent bar */}
      <div className="flex">
        <div className={cn(
          'w-1 shrink-0',
          isCancelled ? 'bg-red-400' : past ? 'bg-muted-foreground/20' : 'bg-primary',
        )} />

        <div className="flex-1 px-4 py-3.5 space-y-2.5">
          {/* Top row: venue + status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{venueName}</p>
              {clubName && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {clubName}
                </p>
              )}
            </div>
            <span className={cn(
              'shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border',
              cfg.cls,
            )}>
              {cfg.label}
            </span>
          </div>

          {/* Date + time */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {dateStr && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3 shrink-0" />
                <span className="capitalize">{fmtDate(dateStr)}</span>
              </span>
            )}
            {start && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                {start}{end ? `–${end}` : ''}
              </span>
            )}
          </div>

          {/* Price + payment */}
          {(amount || paymentMeta) && (
            <div className="flex items-center gap-3 text-xs">
              {amount && (
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <CreditCard className="h-3 w-3 text-muted-foreground shrink-0" />
                  {amount}
                </span>
              )}
              {paymentMeta && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  <span aria-hidden>{paymentMeta.emoji}</span>{paymentMeta.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right icon */}
        <div className="shrink-0 flex items-center pr-4">
          {isCancelled
            ? <XCircle className="h-5 w-5 text-red-400" />
            : past
            ? <CheckCircle2 className="h-5 w-5 text-muted-foreground/40" />
            : <CheckCircle2 className="h-5 w-5 text-green-500" />
          }
        </div>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ label }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="h-px flex-1 bg-border" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0 px-1">
        {label}
      </p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ── BookingHistory page ────────────────────────────────────────────────────────

export default function BookingHistory() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    getMyBookings()
      .then(({ bookings: b }) => {
        // Sort newest first
        const sorted = (b ?? []).slice().sort((a, z) => {
          const ta = String(a.session_date ?? a.slot_date ?? a.date ?? a.created_at ?? '');
          const tz = String(z.session_date ?? z.slot_date ?? z.date ?? z.created_at ?? '');
          return tz > ta ? 1 : tz < ta ? -1 : 0;
        });
        setBookings(sorted);
      })
      .catch((err) => setError(err.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, []);

  // Split into upcoming vs. past
  const upcoming = bookings.filter((b) => {
    const d = b.session_date ?? b.slot_date ?? b.date;
    return !isPast(d) && b.status !== 'cancelled';
  });
  const past = bookings.filter((b) => {
    const d = b.session_date ?? b.slot_date ?? b.date;
    return isPast(d) || b.status === 'cancelled';
  });

  const confirmed = bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;

  return (
    <div className="space-y-5 max-w-2xl pb-8">

      {/* Header */}
      <div className="space-y-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Mes réservations
          </h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {bookings.length} réservation{bookings.length !== 1 ? 's' : ''} au total
              {confirmed > 0 && ` · ${confirmed} confirmée${confirmed !== 1 ? 's' : ''}`}
              {cancelled > 0 && ` · ${cancelled} annulée${cancelled !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <PageSkeleton icon="📅" message="Chargement de vos réservations..." layout="list" />
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="font-medium text-foreground">Aucune réservation pour l'instant</p>
          <p className="text-sm text-muted-foreground">
            Réservez un terrain dans l'un de nos clubs pour voir vos réservations ici.
          </p>
          <Link to="/clubs" className="inline-block mt-1 text-sm font-medium text-primary hover:underline">
            Parcourir les clubs →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <>
              <SectionLabel label={`À venir · ${upcoming.length}`} />
              {upcoming.map((b) => <BookingCard key={b.id} b={b} />)}
            </>
          )}

          {/* Past / cancelled */}
          {past.length > 0 && (
            <>
              <SectionLabel label={`Passées & annulées · ${past.length}`} />
              {past.map((b) => <BookingCard key={b.id} b={b} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
