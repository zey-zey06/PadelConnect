import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  listSessions, createSession, requestJoin, getMySessions,
  getSessionRequests, respondToRequest, cancelSession, inviteCoach,
} from '@/api/sessions';
import { getMyBookings, cancelBooking, createBooking } from '@/api/bookings';
import { listClubs, getClubSlots, getClubCoaches, getClubBallPickers } from '@/api/clubs';
import { listCoaches } from '@/api/coaches';
import { findMatches as aiFindMatches } from '@/api/ai';
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
import PageSkeleton from '@/components/PageSkeleton';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Inter +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

/**
 * PostgreSQL date columns arrive as full ISO strings ("2025-05-22T00:00:00.000Z")
 * after JSON serialisation.  Appending 'T00:00:00' directly breaks the Date
 * constructor → "Invalid Date".  Always slice to the 10-char date part first.
 */
function parseSessionDate(dateVal) {
  const str = (dateVal ?? '').toString().slice(0, 10); // "YYYY-MM-DD"
  return new Date(str + 'T00:00:00');                  // local midnight
}

// French day abbreviations (index = getDay(), 0 = Sunday)
const DAY_ABBR  = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_ABBR = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];

// Time sections for the visual chip picker
function makeRange(startH, endH) {
  const r = [];
  for (let h = startH; h < endH; h++) {
    r.push(`${String(h).padStart(2,'0')}:00`);
    r.push(`${String(h).padStart(2,'0')}:30`);
  }
  return r;
}
const TIME_SECTIONS = [
  { label: 'Matin',       emoji: '🌅', times: makeRange(7, 12) },
  { label: 'Après-midi',  emoji: '☀️',  times: makeRange(12, 17) },
  { label: 'Soir',        emoji: '🌆', times: [...makeRange(17, 22), '22:00'] },
];

// ── Week date picker ──────────────────────────────────────────────────────────
function WeekDatePicker({ value, onChange }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const todayStr = new Date().toISOString().slice(0, 10);

  // 7 days starting from today + weekOffset*7
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7 + i);
    const dateStr = d.toISOString().slice(0, 10);
    return { d, dateStr, isPast: dateStr < todayStr };
  });

  const weekLabel = `${days[0].d.getDate()} ${MONTH_ABBR[days[0].d.getMonth()]} – ${days[6].d.getDate()} ${MONTH_ABBR[days[6].d.getMonth()]} ${days[6].d.getFullYear()}`;

  return (
    <div className="space-y-2">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          disabled={weekOffset === 0}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium text-muted-foreground">{weekLabel}</span>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w + 1)}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day chips row */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ d, dateStr, isPast }) => {
          const isSelected = value === dateStr;
          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => onChange(dateStr)}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl py-2.5 gap-0.5 transition-all select-none',
                isSelected
                  ? 'bg-green-700 text-white shadow-sm'
                  : isPast
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : 'bg-slate-100 text-foreground hover:bg-slate-200'
              )}
            >
              <span className="text-[10px] font-semibold leading-none">{DAY_ABBR[d.getDay()]}</span>
              <span className={cn('text-base font-bold leading-none mt-0.5', isSelected ? 'text-white' : '')}>{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* Selected date label */}
      {value && (
        <p className="text-xs text-center text-green-700 font-medium">
          {new Date(value + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      )}
    </div>
  );
}

