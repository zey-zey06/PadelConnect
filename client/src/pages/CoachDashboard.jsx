import { useState, useEffect } from 'react';
import { Dumbbell, CalendarDays, Users, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/App';
import { getMyCoachProfile, getCoachSessions } from '@/api/coaches';
import PageSkeleton from '@/components/PageSkeleton';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Intermédiaire +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ session }) {
  const d = new Date(String(session.date ?? '').slice(0, 10) + 'T00:00:00');
  const isPast = d < new Date();
  return (
    <div className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${isPast ? 'border-border bg-muted/30' : 'border-border bg-card hover:shadow-sm'} transition-shadow`}>
      <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0 ${isPast ? 'bg-muted' : 'bg-accent'}`}>
        <span className="text-[9px] font-bold uppercase leading-none text-muted-foreground">
          {d.toLocaleDateString('fr-FR', { month: 'short' })}
        </span>
        <span className={`text-lg font-bold leading-none ${isPast ? 'text-muted-foreground' : 'text-primary'}`}>
          {d.getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {d.toLocaleDateString('fr-FR', { weekday: 'long' })}
          <span className="ml-2 font-normal text-muted-foreground">
            à {session.time?.slice(0, 5)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Users className="h-3 w-3" />
          {session.current_players ?? 0}/{session.max_players} joueurs
          {session.preferences?.level_min && (
            <span className="ml-2">· Niv. {LEVEL_LABELS[session.preferences.level_min] ?? session.preferences.level_min}+</span>
          )}
        </p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        session.status === 'open'      ? 'bg-green-100 text-green-700' :
        session.status === 'full'      ? 'bg-blue-100 text-blue-700' :
        session.status === 'cancelled' ? 'bg-red-100 text-red-600' :
        'bg-muted text-muted-foreground'
      }`}>
        {session.status === 'open' ? 'Ouvert' : session.status === 'full' ? 'Complet' : session.status === 'cancelled' ? 'Annulé' : session.status}
      </span>
    </div>
  );
}

// ── CoachDashboard page ───────────────────────────────────────────────────────
export default function CoachDashboard() {
  const { user } = useAuth();

  const [coach,    setCoach]    = useState(null);
  const [sessions, setSessions] = useState({ upcoming: [], past: [] });
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [tab,      setTab]      = useState('upcoming');

  useEffect(() => {
    async function load() {
      try {
        const { coach: c } = await getMyCoachProfile();
        setCoach(c);
        const { sessions: s } = await getCoachSessions(c.id);
        setSessions(s ?? { upcoming: [], past: [] });
      } catch (err) {
        setError(err.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const displayed = tab === 'upcoming' ? sessions.upcoming : sessions.past;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Espace Coach</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bienvenue, {user?.email?.split('@')[0]} — vos séances d'entraînement.
          </p>
        </div>
      </div>

      {loading ? (
        <PageSkeleton icon="📊" message="Chargement de votre espace..." layout="list" />
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : (
        <>
          {/* Coach info */}
          {coach && (
            <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{coach.specialty ?? 'Coach padel'}</p>
                <p className="text-sm text-muted-foreground">
                  {coach.is_independent ? 'Coach indépendant' : 'Coach en club'}
                  {coach.rate != null && ` · ${Number(coach.rate).toLocaleString('fr-FR')} FCFA/h`}
                </p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">À venir</p>
              <p className="text-2xl font-bold text-foreground">{sessions.upcoming.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Passées</p>
              <p className="text-2xl font-bold text-foreground">{sessions.past.length}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            {['upcoming', 'past'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === t
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'upcoming' ? 'Sessions à venir' : 'Sessions passées'}
              </button>
            ))}
          </div>

          {/* Sessions list */}
          {displayed.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-2">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {tab === 'upcoming' ? 'Aucune session à venir.' : 'Aucune session passée.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((s) => <SessionCard key={s.id} session={s} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
