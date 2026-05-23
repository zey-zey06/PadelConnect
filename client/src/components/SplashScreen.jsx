import { useEffect, useState } from 'react';

const SPLASH_STYLES = `
  @keyframes splashIcon {
    0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
    55%  { transform: scale(1.18) rotate(4deg); opacity: 1; }
    75%  { transform: scale(0.95) rotate(-1deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes splashSlideUp {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes splashFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes splashPulse {
    0%, 100% { opacity: 0.15; transform: scale(1); }
    50%       { opacity: 0.25; transform: scale(1.08); }
  }
  .splash-icon    { animation: splashIcon    0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  .splash-text    { animation: splashSlideUp 0.8s ease forwards 0.3s; opacity: 0; }
  .splash-tagline { animation: splashFadeIn  0.5s ease forwards 0.85s; opacity: 0; }
  .splash-glow    { animation: splashPulse   2s ease-in-out infinite; }
  .splash-screen  { transition: opacity 0.5s ease; }
  .splash-screen.hiding { opacity: 0; pointer-events: none; }
`;

export default function SplashScreen({ onDone }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const hideTimer = setTimeout(() => setHiding(true), 2000);
    const doneTimer = setTimeout(() => onDone(), 2500);
    return () => { clearTimeout(hideTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <>
      <style>{SPLASH_STYLES}</style>
      <div className={`splash-screen fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1A3D2B]${hiding ? ' hiding' : ''}`}>

        {/* Decorative background glow circles */}
        <div className="splash-glow absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-white blur-3xl" />
        <div className="splash-glow absolute bottom-1/4 right-1/3 w-60 h-60 rounded-full bg-emerald-300 blur-3xl" style={{ animationDelay: '0.7s' }} />

        {/* Logo icon */}
        <div className="splash-icon relative z-10 mb-5">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-28 h-28 rounded-full bg-white/10 blur-2xl" />
            <div className="relative w-24 h-24 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-sm">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                <span className="text-[#1A3D2B] font-black text-3xl leading-none select-none">P</span>
              </div>
            </div>
          </div>
        </div>

        {/* Brand name */}
        <div className="splash-text relative z-10 flex items-baseline gap-0.5 mb-3">
          <span className="text-white text-4xl font-bold tracking-tight">Padel</span>
          <span className="text-white/50 text-4xl font-bold tracking-tight">Connect</span>
        </div>

        {/* Tagline */}
        <p className="splash-tagline relative z-10 text-white/35 text-sm tracking-[0.2em] uppercase font-medium">
          Padel · Abidjan
        </p>
      </div>
    </>
  );
}
