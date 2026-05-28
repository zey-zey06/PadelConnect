import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, X, User, Sparkles, ChevronLeft } from 'lucide-react';
import { useAuth, usePlayerPanel } from '@/App';
import { logout } from '@/api/auth';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { getUnreadCount } from '@/api/notifications';
import { getUnreadMsgCount } from '@/api/messages';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PIAButton from '@/components/PIA/PIAButton';
import PIAPanel from '@/components/PIA/PIAPanel';
import BottomNav     from '@/components/BottomNav';
import SearchBar     from '@/components/SearchBar';
import NetworkStatus from '@/components/NetworkStatus';

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [piaOpen, setPiaOpen]               = useState(false);

  const swipeEnabled =
    location.pathname !== '/sessions' &&
    !panelUserId &&
    !piaOpen &&
    !mobileOpen;
  const { indicatorRef } = useSwipeBack({ enabled: swipeEnabled });

  useEffect(() => {
    getUnreadCount()
      .then(({ count }) => setUnreadCount(count ?? 0))
      .catch(() => {});
    getUnreadMsgCount()
      .then(({ count }) => setUnreadMsgCount(count ?? 0))
      .catch(() => {});
  }, [location.pathname]);

  async function handleLogout() {
    try { await logout(); } catch { /* non-fatal */ }
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

            {/* PIA button — mobile only, all authenticated users (desktop uses floating FAB) */}
            {user?.sub && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPiaOpen((o) => !o)}
                aria-label={piaOpen ? 'Fermer PIA' : 'Ouvrir PIA'}
                className="md:hidden relative text-foreground/60 hover:text-foreground hover:bg-accent"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}

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
