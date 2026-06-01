import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, Users, MapPin,
  AlertCircle, CheckCircle2, XCircle, Plus, User,
} from 'lucide-react';
import { getSession, requestJoin, getSessionParticipants } from '@/api/sessions';
import { useAuth, usePlayerPanel } from '@/App';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Inter +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

function parseDate(val) {
  const s = (val ?? '').toString().slice(0, 10);
  return new Date(s + 'T00:00:00');
}

function fmtTime(t) {
  return t ? String(t).slice(0, 5).replace(':', 'h') : '';
}

// ── Countdown ────────────────────────────────────────────────────────────────
function countdown(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const dt = new Date(String(dateStr).slice(0, 10) + 'T' + String(timeStr).slice(0, 5) + ':00');
  if (isNaN(dt.getTime())) return null;
  const ms = dt - Date.now();
  if (ms < -30 * 60 * 1000) return null;
  if (ms <= 30 * 60 * 1000) return 'Maintenant !';
  if (ms < 60 * 60 * 1000) return `Dans ${Math.round(ms / 60000)} min`;
  if (ms < 24 * 60 * 60 * 1000) return `Dans ${Math.round(ms / 3600000)} h`;
  const d = Math.round(ms / 86400000);
  return `Dans ${d} jour${d > 1 ? 's' : ''}`;
}

