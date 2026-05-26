import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, Sparkles, ChevronRight, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/App';
import { listSessions, requestJoin } from '@/api/sessions';
import { getMyBookings } from '@/api/bookings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Intermédiaire +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, note, icon: Icon, to }) {
  const inner = (
    <div className={cn(
      'rounded-xl border border-border bg-card p-5 space-y-2 transition-shadow',
      to && 'hover:shadow-sm',
    )}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

// ── Session row (compact, for dashboard preview) ───────────────────────────────
function SessionRow({ session, onJoin }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [errMsg, setErrMsg] = useState('');
  const isFull = (session.current_players ?? 0) >= session.max_players;

  async function handleJoin() {
    setState('loading');
    setErrMsg('');
    try {
      await onJoin(session.id);
      setState('done');
    } catch (err) {
      setErrMsg(err.message || 'Erreur.');
      setState('error');
    }
  }

  const str = (session.date ?? '').toString().slice(0, 10);
  const d = new Date(str + 'T00:00:00');

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:shadow-sm transition-shadow">
      {/* Date block */}
      <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-accent shrink-0">
        <span className="text-[9px] font-bold text-primary/60 uppercase leading-none">
          {d.toLocaleDateString('fr-FR', { month: 'short' })}
        </span>
        <span className="text-lg font-bold text-primary leading-none">{d.getDate()}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {session.time?.slice(0, 5) ?? '—'}
          {session.preferences?.level_min && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Niv. {session.preferences.level_min}+
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Users className="h-3 w-3" />
          {session.current_players ?? 0}/{session.max_players} joueurs
        </p>
      </div>

      {/* Action */}
      {state === 'done' ? (
        <span className="text-xs font-medium text-green-600">Envoyée ✓</span>
      ) : state === 'error' ? (
        <span className="text-xs text-red-600 text-right max-w-[90px]">{errMsg}</span>
      ) : isFull ? (
        <span className="text-xs text-muted-foreground">Complet</span>
      ) : (
        <Button size="sm" variant="outline" onClick={handleJoin} disabled={state === 'loading'}>
          {state === 'loading' ? '…' : 'Rejoindre'}
        </Button>
      )}
    </div>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, profile } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(null);

  useEffect(() => {
    listSessions({ status: 'open' })
      .then(({ sessions: s }) => setSessions(s ?? []))
      .catch((e) => setSessionsError(e.message))
      .finally(() => setSessionsLoading(false));

    getMyBookings()
      .then(({ bookings: b }) => setBookings(b ?? []))
      .catch(() => {}); // non-fatal
  }, []);

  async function handleJoin(sessionId) {
    await requestJoin(sessionId);
    const { sessions: s } = await listSessions({ status: 'open' });
    setSessions(s ?? []);
  }

  const upcoming = bookings.filter((b) => {
    const raw = b.session?.date ?? b.date;
    return raw && new Date(String(raw).slice(0, 10) + 'T00:00:00') >= new Date();
  });

  return (
    <div className="space-y-8">

      {/* Welcome */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Bonjour, {user?.first_name || user?.email?.split('@')[0]} 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Prêt à jouer aujourd'hui ?</p>
        </div>
        <Link to="/sessions">
          <Button>
            <Plus className="h-4 w-4" />
            Sessions
          </Button>
        </Link>
      </div>

      {/* Profile prompt (only if profile not configured) */}
      {profile === null && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Complétez votre profil joueur</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                L'IA analyse votre jeu pour trouver vos meilleurs partenaires.
              </p>
            </div>
          </div>
          <Link to="/profile/setup">
            <Button size="sm">Commencer</Button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Réservations à venir"
          value={upcoming.length}
          note="sessions confirmées"
          icon={CalendarDays}
          to="/calendar"
        />
        <StatCard
          label="Sessions ouvertes"
          value={sessionsLoading ? '…' : sessions.length}
          note="créneaux disponibles"
          icon={Users}
          to="/sessions"
        />
        <StatCard
          label="Mon niveau"
          value={profile ? (LEVEL_LABELS[profile.level] ?? `${profile.level}/7`) : '—'}
          note={profile?.style ?? (profile === null ? 'Profil non configuré' : '')}
          icon={Sparkles}
          to="/profile/setup"
        />
      </div>

      {/* Sessions preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Sessions disponibles</h2>
          <Link to="/sessions" className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
            Voir tout <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {sessionsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : sessionsError ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Impossible de charger les sessions. Réessayez plus tard.
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Aucune session disponible pour le moment.</p>
            <Link to="/sessions">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Créer la première session
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 4).map((s) => (
              <SessionRow key={s.id} session={s} onJoin={handleJoin} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
