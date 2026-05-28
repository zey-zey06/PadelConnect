import { User } from 'lucide-react';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Inter +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

const BADGE_GRADIENT = { background: 'linear-gradient(135deg, #0f6e56, #1d9e75)' };

/**
 * Compact horizontal player card — used in session request lists.
 * Props:
 *   profile  — player_profile object (may be null)
 *   email    — user email (used as display name fallback)
 *   score    — optional AI compatibility score (0-100)
 */
export default function PlayerCard({ profile, email, score }) {
  const name       = email?.split('@')[0] ?? 'Joueur';
  const level      = profile?.level ?? null;
  const levelLabel = LEVEL_LABELS[level] ?? null;
  const style      = profile?.style ?? null;
  const strengths  = Array.isArray(profile?.strengths) ? profile.strengths : [];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:shadow-sm transition-shadow">

      {/* Avatar */}
      <div className="h-12 w-12 rounded-full overflow-hidden bg-muted shrink-0 border-[2px] border-white shadow-sm">
        {profile?.photo_url ? (
          <img
            src={profile.photo_url}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-[#e1f5ee]">
            <User className="h-5 w-5 text-[#085041]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground capitalize truncate">{name}</p>
          {level && (
            <span
              className="shrink-0 text-[10px] font-bold text-white px-2 py-0.5 rounded-full leading-none"
              style={BADGE_GRADIENT}
            >
              {level} · {levelLabel}
            </span>
          )}
        </div>
        {style && (
          <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#e6f1fb] text-[#1a6fa8] mt-0.5">
            {style}
          </span>
        )}
        {strengths.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {strengths.slice(0, 3).map((s) => (
              <span
                key={s}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#e1f5ee] text-[#085041] border border-[#5dcaa5]"
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
        <div className="shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-full border-2 border-[#5dcaa5]/40 bg-[#e1f5ee]">
          <span className="text-xs font-bold text-[#085041] leading-none">{score}</span>
          <span className="text-[8px] text-[#085041]/60 leading-none">%</span>
        </div>
      )}
    </div>
  );
}
