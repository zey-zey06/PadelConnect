import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '@/App';
import { cn } from '@/lib/utils';

// Simple inline padel racket — renders identically on all platforms
function RacketIcon({ className }) {
  return (
    <svg viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg"
      className={className} aria-hidden="true">
      <ellipse cx="10" cy="8.5" rx="7.5" ry="8" stroke="currentColor" strokeWidth="1.6" />
      <line x1="6.5" y1="5.5"  x2="13.5" y2="5.5"  stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.55" />
      <line x1="5.5" y1="8.5"  x2="14.5" y2="8.5"  stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.55" />
      <line x1="6.5" y1="11.5" x2="13.5" y2="11.5" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.55" />
      <line x1="8"   y1="1"    x2="8"    y2="16"   stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.55" />
      <line x1="10"  y1="0.5"  x2="10"   y2="16.5" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.55" />
      <line x1="12"  y1="1"    x2="12"   y2="16"   stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.55" />
      <line x1="10"  y1="16.5" x2="10"   y2="23"   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();

  // phase 0 → logo only (splash)
  // phase 1 → buttons mounted (still invisible, transition start)
  // phase 2 → buttons visible (transition end)
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1500);
    const t2 = setTimeout(() => setPhase(2), 1650);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!loading && user) return <Navigate to={homeFor(user)} replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden bg-[#0d2818]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f12] via-[#1A3D2B] to-[#0d2818]" />

      {/* Decorative court grid — bottom */}
      <div
        className="absolute bottom-0 inset-x-0 h-64 opacity-[0.07]"
        style={{
          backgroundImage: 'linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 right-[-15%] w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-[-10%] w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Logo — slides up when buttons appear */}
      <div
        className={cn(
          'relative z-10 flex flex-col items-center gap-4 transition-all duration-700 ease-out',
          phase >= 1 ? '-translate-y-6' : 'translate-y-0',
        )}
      >
        <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-sm">
          <span className="text-white font-bold text-4xl select-none">P</span>
        </div>
        <div className="text-center space-y-1">
          <p className="text-[2.2rem] font-bold tracking-tight leading-none">
            <span className="text-white">Padel</span>
            <span className="text-emerald-400">Connect</span>
          </p>
          <p className="text-white/35 text-sm tracking-wide">Abidjan</p>
        </div>
      </div>

      {/* Role buttons — fade + slide up from below */}
      {phase >= 1 && (
        <div
          className={cn(
            'relative z-10 w-full max-w-[300px] mt-10 space-y-3 transition-all duration-500 ease-out',
            phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
          )}
        >
          <Link
            to="/signup?role=player"
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-white text-[#1A3D2B] font-semibold text-base hover:bg-white/92 active:scale-[0.98] transition-all shadow-lg"
          >
            <RacketIcon className="w-5 h-5 text-[#1A3D2B]" />
            Je suis joueur
          </Link>

          <Link
            to="/signup?role=venue_admin"
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-white/10 text-white font-semibold text-base hover:bg-white/18 active:scale-[0.98] transition-all border border-white/20"
          >
            <span className="text-xl select-none">🏟️</span>
            Je suis gérant
          </Link>

          <Link
            to="/signup?role=coach"
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-white/10 text-white font-semibold text-base hover:bg-white/18 active:scale-[0.98] transition-all border border-white/20"
          >
            <span className="text-xl select-none">🎾</span>
            Je suis coach
          </Link>

          <Link
            to="/signup?role=tournament_organizer"
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-white/10 text-white font-semibold text-base hover:bg-white/18 active:scale-[0.98] transition-all border border-white/20"
          >
            <span className="text-xl select-none">🏆</span>
            Je suis organisateur de tournoi
          </Link>

          {/* Login link */}
          <div className="pt-3 text-center">
            <Link
              to="/login"
              className="text-white/45 text-sm hover:text-white/70 transition-colors"
            >
              J'ai déjà un compte —{' '}
              <span className="text-white/65 font-medium underline underline-offset-2">
                Se connecter
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
