import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';

const SLIDES = [
  {
    emoji: '🎾',
    title: 'Trouvez des partenaires',
    desc:  'Créez ou rejoignez des sessions de padel autour de vous. Matchez avec des joueurs de votre niveau.',
    bg:    'from-[#0f2d1f] to-[#1a3d2b]',
  },
  {
    emoji: '🏟️',
    title: 'Réservez des terrains',
    desc:  'Parcourez les clubs partenaires à Abidjan et réservez votre créneau en quelques secondes.',
    bg:    'from-[#1a2d3d] to-[#0f1e2d]',
  },
  {
    emoji: '🤖',
    title: 'Discutez avec PIA',
    desc:  'PIA, votre assistante IA padel, répond à toutes vos questions et vous aide à progresser.',
    bg:    'from-[#2d1a3d] to-[#1a0f2d]',
  },
];

export default function Onboarding({ onDone }) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);

  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  function finish() {
    localStorage.setItem('onboarding_done', '1');
    onDone?.();
    navigate('/sessions', { replace: true });
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6"
      style={{ background: `linear-gradient(160deg, ${slide.bg.replace('from-', '').replace(' to-', ', ')})` }}
    >
      {/* Skip */}
      <button
        onClick={finish}
        className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors p-2 rounded-lg"
        aria-label="Passer"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Slide content — key forces re-mount for smooth transition */}
      <div
        key={idx}
        className="flex flex-col items-center text-center gap-6 max-w-xs"
        style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) forwards' }}
      >
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
        >
          {slide.emoji}
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">{slide.title}</h1>
          <p className="text-sm text-white/70 leading-relaxed">{slide.desc}</p>
        </div>
      </div>

      {/* Dots + button */}
      <div className="absolute bottom-10 w-full px-6 flex flex-col items-center gap-6">
        {/* Progress dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="transition-all rounded-full"
              style={{
                width:      i === idx ? '24px' : '8px',
                height:     '8px',
                background: i === idx ? '#74C69D' : 'rgba(255,255,255,0.3)',
              }}
              aria-label={`Diapositive ${i + 1}`}
            />
          ))}
        </div>

        {/* Action button */}
        <button
          onClick={isLast ? finish : () => setIdx((v) => v + 1)}
          className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.97]"
          style={{ background: '#74C69D', color: '#0f2d1f', boxShadow: '0 4px 20px rgba(116,198,157,0.4)' }}
        >
          {isLast ? 'Commencer 🎾' : (
            <>Suivant <ChevronRight className="h-4 w-4" /></>
          )}
        </button>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
