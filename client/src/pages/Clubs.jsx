import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, ChevronRight, AlertCircle } from 'lucide-react';
import { listClubs } from '@/api/clubs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Club card ─────────────────────────────────────────────────────────────────
function ClubCard({ club }) {
  const photo      = club.logo_url || (Array.isArray(club.photos_urls) && club.photos_urls[0]) || null;
  const venueCount = parseInt(club.venue_count ?? 0, 10);
  const minPrice   = club.min_price != null ? Number(club.min_price) : null;
  const maxPrice   = club.max_price != null ? Number(club.max_price) : null;

  let priceLabel = null;
  if (minPrice !== null && maxPrice !== null) {
    priceLabel = minPrice === maxPrice
      ? `${minPrice.toLocaleString('fr-FR')} FCFA`
      : `${minPrice.toLocaleString('fr-FR')} – ${maxPrice.toLocaleString('fr-FR')} FCFA`;
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-sm hover:border-primary/20 transition-all flex flex-col">
      {/* Photo / gradient header */}
      <div className="h-32 bg-gradient-to-br from-primary/15 to-primary/5 relative overflow-hidden shrink-0">
        {photo && (
          <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span className={cn(
          'absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full',
          club.status === 'active'
            ? 'bg-green-100/90 text-green-700'
            : 'bg-muted/90 text-muted-foreground'
        )}>
          {club.status === 'active' ? 'Actif' : 'Inactif'}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">{club.name}</h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {club.address || `/${club.slug}`}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {venueCount > 0 && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {venueCount} terrain{venueCount > 1 ? 's' : ''}
            </span>
          )}
          {priceLabel && (
            <span className="font-medium text-foreground">{priceLabel}</span>
          )}
        </div>

        <Link to={`/clubs/${club.id}`} className="mt-auto">
          <Button size="sm" className="w-full">
            Réserver
            <ChevronRight className="h-3.5 w-3.5 ml-auto" />
          </Button>
        </Link>
      </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((c) => <ClubCard key={c.id} club={c} />)}
        </div>
      )}
    </div>
  );
}
