import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, X, AlertCircle, MessageSquare, Zap, Target,
  UserPlus, UserCheck, UserX, Clock, Share2,
  Calendar, Users, MapPin,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getUserProfile, getUserSessions } from '@/api/profile';
import { requestJoin } from '@/api/sessions';
import {
  getFriendStatus,
  sendFriendRequest,
  unfriend,
  acceptFriendRequest,
} from '@/api/friends';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ShareContactPicker from '@/components/ShareContactPicker';

// ── Mini session card used inside the panel ────────────────────────────────────
function PanelSessionCard({ session, isOwnSession }) {
  const [state, setState] = useState('idle');
  const prefs   = session.preferences ?? {};
  const levelMin = prefs.level_min ?? null;
  const filled  = session.current_players ?? 0;
  const total   = session.max_players ?? 4;
  const spots   = total - filled;
  const d       = new Date((session.date ?? '').toString().slice(0, 10) + 'T00:00:00');
  const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  async function handleJoin(e) {
    e.stopPropagation();
    setState('loading');
    try { await requestJoin(session.id); setState('pending'); }
    catch { setState('error'); }
  }

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground capitalize truncate">{dateStr}</p>
        {session.time && (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {session.time.slice(0, 5).replace(':', 'h')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {levelMin && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Nv.{levelMin}+
          </span>
        )}
        <span className={cn(
          'text-[9px] font-semibold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5',
          spots > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground border-border',
        )}>
          <Users className="h-2 w-2" />
          {filled}/{total}
        </span>
        {!isOwnSession && spots > 0 && (
          state === 'pending' ? (
            <span className="text-[9px] text-green-700 font-semibold">Demande envoyée ✓</span>
          ) : (
            <button
              onClick={handleJoin}
              disabled={state === 'loading'}
              className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {state === 'loading' ? '…' : 'Rejoindre'}
            </button>
          )
        )}
      </div>
    </div>
  );
}

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Intermédiaire +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

const COVER_GRADIENT = { background: 'linear-gradient(135deg, #0f6e56, #1d9e75, #5dcaa5)' };

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
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const map = {
    none:             { label: 'Ajouter en ami', icon: UserPlus,  variant: 'default' },
    pending_sent:     { label: 'Demande envoyée', icon: Clock,    variant: 'outline' },
    pending_received: { label: 'Accepter',        icon: UserCheck, variant: 'default' },
    accepted:         { label: 'Amis',            icon: UserX,    variant: 'outline' },
  };
  const cfg  = map[friendStatus] ?? map.none;
  const Icon = cfg.icon;

  return (
    <Button
      size="sm"
      variant={cfg.variant}
      onClick={handle}
      disabled={loading}
      className="h-8 flex-1 text-xs gap-1.5"
    >
      <Icon className="h-3.5 w-3.5" />
      {loading ? '…' : cfg.label}
    </Button>
  );
}

