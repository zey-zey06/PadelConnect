import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, CalendarDays, Plus, X, AlertCircle, Trash2,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getMyVenues, addVenue, deleteVenue } from '@/api/manager';
import { getMySubscription } from '@/api/subscriptions';
import { getVenueSlots } from '@/api/manager';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';

// ── Add venue modal ───────────────────────────────────────────────────────────
function AddVenueModal({ clubId, onClose, onCreated }) {
  const [form,    setForm]    = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return; }
    setLoading(true); setError(null);
    try {
      const { venue } = await addVenue(clubId, {
        name:        form.name.trim(),
        description: form.description.trim() || null,
      });
      onCreated(venue);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création.');
    } finally { setLoading(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Ajouter un terrain</h2>
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
          <div className="space-y-1.5">
            <Label htmlFor="v-name">Nom du terrain</Label>
            <Input id="v-name" autoFocus placeholder="ex: Court 1" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-desc">Description <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
            <Input id="v-desc" placeholder="ex: Gazon synthétique, couvert" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Création…' : 'Créer le terrain'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteModal({ venue, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handle() {
    setLoading(true); setError(null);
    try {
      await deleteVenue(venue.id);
      onDeleted(venue.id);
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression.');
    } finally { setLoading(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Supprimer "{venue.name}" ?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tous les créneaux seront annulés. Cette action est irréversible.
            </p>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
          <Button
            type="button"
            disabled={loading}
            onClick={handle}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
          >
            {loading ? 'Suppression…' : 'Supprimer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Venue card ────────────────────────────────────────────────────────────────
function VenueCard({ venue, onDelete }) {
  const [weekSlots, setWeekSlots] = useState(null);

  useEffect(() => {
    getVenueSlots(venue.id)
      .then(({ slots: s }) => {
        const today    = new Date(); today.setHours(0, 0, 0, 0);
        const weekEnd  = new Date(today); weekEnd.setDate(today.getDate() + 7);
        const todayStr = today.toISOString().slice(0, 10);
        const weekStr  = weekEnd.toISOString().slice(0, 10);
        setWeekSlots((s ?? []).filter((sl) => {
          const d = String(sl.date).slice(0, 10);
          return d >= todayStr && d < weekStr;
        }));
      })
      .catch(() => setWeekSlots([]));
  }, [venue.id]);

  const booked    = weekSlots?.filter((s) => s.status === 'booked').length    ?? null;
  const available = weekSlots?.filter((s) => s.status === 'available').length ?? null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/25 hover:shadow-md transition-all">
      <div className="h-1 w-full bg-primary/60" />
      <div className="px-5 pt-4 pb-3 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{venue.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {venue.description || 'Aucune description'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(venue)}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
          title="Supprimer ce terrain"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Slot counts */}
      <div className="mx-5 mb-3 rounded-lg bg-muted/40 border border-border/60 px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {weekSlots === null ? (
            <span className="w-20 h-3 rounded bg-muted animate-pulse inline-block" />
          ) : (
            <span>
              <span className="font-semibold text-foreground">{weekSlots.length}</span>
              {' '}créneau{weekSlots.length !== 1 ? 'x' : ''} cette semaine
            </span>
          )}
        </div>
        {booked !== null && booked > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {booked} réservé{booked > 1 ? 's' : ''}
          </span>
        )}
        {available !== null && available > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
            {available} disponible{available > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Action */}
      <div className="px-5 pb-4">
        <Link to={`/manager/venues/${venue.id}/slots`}>
          <Button size="sm" className="w-full gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            Gérer les créneaux
            <ChevronRight className="h-3.5 w-3.5 ml-auto" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4">
      {[1,2].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="h-1 bg-muted" />
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-48 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="h-8 rounded-lg bg-muted animate-pulse" />
            <div className="h-9 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ManagerVenues page ────────────────────────────────────────────────────────
export default function ManagerVenues() {
  const { user } = useAuth();
  const [venues,     setVenues]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);
  const [toDelete,   setToDelete]   = useState(null);  // venue object
  const [subOk,      setSubOk]      = useState(true);

  const clubId = user?.organization_id;

  useEffect(() => {
    if (!clubId) { setLoading(false); return; }
    Promise.all([
      getMyVenues(clubId),
      getMySubscription().catch(() => null),
    ])
      .then(([{ venues: v }, subResult]) => {
        setVenues(v ?? []);
        const status = subResult?.subscription?.status;
        setSubOk(status === 'active' || status === 'trial');
      })
      .catch((err) => setError(err.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [clubId]);

  const handleAddClick = useCallback(() => {
    if (!subOk) { setError('Abonnement requis pour ajouter un terrain.'); return; }
    setShowAdd(true);
  }, [subOk]);

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-36 rounded-lg bg-muted animate-pulse" />
      </div>
      <Skeleton />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mes terrains</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {venues.length} terrain{venues.length !== 1 ? 's' : ''} enregistré{venues.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" onClick={handleAddClick}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Venues list */}
      {venues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-14 text-center space-y-3">
          <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <div>
            <p className="font-medium text-foreground">Aucun terrain</p>
            <p className="text-sm text-muted-foreground mt-0.5">Ajoutez votre premier court pour commencer.</p>
          </div>
          <Button size="sm" onClick={handleAddClick} className="mx-auto">
            <Plus className="h-4 w-4" />Ajouter un terrain
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {venues.map((v) => (
            <VenueCard
              key={v.id}
              venue={v}
              onDelete={(venue) => setToDelete(venue)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddVenueModal
          clubId={clubId}
          onClose={() => setShowAdd(false)}
          onCreated={(v) => { setVenues((prev) => [...prev, v]); setShowAdd(false); }}
        />
      )}

      {toDelete && (
        <DeleteModal
          venue={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={(id) => { setVenues((prev) => prev.filter((v) => v.id !== id)); setToDelete(null); }}
        />
      )}
    </div>
  );
}
