import { useNavigate } from 'react-router-dom';

export default function Onboarding({ onDone }) {
  const navigate = useNavigate();

  function finish() {
    localStorage.setItem('onboarding_done', '1');
    onDone?.();
    navigate('/sessions', { replace: true });
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #0f2d1f, #1a3d2b)' }}
    >
      <div className="flex flex-col items-center text-center gap-8 max-w-xs w-full">
        {/* Logo / icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl text-5xl"
          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
        >
          🎾
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Bienvenue sur PadelConnect
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Trouvez des partenaires, réservez des terrains et progressez à Abidjan.
          </p>
        </div>

        <button
          onClick={finish}
          className="w-full flex items-center justify-center py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.97]"
          style={{
            background: '#74C69D',
            color: '#0f2d1f',
            boxShadow: '0 4px 20px rgba(116,198,157,0.4)',
          }}
        >
          Commencer
        </button>
      </div>
    </div>
  );
}
