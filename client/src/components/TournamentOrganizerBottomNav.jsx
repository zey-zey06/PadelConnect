import { Link, useLocation } from 'react-router-dom';
import { Home, User, MessageSquare, BarChart2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/App';

const PRIMARY = '#1A3D2B';
const GREY    = '#9CA3AF';

export default function TournamentOrganizerBottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const teamId = user?.team_id;

  const ITEMS = [
    { to: '/team/feed',      Icon: Home,              label: 'Accueil'   },
    { to: teamId ? `/team/${teamId}` : '/team/setup', Icon: User, label: 'Profil' },
    { to: '/messages',       Icon: MessageSquare,     label: 'Chat'      },
    { to: '/team/dashboard?tab=rapport', Icon: BarChart2, label: 'Rapports' },
    { to: '/team/dashboard', Icon: LayoutDashboard,   label: 'Dashboard' },
  ];

  function isActive(to) {
    const base = to.split('?')[0];
    if (base === '/team/feed') return pathname === '/team/feed';
    if (base === '/team/dashboard') {
      if (to.includes('tab=rapport')) {
        return pathname === '/team/dashboard' && window.location.search.includes('tab=rapport');
      }
      return pathname === '/team/dashboard' && !window.location.search.includes('tab=rapport');
    }
    if (base === '/messages') return pathname.startsWith('/messages');
    if (teamId && base === `/team/${teamId}`) return pathname === `/team/${teamId}`;
    return pathname === base || pathname.startsWith(base + '/');
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around" style={{ height: '64px' }}>
        {ITEMS.map(({ to, Icon, label }) => {
          const active = isActive(to);
          return (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 no-underline"
            >
              <Icon
                className="h-5 w-5"
                style={{ color: active ? PRIMARY : GREY }}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span
                className="text-[10px] font-medium leading-none"
                style={{ color: active ? PRIMARY : GREY }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
