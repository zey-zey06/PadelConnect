import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/App';
import { logout } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { to: '/sessions',      label: 'Sessions'    },
  { to: '/calendar',      label: 'Calendrier'  },
  { to: '/clubs',         label: 'Clubs'       },
];

export default function Layout({ children }) {
  const { user, setUser } = useAuth();
  const navigate          = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    try { await logout(); } catch { /* non-fatal */ }
    setUser(null);
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">P</span>
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight select-none">
              Padel<span className="text-primary">Connect</span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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
                className="relative"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
                {/* Unread indicator dot */}
                <span
                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
              </Button>
            </Link>

            {/* User email (desktop only) */}
            <span className="hidden md:block text-xs text-muted-foreground max-w-[140px] truncate mx-1">
              {user?.email}
            </span>

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileOpen
                ? <X    className="h-4 w-4" />
                : <Menu className="h-4 w-4" />
              }
            </Button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
