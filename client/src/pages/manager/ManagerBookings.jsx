import { useState, useEffect } from 'react';
import { AlertCircle, CalendarDays, User } from 'lucide-react';
import { getManagerBookings } from '@/api/manager';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}
function fmtTime(t) { return t ? String(t).slice(0, 5) : '—'; }

const PAYMENT_LABELS = {
  on_arrival: 'Sur place', card: 'Carte bancaire',
  wave: 'Wave', orange_money: 'Orange Money', balance: 'Solde',
};

const STATUS_CFG = {
  confirmed: { label: 'Confirmée', cls: 'bg-green-50  text-green-700  border-green-200'  },
  cancelled: { label: 'Annulée',   cls: 'bg-red-50    text-red-700    border-red-200'    },
  completed: { label: 'Terminée',  cls: 'bg-slate-50  text-slate-600  border-slate-200'  },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3,4,5].map((i) => (
        <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

// ── Booking card ──────────────────────────────────────────────────────────────
function BookingCard({ b }) {
  const playerName = [b.player_first_name, b.player_last_name].filter(Boolean).join(' ')
    || b.player_email?.split('@')[0] || 'Joueur';
  const initials   = playerName.slice(0, 2).toUpperCase();
  const cfg        = STATUS_CFG[b.status] ?? STATUS_CFG.confirmed;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {/* Player avatar */}
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {b.player_photo
            ? <img src={b.player_photo} alt={playerName} className="h-full w-full rounded-full object-cover" />
            : <span className="text-xs font-bold text-primary">{initials}</span>}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{playerName}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${cfg.cls}`}>
              {cfg.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3 shrink-0" />
              {b.venue_name}
            </span>
            <span>{fmtDate(b.slot_date)}</span>
            <span>{fmtTime(b.start_time)} – {fmtTime(b.end_time)}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {PAYMENT_LABELS[b.payment_method] ?? b.payment_method}
            </span>
            <span className="text-sm font-bold text-foreground">
              {b.price ? `${Number(b.price).toLocaleString('fr-FR')} FCFA` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────
function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-foreground/70 border-border hover:border-primary/40'
      }`}
    >
      {label}
    </button>
  );
}

// ── ManagerBookings page ──────────────────────────────────────────────────────
export default function ManagerBookings() {
  const [filter,   setFilter]   = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getManagerBookings(filter)
      .then(({ bookings: b }) => setBookings(b ?? []))
      .catch((err) => setError(err.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [filter]);

  const FILTERS = [
    { key: 'all',   label: 'Tout'         },
    { key: 'week',  label: 'Cette semaine' },
    { key: 'today', label: "Aujourd'hui"   },
  ];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Réservations</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Historique et réservations à venir.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <FilterChip
            key={key}
            label={label}
            active={filter === key}
            onClick={() => setFilter(key)}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-14 flex flex-col items-center gap-2 text-center">
          <User className="h-8 w-8 text-muted-foreground/40" />
          <p className="font-medium text-foreground">Aucune réservation</p>
          <p className="text-sm text-muted-foreground">
            {filter === 'today'
              ? "Aucune réservation pour aujourd'hui."
              : filter === 'week'
              ? 'Aucune réservation cette semaine.'
              : 'Aucune réservation enregistrée.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{bookings.length} réservation{bookings.length !== 1 ? 's' : ''}</p>
          {bookings.map((b) => <BookingCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
}
