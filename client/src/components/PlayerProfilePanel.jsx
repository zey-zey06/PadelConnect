import { useState, useEffect } from 'react';
import { User, X, Zap, Target, AlertCircle } from 'lucide-react';
import { getUserProfile } from '@/api/profile';
import { cn } from '@/lib/utils';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Intermédiaire +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

const LEVEL_COLORS = {
  1: 'from-slate-600  to-slate-800',
  2: 'from-stone-600  to-stone-800',
  3: 'from-emerald-700 to-emerald-900',
  4: 'from-teal-700   to-teal-900',
  5: 'from-green-700  to-green-900',
  6: 'from-[#1A3D2B]  to-[#0f2318]',
  7: 'from-[#1A3D2B]  to-black',
};

export default function PlayerProfilePanel({ userId, onClose }) {
  const [profile,  setProfile]  = useState(undefined);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [visible,  setVisible]  = useState(false);

  // Slide in shortly after mount so the transition is visible
  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => setVisible(true), 15);
    return () => clearTimeout(t);
  }, [userId]);

  // Fetch profile whenever userId changes
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    setProfile(undefined);
    getUserProfile(userId)
      .then(({ profile: p }) => setProfile(p ?? null))
      .catch((e) => setError(e.message || 'Profil introuvable.'))
      .finally(() => setLoading(false));
  }, [userId]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280); // wait for slide-out animation
  }

  if (!userId) return null;

  const displayName =
    (profile?.user_first_name && profile?.user_last_name)
      ? `${profile.user_first_name} ${profile.user_last_name}`
      : profile?.user_email?.split('@')[0] ?? 'Joueur';
  const level      = profile?.level ?? null;
  const levelLabel = LEVEL_LABELS[level] ?? null;
  const gradient   = LEVEL_COLORS[level] ?? LEVEL_COLORS[6];
  const strengths  = Array.isArray(profile?.strengths)  ? profile.strengths  : [];
  const weaknesses = Array.isArray(profile?.weaknesses) ? profile.weaknesses : [];

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

      {/* Slide panel — from the right */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-background shadow-2xl',
          'flex flex-col transform transition-transform duration-300 ease-in-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">Profil joueur</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-64 rounded-2xl bg-muted animate-pulse" />
              <div className="h-24 rounded-2xl bg-muted animate-pulse" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          ) : !profile ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
              <User className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium text-foreground">Profil non configuré</p>
              <p className="text-sm text-muted-foreground">Ce joueur n'a pas encore renseigné son profil.</p>
            </div>
          ) : (
            <div className={cn('relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10', `bg-gradient-to-b ${gradient}`)}>

              {/* Photo */}
              <div className="relative h-64 overflow-hidden">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt={displayName} className="absolute inset-0 h-full w-full object-cover object-top" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <User className="h-20 w-20 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Level badge */}
                {level && (
                  <div className="absolute top-4 left-4 flex flex-col items-center leading-none">
                    <span className="text-5xl font-black text-white drop-shadow-lg">{level}</span>
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-0.5">
                      {levelLabel}
                    </span>
                  </div>
                )}

                {/* Name + style */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <p className="text-xl font-black text-white tracking-tight uppercase drop-shadow-md">{displayName}</p>
                  {profile.style && (
                    <p className="text-sm text-white/65 font-medium mt-0.5">{profile.style}</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="px-5 py-4 space-y-4 bg-black/30 backdrop-blur-sm">
                {strengths.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-green-400" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Points forts</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {strengths.map((s) => (
                        <span key={s} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {weaknesses.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3 w-3 text-orange-400" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">À travailler</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {weaknesses.map((w) => (
                        <span key={w} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
                {!strengths.length && !weaknesses.length && (
                  <p className="text-sm text-white/40 text-center py-2">Aucune information renseignée</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