// ── SessionDetail page ────────────────────────────────────────────────────────
export default function SessionDetail() {
  const { id }           = useParams();
  const navigate         = useNavigate();
  const { user }         = useAuth();
  const { openPlayerPanel } = usePlayerPanel();

  const [session,      setSession]      = useState(null);
  const [participants, setParticipants] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [joinState,    setJoinState]    = useState('idle'); // idle | loading | pending | error

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getSession(id),
      getSessionParticipants(id).catch(() => ({ participants: [] })),
    ])
      .then(([{ session: s }, { participants: p }]) => {
        setSession(s);
        setParticipants(p ?? []);
      })
      .catch((e) => setError(e.message || 'Session introuvable.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleJoin() {
    setJoinState('loading');
    try {
      await requestJoin(id);
      setJoinState('pending');
    } catch (e) {
      setJoinState('error');
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
        <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted animate-pulse" />
        <div className="h-12 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  // ── Error ──
  if (error || !session) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Retour
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error || 'Session introuvable.'}
        </div>
      </div>
    );
  }

  const d            = parseDate(session.date);
  const isOwner      = user?.id === session.creator_id;
  const filled       = session.current_players ?? 0;
  const total        = session.max_players ?? 4;
  const isFull       = session.status === 'complete' || filled >= total;
  const levelMin     = session.preferences?.level_min;
  const gender       = session.preferences?.gender;
  const creatorName  = [session.creator_first_name, session.creator_last_name].filter(Boolean).join(' ')
    || session.creator_email?.split('@')[0] || 'Joueur';
  const timer        = countdown(session.date, session.time);

  const GENDER_ICON    = { mixed: '⚧', women: '♀', men: '♂' };
  const GENDER_DISPLAY = { mixed: 'Mixte', women: 'Femmes', men: 'Hommes' };

  const players = (participants ?? []).filter((p) => p.role !== 'coach');
  const coaches  = (participants ?? []).filter((p) => p.role === 'coach');

  return (
    <div className="space-y-5 pb-8">

      {/* Back */}
      <button
        onClick={() => navigate('/sessions')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux sessions
      </button>

      {/* Session card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-primary/5 border-b border-border px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary/70 mb-1">Session</p>
            <h1 className="text-lg font-bold text-foreground capitalize">
              {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {fmtTime(session.time)}
                {session.end_time && ` – ${fmtTime(session.end_time)}`}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Status */}
            <span className={cn(
              'text-[11px] font-semibold px-2.5 py-1 rounded-full border',
              isFull ? 'bg-muted text-muted-foreground border-border'
                     : 'bg-green-50 text-green-700 border-green-200',
            )}>
              {isFull ? 'Complet' : 'Ouvert'}
            </span>
            {/* Countdown */}
            {timer && (
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                timer === 'Maintenant !' ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                  : timer.includes('min') || timer.includes(' h') ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200',
              )}>
                {timer}
              </span>
            )}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Tags */}
          {(levelMin || gender || session.location) && (
            <div className="flex items-center gap-2 flex-wrap">
              {levelMin && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/15">
                  Niv.{levelMin}+ requis
                </span>
              )}
              {gender && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-foreground/70 border border-border">
                  <span>{GENDER_ICON[gender]}</span> {GENDER_DISPLAY[gender]}
                </span>
              )}
              {session.location && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" />{session.location}
                </span>
              )}
            </div>
          )}

          {/* Organiser */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Organisateur</p>
            <button
              type="button"
              onClick={() => openPlayerPanel(session.creator_id)}
              className="flex items-center gap-3 w-full hover:bg-muted/40 rounded-xl p-2 -mx-2 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 shrink-0 ring-2 ring-border flex items-center justify-center">
                {session.creator_photo_url
                  ? <img src={session.creator_photo_url} alt={creatorName} className="h-full w-full object-cover" />
                  : <span className="text-xs font-bold text-primary">{creatorName.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{creatorName}</p>
                {session.creator_level && (
                  <p className="text-xs text-muted-foreground">
                    Niv.{session.creator_level}/7 · {LEVEL_LABELS[session.creator_level]}
                  </p>
                )}
              </div>
            </button>
          </div>

          {/* Players */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Joueurs · {filled}/{total}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {players.map((p) => {
                const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Joueur';
                return (
                  <button key={p.id} type="button" onClick={() => openPlayerPanel(p.id)} title={name}
                    className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 ring-2 ring-border hover:opacity-80 transition-opacity shrink-0 flex items-center justify-center">
                    {p.photo_url
                      ? <img src={p.photo_url} alt={name} className="h-full w-full object-cover" />
                      : <span className="text-[10px] font-bold text-primary">{name.slice(0, 2).toUpperCase()}</span>}
                  </button>
                );
              })}
              {Array.from({ length: Math.max(0, total - players.length) }, (_, i) => (
                <div key={`e${i}`} className="h-10 w-10 rounded-full border-2 border-dashed border-border/50 bg-background shrink-0" />
              ))}
            </div>
          </div>

          {/* Coaches */}
          {coaches.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Coachs · {coaches.length}
              </p>
              <div className="flex gap-2 flex-wrap">
                {coaches.map((c) => {
                  const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Coach';
                  return (
                    <button key={c.id} type="button" onClick={() => openPlayerPanel(c.id)}
                      className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-1.5 hover:bg-muted transition-colors">
                      <div className="h-7 w-7 rounded-full bg-amber-100 shrink-0 flex items-center justify-center">
                        {c.photo_url
                          ? <img src={c.photo_url} alt={name} className="h-full w-full object-cover rounded-full" />
                          : <span className="text-[9px] font-bold text-amber-700">{name.slice(0, 2).toUpperCase()}</span>}
                      </div>
                      <span className="text-xs font-medium text-foreground">{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Join CTA */}
      {!user ? (
        <Link to="/login">
          <Button className="w-full h-12">Se connecter pour rejoindre</Button>
        </Link>
      ) : isOwner ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm text-primary font-medium text-center">
          Vous organisez cette session.
        </div>
      ) : joinState === 'pending' ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3 flex items-center justify-center gap-2 text-sm text-green-700 font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Demande envoyée — en attente de confirmation.
        </div>
      ) : joinState === 'error' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />Erreur lors de la demande.
          </div>
          <Button className="w-full h-12" onClick={handleJoin} disabled={isFull}>Réessayer</Button>
        </div>
      ) : (
        <Button
          className="w-full h-12 text-base"
          onClick={handleJoin}
          disabled={isFull || joinState === 'loading'}
          variant={isFull ? 'outline' : 'default'}
        >
          {joinState === 'loading' ? (
            <span className="w-5 h-5 border-2 border-current/40 border-t-transparent rounded-full animate-spin" />
          ) : isFull ? (
            'Session complète'
          ) : (
            <><Plus className="h-5 w-5" /> Rejoindre cette session</>
          )}
        </Button>
      )}
    </div>
  );
}
