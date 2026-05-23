import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, MapPin, CalendarDays, TrendingUp,
  ChevronRight, AlertCircle, Plus, CalendarCheck,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getManagerDashboard, getMyClub } from '@/api/manager';
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

// ── ManagerDashboard page ─────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { user } = useAuth();

  const [stats,   setStats]   = useState(null);
  const [club,    setClub]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!user?.organization_id) { setLoading(false); return; }

    async function load() {
      try {
        const [{ stats: s }, { club: c }] = await Promise.all([
          getManagerDashboard(),
          getMyClub(user.organization_id),
        ]);
        setStats(s);
        setClub(c);
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
          </div>
          <div className="h-16 rounded-xl bg-muted animate-pulse" />
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
              value={stats?.total_venues ?? '—'}
              note={`terrain${stats?.total_venues !== 1 ? 's' : ''} enregistré${stats?.total_venues !== 1 ? 's' : ''}`}
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

          {/* ── Quick actions ───────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            <Link to="/manager/venues">
              <Button>
                <MapPin className="h-4 w-4" />
                Voir mes terrains
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/manager/venues">
              <Button variant="outline">
                <CalendarDays className="h-4 w-4" />
                Voir les réservations
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
