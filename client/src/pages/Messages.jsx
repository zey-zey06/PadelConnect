import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Send, ArrowLeft, AlertCircle } from 'lucide-react';
import { getConversations, getMessages, sendMessage, markAsRead } from '@/api/messages';
import { getUserProfile } from '@/api/profile';
import { useAuth } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function formatTime(dateStr) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Hier';
  if (diff < 7)   return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function Avatar({ name, photo, size = 'md' }) {
  const initials = name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';
  const sz = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return (
    <div className={cn('rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden', sz)}>
      {photo
        ? <img src={photo} alt={name} className="h-full w-full object-cover" />
        : <span className="font-semibold text-primary">{initials}</span>
      }
    </div>
  );
}

function partnerDisplayName(p) {
  if (!p) return 'Joueur';
  return (p.first_name && p.last_name)
    ? `${p.first_name} ${p.last_name}`
    : p.email?.split('@')[0] ?? 'Joueur';
}

export default function Messages() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();

  const [conversations,   setConversations]   = useState([]);
  const [selectedUserId,  setSelectedUserId]  = useState(searchParams.get('userId') || null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages,        setMessages]        = useState([]);
  const [draft,           setDraft]           = useState('');
  const [sending,         setSending]         = useState(false);
  const [loadingConvs,    setLoadingConvs]    = useState(true);
  const [loadingMsgs,     setLoadingMsgs]     = useState(false);
  const [msgError,        setMsgError]        = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // ── Conversations list — poll every 5 s ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchConvs() {
      try {
        const { conversations: c } = await getConversations();
        if (!cancelled) setConversations(c ?? []);
      } catch { /* non-fatal */ }
      finally { if (!cancelled) setLoadingConvs(false); }
    }

    fetchConvs();
    const id = setInterval(fetchConvs, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // ── Resolve partner info when selectedUserId is not yet in conversations
  useEffect(() => {
    if (!selectedUserId) { setSelectedPartner(null); return; }

    const fromConvs = conversations.find((c) => c.partner_id === selectedUserId);
    if (fromConvs) {
      setSelectedPartner(fromConvs);
      return;
    }

    // Fallback: fetch profile
    getUserProfile(selectedUserId)
      .then(({ profile: p }) => {
        if (!p) return;
        setSelectedPartner({
          partner_id: selectedUserId,
          first_name: p.user_first_name,
          last_name:  p.user_last_name,
          email:      p.user_email,
          photo_url:  p.photo_url,
        });
      })
      .catch(() => {});
  }, [selectedUserId, conversations]);

  // ── Messages — load + poll every 5 s ────────────────────────────────
  useEffect(() => {
    if (!selectedUserId) return;
    let cancelled = false;

    async function fetchMsgs(showLoading = false) {
      if (showLoading) setLoadingMsgs(true);
      try {
        const { messages: m } = await getMessages(selectedUserId);
        if (!cancelled) setMessages(m ?? []);
      } catch (e) {
        if (!cancelled && showLoading) setMsgError(e.message || 'Erreur de chargement.');
      } finally {
        if (!cancelled && showLoading) setLoadingMsgs(false);
      }
    }

    setMessages([]);
    setMsgError(null);
    fetchMsgs(true);
    markAsRead(selectedUserId).catch(() => {});

    const id = setInterval(() => {
      fetchMsgs(false);
      markAsRead(selectedUserId).catch(() => {});
    }, 5000);

    return () => { cancelled = true; clearInterval(id); };
  }, [selectedUserId]);

  // ── Auto-scroll to latest message ───────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send ─────────────────────────────────────────────────────────────
  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !selectedUserId || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      const { message } = await sendMessage(selectedUserId, text);
      setMessages((prev) => [...prev, message]);
    } catch {
      setDraft(text); // restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  function selectConversation(partnerId) {
    setSelectedUserId(partnerId);
    navigate(`/messages?userId=${partnerId}`, { replace: true });
  }

  function handleBack() {
    setSelectedUserId(null);
    navigate('/messages', { replace: true });
  }

  const showChatPanel = !!selectedUserId;

  return (
    <div
      className="flex rounded-xl border border-border bg-card overflow-hidden"
      style={{ height: 'calc(100dvh - 14rem)' }}
    >
      {/* ── Conversations list ──────────────────────────────────────────── */}
      <div className={cn(
        'w-full md:w-72 shrink-0 border-r border-border flex flex-col',
        showChatPanel && 'hidden md:flex',
      )}>
        <div className="px-4 py-3 border-b border-border shrink-0">
          <h1 className="text-base font-semibold text-foreground">Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {loadingConvs ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-2.5 w-32 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Aucune conversation</p>
              <p className="text-xs text-muted-foreground">
                Tapez sur "Envoyer un message" depuis le profil d'un joueur pour démarrer.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const name       = partnerDisplayName(conv);
              const isSelected = conv.partner_id === selectedUserId;
              const isFromMe   = conv.last_sender_id === user?.id;
              return (
                <button
                  key={conv.partner_id}
                  onClick={() => selectConversation(conv.partner_id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                    isSelected && 'bg-primary/5',
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar name={name} photo={conv.photo_url} />
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] text-white font-bold flex items-center justify-center">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className={cn(
                        'text-sm truncate',
                        conv.unread_count > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground/80',
                      )}>
                        {name}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {conv.last_at ? formatTime(conv.last_at) : ''}
                      </span>
                    </div>
                    <p className={cn(
                      'text-xs truncate mt-0.5',
                      conv.unread_count > 0 ? 'text-foreground/70 font-medium' : 'text-muted-foreground',
                    )}>
                      {isFromMe ? 'Vous : ' : ''}{conv.last_content ?? ''}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0',
        !showChatPanel && 'hidden md:flex',
      )}>
        {!selectedUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12" />
            <div>
              <p className="font-medium text-foreground">Sélectionnez une conversation</p>
              <p className="text-sm mt-1">Choisissez un contact dans la liste pour commencer.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
              <button
                onClick={handleBack}
                className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {selectedPartner && (
                <>
                  <Avatar name={partnerDisplayName(selectedPartner)} photo={selectedPartner.photo_url} size="sm" />
                  <span className="font-semibold text-foreground text-sm">
                    {partnerDisplayName(selectedPartner)}
                  </span>
                </>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : msgError ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />{msgError}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8" />
                  <p className="text-sm">Démarrez la conversation</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[72%] rounded-2xl px-3.5 py-2 text-sm',
                        isMine
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm',
                      )}>
                        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={cn(
                          'text-[10px] mt-0.5 text-right leading-none',
                          isMine ? 'text-primary-foreground/60' : 'text-muted-foreground',
                        )}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="border-t border-border p-3 flex items-center gap-2 shrink-0"
            >
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire un message…"
                className="flex-1"
                disabled={sending}
                autoComplete="off"
              />
              <Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Envoyer">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
