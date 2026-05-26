import { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, Send, Users } from 'lucide-react';
import { getFriends } from '@/api/friends';
import { sendShareMessage } from '@/api/messages';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function friendDisplayName(f) {
  if (f.first_name || f.last_name) return `${f.first_name ?? ''} ${f.last_name ?? ''}`.trim();
  return f.username ?? 'Joueur';
}

function FriendAvatar({ name, photo }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center">
      {photo
        ? <img src={photo} alt={name} className="h-full w-full object-cover" />
        : <span className="text-xs font-bold text-primary select-none">{initials}</span>
      }
    </div>
  );
}

/**
 * Modal contact-picker for sharing a session or venue slot in chat.
 *
 * Props:
 *   shareType  – 'session_share' | 'slot_share'
 *   metadata   – object with the share payload
 *   onClose    – () => void
 */
export default function ShareContactPicker({ shareType, metadata, onClose }) {
  const [friends, setFriends]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search,  setSearch]    = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sending,  setSending]  = useState(false);
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    getFriends()
      .then(({ friends: f }) => setFriends(f ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = friends.filter((f) => {
    if (!search.trim()) return true;
    return friendDisplayName(f).toLowerCase().includes(search.toLowerCase());
  });

  function toggle(userId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSend() {
    if (selected.size === 0 || sending) return;
    setSending(true);
    await Promise.allSettled([...selected].map((uid) => sendShareMessage(uid, shareType, metadata)));
    setSending(false);
    setDone(true);
    setTimeout(onClose, 1400);
  }

  const isSession = shareType === 'session_share';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: isSession ? 'rgba(26,61,43,0.12)' : 'rgba(29,78,216,0.12)' }}
            >
              <Users className="h-3.5 w-3.5" style={{ color: isSession ? '#1A3D2B' : '#1d4ed8' }} />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {isSession ? 'Partager la session' : 'Partager ce créneau'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Search ──────────────────────────────────────────────── */}
        <div className="px-4 pt-3.5 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher un ami…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              className="w-full pl-8 pr-3 py-2 text-sm bg-accent/50 rounded-xl border border-transparent outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 transition-all"
            />
          </div>
        </div>

        {/* ── Friends list ─────────────────────────────────────────── */}
        <div className="px-2 max-h-60 overflow-y-auto">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="h-3 w-28 bg-muted animate-pulse rounded-full" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {search.trim() ? 'Aucun ami trouvé.' : 'Aucun ami pour l\'instant.'}
              </p>
            </div>
          ) : (
            filtered.map((f) => {
              const name       = friendDisplayName(f);
              const isSelected = selected.has(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(f.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                    isSelected ? 'bg-primary/8' : 'hover:bg-accent/60'
                  )}
                >
                  <FriendAvatar name={name} photo={f.photo_url} />
                  <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{name}</span>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="px-4 py-4 border-t border-border">
          {done ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Partagé avec {selected.size} ami{selected.size > 1 ? 's' : ''} !
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleSend}
              disabled={selected.size === 0 || sending}
            >
              {sending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {selected.size > 0
                    ? `Partager avec ${selected.size} ami${selected.size > 1 ? 's' : ''}`
                    : 'Sélectionner des amis'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
