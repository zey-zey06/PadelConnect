import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, X, Check,
  AlertCircle, Clock, ArrowLeft, Trash2, Pencil,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getVenueSlots, addSlot, cancelSlot, updateSlot, bulkUpdateSlotPrice, getMyVenues } from '@/api/manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ── Date helpers ──────────────────────────────────────────────────────────────
function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAY_LABELS   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_LABELS = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];

function formatDay(d) {
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return `${DAY_LABELS[dow]} ${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function SlotBadge({ status }) {
  const map = {
    available: { label: 'Disponible', cls: 'bg-green-50 text-green-700 border-green-200'   },
    booked:    { label: 'Réservé',    cls: 'bg-blue-50 text-blue-700 border-blue-200'       },
    cancelled: { label: 'Annulé',     cls: 'bg-muted text-muted-foreground border-border'   },
  };
  const { label, cls } = map[status] ?? map.available;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

// ── Add slot modal ────────────────────────────────────────────────────────────
function AddSlotModal({ venueId, onClose, onCreated }) {
  const [form,    setForm]    = useState({ date: '', start_time: '', end_time: '', price: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.date || !form.start_time || !form.end_time) {
      setError('Date, heure de début et heure de fin sont obligatoires.');
      return;
    }
    if (form.price !== '' && parseFloat(form.price) < 0) {
      setError('Le prix ne peut pas être négatif.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { slot } = await addSlot(venueId, {
        date:       form.date,
        start_time: form.start_time,
        end_time:   form.end_time,
        price:      form.price !== '' ? parseFloat(form.price) : 0,
      });
      onCreated(slot);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création.');
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
          <h2 className="text-lg font-semibold text-foreground">Ajouter un créneau</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="s-date">Date</Label>
            <Input
              id="s-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-start">Heure de début</Label>
              <Input
                id="s-start"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-end">Heure de fin</Label>
              <Input
                id="s-end"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-price">
              Prix (FCFA){' '}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Input
              id="s-price"
              type="number"
              min="0"
              placeholder="ex: 5000"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Création…' : 'Créer le créneau'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Cancel confirmation dialog ────────────────────────────────────────────────
function CancelConfirmDialog({ slot, onConfirm, onClose, loading }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Annuler ce créneau ?</p>
            <p className="text-sm text-muted-foreground">
              {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
              {slot.status === 'booked' && ' · Le joueur sera notifié.'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Garder
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Annulation…' : 'Annuler le créneau'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Slot row ──────────────────────────────────────────────────────────────────
function SlotRow({ slot, venueId, onCancel, onPriceUpdated }) {
  const [editing,   setEditing]   = useState(false);
  const [priceVal,  setPriceVal]  = useState('');
  const [saving,    setSaving]    = useState(false);

  function startEdit() {
    setPriceVal(String(slot.price ?? 0));
    setEditing(true);
  }

  async function save(bulk = false) {
    const p = parseFloat(priceVal);
    if (isNaN(p) || p < 0) return;
    setSaving(true);
    try {
      if (bulk) {
        await bulkUpdateSlotPrice(venueId, slot.start_time.slice(0, 5), slot.end_time.slice(0, 5), p);
        onPriceUpdated({ start_time: slot.start_time, end_time: slot.end_time, price: p, bulk: true });
      } else {
        await updateSlot(venueId, slot.id, { price: p });
        onPriceUpdated({ id: slot.id, price: p, bulk: false });
      }
      setEditing(false);
    } catch {
      // keep editing open on error
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/[0.02] px-4 py-3 space-y-2.5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground flex-1">
            {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
          </p>
          <SlotBadge status={slot.status} />
        </div>
        <div className="flex items-center gap-2 pl-11">
          <div className="relative">
            <Input
              type="number"
              min="0"
              value={priceVal}
              onChange={(e) => setPriceVal(e.target.value)}
              className="w-36 pr-14 h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter')  save(false);
                if (e.key === 'Escape') setEditing(false);
              }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              FCFA
            </span>
          </div>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
            title="Enregistrer"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 transition-colors"
            title="Annuler"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="pl-11 text-xs text-primary hover:underline disabled:opacity-50 transition-opacity"
        >
          Appliquer à tous les créneaux {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border px-4 py-3 transition-all group',
      slot.status === 'cancelled'
        ? 'border-border bg-muted/20 opacity-60'
        : slot.status === 'booked'
          ? 'border-blue-200 bg-blue-50/50 hover:shadow-sm'
          : 'border-border bg-card hover:border-primary/20 hover:shadow-sm'
    )}>
      <div className={cn(
        'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
        slot.status === 'booked' ? 'bg-blue-100' : 'bg-primary/10'
      )}>
        <Clock className={cn('h-4 w-4', slot.status === 'booked' ? 'text-blue-600' : 'text-primary')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {slot.status === 'booked' && slot.booked_by_email
            ? slot.booked_by_email
            : slot.price != null ? `${Number(slot.price).toLocaleString('fr-FR')} FCFA` : '—'}
        </p>
      </div>
      <SlotBadge status={slot.status} />
      {slot.status !== 'cancelled' && (
        <>
          <button
            onClick={startEdit}
            className="text-muted-foreground hover:text-primary transition-colors rounded p-1 hover:bg-primary/10 opacity-0 group-hover:opacity-100"
            title="Modifier le prix"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onCancel(slot)}
            className="text-muted-foreground hover:text-red-600 transition-colors rounded p-1 hover:bg-red-50"
            title="Annuler ce créneau"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

// ── SlotManager page ──────────────────────────────────────────────────────────
export default function SlotManager() {
  const { venueId } = useParams();
  const { user }    = useAuth();

  const [venueName,    setVenueName]    = useState('');
  const [slots,        setSlots]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling,   setCancelling]   = useState(false);
  const [weekStart,    setWeekStart]    = useState(() => getWeekStart(new Date()));

  // Build the 7 days of the displayed week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const weekLabel = (() => {
    const s = weekStart;
    const e = weekDays[6];
    return `${s.getDate()} ${MONTH_LABELS[s.getMonth()]} – ${e.getDate()} ${MONTH_LABELS[e.getMonth()]} ${e.getFullYear()}`;
  })();

  // Resolve venue name from the club's venue list
  useEffect(() => {
    if (!user?.organization_id) return;
    getMyVenues(user.organization_id)
      .then(({ venues }) => {
        const v = (venues ?? []).find((x) => String(x.id) === String(venueId));
        if (v) setVenueName(v.name);
      })
      .catch(() => {});
  }, [venueId, user?.organization_id]);

  // Load all slots (no date filter — grouped client-side by displayed week)
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { slots: s } = await getVenueSlots(venueId);
      setSlots(s ?? []);
    } catch (err) {
      setError(err.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => { load(); }, [load]);

  // Filter + group slots for the current week
  const weekStartStr = toISODate(weekStart);
  const weekEndStr   = toISODate(weekDays[6]);

  const slotsByDay = {};
  weekDays.forEach((d) => { slotsByDay[toISODate(d)] = []; });
  slots
    .filter((s) => s.date >= weekStartStr && s.date <= weekEndStr)
    .forEach((s) => {
      if (slotsByDay[s.date]) slotsByDay[s.date].push(s);
    });
  weekDays.forEach((d) => {
    slotsByDay[toISODate(d)].sort((a, b) => (a.start_time > b.start_time ? 1 : -1));
  });

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelSlot(venueId, cancelTarget.id);
      setSlots((prev) =>
        prev.map((s) => (s.id === cancelTarget.id ? { ...s, status: 'cancelled' } : s))
      );
      setCancelTarget(null);
    } catch {
      // Dialog stays open; user can retry or dismiss
    } finally {
      setCancelling(false);
    }
  }

  function handlePriceUpdated({ id, start_time, end_time, price, bulk }) {
    if (bulk) {
      setSlots((prev) =>
        prev.map((s) =>
          s.start_time === start_time && s.end_time === end_time ? { ...s, price } : s
        )
      );
    } else {
      setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, price } : s)));
    }
  }

  const today = toISODate(new Date());

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link
            to="/manager/venues"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Mes terrains
          </Link>
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">Espace gérant</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {venueName || 'Créneaux'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gérez les créneaux de disponibilité.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un créneau
        </Button>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3">
        <button
          onClick={() => setWeekStart((w) => {
            const d = new Date(w); d.setDate(d.getDate() - 7); return d;
          })}
          className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1.5 hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-foreground">{weekLabel}</p>
        <button
          onClick={() => setWeekStart((w) => {
            const d = new Date(w); d.setDate(d.getDate() + 7); return d;
          })}
          className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1.5 hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Days */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {weekDays.map((d) => {
            const dateStr  = toISODate(d);
            const daySlots = slotsByDay[dateStr] ?? [];
            const isToday  = dateStr === today;

            return (
              <div
                key={dateStr}
                className={cn(
                  'rounded-xl border overflow-hidden',
                  isToday ? 'border-primary/30' : 'border-border'
                )}
              >
                {/* Day header */}
                <div className={cn(
                  'px-5 py-2.5 border-b flex items-center justify-between',
                  isToday
                    ? 'border-primary/20 bg-primary/5'
                    : 'border-border bg-muted/20'
                )}>
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      'text-sm font-semibold',
                      isToday ? 'text-primary' : 'text-foreground'
                    )}>
                      {formatDay(d)}
                    </p>
                    {isToday && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                        Aujourd'hui
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {daySlots.length > 0
                      ? `${daySlots.length} créneau${daySlots.length !== 1 ? 'x' : ''}`
                      : 'Vide'}
                  </span>
                </div>

                {/* Slot list */}
                <div className={cn('p-4 space-y-2', isToday && 'bg-primary/[0.015]')}>
                  {daySlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Aucun créneau
                    </p>
                  ) : (
                    daySlots.map((slot) => (
                      <SlotRow
                        key={slot.id}
                        slot={slot}
                        venueId={venueId}
                        onCancel={setCancelTarget}
                        onPriceUpdated={handlePriceUpdated}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddSlotModal
          venueId={venueId}
          onClose={() => setShowAddModal(false)}
          onCreated={(slot) => {
            setSlots((prev) => [...prev, slot]);
            setShowAddModal(false);
          }}
        />
      )}

      {cancelTarget && (
        <CancelConfirmDialog
          slot={cancelTarget}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
          loading={cancelling}
        />
      )}
    </div>
  );
}
