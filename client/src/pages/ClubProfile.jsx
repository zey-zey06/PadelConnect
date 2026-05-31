import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2, MapPin, Phone, Clock,
  AlertCircle, X, CreditCard, Banknote,
  CheckCircle2, ChevronLeft, ChevronRight, Calendar, ArrowLeft, Eye, Share2,
  Bell, BellOff, ImageIcon, Plus, Send, Trash2,
} from 'lucide-react';
import ShareContactPicker from '@/components/ShareContactPicker';
import { getPublicClub, getClubSlots, getClubSubscriptionStatus, toggleClubSubscription, getClubPosts, createClubPost } from '@/api/clubs';
import { getMySessions }               from '@/api/sessions';
import { createBooking }               from '@/api/bookings';
import { useAuth }                     from '@/App';
import { Button }  from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import { cn }      from '@/lib/utils';
import { CLUB_AMENITIES } from './manager/ClubSetup';
import { SingleClubMap } from '@/components/ClubMap';

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

function formatCardNumber(val) {
  const digits = val.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function generateICS({ date, startTime, endTime, venueName, clubName }) {
  const st = startTime.replace(':', '').slice(0, 4);
  const et = endTime.replace(':', '').slice(0, 4);
  const dateStr = date.replace(/-/g, '');
  const uid = `booking-${Date.now()}@padelconnect`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PadelConnect//FR',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${dateStr}T${st}00`,
    `DTEND:${dateStr}T${et}00`,
    `SUMMARY:Padel — ${venueName}`,
    `DESCRIPTION:Réservation: ${venueName} chez ${clubName}`,
    `LOCATION:${clubName}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadICS(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Slot button ───────────────────────────────────────────────────────────────
function SlotBtn({ slot, venueName, clubName, onBook, onShare, isMyBooking }) {
  const avail     = slot.status === 'available';
  const cancelled = slot.status === 'cancelled';

  if (isMyBooking) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2">
        <span className="text-xs font-medium text-green-800 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Terrain réservé ✓
        </span>
        <button
          type="button"
          onClick={() => {
            const ics = generateICS({
              date: slot.date,
              startTime: slot.start_time?.slice(0, 5),
              endTime: slot.end_time?.slice(0, 5),
              venueName,
              clubName,
            });
            downloadICS(ics, `padel-${slot.date}.ics`);
          }}
          className="flex items-center gap-0.5 text-xs text-green-700 underline hover:text-green-900 transition-colors"
        >
          <Calendar className="h-3 w-3" />
          Calendrier
        </button>
        <button
          type="button"
          onClick={() => onShare?.(slot, venueName)}
          title="Partager ce créneau"
          className="flex items-center gap-0.5 text-xs text-green-700 hover:text-green-900 transition-colors"
        >
          <Share2 className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => avail && onBook(slot, venueName)}
        disabled={!avail}
        title={avail ? `${slot.start_time?.slice(0, 5)}–${slot.end_time?.slice(0, 5)}` : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all select-none',
          avail     && 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100 hover:shadow-sm cursor-pointer',
          !avail && !cancelled && 'border-zinc-200 bg-zinc-100 text-zinc-500 cursor-not-allowed',
          cancelled && 'border-border bg-muted/40 text-muted-foreground line-through cursor-not-allowed opacity-60',
        )}
      >
        {cancelled ? (
          'Annulé'
        ) : !avail ? (
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
      {avail && (
        <button
          type="button"
          onClick={() => onShare?.(slot, venueName)}
          title="Partager ce créneau"
          className="inline-flex items-center justify-center rounded-lg border border-green-200 bg-green-50 p-2 text-green-700 hover:bg-green-100 transition-colors"
        >
          <Share2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Booking modal ─────────────────────────────────────────────────────────────
function BookingModal({ slot, venueName, onClose, onBooked }) {
  const { user } = useAuth();
  const userBalance = Number(user?.balance ?? 0);

  const [sessions,        setSessions]        = useState([]);
  const [sessionId,       setSessionId]       = useState('');
  const [paymentMethod,   setPaymentMethod]   = useState('on_arrival');
  const [loading,         setLoading]         = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [error,           setError]           = useState(null);

  // Card fields
  const [cardNumber,   setCardNumber]   = useState('');
  const [cardExpiry,   setCardExpiry]   = useState('');
  const [cardCvv,      setCardCvv]      = useState('');
  const [cardHolder,   setCardHolder]   = useState('');
  const [cardAccepted, setCardAccepted] = useState(false);

  // Mobile money field (Wave / Orange Money)
  const [phone, setPhone] = useState('');

  const duration = durationLabel(slot.start_time, slot.end_time);
  const showCard  = paymentMethod === 'card';
  const showPhone = paymentMethod === 'wave' || paymentMethod === 'orange_money';

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

  // Reset extra fields when switching payment method
  useEffect(() => { setCardAccepted(false); setPhone(''); setError(null); }, [paymentMethod]);

  function formatPhone(v) {
    const digits = v.replace(/\D/g, '').slice(0, 10);
    const groups = [];
    for (let i = 0; i < digits.length; i += 2) groups.push(digits.slice(i, i + 2));
    return groups.join(' ');
  }

  function validateCard() {
    const num = cardNumber.replace(/\s/g, '');
    if (!/^\d{16}$/.test(num)) return 'Numéro de carte invalide (16 chiffres).';
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return 'Date d\'expiration invalide (MM/AA).';
    const [m, y] = cardExpiry.split('/').map(Number);
    if (m < 1 || m > 12) return 'Mois invalide.';
    const expiryDate = new Date(2000 + y, m);
    if (expiryDate < new Date()) return 'Carte expirée.';
    if (!/^\d{3,4}$/.test(cardCvv)) return 'CVV invalide (3 ou 4 chiffres).';
    if (!cardHolder.trim()) return 'Nom du titulaire requis.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sessionId) { setError('Sélectionnez une session.'); return; }

    if (showCard && !cardAccepted) {
      const cardErr = validateCard();
      if (cardErr) { setError(cardErr); return; }
      setCardAccepted(true);
    }

    if (showPhone) {
      const phoneDigits = phone.replace(/\s/g, '');
      if (phoneDigits.length !== 10) {
        setError('Numéro invalide — 10 chiffres requis (ex: 07 12 34 56 78).');
        return;
      }
    }

    setLoading(true); setError(null);
    try {
      const phoneDigits = phone.replace(/\s/g, '');
      const payment_phone = showPhone && phoneDigits ? `+225${phoneDigits}` : undefined;
      const { booking } = await createBooking({
        session_id:     sessionId,
        venue_slot_id:  slot.id,
        payment_method: paymentMethod,
        ...(payment_phone && { payment_phone }),
      });
      onBooked(booking);
    } catch (err) {
      setError(err.message || 'Erreur lors de la réservation.');
      setCardAccepted(false);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl max-h-[90vh] overflow-y-auto">
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

          {/* Payment method — 2×2 grid */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mode de paiement</label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { value: 'on_arrival',   label: 'Sur place',      Icon: Banknote,   color: null },
                { value: 'card',         label: 'Carte bancaire', Icon: CreditCard, color: null },
                { value: 'wave',         label: 'Wave',           Icon: null,       color: '#1DC8FF' },
                { value: 'orange_money', label: 'Orange Money',   Icon: null,       color: '#FF6600' },
                { value: 'balance',      label: `Solde (${userBalance.toLocaleString('fr-FR')} FCFA)`, Icon: null, color: null },
              ].map(({ value, label, Icon, color }) => {
                const active = paymentMethod === value;
                const isBalance = value === 'balance';
                const insufficient = isBalance && userBalance < (slot.price ?? 0);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => !insufficient && setPaymentMethod(value)}
                    disabled={insufficient}
                    style={active && color ? { borderColor: color, backgroundColor: `${color}15` } : undefined}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all',
                      active && !color ? 'border-primary bg-primary/5 text-primary'
                        : !active && !insufficient ? 'border-border text-foreground/70 hover:border-primary/40'
                        : insufficient ? 'border-border text-muted-foreground/40 cursor-not-allowed opacity-50'
                        : ''
                    )}
                  >
                    {Icon
                      ? <Icon className={cn('h-5 w-5', active ? 'text-primary' : '')} />
                      : <span className="text-lg leading-none">
                          {value === 'wave' ? '🌊' : value === 'orange_money' ? '🟠' : '💰'}
                        </span>
                    }
                    <span style={active && color ? { color } : undefined} className="text-xs text-center leading-tight">
                      {isBalance ? (
                        <>
                          Solde PadelConnect
                          <br />
                          <span className={cn('text-[10px]', insufficient ? 'text-red-500' : 'text-muted-foreground')}>
                            {userBalance.toLocaleString('fr-FR')} FCFA
                            {insufficient && ' — insuffisant'}
                          </span>
                        </>
                      ) : label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wave / Orange Money phone input */}
          {showPhone && (
            <div
              className="rounded-xl border p-4 space-y-2"
              style={{
                borderColor: paymentMethod === 'wave' ? '#1DC8FF' : '#FF6600',
                backgroundColor: paymentMethod === 'wave' ? '#1DC8FF10' : '#FF660010',
              }}
            >
              <label
                className="text-xs font-semibold"
                style={{ color: paymentMethod === 'wave' ? '#0ea5e9' : '#ea580c' }}
              >
                {paymentMethod === 'wave' ? 'Numéro Wave' : 'Numéro Orange Money'}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground shrink-0 select-none">🇨🇮 +225</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="07 12 34 56 78"
                  value={phone}
                  onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(null); }}
                  maxLength={14}
                  className={inputClass + ' font-mono tracking-wider'}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">10 chiffres · ex : 07 12 34 56 78</p>
            </div>
          )}

          {/* Card form — shown when Carte is selected */}
          {showCard && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              {cardAccepted && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Paiement accepté
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Numéro de carte</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => { setCardNumber(formatCardNumber(e.target.value)); setCardAccepted(false); }}
                  maxLength={19}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Date d'expiration</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => { setCardExpiry(formatExpiry(e.target.value)); setCardAccepted(false); }}
                    maxLength={5}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">CVV</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => { setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4)); setCardAccepted(false); }}
                    maxLength={4}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nom du titulaire</label>
                <input
                  type="text"
                  placeholder="PRENOM NOM"
                  value={cardHolder}
                  onChange={(e) => { setCardHolder(e.target.value.toUpperCase()); setCardAccepted(false); }}
                  className={inputClass}
                />
              </div>
            </div>
          )}

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
  const { id }           = useParams();
  const navigate         = useNavigate();
  const { user }         = useAuth();
  const isAdmin          = user?.role === 'super_admin';
  // Manager = venue_admin whose organization_id matches this club id
  const isManager        = user?.role === 'venue_admin' && user?.organization_id === id;
  const [searchParams]   = useSearchParams();

  // Deep-link: ?date=YYYY-MM-DD&slotId=<uuid>
  const urlDate   = searchParams.get('date')   || null;
  const urlSlotId = searchParams.get('slotId') || null;

  const [club,         setClub]         = useState(null);
  const [clubLoading,  setClubLoading]  = useState(true);
  const [clubError,    setClubError]    = useState(null);

  const [selectedDate, setSelectedDate] = useState(() => urlDate || todayISO());
  const [slotsData,    setSlotsData]    = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // When a slotId is passed via URL, store it and open the modal once slotsData is ready
  const [pendingSlotId, setPendingSlotId] = useState(urlSlotId);

  const [booking,   setBooking]   = useState(null);  // { slot, venueName } — opens booking modal
  const [myBooking, setMyBooking] = useState(null);  // booking just made in this session
  const [booked,    setBooked]    = useState(false);
  const [shareSlot, setShareSlot] = useState(null);  // { slot, venueName } — opens share picker

  // Subscription state
  const [subscribed,  setSubscribed]  = useState(false);
  const [subLoading,  setSubLoading]  = useState(false);

  // Posts state
  const [posts,         setPosts]         = useState([]);
  const [postsLoading,  setPostsLoading]  = useState(true);

  // Create post state (manager only)
  const [showPostForm,  setShowPostForm]  = useState(false);
  const [postContent,   setPostContent]   = useState('');
  const [postPhotos,    setPostPhotos]    = useState([]); // base64 data URLs
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError,     setPostError]     = useState(null);

  // Load club info once
  useEffect(() => {
    getPublicClub(id)
      .then(({ club: c }) => setClub(c))
      .catch((err) => setClubError(err.message || 'Erreur de chargement.'))
      .finally(() => setClubLoading(false));
  }, [id]);

  // Load subscription status (players only)
  useEffect(() => {
    if (!user || isAdmin) return;
    getClubSubscriptionStatus(id)
      .then(({ subscribed: s }) => setSubscribed(s))
      .catch(() => {});
  }, [id, user, isAdmin]);

  // Load club posts
  useEffect(() => {
    getClubPosts(id)
      .then(({ posts: p }) => setPosts(p ?? []))
      .catch(() => setPosts([]))
      .finally(() => setPostsLoading(false));
  }, [id]);

  // Reload slots whenever date changes
  useEffect(() => {
    setSlotsLoading(true);
    setSlotsData(null);
    getClubSlots(id, selectedDate)
      .then((data) => {
        setSlotsData(data);
        // Deep-link: auto-open the booking modal for the linked slot
        if (pendingSlotId && data?.venues) {
          for (const venue of (data.venues ?? [])) {
            const targetSlot = venue.slots?.find((s) => s.id === pendingSlotId && s.status === 'available');
            if (targetSlot) {
              setBooking({ slot: targetSlot, venueName: venue.name });
              setPendingSlotId(null);
              break;
            }
          }
          // If slot not found (booked/cancelled), clear pending anyway
          if (pendingSlotId) setPendingSlotId(null);
        }
      })
      .catch(() => setSlotsData({ date: selectedDate, venues: [] }))
      .finally(() => setSlotsLoading(false));
  }, [id, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePostPhotoChange(e) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - postPhotos.length);
    if (!files.length) return;
    const dataUrls = await Promise.all(files.map(readFileAsDataURL));
    setPostPhotos((prev) => [...prev, ...dataUrls].slice(0, 4));
    e.target.value = '';
  }

  async function handleCreatePost() {
    if (!postContent.trim() && postPhotos.length === 0) return;
    setPostSubmitting(true);
    setPostError(null);
    try {
      const { post } = await createClubPost(id, {
        content: postContent.trim(),
        photos:  postPhotos,
      });
      setPosts((prev) => [post, ...prev]);
      setPostContent('');
      setPostPhotos([]);
      setShowPostForm(false);
    } catch (err) {
      setPostError(err.message || 'Erreur lors de la publication.');
    } finally {
      setPostSubmitting(false);
    }
  }

  async function handleToggleSubscription() {
    if (subLoading) return;
    setSubLoading(true);
    try {
      const { subscribed: s } = await toggleClubSubscription(id);
      setSubscribed(s);
    } catch { /* non-fatal */ }
    finally { setSubLoading(false); }
  }

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

      {/* ── Back ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

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
            <div className="flex items-center gap-2">
              {!isAdmin && user && (
                <button
                  onClick={handleToggleSubscription}
                  disabled={subLoading}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-60',
                    subscribed
                      ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                      : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  )}
                  title={subscribed ? 'Se désabonner' : 'S\'abonner aux actualités'}
                >
                  {subscribed
                    ? <Bell className="h-3.5 w-3.5 fill-primary" />
                    : <BellOff className="h-3.5 w-3.5" />
                  }
                  {subscribed ? 'Abonné' : 'S\'abonner'}
                </button>
              )}
              <Badge variant={club.status === 'active' ? 'success' : 'secondary'}>
                {club.status === 'active' ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
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
              <a
                href={`tel:${club.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline transition-colors"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {club.phone}
                <span className="text-xs font-medium bg-primary/10 px-2 py-0.5 rounded-full">Appeler</span>
              </a>
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
          {/* Opening hours — today's status */}
          {club.opening_hours && (() => {
            const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
            const TODAY_KEY = DAY_KEYS[new Date().getDay()];
            const hours = club.opening_hours[TODAY_KEY];
            if (!hours) return null;
            const isOpen = !hours.closed;
            return (
              <div className="flex items-center gap-2 text-sm">
                <span className={cn('w-2 h-2 rounded-full shrink-0', isOpen ? 'bg-green-500' : 'bg-red-400')} />
                <span className={cn('font-medium', isOpen ? 'text-green-700' : 'text-red-600')}>
                  {isOpen ? `Ouvert · jusqu'à ${hours.close ?? ''}` : 'Fermé aujourd\'hui'}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Location map ─────────────────────────────────────────────────── */}
      {club.latitude != null && club.longitude != null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Localisation
            </h2>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${club.latitude},${club.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              Ouvrir dans Google Maps
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <SingleClubMap lat={Number(club.latitude)} lng={Number(club.longitude)} clubName={club.name} />
        </div>
      )}

      {/* ── Suspension banner ───────────────────────────────────────────── */}
      {club.subscription_status === 'suspended' && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Ce club n'est plus disponible</p>
            <p className="text-xs text-orange-700 mt-0.5">
              Les réservations sont temporairement suspendues. Contactez directement l'équipe du club pour plus d'informations.
            </p>
          </div>
        </div>
      )}

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

      {/* ── Club posts ───────────────────────────────────────────────────── */}
      {!postsLoading && (isManager || posts.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Actualités</h2>
            {isManager && (
              <button
                type="button"
                onClick={() => { setShowPostForm((v) => !v); setPostError(null); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {showPostForm ? 'Annuler' : 'Nouvelle publication'}
              </button>
            )}
          </div>

          {/* ── Create post form (manager only) ──────────────────────── */}
          {isManager && showPostForm && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              {postError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{postError}
                </div>
              )}

              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Partagez une actualité, une offre, un événement…"
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              {/* Photo previews */}
              {postPhotos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {postPhotos.map((url, i) => (
                    <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border shrink-0">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPostPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                      >
                        <X className="h-2.5 w-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                {postPhotos.length < 4 && (
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer px-3 py-2 rounded-lg hover:bg-muted transition-colors">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Photo
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePostPhotoChange}
                    />
                  </label>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleCreatePost}
                  disabled={postSubmitting || (!postContent.trim() && postPhotos.length === 0)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
                >
                  {postSubmitting ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Publier
                </button>
              </div>
            </div>
          )}

          {posts.length === 0 && isManager && !showPostForm && (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center space-y-2">
              <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Aucune publication. Créez votre première actualité !</p>
            </div>
          )}

          <div className="space-y-4">
            {posts.map((post) => {
              const imgs = Array.isArray(post.photos) ? post.photos : [];
              const postDate = new Date(post.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              });
              return (
                <div key={post.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  {imgs.length > 0 && (
                    <div className={cn(
                      'grid gap-0.5',
                      imgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
                    )}>
                      {imgs.slice(0, 4).map((url, i) => (
                        <div
                          key={url}
                          className={cn(
                            'overflow-hidden bg-muted relative',
                            imgs.length === 1 ? 'aspect-video' : 'aspect-square',
                            imgs.length === 3 && i === 0 ? 'col-span-2 aspect-video' : '',
                          )}
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                          {i === 3 && imgs.length > 4 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-lg font-bold">+{imgs.length - 4}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {club.logo_url
                          ? <img src={club.logo_url} alt="" className="h-full w-full rounded-full object-cover" />
                          : <Building2 className="h-3.5 w-3.5 text-primary" />
                        }
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{club.name}</p>
                        <p className="text-[11px] text-muted-foreground">{postDate}</p>
                      </div>
                    </div>
                    {post.content && (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{post.content}</p>
                    )}
                  </div>
                </div>
              );
            })}
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

      {/* ── Date picker + slots (hidden when suspended) ──────────────────── */}
      {club.subscription_status !== 'suspended' && <div className="space-y-5">
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
            {slotsData.venues.map((venue) => {
              const availCount = venue.slots.filter((s) => s.status === 'available').length;
              return (
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
                        {availCount} disponible{availCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Slots — horizontal flex-wrap */}
                  <div className="px-5 py-4">
                    {venue.slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun créneau pour cette date.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {venue.slots.map((slot) => (
                          isAdmin ? (
                            /* Admin: read-only slot pill */
                            <div
                              key={slot.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500"
                            >
                              <Eye className="h-3 w-3 shrink-0" />
                              {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}
                              {' '}·{' '}
                              <span className={slot.status === 'available' ? 'text-emerald-600' : 'text-slate-400'}>
                                {slot.status === 'available' ? 'Libre' : 'Réservé'}
                              </span>
                            </div>
                          ) : (
                            <SlotBtn
                              key={slot.id}
                              slot={slot}
                              venueName={venue.name}
                              clubName={club.name}
                              isMyBooking={myBooking?.venue_slot_id === slot.id}
                              onBook={(s, name) => setBooking({ slot: s, venueName: name })}
                              onShare={(s, name) => setShareSlot({ slot: s, venueName: name })}
                            />
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {/* ── Booking modal — hidden for admin and suspended clubs ─────────── */}
      {booking && !isAdmin && club.subscription_status !== 'suspended' && (
        <BookingModal
          slot={booking.slot}
          venueName={booking.venueName}
          onClose={() => setBooking(null)}
          onBooked={(bookingResult) => {
            setMyBooking(bookingResult);
            setBooking(null);
            setBooked(true);
            setSlotsLoading(true);
            getClubSlots(id, selectedDate)
              .then((data) => setSlotsData(data))
              .catch(() => {})
              .finally(() => setSlotsLoading(false));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* ── Share contact picker ─────────────────────────────────────────── */}
      {shareSlot && (
        <ShareContactPicker
          shareType="slot_share"
          metadata={{
            club_id:    club.id,
            club_name:  club.name,
            venue_name: shareSlot.venueName,
            date:       selectedDate,
            start_time: shareSlot.slot.start_time?.slice(0, 5),
            end_time:   shareSlot.slot.end_time?.slice(0, 5),
            price:      shareSlot.slot.price,
            slot_id:    shareSlot.slot.id,
          }}
          onClose={() => setShareSlot(null)}
        />
      )}
    </div>
  );
}
