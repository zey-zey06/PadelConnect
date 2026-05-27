import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, X, AlertCircle, MessageSquare, Zap, Target,
  UserPlus, UserCheck, UserX, Clock,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getUserProfile } from '@/api/profile';
import {
  getFriendStatus,
  sendFriendRequest,
  unfriend,
  acceptFriendRequest,
} from '@/api/friends';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Intermédiaire +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

const COVER_GRADIENTS = [
  'from-emerald-800 to-teal-900',
  'from-slate-700   to-slate-900',
  'from-green-800   to-emerald-950',
  'from-teal-700    to-cyan-900',
];

function coverGradient(userId) {
  if (!userId) return COVER_GRADIENTS[0];
  const idx = userId.charCodeAt(0) % COVER_GRADIENTS.length;
  return COVER_GRADIENTS[idx];
}

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
  const [friendStatus,  setFriendStatus]  = useState('none');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [visible,       setVisible]       = useState(false);

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

    const fetches = [getUserProfile(userId)];
    if (!isOwnProfile) fetches.push(getFriendStatus(userId));

    Promise.all(fetches.map((p) => p.catch(() => null)))
      .then(([profileRes, statusRes]) => {
        setProfile(profileRes?.profile ?? null);
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
        {/* Close button */}
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
              <div className="h-28 bg-muted animate-pulse" />
              <div className="px-4 py-4 space-y-3">
                <div className="h-16 rounded-xl bg-muted animate-pulse" />
                <div className="h-10 rounded-xl bg-muted animate-pulse" />
                <div className="h-20 rounded-xl bg-muted animate-pulse" />
              </div>
            </div>
          ) : error ? (
            <div className="m-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          ) : !profile && !loading ? (
            // No profile yet — show basic user info
            <div className="m-4 rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
              <User className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium text-foreground">Profil non configuré</p>
              <p className="text-sm text-muted-foreground">Ce joueur n'a pas encore renseigné son profil.</p>
            </div>
          ) : (
            <>
              {/* Cover photo (full width, extends to panel edges) */}
              <div className={cn(
                'h-28 w-[calc(100%+2rem)] -ml-4 bg-gradient-to-br relative',
                !coverUrl && coverGradient(userId),
              )}>
                {coverUrl && (
                  <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
                )}
              </div>

              {/* Profile info */}
              <div className="px-4 pb-4">
                {/* Avatar row */}
                <div className="flex items-end justify-between -mt-8 mb-3">
                  <div className="h-16 w-16 rounded-full border-4 border-background bg-muted overflow-hidden flex items-center justify-center shadow-md shrink-0">
                    {photoUrl ? (
                      <img src={photoUrl} alt={displayName} className="h-full w-full object-cover object-top" />
                    ) : (
                      <span className="text-sm font-black text-muted-foreground">{initials}</span>
                    )}
                  </div>
                  {level && (
                    <div className="text-right">
                      <span className="text-3xl font-black text-foreground">{level}</span>
                      {levelLabel && <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{levelLabel}</p>}
                    </div>
                  )}
                </div>

                {/* Name & bio */}
                <div className="space-y-0.5 mb-3">
                  {username && <p className="text-xs text-muted-foreground">@{username}</p>}
                  <h2 className="text-base font-bold text-foreground">{displayName}</h2>
                  {bio && <p className="text-sm text-foreground/80 leading-relaxed mt-1">{bio}</p>}
                </div>

                {/* Stats */}
                <div className="flex border border-border rounded-xl overflow-hidden mb-3">
                  <div className="flex-1 text-center py-2.5">
                    <p className="text-base font-bold text-foreground">{profile?.sessions_count ?? 0}</p>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Sessions</p>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="flex-1 text-center py-2.5">
                    <p className="text-base font-bold text-foreground">{profile?.friends_count ?? 0}</p>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Amis</p>
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                {(strengths.length > 0 || weaknesses.length > 0) && (
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-3 mb-3">
                    {strengths.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3 w-3 text-green-600" />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Points forts</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {strengths.map((s) => (
                            <span key={s} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {weaknesses.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3 w-3 text-orange-500" />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">À travailler</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {weaknesses.map((w) => (
                            <span key={w} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && !error && (
          <div className="shrink-0 px-4 py-3 border-t border-border">
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
            )}
          </div>
        )}
      </div>
    </>
  );
}
