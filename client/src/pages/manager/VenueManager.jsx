import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Plus, X, AlertCircle, Calendar, ChevronRight,
  ShowerHead, ParkingSquare, Wifi, Utensils, ShoppingBag, Lightbulb, Shirt,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getMyVenues, addVenue, getVenueSlots } from '@/api/manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ── Amenity display map ───────────────────────────────────────────────────────
const AMENITY_MAP = {
  vestiaires:     { label: 'Vestiaires',  Icon: Shirt        },
  douches:        { label: 'Douches',     Icon: ShowerHead   },
  parking:        { label: 'Parking',     Icon: ParkingSquare},
  wifi:           { label: 'Wi-Fi',       Icon: Wifi         },
  restaurant:     { label: 'Restaurant',  Icon: Utensils     },
  pro_shop:       { label: 'Pro shop',    Icon: ShoppingBag  },
  boutique:       { label: 'Boutique',    Icon: ShoppingBag  },
  eclairage_nuit: { label: 'Éclairage',   Icon: Lightbulb    },
};

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
              id="v-name" autoFocus placeholder="ex: Court 1" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-desc">
              Description{' '}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Input
              id="v-desc" placeholder="ex: Terrain en gazon synthétique, couvert" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
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

// ── Venue card ────────────────────────────────────────────────────────────────
function VenueCard({ venue }) {
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
        setWeekSlots((s ?? []).filter((sl) => {
          const d = String(sl.date).slice(0, 10);
          return d >= todayStr && d < weekEndStr;
        }));
      })
      .catch(() => setWeekSlots([]));
  }, [venue.id]);

  const booked    = weekSlots?.filter((s) => s.status === 'booked').length    ?? null;
  const available = weekSlots?.filter((s) => s.status === 'available').length ?? null;

  // Active amenities list
  const amenities = Object.entries(AMENITY_MAP).filter(
    ([key]) => venue.amenities?.[key] === true
  );

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden hover:border-primary/25 hover:shadow-md transition-all duration-200">

      {/* Top accent strip */}
      <div className="h-1 w-full bg-primary/60" />

      {/* Identity */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground leading-snug">{venue.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {venue.description || 'Aucune description'}
          </p>
        </div>
      </div>

      {/* Slot stats */}
      <div className="mx-5 mb-4 rounded-lg bg-muted/40 border border-border/60 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {weekSlots === null ? (
            <span className="w-24 h-3 rounded bg-muted animate-pulse inline-block" />
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

      {/* Amenities */}
      {amenities.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {amenities.map(([key, { label, Icon }]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground bg-muted/60 border border-border/50"
            >
              <Icon className="h-3 w-3 shrink-0" />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Spacer pushes button to bottom */}
      <div className="flex-1" />

      {/* CTA */}
      <div className="px-5 pb-5 pt-1">
        <Link to={`/manager/venues/${venue.id}/slots`} className="block">
          <Button size="sm" className="w-full gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Gérer les créneaux
            <ChevronRight className="h-3.5 w-3.5 ml-auto" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function VenueCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-1 w-full bg-muted" />
      <div className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-48 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="h-10 rounded-lg bg-muted animate-pulse" />
        <div className="h-8 rounded-lg bg-muted animate-pulse" />
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
            {loading ? '' : `${venues.length} terrain${venues.length !== 1 ? 's' : ''} enregistré${venues.length !== 1 ? 's' : ''}`}
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

      {/* Content */}
      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : !user?.organization_id ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-3">
          <MapPin className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">Aucun club associé</p>
          <p className="text-sm text-muted-foreground">Votre compte gérant n'est pas encore rattaché à un club.</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4].map((i) => <VenueCardSkeleton key={i} />)}
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
        <div className="grid grid-cols-1 gap-4">
          {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
        </div>
      )}
    </div>
  );
}
