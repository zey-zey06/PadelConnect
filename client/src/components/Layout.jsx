import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, X, User } from 'lucide-react';
import { useAuth } from '@/App';
import { logout } from '@/api/auth';
import { getUnreadCount } from '@/api/notifications';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PLAYER_NAV = [
  { to: '/sessions',  label: 'Sessions'    },
  { to: '/calendar',  label: 'Calendrier'  },
  { to: '/clubs',     label: 'Clubs'       },
  { to: '/history',   label: 'Historique'  },
  { to: '/profile',   label: 'Mon Profil'  },
];

const COACH_NAV = [
  { to: '/coach/dashboard', label: 'Mon espace'  },
  { to: '/sessions',        label: 'Sessions'    },
  { to: '/clubs',           label: 'Clubs'       },
  { to: '/profile',         label: 'Mon Profil'  },
];

const MANAGER_NAV = [
  { to: '/manager/dashboard', label: 'Tableau de bord' },
  { to: '/manager/profile',   label: 'Mon Club'        },
];

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/clubs',           label: 'Clubs'     },
];

export default function Layout({ children }) {
  const { user, setUser, profile } = useAuth();
  const NAV_LINKS =
    user?.role === 'venue_admin' ? MANAGER_NAV :
    user?.role === 'super_admin' ? ADMIN_NAV :
    user?.role === 'coach'       ? COACH_NAV  :
    PLAYER_NAV;
  const navigate          = useNavigate();
  const location          = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getUnreadCount()
      .then(({ count }) => setUnreadCount(count ?? 0))
      .catch(() => {}); // non-fatal — bell just shows no dot
  }, [location.pathname]); // re-fetch when navigating (e.g. after visiting /notifications)

  async function handleLogout() {
    try { await logout(); } catch { /* non-fatal */ }
    setUser(null);
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

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
          <nav className="hidden md:flex items-center gap-0.5">
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

          {/* Right-side actions */}
          <div className="flex items-center gap-1">

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
                {user?.email?.split('@')[0]}
              </span>
            </Link>

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Se déconnecter"
              className="text-foreground/60 hover:text-foreground hover:bg-accent ml-0.5"
            >
              <LogOut className="h-4 w-4" />
            </Button>

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-foreground/60"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
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
            </div>
          </nav>
        )}
      </header>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
