import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyBookings, cancelBooking } from '@/api/bookings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, MapPin, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function BookingCard({ booking, onCancel }) {
  const [cancelling, setCancelling] = useState(false);

  const session = booking.session ?? {};
  const rawDate = session.date ?? booking.date ?? '';
  const date    = new Date(String(rawDate).slice(0, 10) + 'T00:00:00');
  const time    = (session.time ?? booking.time)?.slice(0, 5) ?? '—';
  const isPast  = date < new Date();

  async function handleCancel() {
    if (!window.confirm('Annuler cette réservation ?')) return;
    setCancelling(true);
    try {
      await onCancel(booking.id);
    } catch (err) {
      alert(err.message || 'Impossible d\'annuler.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className={cn(
      'rounded-xl border border-border bg-card p-5 space-y-3 transition-shadow hover:shadow-sm',
      isPast && 'opacity-60'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground capitalize">
            {date.toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-3.5 w-3.5" />
            {time}
          </p>
        </div>
        <Badge variant={
          booking.status === 'confirmed' ? 'success'
          : booking.status === 'cancelled' ? 'destructive'
          : 'secondary'
        }>
          {booking.status === 'confirmed' ? 'Confirmé'
            : booking.status === 'cancelled' ? 'Annulé'
            : booking.status}
        </Badge>
      </div>

      {booking.venue_name && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {booking.venue_name}
        </p>
      )}

      {!isPast && booking.status === 'confirmed' && (
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? 'Annulation…' : 'Annuler la réservation'}
        </Button>
      )}
    </div>
  );
}

export default function Calendar() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

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

  const parseDate = (b) => new Date(String(b.session?.date ?? b.date ?? '').slice(0, 10) + 'T00:00:00');

  const upcoming = bookings.filter((b) => {
    const d = b.session?.date ?? b.date;
    return d && parseDate(b) >= new Date();
  });

  const past = bookings.filter((b) => {
    const d = b.session?.date ?? b.date;
    return d && parseDate(b) < new Date();
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mon calendrier</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Vos réservations passées et à venir.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : (
        <>
          {/* Upcoming */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              À venir{' '}
              <span className="text-muted-foreground font-normal">({upcoming.length})</span>
            </h2>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
                <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">Aucune réservation à venir</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rejoignez une session pour réserver votre créneau.
                  </p>
                </div>
                <Link to="/sessions">
                  <Button variant="outline" size="sm">Parcourir les sessions</Button>
                </Link>
              </div>
            ) : (
              upcoming.map((b) => (
                <BookingCard key={b.id} booking={b} onCancel={handleCancel} />
              ))
            )}
          </section>

          {/* Past */}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                Passées{' '}
                <span className="text-muted-foreground font-normal">({past.length})</span>
              </h2>
              {past.map((b) => (
                <BookingCard key={b.id} booking={b} onCancel={handleCancel} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
