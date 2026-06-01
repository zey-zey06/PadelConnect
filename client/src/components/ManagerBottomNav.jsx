import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Calendar, MessageSquare, User } from 'lucide-react';

const PRIMARY = '#1A3D2B';
const GREY    = '#9CA3AF';

const ITEMS = [
  { to: '/manager/dashboard', Icon: Home,          label: 'Accueil'      },
  { to: '/manager/venues',   Icon: LayoutGrid,    label: 'Terrains'     },
  { to: '/manager/bookings', Icon: Calendar,      label: 'Réservations' },
  { to: '/messages',         Icon: MessageSquare, label: 'Messages'     },
  { to: '/manager/profile',  Icon: User,          label: 'Profil'       },
];

function isActive(pathname, path) {
  if (path === '/manager/dashboard') {
    return pathname === '/manager' || pathname === '/manager/dashboard';
  }
  return pathname === path || pathname.startsWith(path + '/');
}

export default function ManagerBottomNav({ unreadMsgCount = 0 }) {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around" style={{ height: '64px' }}>
        {ITEMS.map(({ to, Icon, label }) => {
          const active = isActive(pathname, to);
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 no-underline"
            >
              <div className="relative">
                <Icon
                  className="h-5 w-5"
                  style={{ color: active ? PRIMARY : GREY }}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                {label === 'Messages' && unreadMsgCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500"
                    aria-hidden="true"
                  />
                )}
              </div>
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
