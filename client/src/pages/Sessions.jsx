import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listSessions, createSession, requestJoin, getMySessions, getSessionRequests, respondToRequest } from '@/api/sessions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, AlertCircle, X, Filter, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/App';
import { cn } from '@/lib/utils';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Inter +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

// ── Organizer avatar + name ───────────────────────────────────────────────────
function OrganizerLine({ session }) {
  const name    = session.creator_email?.split('@')[0] ?? 'Joueur';
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <Link
      to={`/players/${session.creator_id}`}
      state={{ name }}
      className="flex items-center gap-1.5 group w-fit"
    >
      <div className="h-5 w-5 rounded-full overflow-hidden bg-primary/10 shrink-0 ring-1 ring-border">
        {session.creator_photo_url ? (
          <img src={session.creator_photo_url} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[8px] font-bold text-primary/70">
            {initials}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
        Organisé par <span className="font-medium capitalize">{name}</span>
        {session.creator_level && (
          <span className="ml-1 font-bold text-primary/70">· niv. {session.creator_level}</span>
        )}
      </span>
    </Link>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ session, onJoin }) {
  const { user } = useAuth();
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [msg, setMsg] = useState('');
  const isFull = (session.current_players ?? 0) >= session.max_players;
  const isOwner = user?.id === session.creator_id;
  const d = new Date(session.date);

  async function handleJoin() {
    setState('loading');
    setMsg('');
    try {
      await onJoin(session.id);
      setState('done');
    } catch (e) {
      setMsg(e.message || 'Erreur lors de la demande.');
      setState('error');
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 hover:shadow-sm transition-shadow flex flex-col">
      {/* Date + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-xl bg-accent shrink-0">
            <span className="text-[9px] font-bold text-primary/60 uppercase leading-none">
              {d.toLocaleDateString('fr-FR', { month: 'short' })}
            </span>
            <span className="text-2xl font-bold text-primary leading-none">{d.getDate()}</span>
          </div>
          <div>
            <p className="font-semibold text-foreground capitalize">
              {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-sm text-muted-foreground">{session.time?.slice(0, 5) ?? '—'}</p>
          </div>
        </div>
        <Badge variant={isFull ? 'secondary' : 'success'}>
          {isFull ? 'Complet' : 'Ouvert'}
        </Badge>
      </div>

      {/* Players + level */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {session.current_players ?? 0}/{session.max_players} joueurs confirmés
        </span>
        {session.preferences?.level_min && (
          <span>Niv. {LEVEL_LABELS[session.preferences.level_min] ?? session.preferences.level_min}+</span>
        )}
      </div>

      {/* Organizer */}
      <OrganizerLine session={session} />

      {/* Action */}
      <div className="mt-auto">
        {isOwner ? (
          <Link to="/clubs">
            <Button variant="outline" size="sm" className="w-full">
              Réserver un terrain
            </Button>
          </Link>
        ) : state === 'done' ? (
          <p className="text-sm font-medium text-green-600">
            Demande envoyée ✓ — le créateur vous répondra bientôt.
          </p>
        ) : state === 'error' ? (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />{msg}
          </p>
        ) : (
          <Button
            className="w-full"
            size="sm"
            onClick={handleJoin}
            disabled={isFull || state === 'loading'}
            variant={isFull ? 'outline' : 'default'}
          >
            {state === 'loading' ? 'Envoi…' : isFull ? 'Session complète' : 'Rejoindre cette session'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Create session modal ──────────────────────────────────────────────────────
function CreateSessionModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ date: '', time: '', max_players: 4, level_min: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  function set(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.date || !form.time) {
      setError('La date et l\'heure sont obligatoires.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        date: form.date,
        time: form.time,
        max_players: form.max_players,
        ...(form.level_min && { preferences: { level_min: form.level_min } }),
      };
      const result = await onCreate(payload);
      onClose(result.session ?? result);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(null); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Créer une session</h2>
          <button
            onClick={() => onClose(null)}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {/* Date + time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cs-date">Date</Label>
              <Input
                id="cs-date"
                type="date"
                min={today}
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-time">Heure</Label>
              <Input
                id="cs-time"
                type="time"
                value={form.time}
                onChange={(e) => set('time', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Max players */}
          <div className="space-y-2">
            <Label>Nombre de joueurs souhaité (vous inclus)</Label>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('max_players', n)}
                  className={cn(
                    'flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-all',
                    form.max_players === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground/70 border-border hover:border-primary/40'
                  )}
                >
                  {n} joueurs
                </button>
              ))}
            </div>
          </div>

          {/* Level min (optional) */}
          <div className="space-y-2">
            <Label>
              Niveau minimum{' '}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('level_min', form.level_min === n ? null : n)}
                  className={cn(
                    'w-9 h-9 rounded-lg border text-xs font-semibold transition-all',
                    form.level_min === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground/70 border-border hover:border-primary/40'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            {form.level_min && (
              <p className="text-xs text-muted-foreground">
                Niveau {LEVEL_LABELS[form.level_min]} minimum requis
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onClose(null)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Création…' : 'Créer la session'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Request row (inside a session managed by current user) ────────────────────
function RequestRow({ request, sessionId, onRespond }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [errMsg, setErrMsg] = useState('');
  const name = request.player_email?.split('@')[0] ?? 'Joueur';
  const strengths = Array.isArray(request.player_strengths) ? request.player_strengths : [];

  async function handle(status) {
    setState('loading');
    setErrMsg('');
    try {
      await onRespond(sessionId, request.id, status);
      setState('done');
    } catch (e) {
      setErrMsg(e.message || 'Erreur');
      setState('error');
    }
  }

  const statusColors = {
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    accepted: 'bg-green-50 text-green-700 border-green-200',
    refused:  'bg-red-50 text-red-600 border-red-200',
  };
  const statusLabel = { pending: 'En attente', accepted: 'Accepté', refused: 'Refusé' };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
      {/* Avatar */}
      <Link
        to={`/players/${request.player_id}`}
        state={{ name }}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
      >
        <div className="h-10 w-10 rounded-full overflow-hidden bg-muted ring-2 ring-border">
          {request.player_photo_url ? (
            <img src={request.player_photo_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-green-100">
              <span className="text-[11px] font-bold text-green-700 select-none">
                {name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link to={`/players/${request.player_id}`} state={{ name }} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-foreground hover:underline truncate capitalize">
            {name}
          </Link>
          {request.player_level && (
            <span className="shrink-0 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md">
              {request.player_level}/7
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {request.player_style && (
            <span className="text-xs text-muted-foreground">{request.player_style}</span>
          )}
          {strengths.slice(0, 3).map((s) => (
            <span key={s} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{s}</span>
          ))}
          {request.ai_score != null && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary/70">
              <Sparkles className="h-2.5 w-2.5" />{request.ai_score}%
            </span>
          )}
        </div>
      </div>

      {/* Status / actions */}
      {request.status !== 'pending' ? (
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border shrink-0', statusColors[request.status])}>
          {statusLabel[request.status]}
        </span>
      ) : state === 'done' ? (
        <span className="text-xs text-muted-foreground shrink-0">Répondu</span>
      ) : state === 'error' ? (
        <span className="text-xs text-red-600 shrink-0 max-w-[120px] text-right">{errMsg}</span>
      ) : (
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            disabled={state === 'loading'}
            onClick={() => handle('refused')}
            className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Refuser
          </Button>
          <Button
            size="sm"
            disabled={state === 'loading'}
            onClick={() => handle('accepted')}
            className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white border-0"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Accepter
          </Button>
        </div>
      )}
    </div>
  );
}

// ── My session card (with expandable requests) ────────────────────────────────
function MySessionCard({ session, autoOpen = false }) {
  const [requests,    setRequests]    = useState(null); // null = not loaded yet
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [open,        setOpen]        = useState(autoOpen);
  const d = new Date(session.date);

  const pending = (requests ?? []).filter((r) => r.status === 'pending').length;

  async function loadRequests() {
    setLoadingReqs(true);
    try {
      const { requests: r } = await getSessionRequests(session.id);
      setRequests(r ?? []);
    } catch {
      setRequests([]);
    } finally {
      setLoadingReqs(false);
    }
  }

  // Auto-fetch when navigated here from a notification
  useEffect(() => {
    if (autoOpen) loadRequests();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleRequests() {
    if (!open && requests === null) await loadRequests();
    setOpen((o) => !o);
  }

  async function handleRespond(sessionId, requestId, status) {
    await respondToRequest(sessionId, requestId, status);
    await loadRequests();
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={toggleRequests} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/40 transition-colors">
        {/* Date block */}
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-accent shrink-0">
          <span className="text-[9px] font-bold text-primary/60 uppercase">{d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
          <span className="text-xl font-bold text-primary leading-none">{d.getDate()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground capitalize">
            {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-sm text-muted-foreground">
            {session.time?.slice(0, 5)} · {session.current_players ?? 0}/{session.max_players} joueurs confirmés
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pending > 0 && (
            <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              {pending} en attente
            </span>
          )}
          <Badge variant={session.status === 'open' ? 'success' : 'secondary'}>
            {session.status === 'open' ? 'Ouverte' : session.status === 'complete' ? 'Complète' : 'Annulée'}
          </Badge>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-border pt-3 space-y-2">
          {loadingReqs ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : !requests?.length ? (
            <p className="text-sm text-muted-foreground text-center py-3">Aucune demande reçue.</p>
          ) : (
            requests.map((r) => (
              <RequestRow key={r.id} request={r} sessionId={session.id} onRespond={handleRespond} />
            ))
          )}
          <div className="pt-2 border-t border-border">
            <Link to="/clubs">
              <Button variant="outline" size="sm" className="w-full">
                Réserver un terrain
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── My sessions tab ───────────────────────────────────────────────────────────
function MySessions({ autoOpen = false }) {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    getMySessions()
      .then(({ sessions: s }) => setSessions(s ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-3">
      {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />{error}
    </div>
  );

  if (!sessions.length) return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-2">
      <Users className="h-8 w-8 text-muted-foreground mx-auto" />
      <p className="text-sm text-muted-foreground">Vous n'avez pas encore créé de session.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {sessions.map((s) => <MySessionCard key={s.id} session={s} autoOpen={autoOpen} />)}
    </div>
  );
}

// ── Sessions page ─────────────────────────────────────────────────────────────
export default function Sessions() {
  const [searchParams] = useSearchParams();
  const fromNotification = searchParams.get('tab') === 'mine';
  const [tab, setTab] = useState(fromNotification ? 'mine' : 'browse'); // browse | mine

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const [dateFilter,  setDateFilter]  = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const hasFilters = dateFilter || levelFilter;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { status: 'open' };
      if (dateFilter)  params.date      = dateFilter;
      if (levelFilter) params.level_min = levelFilter;
      const { sessions: s } = await listSessions(params);
      setSessions(s ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, levelFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleJoin(sessionId) {
    await requestJoin(sessionId);
    load();
  }

  async function handleCreate(data) {
    const result = await createSession(data);
    await load();
    return result;
  }

  return (
    <div className="space-y-6">
      {showCreate && (
        <CreateSessionModal
          onClose={(s) => { setShowCreate(false); if (s) load(); }}
          onCreate={handleCreate}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sessions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rejoignez ou créez une session de padel.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Créer une session
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'browse', label: 'Sessions disponibles' },
          { key: 'mine',   label: 'Mes sessions' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* My sessions tab */}
      {tab === 'mine' && <MySessions autoOpen={fromNotification} />}

      {/* Browse tab: filters + session list */}
      {tab === 'browse' && <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filtrer
        </span>

        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-8 w-[140px] text-sm"
        />

        <div className="flex gap-1">
          {[['', 'Tous'], ...Object.entries(LEVEL_LABELS).map(([k, v]) => [k, k])].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setLevelFilter(val === '' ? '' : Number(val))}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
                String(levelFilter) === String(val)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground/60 border-border hover:border-primary/40'
              )}
            >
              {val === '' ? 'Tous' : val}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={() => { setDateFilter(''); setLevelFilter(''); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> Réinitialiser
          </button>
        )}
      </div>}

      {tab === 'browse' && (loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-4">
          <Users className="h-8 w-8 text-muted-foreground mx-auto" />
          <div>
            <p className="font-medium text-foreground">Aucune session disponible</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasFilters
                ? 'Aucun résultat pour ces filtres. Essayez d\'en changer.'
                : 'Soyez le premier à créer une session !'}
            </p>
          </div>
          {!hasFilters && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Créer une session
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} onJoin={handleJoin} />
          ))}
        </div>
      ))}
    </div>
  );
}
