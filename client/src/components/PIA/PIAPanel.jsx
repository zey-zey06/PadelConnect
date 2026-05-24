import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { piaChatMessage } from '@/api/pia';
import { useAuth } from '@/App';

const ROLE_LABELS = {
  player:      'Assistante joueur',
  venue_admin: 'Assistante gérant',
  super_admin: 'Assistante admin',
  coach:       'Assistante coach',
  ball_picker: 'Assistante',
};

const WELCOME = 'Bonjour ! Je suis PIA, votre assistante PadelConnect. Comment puis-je vous aider ? 🎾';

/**
 * Slide-up chat panel for PIA.
 * Appears bottom-right, overlays the screen with a soft backdrop.
 */
export default function PIAPanel({ onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{ role: 'model', text: WELCOME }]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [visible, setVisible]   = useState(false);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  // Slide-in animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 15);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build Gemini history: skip hardcoded welcome, exclude current message
      const history = newMessages
        .slice(1)     // skip the pre-seeded welcome message
        .slice(0, -1) // exclude the current user message being sent now
        .map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

      const { response } = await piaChatMessage(text, history);
      setMessages((prev) => [...prev, { role: 'model', text: response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'Désolée, une erreur est survenue. Veuillez réessayer. 🎾' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const roleLabel = ROLE_LABELS[user?.role] ?? 'Assistante';

  return (
    <>
      {/* Soft backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Chat panel */}
      <div
        className={`fixed bottom-20 right-6 z-50
          w-[380px] max-w-[calc(100vw-1.5rem)]
          h-[520px] max-h-[calc(100vh-8rem)]
          flex flex-col rounded-2xl shadow-2xl border border-border bg-white overflow-hidden
          transform transition-all duration-[280ms] ease-out
          ${visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95'}`}
        role="dialog"
        aria-label="PIA — Assistante PadelConnect"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-primary text-white shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">PIA</p>
            <p className="text-xs text-white/80 truncate">{roleLabel}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded"
            aria-label="Fermer PIA"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Messages ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start items-center">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mr-2 shrink-0">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ───────────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 py-3 border-t border-border bg-white">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm
                placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20
                disabled:opacity-50 overflow-y-auto no-scrollbar"
              style={{ minHeight: '38px', maxHeight: '96px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="shrink-0 w-9 h-9 rounded-xl bg-primary hover:bg-primary/90
                disabled:opacity-40 disabled:cursor-not-allowed
                text-white flex items-center justify-center transition-colors"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            PIA peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </>
  );
}
