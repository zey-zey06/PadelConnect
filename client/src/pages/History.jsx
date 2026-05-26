import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMySessions } from '@/api/sessions';
import { getMyBookings } from '@/api/bookings';
import { getNotifications } from '@/api/notifications';
import {
  CalendarDays, MapPin, Bell, AlertCircle,
  CheckCircle2, XCircle, Clock, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PageSkeleton from '@/components/PageSkeleton';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getTimestamp(item) {
  // Normalise to a sortable ISO string
  return (
    item.created_at ??
    item.session_date ??
    item.date ??
    ''
  );
}

const SESSION_STATUS_LABEL = {
  open:      'Ouverte',
  complete:  'Complète',
  cancelled: 'Annulée',
};

const NOTIF_ICON_COLOR = {
  booking_confirmed: 'text-emerald-500 bg-emerald-50',
  booking_cancelled: 'text-red-500 bg-red-50',
  new_booking:       'text-emerald-500 bg-emerald-50',
  slot_cancelled:    'text-orange-500 bg-orange-50',
  session_cancelled: 'text-orange-500 bg-orange-50',
  session_complete:  'text-emerald-600 bg-emerald-50',
  session_request:   'text-primary bg-primary/10',
  session_invite:    'text-primary bg-primary/10',
  request_accepted:  'text-emerald-500 bg-emerald-50',
  request_refused:   'text-red-500 bg-red-50',
  friend_request:    'text-primary bg-primary/10',
  friend_accepted:   'text-emerald-500 bg-emerald-50',
  club_invitation:   'text-primary bg-primary/10',
  coach_invite:      'text-primary bg-primary/10',
  welcome:           'text-primary bg-primary/10',
  no_show:           'text-red-500 bg-red-50',
  late_cancel:       'text-orange-500 bg-orange-50',
  club_ban:          'text-red-600 bg-red-50',
  app_ban:           'text-red-600 bg-red-50',
  ban:               'text-red-600 bg-red-50',
};

// ── Timeline items ────────────────────────────────────────────────────────────

function BookingItem({ item }) {
  const date  = item.session_date ? fmtDate(item.session_date + 'T00:00:00') : '—';
  const start = item.start_time?.slice(0, 5) ?? '—';
  const end   = item.end_time?.slice(0, 5) ?? '';
  const isCancelled = item.status === 'cancelled';

  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-0.5">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          isCancelled ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'
        )}>
          {isCancelled
            ? <XCircle className="h-4 w-4" />
            : <CheckCircle2 className="h-4 w-4" />
          }
        </div>
      </div>
      <div className="flex-1 min-w-0 pb-5 border-b border-border last:border-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {isCancelled ? 'Réservation annulée' : 'Terrain réservé'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {item.venue_name ?? '—'}{item.club_name ? ` · ${item.club_name}` : ''}
            </p>
          </div>
          {item.price > 0 && (
            <span className="text-xs font-semibold text-foreground shrink-0">
              {Number(item.price).toLocaleString('fr-FR')} FCFA
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <CalendarDays className="h-3 w-3 shrink-0" />
          {date}
          {start && ` · ${start}${end ? `–${end}` : ''}`}
        </p>
      </div>
    </div>
  );
}

function SessionItem({ item }) {
  const date = item.date
    ? fmtDate(String(item.date).slice(0, 10) + 'T00:00:00')
    : '—';
  const isCancelled = item.status === 'cancelled';

  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Layers className="h-4 w-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0 pb-5 border-b border-border last:border-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            Session créée
          </p>
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
            isCancelled
              ? 'bg-red-50 text-red-500'
              : item.status === 'open'
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-muted text-muted-foreground'
          )}>
            {SESSION_STATUS_LABEL[item.status] ?? item.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <CalendarDays className="h-3 w-3 shrink-0" />
          {date}
          {item.time && ` · ${String(item.time).slice(0, 5)}`}
          <span className="mx-1">·</span>
          <span>{item.current_players}/{item.max_players} joueurs</span>
        </p>
      </div>
    </div>
  );
}

function NotifItem({ item }) {
  const colorCls = NOTIF_ICON_COLOR[item.type] ?? 'bg-slate-100 text-slate-500';

  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-0.5">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', colorCls)}>
          <Bell className="h-4 w-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0 pb-5 border-b border-border last:border-0">
        <p className="text-sm font-semibold text-foreground">{item.title ?? 'Notification'}</p>
        {item.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.body}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {fmtDate(item.created_at)}
          {' '}à {fmtTime(item.created_at)}
        </p>
      </div>
    </div>
  );
}

// ── History page ──────────────────────────────────────────────────────────────
export default function History() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    Promise.allSettled([
      getMySessions(),
      getMyBookings(),
      getNotifications(),
    ]).then(([sessionsRes, bookingsRes, notifRes]) => {
      const all = [];

      if (sessionsRes.status === 'fulfilled') {
        (sessionsRes.value?.sessions ?? []).forEach((s) => {
          all.push({ ...s, _type: 'session', _ts: String(s.created_at ?? s.date ?? '') });
        });
      }
      if (bookingsRes.status === 'fulfilled') {
        (bookingsRes.value?.bookings ?? []).forEach((b) => {
          all.push({ ...b, _type: 'booking', _ts: String(b.created_at ?? b.session_date ?? '') });
        });
      }
      if (notifRes.status === 'fulfilled') {
        (notifRes.value?.notifications ?? []).forEach((n) => {
          all.push({ ...n, _type: 'notification', _ts: String(n.created_at ?? '') });
        });
      }

      // Sort descending (most recent first)
      all.sort((a, b) => (a._ts < b._ts ? 1 : a._ts > b._ts ? -1 : 0));
      setItems(all);
    }).catch((err) => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Historique</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Toute votre activité, du plus récent au plus ancien.</p>
      </div>

      {loading ? (
        <PageSkeleton icon="📅" message="Chargement de votre historique..." layout="list" />
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">Aucune activité pour l'instant</p>
          <p className="text-sm text-muted-foreground">
            Rejoignez une session ou réservez un terrain pour voir votre historique.
          </p>
          <Link to="/sessions" className="inline-flex">
            <button className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80">
              Parcourir les sessions
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-0">
          {items.map((item, idx) => {
            if (item._type === 'booking')      return <BookingItem  key={`b-${item.id}-${idx}`} item={item} />;
            if (item._type === 'session')      return <SessionItem  key={`s-${item.id}-${idx}`} item={item} />;
            if (item._type === 'notification') return <NotifItem    key={`n-${item.id}-${idx}`} item={item} />;
            return null;
          })}
        </div>
      )}
    </div>
  );
}
