import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Plus, ExternalLink, History, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { piaChatMessage, getPiaHistory, getPiaConversations } from '@/api/pia';
import { useAuth } from '@/App';

const RATE_LIMIT = 20;
const WELCOME    = 'Bonjour ! Je suis PIA, votre assistante PadelConnect. Comment puis-je vous aider ? 🎾';

const ROLE_LABELS = {
  player:      'Assistante joueur',
  venue_admin: 'Assistante gérant',
  super_admin: 'Assistante admin',
  coach:       'Assistante coach',
  ball_picker: 'Assistante',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMsgDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

/** Group conversations by calendar date (label → [conv, ...]) */
function groupByDate(conversations) {
  const groups = [];
  const seen   = {};
  for (const conv of conversations) {
    const label = new Date(conv.updated_at).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    if (!seen[label]) {
      seen[label] = [];
      groups.push({ label, items: seen[label] });
    }
    seen[label].push(conv);
  }
  return groups;
}

function shouldShowDateSeparator(msgs, idx) {
  if (idx === 0 || !msgs[idx]?.ts || !msgs[idx - 1]?.ts) return false;
  return msgs[idx].ts.slice(0, 10) !== msgs[idx - 1].ts.slice(0, 10);
}

/** Detect keywords and return contextual navigation buttons. */
function extractActions(text) {
  const actions = [];
  if (/\bsession/i.test(text))  actions.push({ label: 'Voir les sessions', path: '/sessions' });
  if (/\bclub/i.test(text))     actions.push({ label: 'Voir les clubs',    path: '/clubs'    });
  return actions;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PIAPanel({ onClose }) {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [historyLoading,  setHistoryLoading]  = useState(true);
  const [visible,         setVisible]         = useState(false);
  const [conversationId,  setConversationId]  = useState(null);
  const [rateLimited,     setRateLimited]     = useState(false);
  const [retryMinutes,    setRetryMinutes]    = useState(0);

  // ── History panel ─────────────────────────────────────────────────────────
  const [view,              setView]              = useState('chat');   // 'chat' | 'history'
  const [conversations,     setConversations]     = useState([]);
  const [convsLoading,      setConvsLoading]      = useState(false);
  const [convsLoaded,       setConvsLoaded]       = useState(false); // avoid re-fetching

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // ── Load history on mount ─────────────────────────────────────────────────
  useEffect(() => {
    getPiaHistory()
      .then(({ messages: hist, conversation_id: convId }) => {
        if (hist?.length) {
          setMessages(hist);
          setConversationId(convId);
        } else {
          setMessages([{ role: 'model', text: WELCOME, ts: new Date().toISOString() }]);
        }
      })
      .catch(() => {
        setMessages([{ role: 'model', text: WELCOME, ts: new Date().toISOString() }]);
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  // ── Animations ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 15);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!historyLoading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, historyLoading]);

  useEffect(() => {
    if (visible && !historyLoading) inputRef.current?.focus();
  }, [visible, historyLoading]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  function handleNewConversation() {
    setConversationId(null);
    setRateLimited(false);
    setView('chat');
    setMessages([{ role: 'model', text: WELCOME, ts: new Date().toISOString() }]);
  }

  async function openHistory() {
    setView('history');
    if (!convsLoaded) {
      setConvsLoading(true);
      try {
        const { conversations: convs } = await getPiaConversations();
        setConversations(convs ?? []);
        setConvsLoaded(true);
      } catch {
        setConversations([]);
      } finally {
        setConvsLoading(false);
      }
    }
  }

  async function loadConversation(convId) {
    setHistoryLoading(true);
    setView('chat');
    try {
      const { messages: hist, conversation_id: newConvId } = await getPiaHistory({ conversationId: convId });
      if (hist?.length) {
        setMessages(hist);
        setConversationId(newConvId);
      }
    } catch {
      // keep existing messages on error
    } finally {
      setHistoryLoading(false);
    }
  }

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || rateLimited || historyLoading) return;

    setInput('');
    const ts          = new Date().toISOString();
    const newMessages = [...messages, { role: 'user', text, ts }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build Gemini history from all messages except the current one
      // Skip the welcome message (it was not produced by the model)
      const history = newMessages
        .slice(0, -1)
        .filter((m) => m.text !== WELCOME)
        .map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

      const { response, conversation_id: convId } = await piaChatMessage(
        text, history, conversationId,
      );

      if (convId) setConversationId(convId);

      setMessages((prev) => [
        ...prev,
        {
          role:    'model',
          text:    response,
          ts:      new Date().toISOString(),
          actions: extractActions(response),
        },
      ]);
    } catch (err) {
      if (err.status === 429 && err.data?.retry_after_minutes) {
        setRateLimited(true);
        setRetryMinutes(err.data.retry_after_minutes);
        setMessages((prev) => prev.slice(0, -1)); // remove optimistic user msg
        setInput(text);                            // restore input
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: 'Désolée, une erreur est survenue. Veuillez réessayer. 🎾',
            ts:   new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, rateLimited, historyLoading, messages, conversationId]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const roleLabel = ROLE_LABELS[user?.role] ?? 'Assistante';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
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
          {view === 'history' ? (
            <button
              onClick={() => setView('chat')}
              className="text-white/80 hover:text-white transition-colors p-1 rounded"
              aria-label="Retour au chat"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">
              {view === 'history' ? 'Historique' : 'PIA'}
            </p>
            <p className="text-xs text-white/80 truncate">
              {view === 'history' ? 'Vos conversations passées' : roleLabel}
            </p>
          </div>
          {view === 'chat' && (
            <>
              <button
                onClick={handleNewConversation}
                title="Nouvelle conversation"
                className="text-white/80 hover:text-white transition-colors p-1 rounded"
                aria-label="Nouvelle conversation"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={openHistory}
                title="Historique"
                className="text-white/80 hover:text-white transition-colors p-1 rounded"
                aria-label="Historique des conversations"
              >
                <History className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded"
            aria-label="Fermer PIA"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Messages / History ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">

          {/* ── History view ──────────────────────────────────────────── */}
          {view === 'history' && (
            convsLoading ? (
              <div className="flex items-center justify-center h-full gap-1">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <History className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucune conversation enregistrée.</p>
                <button
                  onClick={() => setView('chat')}
                  className="text-xs text-primary hover:underline"
                >
                  Démarrer une conversation
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {groupByDate(conversations).map(({ label, items }) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      {label}
                    </p>
                    <div className="space-y-1">
                      {items.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => loadConversation(conv.id)}
                          className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-accent px-3 py-2.5 transition-colors"
                        >
                          <p className="text-sm font-medium text-foreground truncate leading-tight">
                            {conv.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Chat view ─────────────────────────────────────────────── */}
          {view === 'chat' && (historyLoading ? (
            <div className="flex items-center justify-center h-full gap-1">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i}>
                  {/* Date separator */}
                  {shouldShowDateSeparator(messages, i) && (
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground px-1 shrink-0">
                        {formatMsgDate(msg.ts)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mr-2 mt-0.5 shrink-0">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    )}

                    <div className="space-y-1.5 max-w-[75%]">
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                          ${msg.role === 'user'
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                          }`}
                      >
                        {msg.text}
                      </div>

                      {/* Contextual action buttons */}
                      {msg.actions?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pl-0.5">
                          {msg.actions.map((action) => (
                            <button
                              key={action.path}
                              onClick={() => { navigate(action.path); handleClose(); }}
                              className="flex items-center gap-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full px-3 py-1 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start items-center">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mr-2 shrink-0">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-2">
                    <div className="flex gap-1 items-center">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">PIA réfléchit…</span>
                  </div>
                </div>
              )}
            </>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Rate-limit banner */}
        {view === 'chat' && rateLimited && (
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700 text-center shrink-0">
            Limite de {RATE_LIMIT} messages/heure atteinte. Réessayez dans {retryMinutes} min.
          </div>
        )}

        {/* ── Input (hidden in history view) ──────────────────────────── */}
        {view === 'chat' && <div className="shrink-0 px-3 py-3 border-t border-border bg-white">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                rateLimited
                  ? `Limite atteinte — ${retryMinutes} min`
                  : 'Posez votre question…'
              }
              rows={1}
              disabled={loading || rateLimited || historyLoading}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm
                placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20
                disabled:opacity-50 overflow-y-auto no-scrollbar"
              style={{ minHeight: '38px', maxHeight: '96px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || rateLimited || historyLoading}
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
        </div>}
      </div>
    </>
  );
}
