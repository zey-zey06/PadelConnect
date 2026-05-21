import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2, MapPin, Phone, Clock,
  AlertCircle, X, CreditCard, Banknote,
  CheckCircle2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getPublicClub, getClubSlots } from '@/api/clubs';
import { getMySessions }               from '@/api/sessions';
import { createBooking }               from '@/api/bookings';
import { Button }  from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import { cn }      from '@/lib/utils';
import { CLUB_AMENITIES } from './manager/ClubSetup';

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtLong(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtShort(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function durationLabel(start = '00:00', end = '00:00') {
  const [sh, sm] = start.slice(0, 5).split(':').map(Number);
  const [eh, em] = end.slice(0, 5).split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return '';
  return mins % 60 === 0 ? `${mins / 60}h` : `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
}

// ── Slot button ───────────────────────────────────────────────────────────────
function SlotBtn({ slot, venueName, onBook }) {
  const avail     = slot.status === 'available';
  const booked    = slot.status === 'booked';
  const cancelled = slot.status === 'cancelled';

  return (
    <button
      onClick={() => avail && onBook(slot, venueName)}
      disabled={!avail}
      title={avail ? `${slot.start_time?.slice(0, 5)}–${slot.end_time?.slice(0, 5)}` : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all select-none',
        avail     && 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100 hover:shadow-sm cursor-pointer',
        booked    && 'border-zinc-200 bg-zinc-100 text-zinc-500 cursor-not-allowed',
        cancelled && 'border-border bg-muted/40 text-muted-foreground line-through cursor-not-allowed opacity-60',
      )}
    >
      {cancelled ? (
        'Annulé'
      ) : booked ? (
        'Réservé'
      ) : (
        <>
          <Clock className="h-3 w-3 shrink-0" />
          {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}
          {slot.price > 0 && (
            <span className="ml-1 font-normal opacity-80">
              | {Number(slot.price).toLocaleString('fr-FR')} FCFA
            </span>
          )}
        </>
      )}
    </button>
  );
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

          {/* Slot details */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{venueName}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{fmtLong(slot.date)}</p>
              </div>
              {slot.price > 0 && (
                <p className="text-lg font-bold text-foreground shrink-0 leading-none">
                  {Number(slot.price).toLocaleString('fr-FR')}
                  <span className="text-xs font-normal text-muted-foreground ml-1">FCFA</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
              </span>
              {duration && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{duration}</span>
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
                <Link to="/sessions" className="font-medium underline">Créez une session</Link>{' '}
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

// ── ClubProfile page ──────────────────────────────────────────────────────────
export default function ClubProfile() {
  const { id } = useParams();

  const [club,         setClub]         = useState(null);
  const [clubLoading,  setClubLoading]  = useState(true);
  const [clubError,    setClubError]    = useState(null);

  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [slotsData,    setSlotsData]    = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [booking, setBooking] = useState(null);
  const [booked,  setBooked]  = useState(false);

  // Load club info once
  useEffect(() => {
    getPublicClub(id)
      .then(({ club: c }) => setClub(c))
      .catch((err) => setClubError(err.message || 'Erreur de chargement.'))
      .finally(() => setClubLoading(false));
  }, [id]);

  // Reload slots whenever date changes
  useEffect(() => {
    setSlotsLoading(true);
    setSlotsData(null);
    getClubSlots(id, selectedDate)
      .then((data) => setSlotsData(data))
      .catch(() => setSlotsData({ date: selectedDate, venues: [] }))
      .finally(() => setSlotsLoading(false));
  }, [id, selectedDate]);

  const amenityKeys = club?.amenities
    ? Object.keys(club.amenities).filter((k) => club.amenities[k])
    : [];
  const photos = Array.isArray(club?.photos_urls) ? club.photos_urls : [];
  const today  = todayISO();

  // ── loading / error states ────────────────────────────────────────────────
  if (clubLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 rounded-2xl bg-muted animate-pulse" />
        <div className="h-12 rounded-xl bg-muted animate-pulse" />
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (clubError || !club) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />{clubError || 'Club introuvable.'}
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Club header ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
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

      {/* ── Photo gallery ────────────────────────────────────────────────── */}
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
            <p className="text-xs text-green-700 mt-0.5">Un email de confirmation vous a été envoyé.</p>
          </div>
          <button onClick={() => setBooked(false)} className="text-green-600 hover:text-green-800 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Date picker + slots ──────────────────────────────────────────── */}
      <div className="space-y-5">
        {/* Date navigation */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <button
            onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
            disabled={selectedDate <= today}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 flex items-center justify-center gap-3">
            <input
              type="date"
              value={selectedDate}
              min={today}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-sm font-medium text-foreground hidden sm:block capitalize">
              {fmtShort(selectedDate)}
              {selectedDate === today && (
                <span className="ml-2 text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                  Aujourd'hui
                </span>
              )}
            </p>
          </div>

          <button
            onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Slots per venue */}
        {slotsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : !slotsData || slotsData.venues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">Aucun terrain enregistré pour ce club.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {slotsData.venues.map((venue) => (
              <div key={venue.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Court header */}
                <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <p className="text-sm font-semibold text-foreground">{venue.name}</p>
                  {venue.description && (
                    <p className="text-xs text-muted-foreground truncate">{venue.description}</p>
                  )}
                  {venue.slots.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {venue.slots.filter((s) => s.status === 'available').length} disponible{venue.slots.filter((s) => s.status === 'available').length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Slot grid */}
                <div className="px-5 py-4">
                  {venue.slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun créneau pour cette date.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {venue.slots.map((slot) => (
                        <SlotBtn
                          key={slot.id}
                          slot={slot}
                          venueName={venue.name}
                          onBook={(s, name) => setBooking({ slot: s, venueName: name })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
            // Refresh slots for current date so booked slot turns grey
            setSlotsLoading(true);
            getClubSlots(id, selectedDate)
              .then((data) => setSlotsData(data))
              .catch(() => {})
              .finally(() => setSlotsLoading(false));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
