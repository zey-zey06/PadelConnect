import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, AlertCircle, Smile, Calendar, Clock, Building2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { getConversations, getMessages, sendMessage, markAsRead } from '@/api/messages';
import { getUserProfile } from '@/api/profile';
import { useAuth } from '@/App';
import { cn } from '@/lib/utils';

// ── Grain texture ──────────────────────────────────────────────────────────────
const NOISE_SVG = encodeURIComponent(
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="0.1"/></svg>`
);

const GRAIN_BG = {
  backgroundColor: '#F5F0E8',
  backgroundImage: `url("data:image/svg+xml,${NOISE_SVG}")`,
  backgroundRepeat: 'repeat',
  backgroundSize: '180px',
};

// ── Bubble styles ──────────────────────────────────────────────────────────────
const SENT_BUBBLE = {
  background: 'linear-gradient(145deg, #1A3D2B 0%, #14301f 100%)',
  color: '#FFFFFF',
  borderRadius: '50px 50px 10px 50px',
  padding: '10px 18px',
  maxWidth: '75%',
  wordBreak: 'break-word',
  boxShadow: '0 3px 14px rgba(26,61,43,0.28)',
};

const RECV_BUBBLE = {
  backgroundColor: '#FAFAF8',
  color: '#1a1a1a',
  borderRadius: '50px 50px 50px 10px',
  padding: '10px 18px',
  maxWidth: '75%',
  border: '1px solid rgba(0,0,0,0.07)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  wordBreak: 'break-word',
};

// ── Padel racket SVG ───────────────────────────────────────────────────────────
function PadelRacket({ style }) {
  return (
    <svg width="72" height="108" viewBox="0 0 72 108" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <clipPath id="rc">
          <ellipse cx="36" cy="38" rx="28" ry="32" />
        </clipPath>
      </defs>
      {/* Head */}
      <ellipse cx="36" cy="38" rx="28" ry="32" fill="#E8DDD0" stroke="#C4B49A" strokeWidth="2.5" />
      {/* Strings */}
      <g clipPath="url(#rc)" opacity="0.45">
        {[22, 28, 34, 36, 38, 44, 50].map((x) => (
          <line key={x} x1={x} y1="6" x2={x} y2="70" stroke="#8B7355" strokeWidth="0.7" />
        ))}
        {[14, 22, 30, 36, 42, 50, 58, 64].map((y) => (
          <line key={y} x1="8" y1={y} x2="64" y2={y} stroke="#8B7355" strokeWidth="0.7" />
        ))}
      </g>
      {/* Throat */}
      <path d="M28 68 L24 80 L48 80 L44 68 Z" fill="#C4B49A" />
      {/* Handle */}
      <rect x="28" y="78" width="16" height="26" rx="8" fill="#7B5F3A" />
      {[84, 90, 96].map((y) => (
        <rect key={y} x="28" y={y} width="16" height="1.5" rx="0.75" fill="#5A3F1C" opacity="0.4" />
      ))}
      <ellipse cx="36" cy="104" rx="9" ry="4" fill="#5A3F1C" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(dateStr) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Hier';
  if (diff < 7)   return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function Avatar({ name, photo, size = 'md', dot = false, dotBorder = '#ffffff' }) {
  const initials = name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';
  const sz = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-sm';
  return (
    <div className="relative shrink-0">
      <div
        className={cn('rounded-full flex items-center justify-center overflow-hidden font-bold', sz)}
        style={{ background: 'linear-gradient(135deg, #2D6A4F, #1A3D2B)' }}
      >
        {photo
          ? <img src={photo} alt={name} className="h-full w-full object-cover" />
          : <span className="text-white/90">{initials}</span>
        }
      </div>
      {dot && (
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400"
          style={{ border: `2px solid ${dotBorder}` }}
        />
      )}
    </div>
  );
}

function partnerDisplayName(p) {
  if (!p) return 'Joueur';
  if (p.first_name || p.last_name) return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return p.username ?? p.email?.split('@')[0] ?? 'Joueur';
}

// ── Session share bubble ───────────────────────────────────────────────────────
function SessionShareCard({ msg }) {
  const navigate = useNavigate();
  const m        = msg.metadata ?? {};
  const dateStr  = m.date ? m.date.slice(0, 10) : null;
  return (
    <div
      className="rounded-2xl overflow-hidden border border-border shadow-sm"
      style={{ maxWidth: '260px', minWidth: '180px' }}
    >
      <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ background: '#1A3D2B' }}>
        <Calendar className="h-3.5 w-3.5 shrink-0 text-white/70" />
        <span className="text-xs font-semibold text-white">Session partagée</span>
      </div>
      <div className="bg-white px-3.5 py-3 space-y-1.5">
        {m.creator_name && (
          <p className="text-xs font-semibold" style={{ color: '#111827' }}>{m.creator_name}</p>
        )}
        {dateStr && (
          <p className="text-xs flex items-center gap-1" style={{ color: '#6B7280' }}>
            <Clock className="h-3 w-3 shrink-0" />
            {new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', {
              weekday: 'short', day: 'numeric', month: 'short',
            })}
            {m.time && <span>· {m.time.slice(0, 5)}</span>}
          </p>
        )}
        {m.level_min && (
          <span
            className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(26,61,43,0.1)', color: '#1A3D2B' }}
          >
            Niv. {m.level_min}+
          </span>
        )}
        <button
          onClick={() => navigate('/sessions')}
          className="block w-full mt-1.5 py-1.5 rounded-lg text-xs font-semibold text-center transition-colors"
          style={{ background: 'rgba(26,61,43,0.12)', color: '#1A3D2B' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(26,61,43,0.22)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(26,61,43,0.12)'; }}
        >
          Rejoindre →
        </button>
      </div>
      <div className="bg-white px-3.5 pb-2.5 flex justify-end">
        <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{formatTime(msg.created_at)}</span>
      </div>
    </div>
  );
}

// ── Slot share bubble ──────────────────────────────────────────────────────────
function SlotShareCard({ msg }) {
  const navigate = useNavigate();
  const m        = msg.metadata ?? {};
  const dateStr  = m.date ? m.date.slice(0, 10) : null;
  return (
    <div
      className="rounded-2xl overflow-hidden border border-border shadow-sm"
      style={{ maxWidth: '260px', minWidth: '180px' }}
    >
      <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ background: '#1d4ed8' }}>
        <Building2 className="h-3.5 w-3.5 shrink-0 text-white/70" />
        <span className="text-xs font-semibold text-white">Terrain disponible</span>
      </div>
      <div className="bg-white px-3.5 py-3 space-y-1.5">
        {m.club_name && (
          <p className="text-xs font-semibold" style={{ color: '#111827' }}>{m.club_name}</p>
        )}
        {m.venue_name && (
          <p className="text-xs" style={{ color: '#6B7280' }}>{m.venue_name}</p>
        )}
        {dateStr && (
          <p className="text-xs flex items-center gap-1" style={{ color: '#6B7280' }}>
            <Clock className="h-3 w-3 shrink-0" />
            {new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', {
              weekday: 'short', day: 'numeric', month: 'short',
            })}
            {m.start_time && <span>· {m.start_time} – {m.end_time}</span>}
          </p>
        )}
        {m.price > 0 && (
          <p className="text-xs font-semibold" style={{ color: '#111827' }}>
            {Number(m.price).toLocaleString('fr-FR')} FCFA
          </p>
        )}
        <button
          onClick={() => m.club_id && navigate(`/clubs/${m.club_id}`)}
          className="block w-full mt-1.5 py-1.5 rounded-lg text-xs font-semibold text-center text-white transition-opacity"
          style={{ background: '#1d4ed8' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          Réserver →
        </button>
      </div>
      <div className="bg-white px-3.5 pb-2.5 flex justify-end">
        <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{formatTime(msg.created_at)}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
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
  const [showEmoji,       setShowEmoji]       = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const emojiRef       = useRef(null);

  // Conversations — poll every 5 s
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

  // Resolve partner info (from conversations list or fresh profile fetch)
  useEffect(() => {
    if (!selectedUserId) { setSelectedPartner(null); return; }
    const fromConvs = conversations.find((c) => c.partner_id === selectedUserId);
    if (fromConvs) { setSelectedPartner(fromConvs); return; }
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

  // Messages — load + poll every 5 s
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
    setMessages([]); setMsgError(null);
    fetchMsgs(true);
    markAsRead(selectedUserId).catch(() => {});
    const id = setInterval(() => {
      fetchMsgs(false);
      markAsRead(selectedUserId).catch(() => {});
    }, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [selectedUserId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    function onOutside(e) {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [showEmoji]);

  function handleEmojiClick({ emoji }) {
    setDraft((prev) => prev + emoji);
    inputRef.current?.focus();
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !selectedUserId || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      const { message } = await sendMessage(selectedUserId, text);
      setMessages((prev) => [...prev, message]);
    } catch { setDraft(text); }
    finally { setSending(false); inputRef.current?.focus(); }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
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
      className="flex overflow-hidden"
      style={{
        height: 'calc(100dvh - 14rem)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.07)',
      }}
    >

      {/* ══ LEFT: Conversation list ════════════════════════════════════════ */}
      <div
        className={cn('w-full md:w-72 shrink-0 flex flex-col', showChatPanel && 'hidden md:flex')}
        style={{ background: '#F8F6F2', borderRight: '1px solid rgba(0,0,0,0.06)' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 shrink-0">
          <h1 className="text-[17px] font-bold tracking-tight" style={{ color: '#1a1a1a' }}>
            Messages
          </h1>
          {!loadingConvs && (
            <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1.5">
          {loadingConvs ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-white">
                <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-20 bg-gray-100 animate-pulse rounded-full" />
                  <div className="h-2.5 w-28 bg-gray-100 animate-pulse rounded-full" />
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-4 text-center px-4">
              <PadelRacket style={{ opacity: 0.25 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>Aucune conversation</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: '#9CA3AF' }}>
                  Ouvrez le profil d'un joueur et tapez "Envoyer un message".
                </p>
              </div>
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
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all duration-150"
                  style={isSelected
                    ? { background: '#1A3D2B', boxShadow: '0 4px 14px rgba(26,61,43,0.28)' }
                    : { background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
                  }
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}
                >
                  <Avatar
                    name={name}
                    photo={conv.photo_url}
                    dot
                    dotBorder={isSelected ? '#1A3D2B' : '#ffffff'}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <span
                        className="text-sm truncate"
                        style={{
                          fontWeight: conv.unread_count > 0 || isSelected ? 600 : 500,
                          color: isSelected ? '#ffffff' : '#1a1a1a',
                        }}
                      >
                        {name}
                      </span>
                      <span className="text-[10px] shrink-0" style={{ color: isSelected ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
                        {conv.last_at ? formatTime(conv.last_at) : ''}
                      </span>
                    </div>
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{
                        color: isSelected ? 'rgba(255,255,255,0.65)' : conv.unread_count > 0 ? '#374151' : '#9CA3AF',
                        fontWeight: conv.unread_count > 0 && !isSelected ? 500 : 400,
                      }}
                    >
                      {isFromMe ? 'Vous : ' : ''}{conv.last_content ?? ''}
                    </p>
                  </div>
                  {conv.unread_count > 0 && !isSelected && (
                    <span
                      className="shrink-0 h-5 min-w-5 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                      style={{ background: '#1A3D2B' }}
                    >
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ══ RIGHT: Chat panel ══════════════════════════════════════════════ */}
      <div className={cn('flex-1 flex flex-col min-w-0 bg-white relative', !showChatPanel && 'hidden md:flex')}>

        {!selectedUserId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center" style={GRAIN_BG}>
            <PadelRacket style={{ opacity: 0.18 }} />
            <div>
              <p className="font-semibold" style={{ color: '#374151' }}>Sélectionnez une conversation</p>
              <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                Choisissez un contact dans la liste pour démarrer.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div
              className="px-4 py-3 flex items-center gap-3 shrink-0 bg-white"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
            >
              <button
                onClick={handleBack}
                className="md:hidden transition-colors"
                style={{ color: '#9CA3AF' }}
                aria-label="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {selectedPartner && (
                <>
                  <Avatar
                    name={partnerDisplayName(selectedPartner)}
                    photo={selectedPartner.photo_url}
                    size="sm"
                    dot
                  />
                  <div>
                    <p className="text-sm font-semibold leading-none" style={{ color: '#1a1a1a' }}>
                      {partnerDisplayName(selectedPartner)}
                    </p>
                    <p className="text-[10px] mt-0.5 font-medium" style={{ color: '#10B981' }}>
                      En ligne
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2.5" style={GRAIN_BG}>
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: '#1A3D2B', borderTopColor: 'transparent' }}
                  />
                </div>
              ) : msgError ? (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 backdrop-blur-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />{msgError}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <PadelRacket style={{ opacity: 0.18 }} />
                  <p className="text-sm font-medium" style={{ color: '#9CA3AF' }}>
                    Démarrez la conversation
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;

                  if (msg.type === 'session_share') {
                    return (
                      <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                        <SessionShareCard msg={msg} />
                      </div>
                    );
                  }

                  if (msg.type === 'slot_share') {
                    return (
                      <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                        <SlotShareCard msg={msg} />
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                      <div style={isMine ? SENT_BUBBLE : RECV_BUBBLE}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <p
                          className="text-[10px] mt-1 text-right leading-none"
                          style={{ color: isMine ? 'rgba(255,255,255,0.45)' : '#9CA3AF' }}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div
              className="shrink-0 bg-white"
              style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
            >
              {/* Emoji picker — floats above the input bar */}
              {showEmoji && (
                <div
                  ref={emojiRef}
                  className="absolute bottom-[70px] left-4 z-50"
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    skinTonesDisabled
                    searchDisabled={false}
                    height={340}
                    width={300}
                  />
                </div>
              )}

              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 px-4 py-3"
              >
                {/* Emoji toggle button */}
                <button
                  type="button"
                  onClick={() => setShowEmoji((v) => !v)}
                  aria-label="Emojis"
                  className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    background: showEmoji ? 'rgba(26,61,43,0.12)' : 'transparent',
                    color: showEmoji ? '#1A3D2B' : '#A89878',
                  }}
                >
                  <Smile className="h-5 w-5" />
                </button>

                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrire un message…"
                  disabled={sending}
                  autoComplete="off"
                  className="flex-1 text-sm outline-none transition-all duration-150"
                  style={{
                    background: '#F5F0E8',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '50px',
                    padding: '10px 18px',
                    color: '#1a1a1a',
                    boxShadow: 'none',
                  }}
                  onFocus={(e)  => { e.target.style.boxShadow = '0 0 0 2.5px rgba(26,61,43,0.18)'; }}
                  onBlur={(e)   => { e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  aria-label="Envoyer"
                  className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150"
                  style={{
                    background: draft.trim() && !sending ? '#1A3D2B' : '#E8E0D4',
                    boxShadow: draft.trim() && !sending ? '0 2px 10px rgba(26,61,43,0.3)' : 'none',
                    transform: draft.trim() && !sending ? 'scale(1)' : 'scale(0.95)',
                  }}
                  onMouseEnter={(e) => { if (draft.trim() && !sending) e.currentTarget.style.transform = 'scale(1.06)'; }}
                  onMouseLeave={(e) => { if (draft.trim() && !sending) e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <Send
                    className="h-4 w-4"
                    style={{ color: draft.trim() && !sending ? '#ffffff' : '#A89878', transform: 'translateX(1px)' }}
                  />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
