import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User, ArrowLeft, AlertCircle, MessageSquare,
  UserPlus, UserCheck, UserX, Clock, X, Pencil,
  Calendar, Users, ChevronRight, Zap, Target,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getUserProfile, getUserSessions } from '@/api/profile';
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

// ── Session detail modal ───────────────────────────────────────────────────────
function SessionModal({ session, onClose }) {
  if (!session) return null;
  const prefs    = session.preferences ?? {};
  const levelMin = prefs.level_min ?? null;
  const levelMax = prefs.level_max ?? null;
  const levelStr = levelMin && levelMax && levelMin !== levelMax
    ? `${levelMin} – ${levelMax}`
    : (levelMin ?? levelMax ?? '—');
  const dateStr  = session.date
    ? new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—';
  const genderMap = { male: 'Hommes', female: 'Femmes', mixed: 'Mixte', any: 'Tous' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Détails de la session</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground capitalize">{dateStr}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {session.time?.slice(0, 5) ?? '—'}
                {session.end_time ? ` – ${session.end_time.slice(0, 5)}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {session.current_players ?? 0}/{session.max_players ?? 4} joueurs
              </p>
              {levelMin && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Niveau {levelStr} · {genderMap[prefs.gender] ?? 'Tous'}
                </p>
              )}
            </div>
          </div>

          <div className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
            session.status === 'open'      ? 'bg-green-50 text-green-700 border border-green-200' :
            session.status === 'full'      ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                             'bg-muted    text-muted-foreground border border-border',
          )}>
            {session.status === 'open' ? 'Ouverte' : session.status === 'full' ? 'Complète' : session.status}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Session grid card ──────────────────────────────────────────────────────────
function SessionCard({ session, onClick }) {
  const prefs    = session.preferences ?? {};
  const level    = prefs.level_min ?? null;
  const dateStr  = session.date
    ? new Date(session.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase()
    : '—';
  const players  = `${session.current_players ?? 0}/${session.max_players ?? 4}`;

  return (
    <button
      onClick={onClick}
      className="aspect-square rounded-xl border border-border bg-card hover:bg-muted/60 transition-colors overflow-hidden flex flex-col justify-between p-3 text-left"
    >
      {/* Level badge */}
      {level && (
        <span className="self-start text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          Nv.{level}
        </span>
      )}

      {/* Date */}
      <div>
        <p className="text-sm font-black text-foreground leading-none">{dateStr}</p>
        {session.time && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{session.time.slice(0, 5)}</p>
        )}
      </div>

      {/* Players */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="h-3 w-3 shrink-0" />
        {players}
      </div>
    </button>
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
  const [activeSession, setActiveSession] = useState(null);
  const [showFriends, setShowFriends]   = useState(false);

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

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="h-2 bg-muted/40" />

      {/* ── Sessions grid ─────────────────────────────────────────── */}
      <div className="bg-background px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Sessions jouées
        </h2>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune session pour l'instant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onClick={() => setActiveSession(s)}
              />
            ))}
          </div>
        )}
      </div>

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
      {activeSession && (
        <SessionModal session={activeSession} onClose={() => setActiveSession(null)} />
      )}
      {showFriends && (
        <FriendsModal userId={userId} onClose={() => setShowFriends(false)} />
      )}
    </div>
  );
}
