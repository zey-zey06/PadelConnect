import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, ArrowLeft, AlertCircle } from 'lucide-react';
import { getUserProfile } from '@/api/profile';
import { Button } from '@/components/ui/button';
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

export default function PlayerProfile() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // The display name comes from the URL — we don't expose emails here.
  // If you have the email available (e.g. from a request card), pass it via state.
  const name = history.state?.usr?.name ?? userId?.slice(0, 8) ?? 'Joueur';

  useEffect(() => {
    getUserProfile(userId)
      .then(({ profile: p }) => setProfile(p ?? null))
      .catch((e) => setError(e.message || 'Profil introuvable.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const level      = profile?.level ?? null;
  const levelLabel = LEVEL_LABELS[level] ?? '—';
  const gradient   = LEVEL_COLORS[level] ?? LEVEL_COLORS[6];
  const strengths  = Array.isArray(profile?.strengths)  ? profile.strengths  : [];
  const weaknesses = Array.isArray(profile?.weaknesses) ? profile.weaknesses : [];

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      {loading ? (
        <div className="w-full max-w-sm mx-auto h-96 bg-muted animate-pulse rounded-2xl" />
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : !profile ? (
        <div className="w-full max-w-sm mx-auto rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <User className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">Profil non configuré</p>
          <p className="text-sm text-muted-foreground">Ce joueur n'a pas encore renseigné son profil.</p>
        </div>
      ) : (
        <div className="w-full max-w-sm mx-auto">
          <div className={cn('relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10', `bg-gradient-to-b ${gradient}`)}>

            {/* Photo + overlay */}
            <div className="relative h-72 overflow-hidden">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={name} className="absolute inset-0 h-full w-full object-cover object-top" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <User className="h-24 w-24 text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Level */}
              {level && (
                <div className="absolute top-4 left-4 flex flex-col items-center leading-none">
                  <span className="text-5xl font-black text-white drop-shadow-lg">{level}</span>
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-0.5">
                    {levelLabel}
                  </span>
                </div>
              )}

              {/* Name + style */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                <p className="text-2xl font-black text-white tracking-tight uppercase drop-shadow-md">{name}</p>
                {profile.style && (
                  <p className="text-sm text-white/70 font-medium mt-0.5">{profile.style}</p>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="px-5 py-4 space-y-3 bg-white/5 backdrop-blur-sm">
              {strengths.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Points forts</p>
                  <div className="flex flex-wrap gap-1.5">
                    {strengths.map((s) => (
                      <span key={s} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {weaknesses.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Points faibles</p>
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
        </div>
      )}
    </div>
  );
}
