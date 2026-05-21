import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listSessions, createSession, requestJoin, getMySessions,
  getSessionRequests, respondToRequest, cancelSession,
} from '@/api/sessions';
import { getMyBookings, cancelBooking, createBooking } from '@/api/bookings';
import { listClubs, getClubSlots } from '@/api/clubs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Users, Plus, AlertCircle, X, Filter,
  CheckCircle2, XCircle, Sparkles, MapPin, Clock, Building2, Calendar,
  ChevronLeft, ChevronRight, Banknote, CreditCard,
} from 'lucide-react';
import { useAuth } from '@/App';
import { cn } from '@/lib/utils';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Inter +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

// Preset time slots every 30 min, 07:00 → 22:00  (31 options)
const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 7; h <= 22; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) opts.push(`${String(h).padStart(2, '0')}:30`);
  }
  return opts;
})();

const PLAYER_CARDS = [
  { n: 2, sub: 'Duo' },
  { n: 3, sub: 'Trio' },
  { n: 4, sub: 'Double' },
];

const GENDER_PREFS = [
  { value: 'mixed',  label: 'Mixte' },
  { value: 'women',  label: 'Femmes seulement' },
  { value: 'men',    label: 'Hommes seulement' },
];

// ── Session card (browse tab) ─────────────────────────────────────────────────
function SessionCard({ session, onJoin }) {
  const { user } = useAuth();
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [msg,   setMsg]   = useState('');
  const [showTerrainPicker, setShowTerrainPicker] = useState(false);

  const isFull  = (session.current_players ?? 0) >= session.max_players;
  const isOwner = user?.id === session.creator_id;
  const d = new Date(session.date + 'T00:00:00');

  const creatorName = session.creator_email?.split('@')[0] ?? 'Joueur';
  const levelMin    = session.preferences?.level_min;

  async function handleJoin() {
    setState('loading');
    setMsg('');
    try {
      await onJoin(session.id);
      setState('done');
    } catch (e) {
      setMsg(e.message || 'Erreur lors de la demande.');
      setState('error');
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      {/* Date row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center w-[48px] h-[48px] rounded-xl bg-accent shrink-0">
            <span className="text-[9px] font-bold text-primary/60 uppercase leading-none">
              {d.toLocaleDateString('fr-FR', { month: 'short' })}
            </span>
            <span className="text-xl font-bold text-primary leading-none">{d.getDate()}</span>
          </div>
          <div>
            <p className="font-semibold text-foreground capitalize text-sm leading-snug">
              {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {session.time?.slice(0, 5) ?? '—'}
            </p>
          </div>
        </div>
        <Badge variant={isFull ? 'secondary' : 'success'} className="shrink-0">
          {isFull ? 'Complet' : 'Ouvert'}
        </Badge>
      </div>

      {/* Players + level + organiser */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {session.current_players ?? 0}/{session.max_players} joueurs
        </span>
        {levelMin && (
          <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            Niveau {levelMin}+
          </span>
        )}
        <span className="capitalize ml-auto truncate max-w-[120px]">{creatorName}</span>
      </div>

      {/* Action */}
      <div className="mt-auto pt-1">
        {isOwner ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowTerrainPicker(true)}
          >
            <Calendar className="h-3.5 w-3.5" />
            Réserver un terrain
          </Button>
        ) : state === 'done' ? (
          <p className="text-xs font-medium text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            Demande envoyée — en attente de confirmation.
          </p>
        ) : state === 'error' ? (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />{msg}
          </p>
        ) : (
          <Button
            className="w-full"
            size="sm"
            onClick={handleJoin}
            disabled={isFull || state === 'loading'}
            variant={isFull ? 'outline' : 'default'}
          >
            {state === 'loading' ? 'Envoi…' : isFull ? 'Session complète' : 'Rejoindre'}
          </Button>
        )}
      </div>

      {showTerrainPicker && (
        <TerrainPickerModal
          session={session}
          onClose={() => setShowTerrainPicker(false)}
          onBooked={() => setShowTerrainPicker(false)}
        />
      )}
    </div>
  );
}

