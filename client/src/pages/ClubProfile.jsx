import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Building2, MapPin, Phone, ChevronDown, ChevronUp,
  Clock, AlertCircle, X, CreditCard, Banknote,
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

// ── Booking modal ─────────────────────────────────────────────────────────────
function BookingModal({ slot, venueName, onClose, onBooked }) {
  const [sessions,       setSessions]       = useState([]);
  const [sessionId,      setSessionId]      = useState('');
  const [paymentMethod,  setPaymentMethod]  = useState('on_arrival');
  const [loading,        setLoading]        = useState(false);
  const [sessionsLoading,setSessionsLoading]= useState(true);
  const [error,          setError]          = useState(null);

  useEffect(() => {
    getMySessions()
      .then(({ sessions: s }) => {
        const open = (s ?? []).filter((x) => x.status === 'open');
        setSessions(open);
        if (open.length === 1) setSessionId(open[0].id);
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Réserver ce créneau</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {venueName} · {slot.date} · {slot.start_time?.slice(0,5)}–{slot.end_time?.slice(0,5)}
            </p>
          </div>
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

          {/* Price */}
          {slot.price > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                {Number(slot.price).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          )}

          {/* Session selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Ma session</label>
            {sessionsLoading ? (
              <div className="h-10 rounded-lg bg-muted animate-pulse" />
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Aucune session ouverte. Créez une session depuis l'onglet Sessions.
              </p>
            ) : (
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Sélectionnez une session…</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
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
                { value: 'on_arrival', label: 'Sur place',       icon: Banknote  },
                { value: 'card',       label: 'Carte bancaire',  icon: CreditCard},
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all',
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
              disabled={loading || sessions.length === 0}
              className="flex-1"
            >
              {loading ? 'Réservation…' : 'Confirmer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Venue section with lazy-loaded slots ──────────────────────────────────────
function VenueSection({ venue, onBook }) {
  const [open,    setOpen]    = useState(false);
  const [slots,   setSlots]   = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (!open && slots === null) {
      setLoading(true);
      try {
        const { slots: s } = await getVenueSlots(venue.id);
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = (s ?? [])
          .filter((sl) => sl.status !== 'cancelled' && sl.date >= today)
          .slice(0, 42); // cap at 3 days × 14 slots
        setSlots(upcoming);
      } catch {
        setSlots([]);
      } finally {
        setLoading(false);
      }
    }
    setOpen((o) => !o);
  }

  // Group by date
  const byDate = {};
  (slots ?? []).forEach((s) => {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  });
  const dates = Object.keys(byDate).sort().slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/40 transition-colors"
      >
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{venue.name}</p>
          {venue.description && (
            <p className="text-xs text-muted-foreground truncate">{venue.description}</p>
          )}
        </div>
        {loading
          ? <div className="h-4 w-4 border-2 border-primary/40 border-t-transparent rounded-full animate-spin shrink-0" />
          : open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                 : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && !loading && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {!slots || slots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">Aucun créneau disponible.</p>
          ) : (
            dates.map((date) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {byDate[date].map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => slot.status === 'available' && onBook(slot, venue.name)}
                      disabled={slot.status !== 'available'}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                        slot.status === 'available'
                          ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                          : 'border-border bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {slot.start_time?.slice(0,5)}–{slot.end_time?.slice(0,5)}
                      {slot.price > 0 && (
                        <span className="ml-1 opacity-75">{Number(slot.price).toLocaleString('fr-FR')} F</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── ClubProfile page ──────────────────────────────────────────────────────────
export default function ClubProfile() {
  const { id }        = useParams();
  const { user }      = useAuth();

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

      {/* ── Club header ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Banner / photos hero */}
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

      {/* ── Photos gallery ──────────────────────────────────────────────── */}
      {photos.length > 1 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Photos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <div key={url} className={cn('rounded-xl overflow-hidden border border-border', i === 0 && 'sm:col-span-2 sm:row-span-2')}>
                <img src={url} alt="" className="h-full w-full object-cover aspect-square" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Booking success banner ───────────────────────────────────────── */}
      {booked && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <span className="text-green-600 font-bold text-sm">✓</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Réservation confirmée !</p>
            <p className="text-xs text-green-700 mt-0.5">Votre créneau a été réservé avec succès.</p>
          </div>
          <button onClick={() => setBooked(false)} className="ml-auto text-green-600 hover:text-green-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Venues + slots ──────────────────────────────────────────────── */}
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

      {/* ── Booking modal ────────────────────────────────────────────────── */}
      {booking && (
        <BookingModal
          slot={booking.slot}
          venueName={booking.venueName}
          onClose={() => setBooking(null)}
          onBooked={() => {
            setBooking(null);
            setBooked(true);
          }}
        />
      )}
    </div>
  );
}
