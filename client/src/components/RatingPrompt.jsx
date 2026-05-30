import { useState } from 'react';
import { X } from 'lucide-react';
import { sendContactMessage } from '@/api/contact';

export default function RatingPrompt({ onDismiss }) {
  const [view,    setView]    = useState('ask');   // 'ask' | 'feedback' | 'done'
  const [text,    setText]    = useState('');
  const [sending, setSending] = useState(false);

  function handleLove() {
    localStorage.setItem('rating_done', '1');
    setView('done');
    setTimeout(onDismiss, 2000);
  }

  async function handleFeedback() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendContactMessage({
        name:    'Utilisateur PadelConnect',
        email:   'feedback@padelconnect.internal',
        subject: '⭐ Retour utilisateur',
        message: text.trim(),
      });
    } catch { /* non-fatal */ }
    finally {
      localStorage.setItem('rating_done', '1');
      setView('done');
      setTimeout(onDismiss, 2000);
    }
  }

  function handleLater() {
    // Remind again in 2 more sessions
    const cur = Number(localStorage.getItem('sessions_joined') ?? 0);
    localStorage.setItem('rating_threshold', String(cur + 2));
    onDismiss();
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white pb-8 px-6 pt-5 shadow-2xl"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1) forwards' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        {/* Dismiss */}
        <button
          onClick={handleLater}
          className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {view === 'ask' && (
          <div className="space-y-5 text-center">
            <div className="text-4xl">⭐</div>
            <div>
              <p className="text-lg font-bold text-foreground">Vous aimez PadelConnect ?</p>
              <p className="text-sm text-muted-foreground mt-1">Votre avis nous aide à améliorer l'app.</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleLove}
                className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                style={{ background: '#1a3d2b' }}
              >
                J'adore l'app 🎾
              </button>
              <button
                onClick={() => setView('feedback')}
                className="w-full py-3.5 rounded-2xl font-semibold border border-border text-foreground hover:bg-muted transition-colors"
              >
                J'ai des suggestions
              </button>
              <button
                onClick={handleLater}
                className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>
        )}

        {view === 'feedback' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">Dites-nous tout 💬</p>
              <p className="text-sm text-muted-foreground mt-1">Qu'est-ce qu'on peut améliorer ?</p>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Partagez votre expérience…"
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleFeedback}
              disabled={!text.trim() || sending}
              className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-40 transition-all active:scale-[0.98]"
              style={{ background: '#1a3d2b' }}
            >
              {sending ? 'Envoi…' : 'Envoyer'}
            </button>
            <button
              onClick={() => setView('ask')}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Retour
            </button>
          </div>
        )}

        {view === 'done' && (
          <div className="text-center py-4 space-y-3">
            <div className="text-4xl">🙏</div>
            <p className="text-base font-bold text-foreground">Merci beaucoup !</p>
            <p className="text-sm text-muted-foreground">Votre retour est précieux pour nous.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