// ── Time chip picker ──────────────────────────────────────────────────────────
// afterTime: if set, only render chips strictly after this "HH:MM" value
function TimeChipPicker({ value, onChange, afterTime = null }) {
  return (
    <div className="space-y-3">
      {TIME_SECTIONS.map(({ label, emoji, times }) => {
        const filtered = afterTime
          ? times.filter((t) => t > afterTime)
          : times;
        if (filtered.length === 0) return null;
        return (
          <div key={label} className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <span>{emoji}</span>{label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {filtered.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange(t === value ? '' : t)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    value === t
                      ? 'bg-green-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
function SessionCard({ session, onJoin, hasBooking = false, onBooked }) {
  const { user } = useAuth();
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [msg,   setMsg]   = useState('');
  const [showTerrainPicker, setShowTerrainPicker] = useState(false);

  const isFull  = session.status === 'complete' || (session.current_players ?? 0) >= session.max_players;
  const isOwner = user?.id === session.creator_id;
  const d = parseSessionDate(session.date);

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
              {session.end_time && <span>– {session.end_time.slice(0, 5)}</span>}
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
          hasBooking ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-green-600 border-green-200 bg-green-50 hover:bg-green-50 hover:border-green-200 cursor-default"
              disabled
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terrain réservé ✓
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowTerrainPicker(true)}
            >
              <Calendar className="h-3.5 w-3.5" />
              Réserver un terrain
            </Button>
          )
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
          onBooked={() => { setShowTerrainPicker(false); onBooked?.(); }}
        />
      )}
    </div>
  );
}

// ── Create session modal (redesigned) ─────────────────────────────────────────
function CreateSessionModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    date: '', time: '', end_time: '', max_players: 4, level_min: null, gender: null,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  function set(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.date || !form.time || !form.end_time) {
      setError('La date, l\'heure de début et l\'heure de fin sont obligatoires.');
      return;
    }
    if (form.end_time <= form.time) {
      setError('L\'heure de fin doit être après l\'heure de début.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const preferences = {};
      if (form.level_min) preferences.level_min = form.level_min;
      if (form.gender)    preferences.gender    = form.gender;
      const payload = {
        date:     form.date,
        time:     form.time,
        end_time: form.end_time,
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

          {/* Date — visual week calendar */}
          <div className="space-y-2">
            <Label>Date</Label>
            <WeekDatePicker value={form.date} onChange={(d) => set('date', d)} />
          </div>

          {/* Start time — visual chip grid */}
          <div className="space-y-2">
            <Label>
              Heure de début
              {form.time && (
                <span className="ml-2 text-green-700 font-semibold">{form.time}</span>
              )}
            </Label>
            <TimeChipPicker
              value={form.time}
              onChange={(t) => {
                set('time', t);
                // Clear end_time if it's now <= new start_time
                if (form.end_time && form.end_time <= t) set('end_time', '');
              }}
            />
          </div>

          {/* End time — only shown once start time is chosen */}
          {form.time && (
            <div className="space-y-2">
              <Label>
                Heure de fin
                {form.end_time && (
                  <span className="ml-2 text-green-700 font-semibold">{form.end_time}</span>
                )}
              </Label>
              <TimeChipPicker
                value={form.end_time}
                afterTime={form.time}
                onChange={(t) => set('end_time', t)}
              />
            </div>
          )}

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

// ── Smart slot covering options ───────────────────────────────────────────────
/**
 * Find ALL slot combinations (single slots or consecutive chains) that start
 * at sessionStart and cover at least until sessionEnd.
 *
 * This includes:
 *  - Exact match:  one slot 09:00–10:30  → covers 09:00–10:30 ✅
 *  - Exact chain:  09:00–10:00 + 10:00–10:30 ✅
 *  - Wider single: 09:00–11:00 → covers more than needed ✅
 *  - Wider chain:  09:00–10:00 + 10:00–11:00 ✅
 *
 * When sessionEnd is falsy, falls back to finding a single slot that contains
 * sessionStart (legacy behaviour for sessions without end_time).
 *
 * Returns an array of option objects: { slots, start_time, end_time, totalPrice }.
 */
function findAllCoveringOptions(availSlots, sessionStart, sessionEnd) {
  if (!sessionEnd) {
    const single = availSlots.find((s) => {
      const st = (s.start_time ?? '').slice(0, 5);
      const et = (s.end_time   ?? '').slice(0, 5);
      return st <= sessionStart && sessionStart < et;
    });
    return single
      ? [{ slots: [single], start_time: single.start_time, end_time: single.end_time, totalPrice: Number(single.price ?? 0) }]
      : [];
  }

  // Group available slots by their start_time (HH:MM) — multiple slots can share a start
  const byStart = {};
  for (const sl of availSlots) {
    const key = (sl.start_time ?? '').slice(0, 5);
    if (!byStart[key]) byStart[key] = [];
    byStart[key].push(sl);
  }

  const options = [];

  // DFS from sessionStart — explore all consecutive chains
  function dfs(chain, cursorEnd) {
    if (chain.length > 0 && cursorEnd >= sessionEnd) {
      // This chain (or single slot) covers the required window → record it
      options.push({
        slots:      [...chain],
        start_time: chain[0].start_time,
        end_time:   chain[chain.length - 1].end_time,
        totalPrice: chain.reduce((sum, s) => sum + Number(s.price ?? 0), 0),
      });
      return; // no need to extend further — longer chains just cost more
    }
    for (const slot of (byStart[cursorEnd] ?? [])) {
      const slotEnd = (slot.end_time ?? '').slice(0, 5);
      if (slotEnd > cursorEnd) dfs([...chain, slot], slotEnd);
    }
  }

  dfs([], sessionStart);

  // Deduplicate (same set of slot IDs may be reachable via parallel paths)
  const seen = new Set();
  return options.filter((opt) => {
    const key = opt.slots.map((s) => s.id).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Terrain picker modal ───────────────────────────────────────────────────────
// 3-step: choose club → choose slot covering session time → confirm + pay
function TerrainPickerModal({ session, onClose, onBooked }) {
  const [step,            setStep]            = useState(1);
  const [clubs,           setClubs]           = useState([]);
  const [loadingClubs,    setLoadingClubs]    = useState(true);
  const [selectedClub,    setSelectedClub]    = useState(null);
  const [venueData,       setVenueData]       = useState([]);
  const [loadingSlots,    setLoadingSlots]    = useState(false);
  const [selectedSlot,    setSelectedSlot]    = useState(null);
  const [availableCoaches,   setAvailableCoaches]   = useState([]);
  const [loadingCoaches,     setLoadingCoaches]     = useState(false);
  const [selectedCoaches,    setSelectedCoaches]    = useState([]); // [{user_id, user_first_name, …}]
  const [availableBallPickers, setAvailableBallPickers] = useState([]);
  const [loadingBallPickers,   setLoadingBallPickers]   = useState(false);
  const [selectedBallPicker,   setSelectedBallPicker]   = useState(null); // single object or null
  const [payment,         setPayment]         = useState('on_arrival');
  const [card,            setCard]            = useState({ number: '', expiry: '', cvv: '', holder: '' });
  const [cardAccepted,    setCardAccepted]    = useState(false);
  const [phone,           setPhone]           = useState('');
  const [confirmedBk,     setConfirmedBk]     = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);

  const sessionTime    = session.time?.slice(0, 5) ?? '';
  const sessionEndTime = session.end_time?.slice(0, 5) ?? null;
  const sessionDate = parseSessionDate(session.date)
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
        .map((v) => {
          const availSlots = (v.slots ?? [])
            .filter((sl) => sl.status === 'available')
            .sort((a, b) => ((a.start_time ?? '') < (b.start_time ?? '') ? -1 : 1));

          const matchingChains = findAllCoveringOptions(availSlots, sessionTime, sessionEndTime);
          return { ...v, matchingChains };
        })
        .filter((v) => v.matchingChains.length > 0);
      setVenueData(filtered);
      setStep(2);
    } catch (e) {
      setError(e.message || 'Erreur lors du chargement des créneaux.');
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleSelectChain(chain, venueName) {
    setSelectedSlot({
      slots:      chain.slots,
      venue_name: venueName,
      start_time: chain.start_time,
      end_time:   chain.end_time,
      totalPrice: chain.totalPrice,
    });
    setSelectedCoaches([]);
    setSelectedBallPicker(null);
    setAvailableCoaches([]);
    setAvailableBallPickers([]);
    // Fetch coaches + ball pickers for this club (non-blocking)
    setLoadingCoaches(true);
    setLoadingBallPickers(true);
    getClubCoaches(selectedClub.id)
      .then(({ coaches }) => setAvailableCoaches(coaches ?? []))
      .catch(() => setAvailableCoaches([]))
      .finally(() => setLoadingCoaches(false));
    getClubBallPickers(selectedClub.id)
      .then(({ ballPickers }) => setAvailableBallPickers(ballPickers ?? []))
      .catch(() => setAvailableBallPickers([]))
      .finally(() => setLoadingBallPickers(false));
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
  // Format Ivorian phone: 10 digits in groups of 2 (07 12 34 56 78)
  function formatPhone(v) {
    const digits = v.replace(/\D/g, '').slice(0, 10);
    const groups = [];
    for (let i = 0; i < digits.length; i += 2) groups.push(digits.slice(i, i + 2));
    return groups.join(' ');
  }
  function updatePhone(raw) {
    setPhone(formatPhone(raw));
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

    if (payment === 'wave' || payment === 'orange_money') {
      const phoneDigits = phone.replace(/\s/g, '');
      if (phoneDigits.length !== 10) {
        setError('Numéro invalide — 10 chiffres requis (ex: 07 12 34 56 78).');
        return;
      }
    }

    setLoading(true);
    try {
      const phoneDigits = phone.replace(/\s/g, '');
      const payment_phone = (payment === 'wave' || payment === 'orange_money') && phoneDigits
        ? `+225${phoneDigits}`
        : undefined;

      // Build addons list (coaches + optional ball picker) — attached to the first slot only
      const addons = [
        ...selectedCoaches.map((c) => ({ type: 'coach', user_id: c.user_id, price: 10000 })),
        ...(selectedBallPicker ? [{ type: 'ball_picker', user_id: selectedBallPicker.user_id, price: 5000 }] : []),
      ];

      // Book every slot in the chain; attach addons to the first slot booking
      const results = await Promise.all(
        (selectedSlot.slots ?? [selectedSlot]).map((slot, idx) =>
          createBooking({
            session_id:     session.id,
            venue_slot_id:  slot.id,
            payment_method: payment,
            ...(payment_phone && { payment_phone }),
            ...(idx === 0 && addons.length > 0 && { addons }),
          })
        )
      );
      const { booking } = results[0];
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

  const STEP_LABELS = ['Club', 'Terrain', 'Équipe', 'Paiement'];

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
                : step === 3 ? 'Votre équipe (optionnel)'
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
              {i < 3 && <div className="w-5 h-px bg-border mx-0.5 shrink-0" />}
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
                    Pas de créneau couvrant {sessionTime}{sessionEndTime ? ` – ${sessionEndTime}` : ''} le{' '}
                    <span className="capitalize">
                      {parseSessionDate(session.date).toLocaleDateString('fr-FR')}
                    </span>.
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
                  {venue.matchingChains.map((chain, idx) => {
                    const n = chain.slots.length;
                    const isExact = chain.end_time?.slice(0, 5) === sessionEndTime;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectChain(chain, venue.name)}
                        className="w-full flex items-center gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3.5 hover:border-primary hover:bg-primary/10 transition-all text-left"
                      >
                        <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {chain.start_time?.slice(0, 5)} – {chain.end_time?.slice(0, 5)}
                            {!isExact && (
                              <span className="ml-2 text-[10px] font-medium text-primary/60 bg-primary/10 px-1.5 py-0.5 rounded-full">
                                élargi
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {n} créneau{n > 1 ? 'x' : ''} · {chain.totalPrice.toLocaleString('fr-FR')} FCFA · disponible
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ))
            )
          )}

          {/* ── Step 3: Team selection (coaches + ball picker) ────────── */}
          {step === 3 && (
            <div className="space-y-5">

              {/* ── Coaches ── */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Coachs <span className="font-normal normal-case tracking-normal ml-1">— jusqu'à 2, optionnel · 10 000 FCFA/coach</span>
                </p>
                {loadingCoaches ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
                  </div>
                ) : availableCoaches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-xl">
                    Aucun coach disponible pour ce club.
                  </p>
                ) : (
                  availableCoaches.map((coach) => {
                    const name = [coach.user_first_name, coach.user_last_name].filter(Boolean).join(' ')
                      || coach.user_email?.split('@')[0]
                      || 'Coach';
                    const isSelected = selectedCoaches.some((c) => c.user_id === coach.user_id);
                    const maxReached = selectedCoaches.length >= 2 && !isSelected;
                    return (
                      <button
                        key={coach.id}
                        type="button"
                        disabled={maxReached}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCoaches((prev) => prev.filter((c) => c.user_id !== coach.user_id));
                          } else if (!maxReached) {
                            setSelectedCoaches((prev) => [...prev, coach]);
                          }
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all text-left',
                          isSelected
                            ? 'border-green-600 bg-green-50'
                            : maxReached
                            ? 'border-border bg-card opacity-40 cursor-not-allowed'
                            : 'border-border bg-card hover:border-primary/40'
                        )}
                      >
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
                          {coach.user_photo_url ? (
                            <img src={coach.user_photo_url} alt={name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-green-100">
                              <span className="text-xs font-bold text-green-700 select-none">
                                {name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a
                            href={`/players/${coach.user_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-foreground hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {name}
                          </a>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {coach.specialty} · 10&nbsp;000 FCFA
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* ── Ball pickers ── */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Ramasseur <span className="font-normal normal-case tracking-normal ml-1">— max 1, optionnel · 5 000 FCFA</span>
                </p>
                {loadingBallPickers ? (
                  <div className="space-y-2">
                    {[1].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
                  </div>
                ) : availableBallPickers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-xl">
                    Aucun ramasseur disponible pour ce club.
                  </p>
                ) : (
                  availableBallPickers.map((bp) => {
                    const name = [bp.user_first_name, bp.user_last_name].filter(Boolean).join(' ')
                      || bp.user_email?.split('@')[0]
                      || 'Ramasseur';
                    const isSelected = selectedBallPicker?.user_id === bp.user_id;
                    return (
                      <button
                        key={bp.user_id}
                        type="button"
                        onClick={() => setSelectedBallPicker(isSelected ? null : bp)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all text-left',
                          isSelected
                            ? 'border-green-600 bg-green-50'
                            : 'border-border bg-card hover:border-primary/40'
                        )}
                      >
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-muted-foreground select-none">
                            {name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Ramasseur · 5&nbsp;000 FCFA</p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-border space-y-2">
                {(selectedCoaches.length > 0 || selectedBallPicker) && (
                  <p className="text-xs text-center text-muted-foreground">
                    {[
                      selectedCoaches.length > 0 && `${selectedCoaches.length} coach${selectedCoaches.length > 1 ? 's' : ''}`,
                      selectedBallPicker && '1 ramasseur',
                    ].filter(Boolean).join(' · ')}
                    {' '}· +{((selectedCoaches.length * 10000) + (selectedBallPicker ? 5000 : 0)).toLocaleString('fr-FR')} FCFA
                  </p>
                )}
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 border-0 text-white"
                  onClick={() => { setStep(4); setError(null); }}
                >
                  {(selectedCoaches.length > 0 || selectedBallPicker)
                    ? 'Continuer avec l\'équipe sélectionnée'
                    : 'Continuer sans équipe'}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Payment ───────────────────────────────────────── */}
          {step === 4 && selectedSlot && (() => {
            const coachCost      = selectedCoaches.length * 10000;
            const ballPickerCost = selectedBallPicker ? 5000 : 0;
            const grandTotal     = (selectedSlot.totalPrice ?? Number(selectedSlot.price ?? 0)) + coachCost + ballPickerCost;
            return (
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
                {/* Terrain line */}
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>
                    Terrain{selectedSlot.slots?.length > 1 ? ` (${selectedSlot.slots.length} créneaux)` : ''}
                  </span>
                  <span>{(selectedSlot.totalPrice ?? Number(selectedSlot.price ?? 0)).toLocaleString('fr-FR')} FCFA</span>
                </div>
                {/* Coach lines */}
                {selectedCoaches.map((c) => {
                  const cName = [c.user_first_name, c.user_last_name].filter(Boolean).join(' ') || 'Coach';
                  return (
                    <div key={c.user_id} className="flex items-center justify-between text-muted-foreground">
                      <span>Coach — {cName}</span>
                      <span>10&nbsp;000 FCFA</span>
                    </div>
                  );
                })}
                {/* Ball picker line */}
                {selectedBallPicker && (() => {
                  const bpName = [selectedBallPicker.user_first_name, selectedBallPicker.user_last_name].filter(Boolean).join(' ') || 'Ramasseur';
                  return (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Ramasseur — {bpName}</span>
                      <span>5&nbsp;000 FCFA</span>
                    </div>
                  );
                })()}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-bold text-foreground">
                    {grandTotal.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Payment method — 2×2 grid */}
              <div className="space-y-2">
                <Label>Moyen de paiement</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { value: 'on_arrival',   label: 'Sur place',      Icon: Banknote,    color: null },
                    { value: 'card',         label: 'Carte bancaire', Icon: CreditCard,  color: null },
                    { value: 'wave',         label: 'Wave',           Icon: null,        color: '#1DC8FF' },
                    { value: 'orange_money', label: 'Orange Money',   Icon: null,        color: '#FF6600' },
                  ].map(({ value, label, Icon, color }) => {
                    const active = payment === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setPayment(value); setCardAccepted(false); setPhone(''); setError(null); }}
                        style={active && color ? { borderColor: color, backgroundColor: `${color}15` } : undefined}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl border p-3.5 transition-all',
                          active && !color ? 'border-primary bg-primary/10'
                            : !active ? 'border-border bg-card hover:border-primary/30'
                            : ''
                        )}
                      >
                        {Icon ? (
                          <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
                        ) : (
                          <span className="text-lg leading-none">{value === 'wave' ? '🌊' : '🟠'}</span>
                        )}
                        <span
                          className="text-xs font-medium"
                          style={active && color ? { color } : undefined}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
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

              {/* Wave / Orange Money phone input */}
              {(payment === 'wave' || payment === 'orange_money') && (
                <div
                  className="rounded-xl border p-4 space-y-2"
                  style={{
                    borderColor: payment === 'wave' ? '#1DC8FF' : '#FF6600',
                    backgroundColor: payment === 'wave' ? '#1DC8FF10' : '#FF660010',
                  }}
                >
                  <Label className="text-xs font-semibold" style={{ color: payment === 'wave' ? '#0ea5e9' : '#ea580c' }}>
                    {payment === 'wave' ? 'Numéro Wave' : 'Numéro Orange Money'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-muted-foreground shrink-0 select-none">🇨🇮 +225</span>
                    <Input
                      placeholder="07 12 34 56 78"
                      value={phone}
                      onChange={(e) => updatePhone(e.target.value)}
                      inputMode="numeric"
                      maxLength={14}
                      className="font-mono tracking-wider"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">10 chiffres · ex : 07 12 34 56 78</p>
                </div>
              )}

              {/* Confirm button */}
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 border-0 text-white"
              >
                {loading
                  ? 'Réservation en cours…'
                  : `Réserver — ${grandTotal.toLocaleString('fr-FR')} FCFA`}
              </Button>
            </div>
          ); })()}
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
  const PAYMENT_LABELS = {
    card: 'Carte bancaire', on_arrival: 'Sur place',
    wave: 'Wave', orange_money: 'Orange Money',
  };
  const paymentLabel = PAYMENT_LABELS[booking.payment_method] ?? booking.payment_method ?? 'Sur place';
  const d = parseSessionDate(booking.session_date);

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
                <Link
                  to={`/clubs/${booking.club_id}`}
                  className="text-sm font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                >
                  {booking.club_name}
                </Link>
                <Link
                  to={`/clubs/${booking.club_id}`}
                  className="block text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
                >
                  {booking.venue_name}
                </Link>
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

  // Coach invite
  const [showCoachInvite,  setShowCoachInvite]  = useState(false);
  const [coachList,        setCoachList]        = useState([]);
  const [loadingCoachList, setLoadingCoachList] = useState(false);
  const [invitedCoachIds,  setInvitedCoachIds]  = useState(new Set());
  const [invitingCoachId,  setInvitingCoachId]  = useState(null);

  // AI find-matches
  const [showAiMatches,  setShowAiMatches]  = useState(false);
  const [aiMatches,      setAiMatches]      = useState(null);
  const [loadingAi,      setLoadingAi]      = useState(false);
  const [aiError,        setAiError]        = useState(null);

  async function toggleCoachInvite() {
    if (showCoachInvite) { setShowCoachInvite(false); return; }
    setShowCoachInvite(true);
    if (coachList.length > 0) return; // already loaded
    setLoadingCoachList(true);
    try {
      const { coaches } = await listCoaches();
      setCoachList(coaches ?? []);
    } catch {
      setCoachList([]);
    } finally {
      setLoadingCoachList(false);
    }
  }

  async function toggleFindMatches() {
    if (showAiMatches) { setShowAiMatches(false); return; }
    setShowAiMatches(true);
    if (aiMatches !== null) return; // already loaded
    setLoadingAi(true);
    setAiError(null);
    try {
      const { matches } = await aiFindMatches(session.id);
      setAiMatches(matches ?? []);
    } catch (e) {
      setAiError(e.message || 'Erreur lors de la recherche.');
      setAiMatches([]);
    } finally {
      setLoadingAi(false);
    }
  }

  async function handleInviteCoach(coachUserId) {
    setInvitingCoachId(coachUserId);
    try {
      await inviteCoach(session.id, coachUserId);
      setInvitedCoachIds((prev) => new Set([...prev, coachUserId]));
    } catch (e) {
      setActionError(e.message || 'Erreur lors de l\'invitation.');
    } finally {
      setInvitingCoachId(null);
    }
  }

  const d = parseSessionDate(session.date);
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
    // Refresh parent so session current_players + status reflect the change immediately
    onRefresh();
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

          {/* Coach invite panel */}
          {showCoachInvite && !isCancelled && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Inviter un coach</p>
              {loadingCoachList ? (
                <div className="space-y-1.5">
                  {[1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : coachList.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun coach indépendant disponible.</p>
              ) : (
                coachList.map((coach) => {
                  const name = [coach.user_first_name, coach.user_last_name].filter(Boolean).join(' ')
                    || coach.user_email?.split('@')[0] || 'Coach';
                  const invited = invitedCoachIds.has(coach.user_id);
                  const busy    = invitingCoachId === coach.user_id;
                  return (
                    <div key={coach.id} className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
                        {coach.user_photo_url ? (
                          <img src={coach.user_photo_url} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-green-100">
                            <span className="text-[10px] font-bold text-green-700">{name.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/players/${coach.user_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-foreground hover:underline truncate block"
                        >
                          {name}
                        </a>
                        <p className="text-[10px] text-muted-foreground truncate">{coach.specialty}</p>
                      </div>
                      {invited ? (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-0.5 shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Invité
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0"
                          disabled={busy}
                          onClick={() => handleInviteCoach(coach.user_id)}
                        >
                          {busy ? '…' : 'Inviter'}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* AI find-matches panel */}
          {showAiMatches && !isCancelled && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Joueurs recommandés par l'IA
              </p>
              {loadingAi ? (
                <div className="space-y-1.5">
                  {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : aiError ? (
                <p className="text-xs text-red-600">{aiError}</p>
              ) : aiMatches?.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun joueur disponible pour l'instant.</p>
              ) : (
                aiMatches.map((m) => {
                  const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || 'Joueur';
                  return (
                    <div key={m.userId} className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
                        {m.photo ? (
                          <img src={m.photo} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-primary/10">
                            <span className="text-[10px] font-bold text-primary">{name.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/players/${m.userId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-foreground hover:underline truncate block"
                        >
                          {name}
                        </a>
                        <p className="text-[10px] text-muted-foreground truncate">{m.explanation}</p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                        {m.score}%
                      </span>
                    </div>
                  );
                })
              )}
            </div>
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
            {/* "Inviter un coach" */}
            {!isCancelled && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleCoachInvite}
                className={showCoachInvite ? 'bg-green-50 border-green-300 text-green-700' : ''}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {showCoachInvite ? 'Masquer' : 'Inviter un coach'}
              </Button>
            )}
            {/* "Trouver des joueurs IA" — only when session is open and not full */}
            {!isCancelled && session.status === 'open' && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFindMatches}
                className={showAiMatches ? 'bg-primary/5 border-primary/40 text-primary' : ''}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {showAiMatches ? 'Masquer les suggestions' : 'Trouver des joueurs'}
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
    <PageSkeleton icon="🎾" message="Chargement de vos sessions..." layout="list" />
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

  const [sessions,    setSessions]    = useState([]);
  const [bookingMap,  setBookingMap]  = useState({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);

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
      const [{ sessions: s }, { bookings: b }] = await Promise.all([
        listSessions(params),
        getMyBookings(),
      ]);
      setSessions(s ?? []);
      const map = {};
      for (const bk of (b ?? [])) {
        if (bk.status !== 'cancelled') map[bk.session_id] = bk;
      }
      setBookingMap(map);
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
          <PageSkeleton icon="🎾" message="Recherche de partenaires..." layout="cards" />
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
              <SessionCard
                key={s.id}
                session={s}
                onJoin={handleJoin}
                hasBooking={!!bookingMap[s.id]}
                onBooked={load}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
