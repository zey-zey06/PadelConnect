import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyBookings, cancelBooking } from '@/api/bookings';
import { CalendarDays, MapPin, Clock, CreditCard, Banknote, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PageSkeleton from '@/components/PageSkeleton';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHeader(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function fmtTime(t) {
  return t ? String(t).slice(0, 5) : '—';
}

const PAYMENT_LABEL = {
  on_arrival:   'Sur place',
  wave:         'Wave',
  orange_money: 'Orange Money',
  card:         'Carte',
  mtn_money:    'MTN Money',
};

function PaymentIcon({ method }) {
  if (method === 'on_arrival') return <Banknote className="h-3.5 w-3.5" />;
  return <CreditCard className="h-3.5 w-3.5" />;
}

// ── Single booking row ────────────────────────────────────────────────────────
function BookingRow({ booking, isPast, onCancel }) {
  const [cancelling, setCancelling] = useState(false);

  const canCancel = !isPast && booking.status === 'confirmed';

  async function handleCancel() {
    if (!confirm('Annuler cette réservation ?')) return;
    setCancelling(true);
    try {
      await onCancel(booking.id);
    } catch (err) {
      alert(err.message || 'Impossible d\'annuler.');
      setCancelling(false);
    }
  }

  return (
    <div className={cn(
      'flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors',
      isPast ? 'opacity-55' : 'hover:border-primary/20'
    )}>
      {/* Time block */}
      <div className="shrink-0 text-center w-14">
        <p className="text-sm font-bold text-foreground tabular-nums">{fmtTime(booking.start_time)}</p>
        <p className="text-[11px] text-muted-foreground tabular-nums">{fmtTime(booking.end_time)}</p>
      </div>

      {/* Separator */}
      <div className="w-px h-10 bg-border shrink-0" />

      {/* Club + court */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{booking.club_name ?? '—'}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
          <MapPin className="h-3 w-3 shrink-0" />
          {booking.venue_name ?? '—'}
        </p>
      </div>

      {/* Price + payment */}
      <div className="shrink-0 text-right hidden sm:block">
        {booking.price > 0 && (
          <p className="text-sm font-semibold text-foreground">
            {Number(booking.price).toLocaleString('fr-FR')} FCFA
          </p>
        )}
        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
          <PaymentIcon method={booking.payment_method} />
          {PAYMENT_LABEL[booking.payment_method] ?? booking.payment_method ?? '—'}
        </p>
      </div>

      {/* Cancel */}
      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          title="Annuler"
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          {cancelling
            ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <X className="h-4 w-4" />
          }
        </button>
      )}
    </div>
  );
}

// ── Date group ────────────────────────────────────────────────────────────────
function DateGroup({ dateISO, bookings, isPast, onCancel }) {
  return (
    <div className="space-y-2">
      <h3 className={cn(
        'text-sm font-semibold capitalize tracking-tight',
        isPast ? 'text-muted-foreground' : 'text-foreground'
      )}>
        {fmtHeader(dateISO)}
      </h3>
      {bookings.map((b) => (
        <BookingRow key={b.id} booking={b} isPast={isPast} onCancel={onCancel} />
      ))}
    </div>
  );
}

// ── Calendar page ─────────────────────────────────────────────────────────────
export default function Calendar() {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getMyBookings()
      .then(({ bookings: b }) => setBookings(b ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(id) {
    await cancelBooking(id);
    load();
  }

  // Group bookings by date (using session_date — YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);

  function getDateStr(b) {
    return String(b.session_date ?? b.start_time ?? '').slice(0, 10);
  }

  // Sort descending by date, then group
  const sorted = [...bookings].sort((a, b) => {
    const da = getDateStr(a), db = getDateStr(b);
    return da < db ? 1 : da > db ? -1 : 0;
  });

  // Split into upcoming (>= today) and past (< today)
  const upcomingMap = {};
  const pastMap = {};

  for (const b of sorted) {
    const d = getDateStr(b);
    if (!d) continue;
    if (d >= todayStr) {
      if (!upcomingMap[d]) upcomingMap[d] = [];
      upcomingMap[d].push(b);
    } else {
      if (!pastMap[d]) pastMap[d] = [];
      pastMap[d].push(b);
    }
  }

  // Sort upcoming ascending (soonest first), past descending (most recent first)
  const upcomingDates = Object.keys(upcomingMap).sort();
  const pastDates     = Object.keys(pastMap).sort().reverse();

  const totalUpcoming = upcomingDates.reduce((s, d) => s + upcomingMap[d].length, 0);
  const totalPast     = pastDates.reduce((s, d) => s + pastMap[d].length, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mon calendrier</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Vos réservations passées et à venir.</p>
      </div>

      {loading ? (
        <PageSkeleton icon="📅" message="Chargement de votre agenda..." layout="calendar" />
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : (
        <>
          {/* ── Upcoming ──────────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                À venir
                <span className="text-sm font-normal text-muted-foreground">({totalUpcoming})</span>
              </h2>
            </div>

            {upcomingDates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
                <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">Aucune réservation à venir</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Réservez un terrain depuis la page Clubs.
                  </p>
                </div>
                <Link to="/clubs">
                  <Button variant="outline" size="sm">Voir les clubs</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {upcomingDates.map((d) => (
                  <DateGroup
                    key={d}
                    dateISO={d}
                    bookings={upcomingMap[d]}
                    isPast={false}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Past ──────────────────────────────────────────────────── */}
          {pastDates.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Passées
                <span className="text-sm font-normal">({totalPast})</span>
              </h2>
              <div className="space-y-5">
                {pastDates.map((d) => (
                  <DateGroup
                    key={d}
                    dateISO={d}
                    bookings={pastMap[d]}
                    isPast={true}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
