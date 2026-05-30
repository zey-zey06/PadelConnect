import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, X, User, ChevronLeft } from 'lucide-react';
import { useAuth, usePlayerPanel } from '@/App';
import { logout } from '@/api/auth';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { getUnreadCount, getNotifications } from '@/api/notifications';
import { getUnreadMsgCount } from '@/api/messages';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PIAButton from '@/components/PIA/PIAButton';
import PIAPanel from '@/components/PIA/PIAPanel';
import BottomNav          from '@/components/BottomNav';
import SearchBar          from '@/components/SearchBar';
import NetworkStatus      from '@/components/NetworkStatus';
import ToastContainer     from '@/components/ToastNotification';
import { getVapidKey, subscribePush } from '@/api/push';

// Converts a URL-safe base64 VAPID public key to a Uint8Array for pushManager.subscribe
function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - base64String.length % 4) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const NOTIF_TITLE = {
  friend_request:    "Demande d'ami",
  session_request:   'Demande de session',
  session_invite:    'Invitation de session',
  request_accepted:  'Demande acceptée',
  request_refused:   'Demande refusée',
  session_complete:  'Session complète',
  booking_confirmed: 'Réservation confirmée',
  club_post:         'Nouvelle publication',
  club_ban:          'Compte suspendu',
  late_cancel:       'Annulation tardive',
  no_show:           'No-show enregistré',
};

// Nav link keys — labels resolved at render time via useTranslation()
const PLAYER_NAV_KEYS = [
  { to: '/sessions',  key: 'nav.sessions'  },
  { to: '/calendar',  key: 'nav.calendar'  },
  { to: '/clubs',     key: 'nav.clubs'     },
  { to: '/history',   key: 'nav.history'   },
  { to: '/messages',  key: 'nav.messages'  },
  { to: '/profile',   key: 'nav.profile'   },
];

const COACH_NAV_KEYS = [
  { to: '/coach/dashboard', key: 'nav.mySpace'  },
  { to: '/sessions',        key: 'nav.sessions' },
  { to: '/clubs',           key: 'nav.clubs'    },
  { to: '/profile',         key: 'nav.profile'  },
];

const MANAGER_NAV_KEYS = [
  { to: '/manager/dashboard', key: 'nav.dashboard' },
  { to: '/manager/profile',   key: 'nav.myClub'    },
];

const ADMIN_NAV_KEYS = [
  { to: '/admin/dashboard', key: 'nav.dashboard' },
  { to: '/clubs',           key: 'nav.clubs'     },
];

