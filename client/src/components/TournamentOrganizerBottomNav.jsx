import { Link, useLocation } from 'react-router-dom';
import { Home, User, MessageSquare, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/App';

const PRIMARY = '#1A3D2B';
const GREY    = '#9CA3AF';

export default function TournamentOrganizerBottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const teamId = user?.team_id;

  const ITEMS = [
    { to: '/team/feed',      Icon: Home,          label: 'Accueil'   },
    { to: '/messages',       Icon: MessageSquare, label: 'Chat'      },
    { to: '/team/dashboard', Icon: LayoutGrid,    label: 'Dashboard' },
    { to: teamId ? `/team/${teamId}` : '/team/setup', Icon: User, label: 'Profil' },
  ];

  function isActive({ to }) {
    if (to === '/team/feed')      return pathname === '/team/feed';
    if (to === '/team/dashboard') return pathname === '/team/dashboard';
    if (to === '/messages')       return pathname.startsWith('/messages');
    if (teamId && to === `/team/${teamId}`) return pathname === `/team/${teamId}`;
    return pathname === to || pathname.startsWith(to + '/');
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around" style={{ height: '64px' }}>
        {ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.label}
              to={item.to}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[44px] no-underline"
            >
              <item.Icon
                className="h-5 w-5"
                style={{ color: active ? PRIMARY : GREY }}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span
                className="text-[10px] font-medium leading-none"
                style={{ color: active ? PRIMARY : GREY }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
