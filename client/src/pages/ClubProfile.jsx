import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2, MapPin, Phone, ChevronDown, ChevronUp,
  Clock, AlertCircle, X, CreditCard, Banknote,
  CalendarDays, CheckCircle2,
} from 'lucide-react';
import { useAuth }       from '@/App';
import { getPublicClub } from '@/api/clubs';
import { getVenueSlots } from '@/api/manager';
import { getMySessions } from '@/api/sessions';
import { createBooking } from '@/api/bookings';
import { Button }  from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import { cn }      from '@/lib/utils';
import { CLUB_AMENITIES } from './manager/ClubSetup';

// ── Helpers ───────────────────────────────────────────────────────────────────
function toISODate(d) {
  return d instanceof Date ? d.toISOString().slice(0, 10) : d;
}

function durationLabel(start = '00:00', end = '00:00') {
  const [sh, sm] = start.slice(0, 5).split(':').map(Number);
  const [eh, em] = end.slice(0, 5).split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return '';
  if (mins % 60 === 0) return `${mins / 60}h`;
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ── Booking modal ─────────────────────────────────────────────────────────────
function BookingModal({ slot, venueName, onClose, onBooked }) {
  const [sessions,        setSessions]        = useState([]);
  const [sessionId,       setSessionId]       = useState('');
  const [paymentMethod,   setPaymentMethod]   = useState('on_arrival');
  const [loading,         setLoading]         = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [error,           setError]           = useState(null);

  const duration = durationLabel(slot.start_time, slot.end_time);

  useEffect(() => {
    getMySessions()
      .then(({ sessions: s }) => {
        const open = (s ?? []).filter((x) => x.status === 'open');
        setSessions(open);
        if (open.length === 1) setSessionId(String(open[0].id));
      })
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sessionId) { setError('Sélectionnez une session.'); return; }
    setLoading(true); setError(null);
    try {
      const { booking } = await createBooking({
        session_id:     sessionId,
        venue_slot_id:  slot.id,
        payment_method: paymentMethod,
      });
      onBooked(booking);
    } catch (err) {
      setError(err.message || 'Erreur lors de la réservation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Réserver ce créneau</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {/* Slot details card */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{venueName}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{fmtDate(slot.date)}</p>
              </div>
              {slot.price > 0 && (
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-foreground leading-none">
                    {Number(slot.price).toLocaleString('fr-FR')}
                    <span className="text-xs font-normal text-muted-foreground ml-1">FCFA</span>
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
              </span>
              {duration && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {duration}
                </span>
              )}
            </div>
          </div>

          {/* Session selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Ma session</label>
            {sessionsLoading ? (
              <div className="h-10 rounded-lg bg-muted animate-pulse" />
            ) : sessions.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                Aucune session ouverte.{' '}
                <Link to="/sessions" className="font-medium underline hover:text-amber-900">
                  Créez une session
                </Link>{' '}
                puis revenez réserver ce créneau.
              </div>
            ) : (
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Sélectionnez une session…</option>
                {sessions.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.date} à {s.time} — {s.current_players}/{s.max_players} joueurs
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mode de paiement</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'on_arrival', label: 'Sur place',      icon: Banknote   },
                { value: 'card',       label: 'Carte bancaire', icon: CreditCard },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                    paymentMethod === value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-foreground/70 hover:border-primary/40'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || sessionsLoading || sessions.length === 0}
              className="flex-1"
            >
              {loading ? 'Réservation…' : 'Confirmer la réservation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Venue section with date picker ────────────────────────────────────────────
function VenueSection({ venue, onBook }) {
  const today                         = toISODate(new Date());
  const [open,         setOpen]       = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [allSlots,     setAllSlots]   = useState(null);
  const [loading,      setLoading]    = useState(false);

  const handleOpen = useCallback(async () => {
    if (!open && allSlots === null) {
      setLoading(true);
      try {
        const { slots: s } = await getVenueSlots(venue.id);
        setAllSlots((s ?? []).filter((sl) => sl.status !== 'cancelled' && sl.date >= today));
      } catch {
        setAllSlots([]);
      } finally {
        setLoading(false);
      }
    }
    setOpen((o) => !o);
  }, [open, allSlots, venue.id, today]);

  const slotsForDate = (allSlots ?? [])
    .filter((sl) => sl.date === selectedDate)
    .sort((a, b) => (a.start_time > b.start_time ? 1 : -1));

  const availableCount = slotsForDate.filter((s) => s.status === 'available').length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Venue header row */}
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{venue.name}</p>
          {venue.description && (
            <p className="text-xs text-muted-foreground truncate">{venue.description}</p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleOpen} disabled={loading}>
          {loading
            ? <span className="h-3.5 w-3.5 border border-primary border-t-transparent rounded-full animate-spin inline-block" />
            : open
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <CalendarDays className="h-3.5 w-3.5" />}
          {open ? 'Masquer' : 'Voir les créneaux'}
        </Button>
      </div>

      {/* Slots panel */}
      {open && !loading && (
        <div className="border-t border-border bg-muted/10 px-5 py-4 space-y-4">
          {/* Date picker */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground shrink-0">Date</label>
            <input
              type="date"
              value={selectedDate}
              min={today}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {allSlots !== null && (
              <span className="text-xs text-muted-foreground ml-auto">
                {availableCount > 0
                  ? `${availableCount} disponible${availableCount > 1 ? 's' : ''}`
                  : 'Complet'}
              </span>
            )}
          </div>

          {/* Slot buttons */}
          {slotsForDate.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">Aucun créneau pour cette date.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slotsForDate.map((slot) => {
                const avail = slot.status === 'available';
                return (
                  <button
                    key={slot.id}
                    onClick={() => avail && onBook(slot, venue.name)}
                    disabled={!avail}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                      avail
                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer hover:shadow-sm'
                        : 'border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}
                    {slot.price > 0 && (
                      <span className="ml-1 opacity-80">
                        {Number(slot.price).toLocaleString('fr-FR')} F
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ClubProfile page ──────────────────────────────────────────────────────────
export default function ClubProfile() {
  const { id }   = useParams();
  const { user } = useAuth();

  const [club,    setClub]    = useState(null);
  const [venues,  setVenues]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [booking, setBooking] = useState(null); // { slot, venueName }
  const [booked,  setBooked]  = useState(false);

  useEffect(() => {
    getPublicClub(id)
      .then(({ club: c, venues: v }) => { setClub(c); setVenues(v ?? []); })
      .catch((err) => setError(err.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [id]);

  const amenityKeys = club?.amenities
    ? Object.keys(club.amenities).filter((k) => club.amenities[k])
    : [];
  const photos = Array.isArray(club?.photos_urls) ? club.photos_urls : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 rounded-2xl bg-muted animate-pulse" />
        <div className="h-6 w-40 bg-muted animate-pulse rounded-lg" />
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />{error || 'Club introuvable.'}
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Club header ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
          {photos[0] && (
            <img src={photos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <div className="px-6 pb-6 -mt-8 space-y-4">
          <div className="flex items-end justify-between">
            <div className="h-16 w-16 rounded-2xl border-4 border-card overflow-hidden shadow-sm bg-muted">
              {club.logo_url
                ? <img src={club.logo_url} alt="Logo" className="h-full w-full object-cover" />
                : <div className="h-full w-full flex items-center justify-center bg-primary/10"><Building2 className="h-7 w-7 text-primary" /></div>}
            </div>
            <Badge variant={club.status === 'active' ? 'success' : 'secondary'}>
              {club.status === 'active' ? 'Actif' : 'Inactif'}
            </Badge>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">{club.name}</h1>
            {club.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{club.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {club.address && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />{club.address}
              </div>
            )}
            {club.phone && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />{club.phone}
              </div>
            )}
          </div>

          {amenityKeys.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {amenityKeys.map((k) => {
                const opt = CLUB_AMENITIES.find((a) => a.key === k);
                return (
                  <span key={k} className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {opt?.label ?? k}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Photos gallery ───────────────────────────────────────────────── */}
      {photos.length > 1 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Photos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <div
                key={url}
                className={cn(
                  'rounded-xl overflow-hidden border border-border aspect-square',
                  i === 0 && 'sm:col-span-2 sm:row-span-2'
                )}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Booking success banner ───────────────────────────────────────── */}
      {booked && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Réservation confirmée !</p>
            <p className="text-xs text-green-700 mt-0.5">
              Votre créneau a été réservé. Un email de confirmation vous a été envoyé.
            </p>
          </div>
          <button onClick={() => setBooked(false)} className="text-green-600 hover:text-green-800 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Venues + slots ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Terrains{venues.length > 0 && ` (${venues.length})`}
        </h2>
        {venues.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun terrain enregistré pour ce club.</p>
        ) : (
          venues.map((v) => (
            <VenueSection
              key={v.id}
              venue={v}
              onBook={(slot, venueName) => setBooking({ slot, venueName })}
            />
          ))
        )}
      </div>

      {/* ── Booking modal ─────────────────────────────────────────────────── */}
      {booking && (
        <BookingModal
          slot={booking.slot}
          venueName={booking.venueName}
          onClose={() => setBooking(null)}
          onBooked={() => {
            setBooking(null);
            setBooked(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
