import { useState, useEffect } from 'react';
import { Dumbbell, CalendarDays, Users, AlertCircle, Clock, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/App';
import { getMyCoachProfile, getCoachSessions, getMyInvitations, respondToInvitation } from '@/api/coaches';
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

  const [coach,       setCoach]       = useState(null);
  const [sessions,    setSessions]    = useState({ upcoming: [], past: [] });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [tab,         setTab]         = useState('upcoming');
  const [invitations, setInvitations] = useState([]);
  const [invLoading,  setInvLoading]  = useState(false);
  const [invAction,   setInvAction]   = useState(null); // id of invitation being processed

  useEffect(() => {
    async function load() {
      try {
        const { coach: c } = await getMyCoachProfile();
        setCoach(c);
        const [sessData, invData] = await Promise.allSettled([
          getCoachSessions(c.id),
          getMyInvitations(),
        ]);
        if (sessData.status === 'fulfilled') {
          setSessions(sessData.value?.sessions ?? { upcoming: [], past: [] });
        }
        if (invData.status === 'fulfilled') {
          setInvitations(invData.value?.invitations ?? []);
        }
      } catch (err) {
        setError(err.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleInvitation(invId, status) {
    setInvAction(invId);
    try {
      await respondToInvitation(invId, status);
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
    } catch {
      // silently ignore — invitation will stay visible
    } finally {
      setInvAction(null);
    }
  }

  const displayed = tab === 'upcoming' ? sessions.upcoming : sessions.past;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Espace Coach</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bienvenue, {user?.first_name || user?.email?.split('@')[0]} — vos séances d'entraînement.
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

          {/* ── Club invitations ──────────────────────────────────── */}
          {invitations.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-600 shrink-0" />
                <h2 className="text-sm font-semibold text-amber-800">
                  Invitations de clubs ({invitations.length})
                </h2>
              </div>
              <div className="space-y-2">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv.organization_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Invité par {inv.inviter_first_name ?? ''} {inv.inviter_last_name ?? ''} ·{' '}
                        {new Date(inv.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleInvitation(inv.id, 'accepted')}
                        disabled={invAction === inv.id}
                        className="flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Accepter
                      </button>
                      <button
                        onClick={() => handleInvitation(inv.id, 'refused')}
                        disabled={invAction === inv.id}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-white hover:bg-muted disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-foreground transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
