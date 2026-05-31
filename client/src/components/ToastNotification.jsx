import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Per-type configuration ────────────────────────────────────────────────────
const TYPE_CONFIG = {
  friend_request:    { accent: '#16a34a', icon: '🤝', title: "Demande d'ami",        path: '/notifications' },
  session_request:   { accent: '#ea580c', icon: '👥', title: 'Demande de session',   path: '/notifications' },
  session_invite:    { accent: '#ea580c', icon: '🏓', title: 'Invitation de session',path: '/sessions'      },
  request_accepted:  { accent: '#16a34a', icon: '✅', title: 'Demande acceptée',     path: '/sessions'      },
  request_refused:   { accent: '#dc2626', icon: '❌', title: 'Demande refusée',      path: '/history/sessions' },
  session_complete:  { accent: '#16a34a', icon: '🎉', title: 'Session complète',     path: '/sessions'      },
  booking_confirmed: { accent: '#16a34a', icon: '✅', title: 'Réservation confirmée',path: '/calendar'      },
  new_message:       { accent: '#2563eb', icon: '💬', title: 'Nouveau message',      path: '/messages'      },
  club_post:         { accent: '#7c3aed', icon: '📢', title: 'Nouvelle publication', path: '/clubs'         },
  club_ban:          { accent: '#dc2626', icon: '🚫', title: 'Compte suspendu',      path: '/notifications' },
  late_cancel:       { accent: '#ea580c', icon: '⚠️', title: 'Annulation tardive',   path: '/notifications' },
  no_show:           { accent: '#dc2626', icon: '⚠️', title: 'No-show enregistré',   path: '/notifications' },
};

const FALLBACK = { accent: '#1a3d2b', icon: '🔔', title: 'Notification', path: '/notifications' };

// ── Single toast card ─────────────────────────────────────────────────────────
function Toast({ toast, onDismiss }) {
  const navigate  = useNavigate();
  const timerRef  = useRef(null);
  const cfg       = TYPE_CONFIG[toast.type] ?? FALLBACK;

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, onDismiss]);

  function handleClick() {
    onDismiss(toast.id);
    navigate(cfg.path);
  }

  return (
    <div
      className="flex items-start gap-3 w-full max-w-sm rounded-2xl bg-white border border-border shadow-xl overflow-hidden cursor-pointer select-none"
      style={{
        borderLeft: `4px solid ${cfg.accent}`,
        animation: 'toastSlideDown 0.35s cubic-bezier(0.22,1,0.36,1) forwards',
      }}
      onClick={handleClick}
      role="alert"
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0 m-3 mr-0 text-xl"
        style={{ background: `${cfg.accent}18` }}
      >
        <span role="img" aria-hidden>{cfg.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-3">
        <p className="text-xs font-bold text-foreground leading-tight">{toast.title ?? cfg.title}</p>
        {toast.message && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
            {toast.message}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        className="shrink-0 p-2.5 mt-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg"
        aria-label="Fermer"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Auto-dismiss progress bar */}
      <div className="absolute bottom-0 left-0 h-[2px] w-full" style={{ background: `${cfg.accent}22` }}>
        <div
          className="h-full"
          style={{
            background: cfg.accent,
            animation: 'toastProgress 4s linear forwards',
          }}
        />
      </div>
    </div>
  );
}

// ── Container rendered at top of screen ───────────────────────────────────────
export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <>
      <style>{`
        @keyframes toastSlideDown {
          from { opacity: 0; transform: translateY(-20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      <div
        className="fixed top-20 right-4 z-[200] flex flex-col gap-2.5 pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto relative">
            <Toast toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </div>
    </>
  );
}
