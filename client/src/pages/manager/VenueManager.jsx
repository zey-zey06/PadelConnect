import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, ChevronRight, X, AlertCircle, Calendar } from 'lucide-react';
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Ajouter un terrain</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
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

// ── Venue card ────────────────────────────────────────────────────────────────
function VenueCard({ venue }) {
  const [weekSlots, setWeekSlots] = useState(null);

  useEffect(() => {
    // Fetch this week's slots (no date filter = all slots; we slice to 7 days client-side)
    getVenueSlots(venue.id)
      .then(({ slots: s }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        const thisWeek = (s ?? []).filter((sl) => {
          const d = new Date(sl.date);
          return d >= today && d < weekEnd;
        });
        setWeekSlots(thisWeek);
      })
      .catch(() => setWeekSlots([]));
  }, [venue.id]);

  const booked    = weekSlots ? weekSlots.filter((s) => s.status === 'booked').length    : null;
  const available = weekSlots ? weekSlots.filter((s) => s.status === 'available').length : null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-sm hover:border-primary/20 transition-all group">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{venue.name}</p>
            {venue.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{venue.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 py-3 flex items-center gap-4 text-xs text-muted-foreground bg-muted/20">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {weekSlots === null ? (
            <span className="w-12 h-3 rounded bg-muted animate-pulse inline-block" />
          ) : (
            `${weekSlots.length} créneau${weekSlots.length !== 1 ? 'x' : ''} cette semaine`
          )}
        </span>
        {booked !== null && booked > 0 && (
          <Badge variant="default">{booked} réservé{booked > 1 ? 's' : ''}</Badge>
        )}
        {available !== null && available > 0 && (
          <Badge variant="success">{available} disponible{available > 1 ? 's' : ''}</Badge>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-border">
        <Link to={`/manager/venues/${venue.id}/slots`}>
          <Button size="sm" className="w-full">
            <Calendar className="h-3.5 w-3.5" />
            Gérer les créneaux
            <ChevronRight className="h-3.5 w-3.5 ml-auto" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── VenueManager page ─────────────────────────────────────────────────────────
export default function VenueManager() {
  const { user } = useAuth();
  const [venues,    setVenues]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    if (!user?.organization_id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { venues: v } = await getMyVenues(user.organization_id);
      setVenues(v ?? []);
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
            setShowModal(false);
          }}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
        </div>
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
      ) : venues.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
        </div>
      )}
    </div>
  );
}
