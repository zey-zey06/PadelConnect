import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Plus, ChevronRight, ChevronLeft, X, AlertCircle, Calendar,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getMyVenues, addVenue, getVenueSlots } from '@/api/manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Add venue modal ───────────────────────────────────────────────────────────
function AddVenueModal({ clubId, onClose, onCreated }) {
  const [form,    setForm]    = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { venue } = await addVenue(clubId, {
        name:        form.name.trim(),
        description: form.description.trim() || null,
      });
      onCreated(venue);
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
          <h2 className="text-lg font-semibold text-foreground">Ajouter un terrain</h2>
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
            <Label htmlFor="v-name">Nom du terrain</Label>
            <Input
              id="v-name"
              placeholder="ex: Court 1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-desc">
              Description{' '}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Input
              id="v-desc"
              placeholder="ex: Terrain en gazon synthétique, couvert"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Création…' : 'Créer le terrain'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Venue slide card ──────────────────────────────────────────────────────────
function VenueSlide({ venue, index, total }) {
  const [weekSlots, setWeekSlots] = useState(null);

  useEffect(() => {
    getVenueSlots(venue.id)
      .then(({ slots: s }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        const todayStr   = today.toISOString().slice(0, 10);
        const weekEndStr = weekEnd.toISOString().slice(0, 10);
        const thisWeek = (s ?? []).filter((sl) => {
          const d = String(sl.date).slice(0, 10);
          return d >= todayStr && d < weekEndStr;
        });
        setWeekSlots(thisWeek);
      })
      .catch(() => setWeekSlots([]));
  }, [venue.id]);

  const booked    = weekSlots ? weekSlots.filter((s) => s.status === 'booked').length    : null;
  const available = weekSlots ? weekSlots.filter((s) => s.status === 'available').length : null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
      {/* Position indicator */}
      {total > 1 && (
        <div className="px-6 pt-4 pb-0 flex justify-end">
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {index + 1} / {total}
          </span>
        </div>
      )}

      {/* Card header */}
      <div className="px-6 py-5 flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-foreground leading-tight">{venue.name}</p>
          {venue.description ? (
            <p className="text-sm text-muted-foreground mt-1">{venue.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1 italic">Aucune description</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mx-6 mb-5 rounded-xl bg-muted/30 border border-border px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          {weekSlots === null ? (
            <span className="w-28 h-3.5 rounded bg-muted animate-pulse inline-block" />
          ) : (
            <span>
              <span className="font-semibold text-foreground">{weekSlots.length}</span>
              {' '}créneau{weekSlots.length !== 1 ? 'x' : ''} cette semaine
            </span>
          )}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {booked !== null && booked > 0 && (
            <Badge variant="default">{booked} réservé{booked > 1 ? 's' : ''}</Badge>
          )}
          {available !== null && available > 0 && (
            <Badge variant="success">{available} disponible{available > 1 ? 's' : ''}</Badge>
          )}
          {weekSlots !== null && weekSlots.length === 0 && (
            <span className="text-xs text-muted-foreground">Aucun créneau cette semaine</span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="px-6 pb-6">
        <Link to={`/manager/venues/${venue.id}/slots`} className="block">
          <Button className="w-full">
            <Calendar className="h-4 w-4" />
            Gérer les créneaux
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── VenueManager page ─────────────────────────────────────────────────────────
export default function VenueManager() {
  const { user } = useAuth();
  const [venues,      setVenues]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showModal,   setShowModal]   = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Touch swipe tracking
  const touchStartX = useRef(null);

  const total = venues.length;

  function goPrev() {
    setActiveIndex((i) => (i > 0 ? i - 1 : total - 1));
  }
  function goNext() {
    setActiveIndex((i) => (i < total - 1 ? i + 1 : 0));
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -50) goNext();
    else if (delta > 50) goPrev();
    touchStartX.current = null;
  }

  const load = useCallback(async () => {
    if (!user?.organization_id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { venues: v } = await getMyVenues(user.organization_id);
      setVenues(v ?? []);
      setActiveIndex(0);
    } catch (err) {
      setError(err.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [user?.organization_id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">Espace gérant</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mes terrains</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gérez vos terrains et leurs créneaux.
          </p>
        </div>
        {user?.organization_id && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Ajouter un terrain
          </Button>
        )}
      </div>

      {showModal && (
        <AddVenueModal
          clubId={user.organization_id}
          onClose={() => setShowModal(false)}
          onCreated={(v) => {
            setVenues((prev) => [...prev, v]);
            setActiveIndex(venues.length); // point to the new venue
            setShowModal(false);
          }}
        />
      )}

      {loading ? (
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : !user?.organization_id ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-3">
          <MapPin className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">Aucun club associé</p>
          <p className="text-sm text-muted-foreground">Votre compte gérant n'est pas encore rattaché à un club.</p>
        </div>
      ) : total === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-4">
          <MapPin className="h-10 w-10 text-muted-foreground mx-auto" />
          <div>
            <p className="font-medium text-foreground">Aucun terrain enregistré</p>
            <p className="text-sm text-muted-foreground mt-1">Ajoutez votre premier terrain pour commencer.</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Ajouter un terrain
          </Button>
        </div>
      ) : (
        <div>
          {/* Carousel */}
          <div className="relative">
            {/* Left arrow */}
            {total > 1 && (
              <button
                onClick={goPrev}
                className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10',
                  'h-9 w-9 rounded-full border border-border bg-card shadow-sm',
                  'flex items-center justify-center',
                  'text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all',
                )}
                aria-label="Terrain précédent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {/* Slide */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="select-none"
            >
              <VenueSlide
                key={venues[activeIndex].id}
                venue={venues[activeIndex]}
                index={activeIndex}
                total={total}
              />
            </div>

            {/* Right arrow */}
            {total > 1 && (
              <button
                onClick={goNext}
                className={cn(
                  'absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10',
                  'h-9 w-9 rounded-full border border-border bg-card shadow-sm',
                  'flex items-center justify-center',
                  'text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all',
                )}
                aria-label="Terrain suivant"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Dot indicators */}
          {total > 1 && (
            <div className="flex justify-center items-center gap-1.5 mt-5">
              {venues.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    'rounded-full transition-all',
                    i === activeIndex
                      ? 'w-5 h-1.5 bg-primary'
                      : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60',
                  )}
                  aria-label={`Terrain ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