// ── Create session modal (redesigned) ─────────────────────────────────────────
function CreateSessionModal({ onClose, onCreate }) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: '', time: '', max_players: 4, level_min: null, gender: null,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  function set(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.date || !form.time) {
      setError('La date et l\'heure sont obligatoires.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const preferences = {};
      if (form.level_min) preferences.level_min = form.level_min;
      if (form.gender)    preferences.gender    = form.gender;
      const payload = {
        date: form.date,
        time: form.time,
        max_players: form.max_players,
        ...(Object.keys(preferences).length > 0 && { preferences }),
      };
      const result = await onCreate(payload);
      onClose(result.session ?? result);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(null); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Créer une session</h2>
          <button
            onClick={() => onClose(null)}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="cs-date">Date</Label>
            <Input
              id="cs-date"
              type="date"
              min={today}
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* Time — preset dropdown */}
          <div className="space-y-2">
            <Label htmlFor="cs-time">Heure</Label>
            <select
              id="cs-time"
              value={form.time}
              onChange={(e) => set('time', e.target.value)}
              required
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Choisir une heure…</option>
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Max players — big visual cards */}
          <div className="space-y-2">
            <Label>Joueurs (vous inclus)</Label>
            <div className="grid grid-cols-3 gap-3">
              {PLAYER_CARDS.map(({ n, sub }) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('max_players', n)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl border py-5 gap-1 transition-all',
                    form.max_players === n
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border bg-card text-foreground/70 hover:border-primary/40'
                  )}
                >
                  <span className="text-2xl font-bold leading-none">{n}</span>
                  <span className="text-[10px] font-medium">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Level min — visual number selector (filled ≤ selected) */}
          <div className="space-y-2">
            <Label>
              Niveau minimum{' '}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('level_min', form.level_min === n ? null : n)}
                  className={cn(
                    'flex-1 h-9 rounded-lg border text-xs font-bold transition-all',
                    form.level_min != null && n <= form.level_min
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground/50 border-border hover:border-primary/40'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            {form.level_min && (
              <p className="text-xs text-muted-foreground">
                {LEVEL_LABELS[form.level_min]} minimum requis
              </p>
            )}
          </div>

          {/* Preferences — gender chips */}
          <div className="space-y-2">
            <Label>
              Préférence{' '}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <div className="flex gap-2 flex-wrap">
              {GENDER_PREFS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('gender', form.gender === value ? null : value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-sm font-medium transition-all',
                    form.gender === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border bg-card text-foreground/70 hover:border-primary/40'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 border-0 text-white"
          >
            {loading ? 'Création…' : 'Créer la session'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Terrain picker modal ───────────────────────────────────────────────────────
// 3-step: choose club → choose slot covering session time → confirm + pay
function TerrainPickerModal({ session, onClose, onBooked }) {
  const [step,         setStep]         = useState(1);
  const [clubs,        setClubs]        = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [selectedClub, setSelectedClub] = useState(null);
  const [venueData,    setVenueData]    = useState([]);   // [{ id, name, matchingSlots }]
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // slot + venue_name
  const [payment,      setPayment]      = useState('place'); // 'place' | 'card'
  const [card,         setCard]         = useState({ number: '', expiry: '', cvv: '', holder: '' });
  const [cardAccepted, setCardAccepted] = useState(false);
  const [confirmedBk,  setConfirmedBk]  = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  const sessionTime = session.time?.slice(0, 5) ?? '';
  const sessionDate = new Date(session.date + 'T00:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Load clubs on mount
  useEffect(() => {
    listClubs()
      .then(({ clubs: c }) => setClubs((c ?? []).filter((cl) => cl.status === 'active' || cl.status == null)))
      .catch(() => setClubs([]))
      .finally(() => setLoadingClubs(false));
  }, []);

  async function handleSelectClub(club) {
    setSelectedClub(club);
    setLoadingSlots(true);
    setError(null);
    try {
      const { venues } = await getClubSlots(club.id, session.date);
      const filtered = (venues ?? [])
        .map((v) => ({
          ...v,
          matchingSlots: (v.slots ?? []).filter((sl) => {
            const st = (sl.start_time ?? '').slice(0, 5);
            const et = (sl.end_time   ?? '').slice(0, 5);
            return sl.status === 'available' && st <= sessionTime && sessionTime < et;
          }),
        }))
        .filter((v) => v.matchingSlots.length > 0);
      setVenueData(filtered);
      setStep(2);
    } catch (e) {
      setError(e.message || 'Erreur lors du chargement des créneaux.');
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleSelectSlot(slot, venueName) {
    setSelectedSlot({ ...slot, venue_name: venueName });
    setStep(3);
    setError(null);
  }

  function formatCardNumber(v) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }
  function formatExpiry(v) {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }
  function updateCard(field, raw) {
    let val = raw;
    if (field === 'number') val = formatCardNumber(raw);
    if (field === 'expiry') val = formatExpiry(raw);
    if (field === 'cvv')    val = raw.replace(/\D/g, '').slice(0, 4);
    setCard((prev) => ({ ...prev, [field]: val }));
    setCardAccepted(false);
    if (error) setError(null);
  }

  async function handleConfirm() {
    setError(null);

    if (payment === 'card') {
      const digits = card.number.replace(/\s/g, '');
      if (digits.length < 16 || !card.expiry.includes('/') || card.cvv.length < 3 || !card.holder.trim()) {
        setError('Veuillez remplir tous les champs de la carte.');
        return;
      }
      setCardAccepted(true);
    }

    setLoading(true);
    try {
      const { booking } = await createBooking({
        session_id:     session.id,
        venue_slot_id:  selectedSlot.id,
        payment_method: payment,
      });
      setConfirmedBk(booking);
      onBooked();
    } catch (e) {
      setError(e.message || 'Erreur lors de la réservation.');
      setCardAccepted(false);
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setError(null);
    setStep((s) => s - 1);
  }

  const STEP_LABELS = ['Club', 'Terrain', 'Paiement'];

  // ── Success screen ───────────────────────────────────────────────────────────
  if (confirmedBk) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-8 text-center space-y-5">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Terrain réservé !</p>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedSlot?.venue_name} · {selectedSlot?.start_time?.slice(0, 5)}–{selectedSlot?.end_time?.slice(0, 5)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{sessionDate}</p>
          </div>
          <Button className="w-full" onClick={() => onClose(confirmedBk)}>Fermer</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(null); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
          {step > 1 && (
            <button
              onClick={goBack}
              className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              {step === 1 ? 'Choisir un club'
                : step === 2 ? selectedClub?.name
                : 'Confirmer la réservation'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {sessionDate} à {sessionTime}
            </p>
          </div>
          <button
            onClick={() => onClose(null)}
            className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-border shrink-0">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={cn(
                'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                step > i + 1  ? 'bg-green-600 text-white'
                  : step === i + 1 ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={cn(
                'text-xs',
                step === i + 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}>
                {label}
              </span>
              {i < 2 && <div className="w-5 h-px bg-border mx-0.5 shrink-0" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {/* ── Step 1: Club list ─────────────────────────────────────── */}
          {step === 1 && (
            loadingClubs ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : clubs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Aucun club disponible.</p>
            ) : (
              clubs.map((club) => (
                <button
                  key={club.id}
                  onClick={() => handleSelectClub(club)}
                  disabled={loadingSlots}
                  className="w-full flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-primary/30 hover:bg-accent/40 transition-all text-left disabled:opacity-60"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{club.name}</p>
                    {club.address && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{club.address}</p>
                    )}
                  </div>
                  {loadingSlots && selectedClub?.id === club.id ? (
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))
            )
          )}

          {/* ── Step 2: Available slots ───────────────────────────────── */}
          {step === 2 && (
            loadingSlots ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : venueData.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-medium text-foreground text-sm">Aucun terrain disponible</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pas de créneau à {sessionTime} le{' '}
                    <span className="capitalize">{sessionDate}</span>.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  Choisir un autre club
                </Button>
              </div>
            ) : (
              venueData.map((venue) => (
                <div key={venue.id} className="space-y-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                    {venue.name}
                  </p>
                  {venue.matchingSlots.map((sl) => (
                    <button
                      key={sl.id}
                      onClick={() => handleSelectSlot(sl, venue.name)}
                      className="w-full flex items-center gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3.5 hover:border-primary hover:bg-primary/10 transition-all text-left"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Clock className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {sl.start_time?.slice(0, 5)} – {sl.end_time?.slice(0, 5)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {Number(sl.price).toLocaleString('fr-FR')} FCFA · disponible
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              ))
            )
          )}

          {/* ── Step 3: Payment ───────────────────────────────────────── */}
          {step === 3 && selectedSlot && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-foreground">{selectedSlot.venue_name}</span>
                  <span className="text-muted-foreground">· {selectedClub?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="capitalize">{sessionDate}</span>
                  <span>·</span>
                  <span>{selectedSlot.start_time?.slice(0, 5)} – {selectedSlot.end_time?.slice(0, 5)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">
                    {Number(selectedSlot.price).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <Label>Moyen de paiement</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'place', label: 'Sur place',      Icon: Banknote },
                    { value: 'card',  label: 'Carte bancaire', Icon: CreditCard },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setPayment(value); setCardAccepted(false); setError(null); }}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                        payment === value
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:border-primary/30'
                      )}
                    >
                      <Icon className={cn('h-5 w-5', payment === value ? 'text-primary' : 'text-muted-foreground')} />
                      <span className={cn('text-xs font-medium', payment === value ? 'text-primary' : 'text-foreground')}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card form */}
              {payment === 'card' && (
                cardAccepted ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Paiement accepté</p>
                      <p className="text-xs text-green-700">
                        Carte se terminant par {card.number.replace(/\s/g, '').slice(-4)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Numéro de carte</Label>
                      <Input
                        placeholder="0000 0000 0000 0000"
                        value={card.number}
                        onChange={(e) => updateCard('number', e.target.value)}
                        maxLength={19}
                        className="font-mono tracking-wider"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Expiration</Label>
                        <Input
                          placeholder="MM/AA"
                          value={card.expiry}
                          onChange={(e) => updateCard('expiry', e.target.value)}
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">CVV</Label>
                        <Input
                          placeholder="123"
                          value={card.cvv}
                          onChange={(e) => updateCard('cvv', e.target.value)}
                          maxLength={4}
                          type="password"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Titulaire</Label>
                      <Input
                        placeholder="NOM PRÉNOM"
                        value={card.holder}
                        onChange={(e) => updateCard('holder', e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                )
              )}

              {/* Confirm button */}
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 border-0 text-white"
              >
                {loading
                  ? 'Réservation en cours…'
                  : `Réserver — ${Number(selectedSlot.price).toLocaleString('fr-FR')} FCFA`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Request row (inside a session managed by current user) ────────────────────
function RequestRow({ request, sessionId, onRespond }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [errMsg, setErrMsg] = useState('');
  const name = request.player_email?.split('@')[0] ?? 'Joueur';
  const strengths = Array.isArray(request.player_strengths) ? request.player_strengths : [];

  async function handle(status) {
    setState('loading');
    setErrMsg('');
    try {
      await onRespond(sessionId, request.id, status);
      setState('done');
    } catch (e) {
      setErrMsg(e.message || 'Erreur');
      setState('error');
    }
  }

  const statusColors = {
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    accepted: 'bg-green-50 text-green-700 border-green-200',
    refused:  'bg-red-50 text-red-600 border-red-200',
  };
  const statusLabel = { pending: 'En attente', accepted: 'Accepté', refused: 'Refusé' };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
      {/* Avatar */}
      <a
        href={`/players/${request.player_id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
      >
        <div className="h-10 w-10 rounded-full overflow-hidden bg-muted ring-2 ring-border">
          {request.player_photo_url ? (
            <img src={request.player_photo_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-green-100">
              <span className="text-[11px] font-bold text-green-700 select-none">
                {name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </a>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={`/players/${request.player_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-foreground hover:underline truncate capitalize"
          >
            {name}
          </a>
          {request.player_level && (
            <span className="shrink-0 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md">
              {request.player_level}/7
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {request.player_style && (
            <span className="text-xs text-muted-foreground">{request.player_style}</span>
          )}
          {strengths.slice(0, 3).map((s) => (
            <span key={s} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{s}</span>
          ))}
          {request.ai_score != null && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary/70">
              <Sparkles className="h-2.5 w-2.5" />{request.ai_score}%
            </span>
          )}
        </div>
      </div>

      {/* Status / actions */}
      {request.status !== 'pending' ? (
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border shrink-0', statusColors[request.status])}>
          {statusLabel[request.status]}
        </span>
      ) : state === 'done' ? (
        <span className="text-xs text-muted-foreground shrink-0">Répondu</span>
      ) : state === 'error' ? (
        <span className="text-xs text-red-600 shrink-0 max-w-[120px] text-right">{errMsg}</span>
      ) : (
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            disabled={state === 'loading'}
            onClick={() => handle('refused')}
            className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Refuser
          </Button>
          <Button
            size="sm"
            disabled={state === 'loading'}
            onClick={() => handle('accepted')}
            className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white border-0"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Accepter
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Booking detail modal ──────────────────────────────────────────────────────
function BookingDetailModal({ booking, onClose }) {
  const paymentLabel = booking.payment_method === 'card' ? 'Carte bancaire' : 'Sur place';
  const d = new Date(booking.session_date + 'T00:00:00');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Détail de la réservation</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">{booking.club_name}</p>
                <p className="text-xs text-muted-foreground">{booking.venue_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="capitalize">
                {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              <span>·</span>
              <span>{booking.start_time?.slice(0, 5)}–{booking.end_time?.slice(0, 5)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prix</span>
              <span className="font-semibold">{Number(booking.price).toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Paiement</span>
              <span>{paymentLabel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Référence</span>
              <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{booking.id?.slice(0, 8).toUpperCase()}</code>
            </div>
          </div>

          <Button variant="outline" onClick={onClose} className="w-full">Fermer</Button>
        </div>
      </div>
    </div>
  );
}

// ── My session card (with expandable requests) ────────────────────────────────
function MySessionCard({ session, booking, autoOpen = false, onRefresh }) {
  const [requests,    setRequests]    = useState(null);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [open,        setOpen]        = useState(autoOpen);

  const [showBookingModal,   setShowBookingModal]   = useState(false);
  const [showTerrainPicker,  setShowTerrainPicker]  = useState(false);
  const [cancelBkConfirm,    setCancelBkConfirm]    = useState(false);
  const [cancellingBk,       setCancellingBk]       = useState(false);
  const [cancelSessConfirm,  setCancelSessConfirm]  = useState(false);
  const [cancellingSess,     setCancellingSess]     = useState(false);
  const [actionError,        setActionError]        = useState(null);

  const d = new Date(session.date + 'T00:00:00');
  const pending = (requests ?? []).filter((r) => r.status === 'pending').length;
  const isCancelled = session.status === 'cancelled';
  const hasActiveBooking = booking && booking.status !== 'cancelled';

  async function loadRequests() {
    setLoadingReqs(true);
    try {
      const { requests: r } = await getSessionRequests(session.id);
      setRequests(r ?? []);
    } catch {
      setRequests([]);
    } finally {
      setLoadingReqs(false);
    }
  }

  useEffect(() => {
    if (autoOpen) loadRequests();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleRequests() {
    if (!open && requests === null) await loadRequests();
    setOpen((o) => !o);
  }

  async function handleRespond(sessionId, requestId, status) {
    await respondToRequest(sessionId, requestId, status);
    await loadRequests();
  }

  async function handleCancelBooking() {
    setCancellingBk(true);
    setActionError(null);
    try {
      await cancelBooking(booking.id);
      onRefresh();
    } catch (e) {
      setActionError(e.message || 'Erreur lors de l\'annulation.');
    } finally {
      setCancellingBk(false);
      setCancelBkConfirm(false);
    }
  }

  async function handleCancelSession() {
    setCancellingSess(true);
    setActionError(null);
    try {
      await cancelSession(session.id);
      onRefresh();
    } catch (e) {
      setActionError(e.message || 'Erreur lors de l\'annulation.');
    } finally {
      setCancellingSess(false);
      setCancelSessConfirm(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={toggleRequests} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/40 transition-colors">
        {/* Date block */}
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-accent shrink-0">
          <span className="text-[9px] font-bold text-primary/60 uppercase">{d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
          <span className="text-xl font-bold text-primary leading-none">{d.getDate()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground capitalize">
            {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-sm text-muted-foreground">
            {session.time?.slice(0, 5)} · {session.current_players ?? 0}/{session.max_players} joueurs confirmés
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pending > 0 && (
            <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              {pending} en attente
            </span>
          )}
          <Badge variant={session.status === 'open' ? 'success' : 'secondary'}>
            {session.status === 'open' ? 'Ouverte' : session.status === 'complete' ? 'Complète' : 'Annulée'}
          </Badge>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-border pt-3 space-y-3">

          {/* Error */}
          {actionError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{actionError}
            </div>
          )}

          {/* Terrain info (when booking exists) */}
          {hasActiveBooking && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{booking.venue_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {booking.club_name} · {booking.start_time?.slice(0, 5)}–{booking.end_time?.slice(0, 5)} · {Number(booking.price).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowBookingModal(true)}
                >
                  Voir la réservation
                </Button>
                {!isCancelled && (
                  cancelBkConfirm ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={cancellingBk}
                        onClick={handleCancelBooking}
                      >
                        {cancellingBk ? 'Annulation…' : 'Confirmer l\'annulation'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setCancelBkConfirm(false)}
                      >
                        Retour
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setCancelBkConfirm(true)}
                    >
                      Annuler la réservation
                    </Button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Requests list */}
          {loadingReqs ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : !requests?.length ? (
            <p className="text-sm text-muted-foreground text-center py-2">Aucune demande reçue.</p>
          ) : (
            requests.map((r) => (
              <RequestRow key={r.id} request={r} sessionId={session.id} onRespond={handleRespond} />
            ))
          )}

          {/* Bottom actions */}
          <div className="pt-1 border-t border-border flex flex-wrap gap-2 items-center">
            {/* "Réserver un terrain" — only when no active booking and session not cancelled */}
            {!isCancelled && !hasActiveBooking && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTerrainPicker(true)}
              >
                <MapPin className="h-3.5 w-3.5" />
                Réserver un terrain
              </Button>
            )}
            {!isCancelled && (
              cancelSessConfirm ? (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={cancellingSess}
                    onClick={handleCancelSession}
                  >
                    {cancellingSess ? 'Annulation…' : 'Confirmer l\'annulation de la session'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancelSessConfirm(false)}
                  >
                    Retour
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setCancelSessConfirm(true)}
                >
                  Annuler la session
                </Button>
              )
            )}
          </div>
        </div>
      )}

      {/* Booking detail modal */}
      {showBookingModal && booking && (
        <BookingDetailModal booking={booking} onClose={() => setShowBookingModal(false)} />
      )}

      {/* Terrain picker modal */}
      {showTerrainPicker && (
        <TerrainPickerModal
          session={session}
          onClose={() => setShowTerrainPicker(false)}
          onBooked={() => { setShowTerrainPicker(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ── My sessions tab ───────────────────────────────────────────────────────────
function MySessions({ autoOpen = false }) {
  const [sessions,    setSessions]    = useState([]);
  const [bookingMap,  setBookingMap]  = useState({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [refreshKey,  setRefreshKey]  = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([getMySessions(), getMyBookings()])
      .then(([{ sessions: s }, { bookings: b }]) => {
        setSessions(s ?? []);
        const map = {};
        for (const bk of (b ?? [])) {
          if (bk.status !== 'cancelled') map[bk.session_id] = bk;
        }
        setBookingMap(map);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return (
    <div className="space-y-3">
      {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />{error}
    </div>
  );

  if (!sessions.length) return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-2">
      <Users className="h-8 w-8 text-muted-foreground mx-auto" />
      <p className="text-sm text-muted-foreground">Vous n'avez pas encore créé de session.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <MySessionCard
          key={s.id}
          session={s}
          booking={bookingMap[s.id] ?? null}
          autoOpen={autoOpen}
          onRefresh={refresh}
        />
      ))}
    </div>
  );
}

// ── Sessions page ─────────────────────────────────────────────────────────────
export default function Sessions() {
  const [searchParams] = useSearchParams();
  const fromNotification = searchParams.get('tab') === 'mine';
  const [tab, setTab] = useState(fromNotification ? 'mine' : 'browse');

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const [dateFilter,  setDateFilter]  = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const hasFilters = dateFilter || levelFilter;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { status: 'open' };
      if (dateFilter)  params.date      = dateFilter;
      if (levelFilter) params.level_min = levelFilter;
      const { sessions: s } = await listSessions(params);
      setSessions(s ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, levelFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleJoin(sessionId) {
    await requestJoin(sessionId);
    load();
  }

  async function handleCreate(data) {
    const result = await createSession(data);
    await load();
    return result;
  }

  return (
    <div className="space-y-6">
      {showCreate && (
        <CreateSessionModal
          onClose={(s) => { setShowCreate(false); if (s) load(); }}
          onCreate={handleCreate}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sessions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rejoignez ou créez une session de padel.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Créer une session
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'browse', label: 'Sessions disponibles' },
          { key: 'mine',   label: 'Mes sessions' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* My sessions tab */}
      {tab === 'mine' && <MySessions autoOpen={fromNotification} />}

      {/* Browse tab: filters */}
      {tab === 'browse' && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filtrer
          </span>

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-8 w-[140px] text-sm"
          />

          <div className="flex gap-1">
            {[['', 'Tous'], ...Object.entries(LEVEL_LABELS).map(([k]) => [k, k])].map(([val]) => (
              <button
                key={val}
                onClick={() => setLevelFilter(val === '' ? '' : Number(val))}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
                  String(levelFilter) === String(val)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground/60 border-border hover:border-primary/40'
                )}
              >
                {val === '' ? 'Tous' : val}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              onClick={() => { setDateFilter(''); setLevelFilter(''); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" /> Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* Browse tab: session list */}
      {tab === 'browse' && (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-4">
            <Users className="h-8 w-8 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium text-foreground">Aucune session disponible</p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasFilters
                  ? 'Aucun résultat pour ces filtres. Essayez d\'en changer.'
                  : 'Soyez le premier à créer une session !'}
              </p>
            </div>
            {!hasFilters && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" />
                Créer une session
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} onJoin={handleJoin} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
