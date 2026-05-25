import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Building2 } from 'lucide-react';
import { usePlayerPanel } from '@/App';
import { search as searchApi } from '@/api/search';
import { cn } from '@/lib/utils';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Inter +',  5: 'Confirmé',   6: 'Avancé', 7: 'Expert',
};

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 bg-muted animate-pulse rounded w-2/5" />
        <div className="h-2   bg-muted animate-pulse rounded w-1/4" />
      </div>
    </div>
  );
}

// ── SearchBar ─────────────────────────────────────────────────────────────────
/**
 * Self-contained search bar with debounced API call + results dropdown.
 *
 * Props:
 *   className — forwarded to the outer container (for sizing / visibility)
 */
export default function SearchBar({ className }) {
  const navigate          = useNavigate();
  const { openPlayerPanel } = usePlayerPanel();

  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState(null); // null → no search yet
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);

  const containerRef = useRef(null);
  const inputRef     = useRef(null);
  const timerRef     = useRef(null);

  // ── Close on click outside ────────────────────────────────────────────────
  useEffect(() => {
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // ── Cleanup debounce on unmount ───────────────────────────────────────────
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // ── Input change + debounce ───────────────────────────────────────────────
  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);

    if (val.trim().length < 2) {
      setResults(null);
      setOpen(false);
      setLoading(false);
      return;
    }

    setOpen(true);
    setLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchApi(val.trim());
        setResults(data);
      } catch {
        setResults({ players: [], clubs: [] });
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  // ── Result clicks ─────────────────────────────────────────────────────────
  function handlePlayerClick(userId) {
    setOpen(false);
    setQuery('');
    openPlayerPanel(userId);
  }

  function handleClubClick(clubId) {
    setOpen(false);
    setQuery('');
    navigate(`/clubs/${clubId}`);
  }

  // ── Derived display state ─────────────────────────────────────────────────
  const hasPlayers = results?.players?.length > 0;
  const hasClubs   = results?.clubs?.length   > 0;
  const hasResults = hasPlayers || hasClubs;
  const showEmpty  = !loading && results !== null && !hasResults;

  return (
    <div ref={containerRef} className={cn('relative', className)}>

      {/* ── Input ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
          placeholder="Rechercher joueurs, clubs…"
          autoComplete="off"
          className={cn(
            'w-full rounded-lg border border-border bg-background',
            'pl-9 pr-3 py-2 text-sm text-foreground',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
            'transition-colors',
          )}
        />
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 rounded-xl border border-border bg-white shadow-xl overflow-hidden">

          {/* Loading skeleton */}
          {loading && (
            <div className="py-1">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <p className="px-4 py-5 text-center text-sm text-muted-foreground">
              Aucun résultat pour «&nbsp;{query}&nbsp;»
            </p>
          )}

          {/* Results */}
          {!loading && hasResults && (
            <div className="max-h-80 overflow-y-auto py-1">

              {/* ── Players ── */}
              {hasPlayers && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Joueurs
                  </p>
                  {results.players.map((p) => {
                    const name =
                      p.first_name || p.last_name
                        ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
                        : p.email?.split('@')[0] ?? 'Joueur';
                    return (
                      <button
                        key={p.user_id}
                        type="button"
                        onClick={() => handlePlayerClick(p.user_id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                      >
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0 ring-1 ring-border">
                          {p.photo_url ? (
                            <img src={p.photo_url} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{name}</p>
                          {p.level && (
                            <p className="text-xs text-muted-foreground leading-none mt-0.5">
                              {LEVEL_LABELS[p.level] ?? `Niv. ${p.level}`}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {/* ── Clubs ── */}
              {hasClubs && (
                <>
                  <p className={cn(
                    'px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground',
                    hasPlayers ? 'pt-2 mt-1 border-t border-border' : 'pt-2',
                  )}>
                    Clubs
                  </p>
                  {results.clubs.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleClubClick(c.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                    >
                      {/* Logo */}
                      <div className="w-7 h-7 rounded-md overflow-hidden bg-muted shrink-0 ring-1 ring-border flex items-center justify-center">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground leading-none mt-0.5">
                          {c.venue_count === 1 ? '1 terrain' : `${c.venue_count ?? 0} terrains`}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
