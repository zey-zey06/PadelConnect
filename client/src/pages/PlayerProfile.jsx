import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User, ArrowLeft, AlertCircle, MessageSquare,
  UserPlus, UserCheck, UserX, Clock, X, Pencil,
  Calendar, Users, ChevronRight, Zap, Target, Flag,
  BarChart2, TrendingUp, MapPin,
} from 'lucide-react';
import { useAuth, usePlayerPanel } from '@/App';
import { getUserProfile, getUserSessions, getSimilarPlayers } from '@/api/profile';
import { requestJoin } from '@/api/sessions';
import { reportUser } from '@/api/reports';
import {
  getFriendStatus,
  sendFriendRequest,
  unfriend,
  acceptFriendRequest,
  refuseFriendRequest,
  getUserFriends,
} from '@/api/friends';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ── Constants ─────────────────────────────────────────────────────────────────
const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Intermédiaire +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

const COVER_GRADIENT = { background: 'linear-gradient(135deg, #0f6e56, #1d9e75, #5dcaa5)' };

// ── Upcoming session card — shown on public profile ────────────────────────────
function UpcomingSessionCard({ session, isOwnSession }) {
  const [state, setState] = useState('idle'); // idle | loading | pending | error
  const prefs    = session.preferences ?? {};
  const levelMin = prefs.level_min ?? null;
  const filled   = session.current_players ?? 0;
  const total    = session.max_players ?? 4;
  const spots    = total - filled;
  const d        = new Date((session.date ?? '').toString().slice(0, 10) + 'T00:00:00');
  const dateStr  = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  async function handleJoin(e) {
    e.stopPropagation();
    setState('loading');
    try {
      await requestJoin(session.id);
      setState('pending');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5 space-y-2.5">
      {/* Date + time */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground capitalize truncate">{dateStr}</p>
        {session.time && (
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {session.time.slice(0, 5).replace(':', 'h')}
            {session.end_time ? `–${session.end_time.slice(0, 5).replace(':', 'h')}` : ''}
          </span>
        )}
      </div>

      {/* Tags row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {levelMin && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Nv.{levelMin}+
          </span>
        )}
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
          spots > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground border-border',
        )}>
          <Users className="inline h-2.5 w-2.5 mr-0.5" />
          {filled}/{total} · {spots > 0 ? `${spots} place${spots > 1 ? 's' : ''}` : 'Complet'}
        </span>
        {session.location && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 shrink-0" />{session.location}
          </span>
        )}
      </div>

      {/* Join button */}
      {!isOwnSession && (
        state === 'pending' ? (
          <p className="text-xs text-green-700 font-medium">Demande envoyée ✓</p>
        ) : state === 'error' ? (
          <p className="text-xs text-red-600">Erreur — réessayez.</p>
        ) : (
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            disabled={spots === 0 || state === 'loading'}
            onClick={handleJoin}
          >
            {state === 'loading' ? <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" /> : 'Rejoindre'}
          </Button>
        )
      )}
    </div>
  );
}

// ── Friends list modal ─────────────────────────────────────────────────────────
function FriendsModal({ userId, onClose }) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState(null);

  useEffect(() => {
    getUserFriends(userId).then((r) => setFriends(r.friends ?? [])).catch(() => setFriends([]));
  }, [userId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Amis</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {friends === null ? (
            <div className="p-5 flex justify-center">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun ami pour l'instant.</p>
          ) : (
            friends.map((f) => (
              <button
                key={f.id}
                onClick={() => { navigate(`/players/${f.id}`); onClose(); }}
                className="flex items-center gap-3 w-full px-5 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-full overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                  {f.photo_url
                    ? <img src={f.photo_url} alt="" className="h-full w-full object-cover" />
                    : <User className="h-5 w-5 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {[f.first_name, f.last_name].filter(Boolean).join(' ') || f.username || 'Joueur'}
                  </p>
                  {f.username && <p className="text-xs text-muted-foreground">@{f.username}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Friend action button ───────────────────────────────────────────────────────
function FriendButton({ friendStatus, targetUserId, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      if (friendStatus === 'none') {
        await sendFriendRequest(targetUserId);
        onStatusChange('pending_sent');
      } else if (friendStatus === 'pending_sent') {
        await unfriend(targetUserId);
        onStatusChange('none');
      } else if (friendStatus === 'pending_received') {
        await acceptFriendRequest(targetUserId);
        onStatusChange('accepted');
      } else if (friendStatus === 'accepted') {
        await unfriend(targetUserId);
        onStatusChange('none');
      }
    } catch { /* silently ignore */ }
    finally { setLoading(false); }
  }

  const map = {
    none:             { label: 'Ajouter en ami', icon: UserPlus,  variant: 'default' },
    pending_sent:     { label: 'Demande envoyée', icon: Clock,    variant: 'outline' },
    pending_received: { label: 'Accepter',        icon: UserCheck, variant: 'default' },
    accepted:         { label: 'Amis',            icon: UserX,    variant: 'outline' },
  };
  const cfg = map[friendStatus] ?? map.none;
  const Icon = cfg.icon;

  return (
    <Button
      size="sm"
      variant={cfg.variant}
      onClick={handle}
      disabled={loading}
      className="h-8 px-3 text-xs gap-1.5"
    >
      <Icon className="h-3.5 w-3.5" />
      {loading ? '…' : cfg.label}
    </Button>
  );
}

// ── Stats section ─────────────────────────────────────────────────────────────
function StatsSection({ sessions, sessionsCount, level }) {
  const total     = sessionsCount ?? sessions.length;
  const completed = sessions.filter((s) => s.status === 'complete').length;
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;
  const progress  = level ? Math.round((level / 7) * 100) : 0;

  return (
    <div className="bg-background px-4 py-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <BarChart2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Statistiques</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
          <p className="text-2xl font-bold text-foreground">{total}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Sessions jouées</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
          <p className="text-2xl font-bold text-foreground">{rate}%</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Taux de complétion</p>
        </div>
      </div>
      {level && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {LEVEL_LABELS[level] ?? `Niveau ${level}`}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Niv. {level}/7</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {level < 7 && (
            <p className="text-[10px] text-muted-foreground">
              Prochain niveau : {LEVEL_LABELS[level + 1]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Similar players section ────────────────────────────────────────────────────
function SimilarPlayersSection({ userId }) {
  const { openPlayerPanel } = usePlayerPanel();
  const [players, setPlayers] = useState(null);

  useEffect(() => {
    getSimilarPlayers(userId)
      .then((r) => setPlayers(r.players ?? []))
      .catch(() => setPlayers([]));
  }, [userId]);

  if (players === null) return null;
  if (players.length === 0) return null;

  return (
    <div className="bg-background px-4 py-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Joueurs similaires</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">Vous pourriez jouer ensemble !</p>
      <div className="space-y-2">
        {players.map((p) => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || 'Joueur';
          const initials = name.slice(0, 2).toUpperCase();
          return (
            <button
              key={p.id}
              onClick={() => openPlayerPanel(p.id)}
              className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-full overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                {p.photo_url
                  ? <img src={p.photo_url} alt={name} className="h-full w-full object-cover" />
                  : <span className="text-xs font-bold text-muted-foreground">{initials}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                {p.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
              </div>
              {p.level && (
                <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Nv.{p.level}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PlayerProfile() {
  const { userId }  = useParams();
  const navigate    = useNavigate();
  const { user: me } = useAuth();

  const [profile,      setProfile]      = useState(undefined);
  const [sessions,     setSessions]     = useState([]);
  const [friendStatus, setFriendStatus] = useState('none');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showFriends, setShowFriends] = useState(false);
  const [showReport,  setShowReport]  = useState(false);

  const isOwnProfile = me?.id === userId;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setProfile(undefined);
    setSessions([]);
    setFriendStatus('none');

    const fetches = [
      getUserProfile(userId),
      getUserSessions(userId),
    ];
    if (!isOwnProfile) fetches.push(getFriendStatus(userId));

    Promise.all(fetches.map((p) => p.catch(() => null)))
      .then(([profileRes, sessionsRes, statusRes]) => {
        setProfile(profileRes?.profile ?? null);
        setSessions(sessionsRes?.sessions ?? []);
        if (statusRes) setFriendStatus(statusRes.status ?? 'none');
      })
      .catch((e) => setError(e.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [userId, isOwnProfile]);

  // Derived display values
  const displayName  =
    (profile?.user_first_name && profile?.user_last_name)
      ? `${profile.user_first_name} ${profile.user_last_name}`
      : profile?.user_first_name ?? profile?.user_email?.split('@')[0] ?? 'Joueur';
  const username      = profile?.user_username ?? null;
  const bio           = profile?.bio ?? null;
  const level         = profile?.level ?? null;
  const levelLabel    = LEVEL_LABELS[level] ?? null;
  const photoUrl      = profile?.photo_url ?? null;
  const coverUrl      = profile?.cover_photo_url ?? null;
  const style         = profile?.style ?? null;
  const strengths     = Array.isArray(profile?.strengths)  ? profile.strengths  : [];
  const weaknesses    = Array.isArray(profile?.weaknesses) ? profile.weaknesses : [];
  const sessionsCount = profile?.sessions_count ?? sessions.length;
  const friendsCount  = profile?.friends_count ?? 0;
  const initials      = displayName.slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-[130px] rounded-2xl bg-muted animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />{error}
      </div>
    );
  }

  return (
    <div className="space-y-0">

      {/* ── Cover — edge-to-edge, starts at top ───────────────────── */}
      <div className="relative -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] md:w-[calc(100%+4rem)] lg:w-[calc(100%+6rem)]">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Cover — z-[1] creates a stacking context so the overhanging avatar
             renders above the profile-info section's bg-background */}
        <div
          className="h-[130px] w-full relative z-[1]"
          style={coverUrl ? undefined : COVER_GRADIENT}
        >
          {coverUrl && (
            <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
          )}
          {/* Level badge — top-right (back button is top-left, no conflict) */}
          {level && (
            <div className="absolute top-3 right-4 flex flex-col items-center bg-black/30 backdrop-blur-sm rounded-xl px-3 py-1.5 min-w-[44px]">
              <span className="text-xl font-black text-white leading-none">{level}</span>
              {levelLabel && (
                <span className="text-[8px] font-semibold text-white/80 uppercase tracking-wide mt-0.5 whitespace-nowrap">
                  {levelLabel}
                </span>
              )}
            </div>
          )}
          {/* Avatar — absolute at bottom of cover, hanging 42px below */}
          <div className="absolute bottom-[-42px] left-4 z-10 h-[84px] w-[84px] rounded-full border-[3px] border-white overflow-hidden flex items-center justify-center shadow-lg">
            {photoUrl ? (
              <img src={photoUrl} alt={displayName} className="h-full w-full object-cover object-top" />
            ) : (
              <span
                className="h-full w-full flex items-center justify-center text-xl font-black"
                style={{ background: '#e1f5ee', color: '#085041' }}
              >
                {initials}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Profile info ──────────────────────────────────────────── */}
      <div className="bg-background px-4 pb-4 pt-[50px]">

        {/* Action buttons */}
        <div className="flex justify-end mb-3">
          {isOwnProfile ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => navigate('/profile')}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Modifier le profil
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => navigate(`/messages?userId=${userId}`)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
              <FriendButton
                friendStatus={friendStatus}
                targetUserId={userId}
                onStatusChange={setFriendStatus}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-red-600"
                onClick={() => setShowReport(true)}
                title="Signaler ce joueur"
              >
                <Flag className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Name · username · style pill · bio */}
        <div className="space-y-1 mb-3">
          {username && (
            <p className="text-xs font-medium text-muted-foreground">@{username}</p>
          )}
          <h1 className="text-lg font-bold text-foreground leading-tight">{displayName}</h1>
          {style && (
            <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#e6f1fb] text-[#1a6fa8]">
              {style}
            </span>
          )}
          {bio && (
            <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed">{bio}</p>
          )}
        </div>

        {/* Stats row — Sessions + Amis */}
        <div className="flex border border-border rounded-xl overflow-hidden">
          <div className="flex-1 text-center py-3 px-2">
            <p className="text-lg font-bold text-foreground">{sessionsCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Sessions</p>
          </div>
          <div className="w-px bg-border" />
          <button
            className="flex-1 text-center py-3 px-2 hover:bg-muted/50 transition-colors"
            onClick={() => setShowFriends(true)}
          >
            <p className="text-lg font-bold text-foreground">{friendsCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Amis</p>
          </button>
        </div>
      </div>

      {/* ── Strengths & Weaknesses ────────────────────────────────── */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <>
          <div className="h-2 bg-muted/40" />
          <div className="bg-background px-4 py-4 space-y-3">
            {strengths.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-[#085041]" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Points forts</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {strengths.map((s) => (
                    <span
                      key={s}
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#e1f5ee] text-[#085041] border border-[#5dcaa5]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-[#ef9f27]" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">À travailler</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {weaknesses.map((w) => (
                    <span
                      key={w}
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#faeeda] text-[#633806] border border-[#ef9f27]"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="h-2 bg-muted/40" />
      <StatsSection sessions={sessions} sessionsCount={sessionsCount} level={level} />

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="h-2 bg-muted/40" />

      {/* ── Upcoming sessions ─────────────────────────────────────── */}
      <div className="bg-background px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Sessions à venir
        </h2>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-8 text-center">
            <Calendar className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune session ouverte pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <UpcomingSessionCard
                key={s.id}
                session={s}
                isOwnSession={isOwnProfile}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Similar players ──────────────────────────────────────── */}
      <div className="h-2 bg-muted/40" />
      <SimilarPlayersSection userId={userId} />

      {/* ── Pending request banner ────────────────────────────────── */}
      {friendStatus === 'pending_received' && !isOwnProfile && (
        <div className="mx-4 mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-foreground font-medium">Ce joueur vous a envoyé une demande d'ami.</p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => acceptFriendRequest(userId).then(() => setFriendStatus('accepted')).catch(() => {})}
              className="text-xs font-semibold text-green-700 hover:underline"
            >Accepter</button>
            <button
              onClick={() => refuseFriendRequest(userId).then(() => setFriendStatus('none')).catch(() => {})}
              className="text-xs font-semibold text-muted-foreground hover:underline"
            >Refuser</button>
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────── */}
      {showFriends && (
        <FriendsModal userId={userId} onClose={() => setShowFriends(false)} />
      )}
      {showReport && (
        <ReportModal userId={userId} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

// ── Report modal ───────────────────────────────────────────────────────────────
function ReportModal({ userId, onClose }) {
  const [reason,      setReason]      = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState(null);

  const REASONS = [
    { value: 'spam',          label: 'Spam ou publicité' },
    { value: 'inappropriate', label: 'Contenu inapproprié' },
    { value: 'fake',          label: 'Faux profil' },
    { value: 'other',         label: 'Autre raison' },
  ];

  async function handleSubmit() {
    if (!reason || loading) return;
    setLoading(true);
    setError(null);
    try {
      await reportUser({ reported_user_id: userId, reason, description: description.trim() });
      setDone(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      setError(err.message || 'Erreur lors du signalement.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-foreground">Signaler ce joueur</h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {done ? (
            <div className="flex items-center gap-2 py-4 text-sm font-medium text-green-700 justify-center">
              <span className="text-xl">✅</span> Signalement envoyé. Merci.
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Raison</p>
                {REASONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setReason(value)}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition-all',
                      reason === value
                        ? 'border-red-300 bg-red-50 text-red-700 font-medium'
                        : 'border-border bg-card text-foreground hover:border-red-200 hover:bg-red-50/50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Description <span className="font-normal normal-case">(optionnel)</span>
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Donnez plus de détails si nécessaire…"
                  rows={3}
                  maxLength={200}
                  className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!reason || loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 border-0 text-white"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                  ) : 'Signaler'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
