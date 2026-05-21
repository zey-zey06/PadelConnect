import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, MapPin, CalendarDays, TrendingUp,
  ChevronRight, AlertCircle, Plus, CalendarCheck,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getManagerDashboard, getMyClub, getMyVenues, getVenueSlots } from '@/api/manager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

// ── Venue row (compact overview) ──────────────────────────────────────────────
function VenueRow({ venue, todaySlots = [] }) {
  const booked    = todaySlots.filter((s) => s.status === 'booked').length;
  const available = todaySlots.filter((s) => s.status === 'available').length;

  return (
    <Link
      to={`/manager/venues/${venue.id}/slots`}
      className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:shadow-sm hover:border-primary/20 transition-all group"
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <MapPin className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{venue.name}</p>
        {venue.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{venue.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {booked > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {booked} réservé{booked > 1 ? 's' : ''}
          </span>
        )}
        {available > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
            {available} dispo
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

// ── ManagerDashboard page ─────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { user } = useAuth();

  const [stats,      setStats]      = useState(null);
  const [club,       setClub]       = useState(null);
  const [venues,     setVenues]     = useState([]);
  const [todaySlots, setTodaySlots] = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

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

        // Today's per-venue slot breakdown for the venue overview list
        const today = new Date().toISOString().slice(0, 10);
        const results = await Promise.allSettled(
          (v ?? []).map((venue) =>
            getVenueSlots(venue.id, { date: today })
              .then(({ slots: sl }) => ({ id: venue.id, slots: sl ?? [] }))
          )
        );
        const map = {};
        results.forEach((r) => {
          if (r.status === 'fulfilled') map[r.value.id] = r.value.slots;
        });
        setTodaySlots(map);
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
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">Espace gérant</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {club ? club.name : 'Tableau de bord'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bienvenue, {user?.email?.split('@')[0]}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/manager/venues">
            <Button variant="outline">
              <MapPin className="h-4 w-4" />
              Mes terrains
            </Button>
          </Link>
          <Link to="/manager/venues">
            <Button>
              <Plus className="h-4 w-4" />
              Ajouter un terrain
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
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
            <Button>
              <Plus className="h-4 w-4" />
              Créer votre club
            </Button>
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

          {/* ── Club status banner ──────────────────────────────────── */}
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

          {/* ── Venues overview ─────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Mes terrains — aujourd'hui</h2>
              <Link to="/manager/venues" className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
                Gérer <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {venues.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-3">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Aucun terrain. Commencez par en ajouter un.</p>
                <Link to="/manager/venues">
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    Ajouter un terrain
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {venues.map((v) => (
                  <VenueRow key={v.id} venue={v} todaySlots={todaySlots[v.id] ?? []} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
