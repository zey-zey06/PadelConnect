import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Building2, Plus, MessageSquare, User } from 'lucide-react';

const PRIMARY = '#1A3D2B';
const GREY    = '#9CA3AF';

function isActive(pathname, path) {
  return pathname === path || pathname.startsWith(path + '/');
}

export default function BottomNav({ unreadMsgCount = 0 }) {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const { t }        = useTranslation();

  const items = [
    { to: '/sessions', Icon: Home,          labelKey: 'nav.home'     },
    { to: '/clubs',    Icon: Building2,     labelKey: 'nav.clubs'    },
    null, // centre "+"
    { to: '/messages', Icon: MessageSquare, labelKey: 'nav.messages', badge: unreadMsgCount },
    { to: '/profile',  Icon: User,          labelKey: 'nav.profile'  },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around" style={{ height: '64px' }}>
        {items.map((item, idx) => {
          /* ── Centre "+" button ─────────────────────────────────────── */
          if (item === null) {
            return (
              <button
                key="create"
                onClick={() => navigate('/sessions?create=1')}
                className="flex flex-col items-center justify-center flex-1 outline-none"
                aria-label={t('sessions.create', 'Créer une session')}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: PRIMARY, transform: 'translateY(-10px)' }}
                >
                  <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
                </div>
              </button>
            );
          }

          /* ── Regular nav items ─────────────────────────────────────── */
          const active = isActive(pathname, item.to);
          const { Icon } = item;

          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 no-underline"
            >
              <div className="relative">
                <Icon
                  className="h-5 w-5"
                  style={{ color: active ? PRIMARY : GREY }}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                {item.badge > 0 && (
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
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
