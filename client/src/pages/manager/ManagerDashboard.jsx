import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, MapPin, CalendarDays, TrendingUp, CalendarCheck,
  ChevronRight, AlertCircle, Plus, X,
  ShowerHead, ParkingSquare, Wifi, Utensils, ShoppingBag, Lightbulb, Shirt,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getManagerDashboard, getMyClub, getMyVenues, addVenue, getVenueSlots } from '@/api/manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// ── Amenity display map ───────────────────────────────────────────────────────
const AMENITY_MAP = {
  vestiaires:     { label: 'Vestiaires',  Icon: Shirt         },
  douches:        { label: 'Douches',     Icon: ShowerHead    },
  parking:        { label: 'Parking',     Icon: ParkingSquare },
  wifi:           { label: 'Wi-Fi',       Icon: Wifi          },
  restaurant:     { label: 'Restaurant',  Icon: Utensils      },
  pro_shop:       { label: 'Pro shop',    Icon: ShoppingBag   },
  boutique:       { label: 'Boutique',    Icon: ShoppingBag   },
  eclairage_nuit: { label: 'Éclairage',   Icon: Lightbulb     },
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, note, icon: Icon, accent }) {
  return (
    <div className={`rounded-xl border bg-card p-5 space-y-3 ${accent ? 'border-primary/20 bg-primary/[0.02]' : 'border-border'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent ? 'bg-primary/10' : 'bg-muted'}`}>
          <Icon className={`h-4 w-4 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value ?? '—'}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

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

  const amenities = Object.entries(AMENITY_MAP).filter(
    ([key]) => venue.amenities?.[key] === true
  );

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden hover:border-primary/25 hover:shadow-md transition-all duration-200">
      <div className="h-1 w-full bg-primary/60" />

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

      <div className="mx-5 mb-4 rounded-lg bg-muted/40 border border-border/60 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
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

      {amenities.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {amenities.map(([key, { label, Icon }]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground bg-muted/60 border border-border/50"
            >
              <Icon className="h-3 w-3 shrink-0" />{label}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1" />

      <div className="px-5 pb-5 pt-1">
        <Link to={`/manager/venues/${venue.id}/slots`} className="block">
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

// ── ManagerDashboard page ─────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { user } = useAuth();

  const [stats,     setStats]     = useState(null);
  const [club,      setClub]      = useState(null);
  const [venues,    setVenues]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user?.organization_id) { setLoading(false); return; }

    async function load() {
      try {
        const [{ stats: s }, { club: c }, { venues: v }] = await Promise.all([
          getManagerDashboard(),
          getMyClub(user.organization_id),
          getMyVenues(user.organization_id),
        ]);
        setStats(s);
        setClub(c);
        setVenues(v ?? []);
      } catch (err) {
        setError(err.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.organization_id]);

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">Espace gérant</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {club ? club.name : 'Tableau de bord'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bienvenue, {user?.email?.split('@')[0]}
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
          </div>
          <div className="h-16 rounded-xl bg-muted animate-pulse" />
          <div className="grid grid-cols-1 gap-4">
            {[1, 2].map((i) => <VenueCardSkeleton key={i} />)}
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : !user?.organization_id ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-4">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <div>
            <p className="font-medium text-foreground">Aucun club associé</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
              Créez votre club pour commencer à gérer vos terrains.
            </p>
          </div>
          <Link to="/manager/setup">
            <Button><Plus className="h-4 w-4" />Créer votre club</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* ── Stats ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Terrains"
              value={stats?.total_venues ?? venues.length}
              note={`terrain${(stats?.total_venues ?? venues.length) !== 1 ? 's' : ''} enregistré${(stats?.total_venues ?? venues.length) !== 1 ? 's' : ''}`}
              icon={MapPin}
            />
            <StatCard
              label="Réservés aujourd'hui"
              value={stats?.bookings_today ?? 0}
              note={stats?.bookings_today === 0 ? 'aucune réservation' : 'créneaux réservés'}
              icon={CalendarDays}
              accent
            />
            <StatCard
              label="Réservés cette semaine"
              value={stats?.bookings_week ?? 0}
              note={stats?.bookings_week === 0 ? 'aucune réservation' : 'sur les 7 prochains jours'}
              icon={CalendarCheck}
            />
            <StatCard
              label="Revenus aujourd'hui"
              value={`${(stats?.revenue_today ?? 0).toLocaleString('fr-FR')} FCFA`}
              note="créneaux réservés ce jour"
              icon={TrendingUp}
            />
          </div>

          {/* ── Club info card ──────────────────────────────────────── */}
          {club && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{club.name}</p>
                <p className="text-xs text-muted-foreground">/{club.slug}</p>
              </div>
              <Badge variant={club.status === 'active' ? 'success' : 'secondary'}>
                {club.status === 'active' ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
          )}

          {/* ── Venues section ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Mes terrains</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {venues.length} terrain{venues.length !== 1 ? 's' : ''} enregistré{venues.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button size="sm" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" />
                Ajouter un terrain
              </Button>
            </div>

            {venues.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Aucun terrain. Ajoutez votre premier court pour commencer.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
              </div>
            )}
          </div>
        </>
      )}

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
    </div>
  );
}