export default function PlayerProfilePanel({ userId, onClose }) {
  const navigate        = useNavigate();
  const { user: me }    = useAuth();
  const [profile,       setProfile]       = useState(undefined);
  const [sessions,      setSessions]      = useState([]);
  const [friendStatus,  setFriendStatus]  = useState('none');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [visible,       setVisible]       = useState(false);
  const [showShare,     setShowShare]     = useState(false);

  const isOwnProfile = me?.id === userId;

  // Slide in
  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => setVisible(true), 15);
    return () => clearTimeout(t);
  }, [userId]);

  // Fetch profile + friendship status
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    setProfile(undefined);
    setFriendStatus('none');

    const fetches = [getUserProfile(userId), getUserSessions(userId)];
    if (!isOwnProfile) fetches.push(getFriendStatus(userId));

    Promise.all(fetches.map((p) => p.catch(() => null)))
      .then(([profileRes, sessionsRes, statusRes]) => {
        setProfile(profileRes?.profile ?? null);
        setSessions(sessionsRes?.sessions ?? []);
        if (statusRes) setFriendStatus(statusRes.status ?? 'none');
      })
      .catch((e) => setError(e.message || 'Profil introuvable.'))
      .finally(() => setLoading(false));
  }, [userId, isOwnProfile]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  if (!userId) return null;

  const displayName =
    (profile?.user_first_name && profile?.user_last_name)
      ? `${profile.user_first_name} ${profile.user_last_name}`
      : profile?.user_first_name ?? profile?.user_email?.split('@')[0] ?? 'Joueur';
  const username   = profile?.user_username ?? null;
  const bio        = profile?.bio ?? null;
  const level      = profile?.level ?? null;
  const levelLabel = LEVEL_LABELS[level] ?? null;
  const photoUrl   = profile?.photo_url ?? null;
  const coverUrl   = profile?.cover_photo_url ?? null;
  const style      = profile?.style ?? null;
  const strengths  = Array.isArray(profile?.strengths)  ? profile.strengths  : [];
  const weaknesses = Array.isArray(profile?.weaknesses) ? profile.weaknesses : [];
  const initials   = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={handleClose}
      />

      {/* Slide panel */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-background shadow-2xl',
          'flex flex-col transform transition-transform duration-300 ease-in-out overflow-hidden',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Close button — floats over the cover */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div>
              <div className="h-[130px] bg-muted animate-pulse" />
              <div className="px-4 pt-[54px] pb-4 space-y-3">
                <div className="h-5 w-32 rounded-lg bg-muted animate-pulse" />
                <div className="h-10 rounded-xl bg-muted animate-pulse" />
                <div className="h-20 rounded-xl bg-muted animate-pulse" />
              </div>
            </div>
          ) : error ? (
            <div className="m-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          ) : !profile && !loading ? (
            <div className="m-4 rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
              <User className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium text-foreground">Profil non configuré</p>
              <p className="text-sm text-muted-foreground">Ce joueur n'a pas encore renseigné son profil.</p>
            </div>
          ) : (
            <>
              {/* ── Cover — z-[1] creates a stacking context so the overhanging
                   avatar renders above the profile-info section that follows */}
              <div
                className="h-[130px] w-full relative z-[1]"
                style={coverUrl ? undefined : COVER_GRADIENT}
              >
                {coverUrl && (
                  <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
                )}
                {/* Level badge — top-right, shifted left to clear the X button */}
                {level && (
                  <div className="absolute top-3 right-14 flex flex-col items-center bg-black/30 backdrop-blur-sm rounded-xl px-2.5 py-1.5 min-w-[40px]">
                    <span className="text-xl font-black text-white leading-none">{level}</span>
                    {levelLabel && (
                      <span className="text-[8px] font-semibold text-white/80 uppercase tracking-wide mt-0.5 whitespace-nowrap">
                        {levelLabel}
                      </span>
                    )}
                  </div>
                )}
                {/* Avatar — absolute at bottom of cover, hanging 42px below */}
                <div className="absolute bottom-[-42px] left-4 z-10 h-[84px] w-[84px] rounded-full border-[3px] border-white overflow-hidden flex items-center justify-center shadow-md">
                  {photoUrl ? (
                    <img src={photoUrl} alt={displayName} className="h-full w-full object-cover object-top" />
                  ) : (
                    <span
                      className="h-full w-full flex items-center justify-center text-base font-black"
                      style={{ background: '#e1f5ee', color: '#085041' }}
                    >
                      {initials}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Profile info ───────────────────────────────── */}
              <div className="px-4 pb-4 pt-[50px]">

                {/* Name · username · style pill · bio */}
                <div className="space-y-1 mb-3">
                  {username && <p className="text-xs text-muted-foreground">@{username}</p>}
                  <h2 className="text-base font-bold text-foreground">{displayName}</h2>
                  {style && (
                    <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#e6f1fb] text-[#1a6fa8]">
                      {style}
                    </span>
                  )}
                  {bio && <p className="text-sm text-foreground/80 leading-relaxed mt-1">{bio}</p>}
                </div>

                {/* Stats — Sessions + Amis */}
                <div className="flex border border-border rounded-xl overflow-hidden mb-3">
                  <div className="flex-1 text-center py-2.5">
                    <p className="text-lg font-bold text-foreground">{profile?.sessions_count ?? 0}</p>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Sessions</p>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="flex-1 text-center py-2.5">
                    <p className="text-lg font-bold text-foreground">{profile?.friends_count ?? 0}</p>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Amis</p>
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                {(strengths.length > 0 || weaknesses.length > 0) && (
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 space-y-3">
                    {strengths.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3 w-3 text-[#085041]" />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Points forts
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {strengths.map((s) => (
                            <span
                              key={s}
                              className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#e1f5ee] text-[#085041] border border-[#5dcaa5]"
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
                          <Target className="h-3 w-3 text-[#ef9f27]" />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            À travailler
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {weaknesses.map((w) => (
                            <span
                              key={w}
                              className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#faeeda] text-[#633806] border border-[#ef9f27]"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Upcoming sessions */}
                {sessions.length > 0 && (
                  <div className="mt-3 px-4 pb-4 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold text-foreground">Sessions à venir</p>
                    </div>
                    {sessions.slice(0, 3).map((s) => (
                      <PanelSessionCard key={s.id} session={s} isOwnSession={isOwnProfile} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && !error && (
          <div className="shrink-0 px-4 py-3 border-t border-border space-y-2">
            {isOwnProfile ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => { navigate('/profile'); handleClose(); }}
              >
                <User className="h-4 w-4 mr-2" />
                Voir mon profil
              </Button>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { navigate(`/messages?userId=${userId}`); handleClose(); }}
                  >
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    Message
                  </Button>
                  <FriendButton
                    friendStatus={friendStatus}
                    targetUserId={userId}
                    onStatusChange={setFriendStatus}
                  />
                </div>
                {profile && (
                  <Button
                    variant="outline"
                    className="w-full text-[#7c3aed] border-[#7c3aed]/30 hover:bg-[#7c3aed]/5 hover:border-[#7c3aed]/60"
                    onClick={() => setShowShare(true)}
                  >
                    <Share2 className="h-4 w-4 mr-1.5" />
                    Partager le profil
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showShare && profile && (
        <ShareContactPicker
          shareType="profile_share"
          metadata={{
            userId,
            name:      displayName,
            photo_url: photoUrl,
            level,
          }}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
