import { User } from 'lucide-react';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Inter +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

/**
 * Compact horizontal player card — used in session request lists.
 * Props:
 *   profile  — player_profile object (may be null)
 *   email    — user email (used as display name fallback)
 *   score    — optional AI compatibility score (0-100)
 */
export default function PlayerCard({ profile, email, score }) {
  const name      = email?.split('@')[0] ?? 'Joueur';
  const strengths = Array.isArray(profile?.strengths) ? profile.strengths : [];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:shadow-sm transition-shadow">

      {/* Avatar */}
      <div className="h-12 w-12 rounded-full overflow-hidden bg-muted shrink-0 ring-2 ring-border">
        {profile?.photo_url ? (
          <img
            src={profile.photo_url}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-primary/10">
            <User className="h-5 w-5 text-primary/60" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground capitalize truncate">{name}</p>
          {profile?.level && (
            <span className="shrink-0 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md leading-none">
              {profile.level}/7
            </span>
          )}
        </div>
        {profile?.style && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.style}</p>
        )}
        {strengths.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {strengths.slice(0, 3).map((s) => (
              <span
                key={s}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200"
              >
                {s}
              </span>
            ))}
            {strengths.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{strengths.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* AI score (optional) */}
      {score != null && (
        <div className="shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-full border-2 border-primary/20 bg-primary/5">
          <span className="text-xs font-bold text-primary leading-none">{score}</span>
          <span className="text-[8px] text-primary/60 leading-none">%</span>
        </div>
      )}
    </div>
  );
}
