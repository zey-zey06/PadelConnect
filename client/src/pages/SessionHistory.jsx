import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Users, MapPin, AlertCircle, Star, X,
} from 'lucide-react';
import { getSessionHistory, rateSession } from '@/api/sessions';
import { useAuth } from '@/App';
import { cn } from '@/lib/utils';
import PageSkeleton from '@/components/PageSkeleton';

// ── Rate session modal ────────────────────────────────────────────────────────
function RateModal({ session, onClose, onRated }) {
  const [stars, setStars] = useState({ organisation: 0, niveau: 0, ambiance: 0 });
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const criteria = [
    { key: 'organisation', label: 'Organisation' },
    { key: 'niveau',       label: 'Niveau des joueurs' },
    { key: 'ambiance',     label: 'Ambiance' },
  ];

  const canSubmit = Object.values(stars).every((v) => v > 0);

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      await rateSession(session.id, stars);
      setDone(true);
      onRated?.(session.id);
      setTimeout(onClose, 1500);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Évaluer la session</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {done ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-green-700">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" /> Merci pour votre avis !
            </div>
          ) : (
            <>
              {criteria.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map((v) => (
                      <button key={v} type="button" onClick={() => setStars((s) => ({ ...s, [key]: v }))}
                        className="transition-transform active:scale-110">
                        <Star className={cn('h-7 w-7', v <= stars[key] ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-40 transition-opacity mt-2"
              >
                {loading ? 'Envoi…' : 'Envoyer mon avis'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_FR = [
  'jan', 'fév', 'mar', 'avr', 'mai', 'juin',
  'juil', 'août', 'sep', 'oct', 'nov', 'déc',
];

function parseDate(dateVal) {
  const str = (dateVal ?? '').toString().slice(0, 10);
  return new Date(str + 'T00:00:00');
}

function groupByMonth(sessions) {
  const groups = new Map();
  for (const s of sessions) {
    const d   = parseDate(s.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const raw = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    if (!groups.has(key)) groups.set(key, { key, label, sessions: [] });
    groups.get(key).sessions.push(s);
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

function getUserRole(session, userId) {
  if (session.creator_id === userId) return 'creator';
  return session.request_status; // 'accepted' | 'pending' | 'refused' | null
}

// ── Status badge config ───────────────────────────────────────────────────────

const ROLE_CONFIG = {
  creator:  { label: 'Créée par moi', bg: 'bg-primary/10', text: 'text-primary',   border: 'border-primary/20'  },
  accepted: { label: 'Participé',     bg: 'bg-green-50',   text: 'text-green-700', border: 'border-green-200'   },
  pending:  { label: 'En attente',    bg: 'bg-amber-50',   text: 'text-amber-700', border: 'border-amber-200'   },
  refused:  { label: 'Refusée',       bg: 'bg-red-50',     text: 'text-red-600',   border: 'border-red-200'     },
};

// ── Filter tabs ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',      label: 'Toutes'        },
  { key: 'mine',     label: 'Mes sessions'  },
  { key: 'joined',   label: 'Participées'   },
  { key: 'requests', label: 'Demandes'      },
];

// ── Session history card ──────────────────────────────────────────────────────

function SessionHistoryCard({ session, userId, canRate, onRate }) {
  const navigate   = useNavigate();
  const d          = parseDate(session.date);
  const role       = getUserRole(session, userId);
  const cfg        = ROLE_CONFIG[role] ?? ROLE_CONFIG.pending;
  const isOwner    = session.creator_id === userId;
  const levelMin   = session.preferences?.level_min;
  const isPast     = new Date(session.date + 'T23:59:59') < new Date();

  const creatorName =
    [session.creator_first_name, session.creator_last_name].filter(Boolean).join(' ') ||
    'Joueur';

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 space-y-3 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => navigate('/sessions')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate('/sessions'); }}
    >
      {/* ── Top row: date block + status badge ──────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Compact date block */}
          <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-primary/8 shrink-0 border border-primary/15">
            <span className="text-[8px] font-extrabold text-primary/60 uppercase leading-none tracking-wide">
              {MONTH_FR[d.getMonth()]}
            </span>
            <span className="text-[17px] font-extrabold text-primary leading-none mt-0.5">
              {d.getDate()}
            </span>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground capitalize leading-snug">
              {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {session.time?.slice(0, 5) ?? '—'}
              {session.end_time && (
                <span className="text-muted-foreground/60">– {session.end_time.slice(0, 5)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Role / status badge */}
        <span className={cn(
          'text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0',
          cfg.bg, cfg.text, cfg.border,
        )}>
          {cfg.label}
        </span>
      </div>

      {/* ── Details row ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Creator (only when not owner) */}
        {!isOwner && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-5 w-5 rounded-full overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center">
              {session.creator_photo_url ? (
                <img src={session.creator_photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[8px] font-bold text-primary">
                  {creatorName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <span className="truncate max-w-[120px]">{creatorName}</span>
          </div>
        )}

        {/* Players count */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          <span>
            <span className="font-semibold text-foreground">{session.current_players ?? 0}</span>
            /{session.max_players} joueurs
          </span>
        </div>

        {/* Level chip */}
        {levelMin && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">
            Niv.&nbsp;{levelMin}+
          </span>
        )}

        {/* Session status (cancelled / complete) */}
        {session.status === 'cancelled' && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-500">
            Annulée
          </span>
        )}
        {session.status === 'complete' && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Complète
          </span>
        )}
      </div>

      {/* ── Terrain info ─────────────────────────────────────────── */}
      {session.booking && (
        <div className="flex items-center gap-1.5 text-xs bg-muted/40 rounded-lg px-3 py-1.5">
          <MapPin className="h-3 w-3 shrink-0 text-primary" />
          <span className="font-medium text-foreground truncate">
            {session.booking.venue_name}
          </span>
          {session.booking.club_name && (
            <span className="text-muted-foreground/70">
              · {session.booking.club_name}
            </span>
          )}
        </div>
      )}

      {/* ── Rate button ──────────────────────────────────────────── */}
      {isPast && canRate && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRate(session); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors w-fit"
        >
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          Évaluer la session
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SessionHistory() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [tab,       setTab]       = useState('all');
  const [rateTarget, setRateTarget] = useState(null); // session to rate
  const [ratedIds,   setRatedIds]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('rated_sessions') ?? '[]'); } catch { return []; }
  });

  useEffect(() => {
    getSessionHistory()
      .then(({ sessions: s }) => setSessions(s ?? []))
      .catch((e) => setError(e.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sessions.filter((s) => {
    if (tab === 'mine')     return s.creator_id === user?.id;
    if (tab === 'joined')   return s.request_status === 'accepted';
    if (tab === 'requests') return s.request_status === 'pending' || s.request_status === 'refused';
    return true;
  });

  const groups = groupByMonth(filtered);

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Historique des sessions
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Toutes vos sessions — créées, rejointes ou demandées.
        </p>
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border overflow-x-auto no-scrollbar">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap shrink-0',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      {loading ? (
        <PageSkeleton icon="🎾" message="Chargement de l'historique..." layout="list" />
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">Aucune session</p>
          <p className="text-sm text-muted-foreground">
            {tab === 'all'
              ? "Vous n'avez pas encore participé à une session."
              : 'Aucune session dans cette catégorie.'}
          </p>
          <button
            onClick={() => navigate('/sessions')}
            className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Parcourir les sessions →
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <div key={group.key}>
              {/* Month separator */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground shrink-0">
                  {group.sessions.length} session{group.sessions.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {group.sessions.map((s) => {
                  const participated = s.creator_id === user?.id || s.request_status === 'accepted';
                  const canRate      = participated && !ratedIds.includes(s.id);
                  return (
                    <SessionHistoryCard
                      key={s.id}
                      session={s}
                      userId={user?.id}
                      canRate={canRate}
                      onRate={setRateTarget}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rating modal */}
      {rateTarget && (
        <RateModal
          session={rateTarget}
          onClose={() => setRateTarget(null)}
          onRated={(id) => {
            const next = [...ratedIds, id];
            setRatedIds(next);
            localStorage.setItem('rated_sessions', JSON.stringify(next));
          }}
        />
      )}
    </div>
  );
}
