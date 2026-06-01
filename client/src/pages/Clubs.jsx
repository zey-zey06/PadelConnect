import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, MapPin, Phone, ChevronRight, Eye, AlertCircle, Map, List, Heart, Navigation } from 'lucide-react';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import { listClubs, toggleClubFavorite, getClubFavoriteStatus } from '@/api/clubs';
import { useAuth } from '@/App';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PageSkeleton from '@/components/PageSkeleton';
import { MultiClubMap } from '@/components/ClubMap';

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R  = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dL / 2) ** 2
           + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

// ── Club card ─────────────────────────────────────────────────────────────────
const ClubCard = memo(function ClubCard({ club, isAdmin, distance }) {
  const { t } = useTranslation();
  const photo      = club.logo_url || (Array.isArray(club.photos_urls) && club.photos_urls[0]) || null;
  const venueCount = parseInt(club.venue_count ?? 0, 10);
  const minPrice   = club.min_price != null ? Number(club.min_price) : null;
  const maxPrice   = club.max_price != null ? Number(club.max_price) : null;

  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) return;
    getClubFavoriteStatus(club.id)
      .then(({ favorited: f }) => setFavorited(f))
      .catch(() => {});
  }, [club.id, isAdmin]);

  const handleFavorite = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (favLoading) return;
    setFavLoading(true);
    try {
      const { favorited: f } = await toggleClubFavorite(club.id);
      setFavorited(f);
    } catch { /* non-fatal */ }
    finally { setFavLoading(false); }
  }, [club.id, favLoading]);

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
          'absolute top-3 left-3 text-xs font-medium px-2 py-0.5 rounded-full',
          club.status === 'active'
            ? 'bg-green-100/90 text-green-700'
            : 'bg-muted/90 text-muted-foreground'
        )}>
          {club.status === 'active' ? 'Actif' : 'Inactif'}
        </span>
        {!isAdmin && (
          <button
            onClick={handleFavorite}
            disabled={favLoading}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors disabled:opacity-60"
            aria-label={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={cn('h-4 w-4 transition-colors', favorited ? 'fill-red-500 text-red-500' : 'text-slate-400')} />
          </button>
        )}
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
          {distance != null && (
            <span className="flex items-center gap-1 text-primary font-semibold">
              <Navigation className="h-3 w-3" />
              {fmtDist(distance)}
            </span>
          )}
          {priceLabel && (
            <span className="font-medium text-foreground">{priceLabel}</span>
          )}
        </div>

        {/* Phone */}
        {club.phone && (
          <a
            href={`tel:${club.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline transition-colors"
          >
            <Phone className="h-3 w-3 shrink-0" />
            {club.phone}
          </a>
        )}

        <Link to={`/clubs/${club.id}`} className="mt-auto">
          {isAdmin ? (
            <Button size="sm" variant="outline" className="w-full">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              {t('common.edit')}
            </Button>
          ) : (
            <Button size="sm" className="w-full">
              {t('clubs.reserve')}
              <ChevronRight className="h-3.5 w-3.5 ml-auto" />
            </Button>
          )}
        </Link>
      </div>
    </div>
  );
});

// ── Clubs page ────────────────────────────────────────────────────────────────
export default function Clubs() {
  const { t }      = useTranslation();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const isAdmin    = user?.role === 'super_admin';

  const [clubs,       setClubs]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [viewMode,    setViewMode]    = useState('list'); // 'list' | 'map'
  const [userPos,     setUserPos]     = useState(null);   // { lat, lng }
  const [sortByDist,  setSortByDist]  = useState(false);

  // One-shot geolocation request
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // silently ignore denial
      { timeout: 6000 }
    );
  }, []);

  const clubsWithDistance = useMemo(() => {
    if (!userPos) return clubs.map((c) => ({ ...c, _dist: null }));
    return clubs.map((c) => ({
      ...c,
      _dist: (c.latitude != null && c.longitude != null)
        ? haversine(userPos.lat, userPos.lng, parseFloat(c.latitude), parseFloat(c.longitude))
        : null,
    }));
  }, [clubs, userPos]);

  const displayedClubs = useMemo(() => {
    if (!sortByDist) return clubsWithDistance;
    return [...clubsWithDistance].sort((a, b) => {
      if (a._dist == null && b._dist == null) return 0;
      if (a._dist == null) return 1;
      if (b._dist == null) return -1;
      return a._dist - b._dist;
    });
  }, [clubsWithDistance, sortByDist]);

  const fetchClubs = useCallback(async () => {
    try {
      const { clubs: c } = await listClubs();
      setClubs(c ?? []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Erreur de chargement.');
    }
  }, []);

  useEffect(() => {
    fetchClubs().finally(() => setLoading(false));
  }, [fetchClubs]);

  const { refreshing } = usePullToRefresh(fetchClubs);

  return (
    <div className="space-y-6">
      {refreshing && (
        <div className="flex items-center justify-center py-2">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('clubs.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Découvrez les clubs partenaires à Abidjan.
          </p>
        </div>

        {/* Controls row — only show once loaded and clubs exist */}
        {!loading && !error && clubs.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Distance sort — only shown when geolocation is available */}
            {userPos && (
              <button
                onClick={() => setSortByDist((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  sortByDist
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                <Navigation className="h-3.5 w-3.5" />
                {sortByDist ? 'Trié par distance' : 'Par distance'}
              </button>
            )}
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="h-3.5 w-3.5" />
                {t('clubs.list')}
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'map'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Map className="h-3.5 w-3.5" />
                {t('clubs.map')}
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <PageSkeleton icon="🏟️" message="Chargement des clubs..." layout="cards" />
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
      ) : viewMode === 'map' ? (
        <MultiClubMap
          clubs={clubs}
          onClubClick={(id) => navigate(`/clubs/${id}`)}
          className="w-full"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedClubs.map((c) => <ClubCard key={c.id} club={c} isAdmin={isAdmin} distance={c._dist} />)}
        </div>
      )}
    </div>
  );
}