export default function Layout({ children }) {
  const { user, setUser, profile } = useAuth();
  const { panelUserId } = usePlayerPanel();
  const { t } = useTranslation();

  const NAV_KEY_LIST =
    user?.role === 'venue_admin' ? MANAGER_NAV_KEYS :
    user?.role === 'super_admin' ? ADMIN_NAV_KEYS :
    user?.role === 'coach'       ? COACH_NAV_KEYS  :
    PLAYER_NAV_KEYS;

  // Resolve translation keys — fall back to static strings if key is missing
  const NAV_LINKS = NAV_KEY_LIST.map(({ to, key }) => ({
    to,
    label: t(key, {
      defaultValue: key.replace('nav.', ''),
    }),
  }));

  // Bottom nav is shown only for players and coaches
  const showBottomNav = user?.role === 'player' || user?.role === 'coach';

  const navigate          = useNavigate();
  const location          = useLocation();
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [piaOpen,        setPiaOpen]        = useState(false);
  const [toasts,         setToasts]         = useState([]);

  const swipeEnabled =
    location.pathname !== '/sessions' &&
    !panelUserId &&
    !piaOpen &&
    !mobileOpen;
  const { indicatorRef } = useSwipeBack({ enabled: swipeEnabled });

  // ── Push notification subscription (once per session) ────────────────────
  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') return;

    async function trySubscribe() {
      try {
        const { enabled, publicKey } = await getVapidKey();
        if (!enabled || !publicKey) return;

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          if (Notification.permission !== 'granted') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') return;
          }
          sub = await reg.pushManager.subscribe({
            userVisibleOnly:      true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        await subscribePush(sub.toJSON());
      } catch { /* non-fatal */ }
    }

    trySubscribe();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── On route change: refresh counts ─────────────────────────────────────────
  useEffect(() => {
    getUnreadCount()
      .then(({ count }) => setUnreadCount(count ?? 0))
      .catch(() => {});
    getUnreadMsgCount()
      .then(({ count }) => setUnreadMsgCount(count ?? 0))
      .catch(() => {});
  }, [location.pathname]);

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]); // max 3 at once
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Notification polling (every 30 s) ────────────────────────────────────
  const prevNotifCountRef = useRef(null);
  const prevMsgCountRef   = useRef(null);
  const lastSeenTsRef     = useRef(new Date().toISOString());
  const initializedRef    = useRef(false);

  useEffect(() => {
    async function poll() {
      try {
        const [{ count: nc }, { count: mc }] = await Promise.all([
          getUnreadCount(),
          getUnreadMsgCount(),
        ]);

        setUnreadCount(nc ?? 0);
        setUnreadMsgCount(mc ?? 0);

        if (!initializedRef.current) {
          prevNotifCountRef.current = nc ?? 0;
          prevMsgCountRef.current   = mc ?? 0;
          initializedRef.current    = true;
          return;
        }

        // ── New notification(s) ────────────────────────────────────────────
        if ((nc ?? 0) > (prevNotifCountRef.current ?? 0)) {
          try {
            const { notifications } = await getNotifications();
            const fresh = (notifications ?? []).filter(
              (n) => !n.read && n.created_at > lastSeenTsRef.current
            );
            for (const n of fresh.slice(0, 2)) {
              addToast({
                type:    n.type,
                title:   NOTIF_TITLE[n.type] ?? 'Notification',
                message: n.message ?? '',
              });
            }
          } catch { /* non-fatal */ }
        }

        // ── New message(s) ─────────────────────────────────────────────────
        if ((mc ?? 0) > (prevMsgCountRef.current ?? 0)) {
          addToast({ type: 'new_message', title: 'Nouveau message', message: '' });
        }

        prevNotifCountRef.current = nc ?? 0;
        prevMsgCountRef.current   = mc ?? 0;
        lastSeenTsRef.current     = new Date().toISOString();
      } catch { /* non-fatal — ignore network errors */ }
    }

    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [addToast]);

  async function handleLogout() {
    try { await logout(); } catch { /* non-fatal */ }
    sessionStorage.clear();
    setUser(null);
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 gap-2">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="text-lg font-bold tracking-tight select-none">
              <span className="text-foreground">Padel</span>
              <span className="text-primary">Connect</span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-0.5 ml-2">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-primary font-semibold'
                      : 'text-foreground/65 hover:text-foreground hover:bg-accent'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop search bar — grows to fill space between nav and actions */}
          <SearchBar className="hidden md:block flex-1 max-w-xs mx-2" />

          {/* Right-side actions — pushed to far right */}
          <div className="flex items-center gap-1 ml-auto">

            {/* Notification bell */}
            <Link to="/notifications">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-foreground/60 hover:text-foreground hover:bg-accent"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span
                    className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </Button>
            </Link>

            {/* Divider (desktop) */}
            <div className="hidden md:block w-px h-5 bg-border mx-1" />

            {/* Profile avatar link (desktop) */}
            <Link
              to="/profile"
              className="hidden md:flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent transition-colors"
            >
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
              <span className="text-xs text-muted-foreground max-w-[120px] truncate">
                {user?.first_name || user?.email?.split('@')[0]}
              </span>
            </Link>

            {/* Logout — desktop always, mobile only for managers/admins */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Se déconnecter"
              className={cn(
                'text-foreground/60 hover:text-foreground hover:bg-accent ml-0.5',
                showBottomNav ? 'hidden md:flex' : ''
              )}
            >
              <LogOut className="h-4 w-4" />
            </Button>

            {/* Mobile hamburger — managers/admins only (players/coaches use bottom nav) */}
            {!showBottomNav && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-foreground/60"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile search row — full width below logo/actions row */}
        <div className="md:hidden border-t border-border px-4 py-2.5">
          <SearchBar className="w-full" />
        </div>

        {/* Mobile nav drawer — managers/admins only */}
        {!showBottomNav && mobileOpen && (
          <nav className="md:hidden border-t border-border bg-white px-4 py-3 space-y-0.5">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-primary font-semibold'
                      : 'text-foreground/65 hover:text-foreground hover:bg-accent'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="pt-2 mt-2 border-t border-border">
              <p className="px-3 py-1 text-xs text-muted-foreground truncate">{user?.email}</p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* ── Offline banner ──────────────────────────────────────────────── */}
      <NetworkStatus />

      {/* ── Page content ────────────────────────────────────────────────── */}
      {/* pb-20 on mobile gives breathing room above the fixed bottom nav */}
      <main className={cn('mx-auto max-w-6xl px-4 sm:px-6 py-8', showBottomNav && 'pb-20 md:pb-8')}>
        {children}
      </main>

      {/* ── Toast notifications ─────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── PIA floating assistant ──────────────────────────────────────── */}
      <PIAButton onClick={() => setPiaOpen((o) => !o)} isOpen={piaOpen} />
      {piaOpen && <PIAPanel onClose={() => setPiaOpen(false)} />}

      {/* ── Mobile bottom navigation (players + coaches only) ───────────── */}
      {showBottomNav && <BottomNav unreadMsgCount={unreadMsgCount} />}

      {/* ── Swipe-back edge indicator (mobile only) ─────────────────────── */}
      <div
        ref={indicatorRef}
        className="fixed left-0 top-1/2 z-50 pointer-events-none md:hidden"
        style={{ opacity: 0, transform: 'translateY(-50%) translateX(-4px)' }}
        aria-hidden="true"
      >
        <div className="flex items-center justify-center w-8 h-14 bg-black/20 rounded-r-2xl backdrop-blur-sm">
          <ChevronLeft className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  );
}
