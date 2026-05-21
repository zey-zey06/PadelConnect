import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, ChevronDown, ChevronRight, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { listClubs, getClubVenues } from '@/api/clubs';
import { Button } from '@/components/ui/button';

// ── Slot badge ────────────────────────────────────────────────────────────────
function SlotBadge({ slot }) {
  const colors = {
    available: 'bg-green-100 text-green-700',
    booked:    'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors[slot.status] ?? 'bg-muted text-muted-foreground'}`}>
      <Clock className="h-3 w-3" />
      {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}
      {slot.price != null && (
        <span className="ml-1 font-normal opacity-75">{Number(slot.price).toLocaleString('fr-FR')} FCFA</span>
      )}
    </span>
  );
}

// ── Venue row (expandable slots) ──────────────────────────────────────────────
function VenueCard({ venue }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <p className="text-sm font-medium text-foreground">{venue.name}</p>
        {venue.description && (
          <p className="text-xs text-muted-foreground truncate max-w-xs">{venue.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Club card ─────────────────────────────────────────────────────────────────
function ClubCard({ club }) {
  const [open,    setOpen]    = useState(false);
  const [venues,  setVenues]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleToggle() {
    if (!open && venues.length === 0) {
      setLoading(true);
      setError(null);
      try {
        const { venues: v } = await getClubVenues(club.id);
        setVenues(v ?? []);
      } catch (err) {
        setError(err.message || 'Impossible de charger les terrains.');
      } finally {
        setLoading(false);
      }
    }
    setOpen((o) => !o);
  }

  const statusColors = {
    active:   'bg-green-100 text-green-700',
    inactive: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{club.name}</p>
          <p className="text-xs text-muted-foreground">/{club.slug}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[club.status] ?? 'bg-muted text-muted-foreground'}`}>
          {club.status === 'active' ? 'Actif' : 'Inactif'}
        </span>
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      <div className="px-5 pb-3 flex justify-end border-b border-border -mt-1">
        <Link
          to={`/clubs/${club.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Voir le profil
        </Link>
      </div>

      {/* Venues */}
      {open && (
        <div className="px-5 pb-4 border-t border-border pt-3 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : venues.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Aucun terrain enregistré pour ce club.</p>
          ) : (
            venues.map((v) => <VenueCard key={v.id} venue={v} />)
          )}
        </div>
      )}
    </div>
  );
}

// ── Clubs page ────────────────────────────────────────────────────────────────
export default function Clubs() {
  const [clubs,   setClubs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    listClubs()
      .then(({ clubs: c }) => setClubs(c ?? []))
      .catch((e) => setError(e.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clubs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Découvrez les clubs partenaires à Abidjan.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : clubs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-3">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">Aucun club disponible</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Les fiches des clubs seront disponibles prochainement.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clubs.map((c) => <ClubCard key={c.id} club={c} />)}
        </div>
      )}
    </div>
  );
}
