import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getNotifications, markAsRead } from '@/api/notifications';
import { acceptFriendRequest, refuseFriendRequest } from '@/api/friends';
import { getMySessions, invitePlayer } from '@/api/sessions';
import { respondToBallPickerInvitation } from '@/api/coaches';
import { Button } from '@/components/ui/button';
import {
  Bell, CheckCircle2, AlertCircle, UserCheck, UserX, Users, X,
  UserPlus, CalendarDays, CalendarCheck, CalendarX, CreditCard,
  MessageSquare, Building2, Shield, Sparkles, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PageSkeleton from '@/components/PageSkeleton';
import usePullToRefresh from '@/hooks/usePullToRefresh';

const TYPE_LABELS = {
  // Sessions
  session_request:   'Demande de session',
  request_accepted:  'Demande acceptée',
  request_refused:   'Demande refusée',
  session_complete:  'Session complète',
  session_cancelled: 'Session annulée',
  session_invite:    'Invitation reçue',
  // Bookings
  new_booking:       'Nouvelle réservation',
  booking_confirmed: 'Réservation confirmée',
  booking_cancelled: 'Réservation annulée',
  slot_cancelled:    'Créneau annulé',
  // Coaches / staff
  coach_invite:           'Invitation coach',
  club_invitation:        'Invitation au club',
  ball_picker_invitation: 'Invitation ramasseur',
  // Sanctions
  late_cancel:       'Annulation tardive',
  no_show:           'No-show enregistré',
  club_ban:          'Banni du club',
  app_ban:           'Compte suspendu',
  ban:               'Compte suspendu',
  // Social
  friend_request:    'Demande d\'ami',
  friend_accepted:   'Demande acceptée',
  // System
  welcome:                   'Bienvenue',
  new_user:                  'Nouveau joueur',
  session_cancelled_admin:   'Session annulée',
  contact_form:              'Message de contact',
  account_deleted:           'Compte supprimé',
  // Club
  club_new_post:             'Nouvelle publication',
};

// ── Notification type icon config ────────────────────────────────────────────
function getTypeIcon(type) {
  switch (type) {
    // Social
    case 'friend_request':    return { Icon: UserPlus,      color: '#3b82f6' }; // blue
    case 'friend_accepted':   return { Icon: UserCheck,     color: '#16a34a' }; // green
    // Sessions
    case 'session_request':   return { Icon: CalendarDays,  color: '#1A3D2B' }; // primary
    case 'request_accepted':  return { Icon: CalendarCheck, color: '#16a34a' };
    case 'request_refused':   return { Icon: CalendarX,     color: '#dc2626' };
    case 'session_complete':  return { Icon: Users,          color: '#1A3D2B' };
    case 'session_cancelled': return { Icon: CalendarX,     color: '#dc2626' };
    case 'session_invite':    return { Icon: CalendarDays,  color: '#3b82f6' };
    case 'session_cancelled_admin': return { Icon: CalendarX, color: '#dc2626' };
    // Bookings
    case 'new_booking':       return { Icon: CreditCard,    color: '#3b82f6' };
    case 'booking_confirmed': return { Icon: CalendarCheck, color: '#16a34a' };
    case 'booking_cancelled': return { Icon: CalendarX,     color: '#dc2626' };
    case 'slot_cancelled':    return { Icon: CalendarX,     color: '#f59e0b' };
    // Staff
    case 'coach_invite':           return { Icon: Users,    color: '#f59e0b' };
    case 'club_invitation':        return { Icon: Building2, color: '#1A3D2B' };
    case 'ball_picker_invitation': return { Icon: Zap,      color: '#f59e0b' };
    // Sanctions
    case 'late_cancel': return { Icon: AlertCircle, color: '#f59e0b' };
    case 'no_show':     return { Icon: AlertCircle, color: '#dc2626' };
    case 'club_ban':    return { Icon: Shield,      color: '#dc2626' };
    case 'app_ban':     return { Icon: Shield,      color: '#dc2626' };
    case 'ban':         return { Icon: Shield,      color: '#dc2626' };
    // Club
    case 'club_new_post': return { Icon: Bell,      color: '#1A3D2B' };
    // System
    case 'welcome':     return { Icon: Sparkles,   color: '#1A3D2B' };
    case 'new_user':    return { Icon: UserPlus,   color: '#1A3D2B' };
    default:            return { Icon: Bell,       color: '#9CA3AF' };
  }
}

// ── Date grouping ─────────────────────────────────────────────────────────────
function getGroup(createdAt) {
  const d     = new Date(createdAt);
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today - new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (diffMs === 0)          return 'Aujourd\'hui';
  if (diffMs === 86_400_000) return 'Hier';
  if (diffMs < 7 * 86_400_000) return 'Cette semaine';
  return 'Plus ancien';
}

const GROUP_ORDER = ["Aujourd'hui", 'Hier', 'Cette semaine', 'Plus ancien'];

function groupNotifications(notifications) {
  const map = {};
  for (const n of notifications) {
    const g = getGroup(n.created_at);
    if (!map[g]) map[g] = [];
    map[g].push(n);
  }
  return GROUP_ORDER.filter((g) => map[g]).map((g) => ({ label: g, items: map[g] }));
}

// ── Swipeable notification card ───────────────────────────────────────────────
function SwipeableNotif({ n, onDismiss, children }) {
  const startX  = useRef(null);
  const startY  = useRef(null);
  const [dx, setDx] = useState(0);
  const THRESHOLD = 80;

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }
  function onTouchMove(e) {
    if (startX.current === null) return;
    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = Math.abs(e.touches[0].clientY - startY.current);
    if (deltaX < 0 && Math.abs(deltaX) > deltaY) {
      setDx(Math.max(deltaX, -120));
    }
  }
  function onTouchEnd() {
    if (dx < -THRESHOLD) {
      onDismiss(n.id);
    } else {
      setDx(0);
    }
    startX.current = null;
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? 'transform 0.2s ease' : 'none' }}
    >
      {children}
    </div>
  );
}

// ── Full notification list with date groups ───────────────────────────────────
function NotificationList({ notifications, friendActionLoading, bpActionLoading, onMarkRead, onFriendAction, onBallPickerAction, onDismiss, t }) {
  const groups = groupNotifications(notifications);

  return (
    <div className="space-y-6">
      {groups.map(({ label, items }) => (
        <div key={label} className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">{label}</p>
          {items.map((n) => {
            const actorName = n.message?.split(' ')[0] ?? 'Ce joueur';
            return (
              <SwipeableNotif key={n.id} n={n} onDismiss={async (id) => {
                await onMarkRead(id).catch(() => {});
                onDismiss(id);
              }}>
                <div
                  className={cn(
                    'flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors',
                    !n.read && 'border-primary/20 bg-primary/[0.03]'
                  )}
                >
                  {/* Type icon */}
                  {(() => {
                    const { Icon, color } = getTypeIcon(n.type);
                    return (
                      <div className="relative mt-0.5 shrink-0">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${color}18` }}
                        >
                          <Icon className="h-4 w-4" style={{ color }} />
                        </div>
                        {!n.read && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    {n.type && (
                      <p className="text-xs font-medium text-primary mb-0.5">
                        {TYPE_LABELS[n.type] ?? n.type}
                      </p>
                    )}
                    <p className={cn('text-sm', n.read ? 'text-muted-foreground' : 'text-foreground font-medium')}>
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {n.type === 'session_request' && (
                      <Link to="/sessions?tab=mine">
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2">Gérer</Button>
                      </Link>
                    )}
                    {n.type === 'friend_request' && n.actor_id && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="default" className="text-xs h-7 px-2 gap-1 bg-green-600 hover:bg-green-700"
                          disabled={!!friendActionLoading[n.id]}
                          onClick={() => onFriendAction(n.id, n.actor_id, actorName, 'accept')}>
                          {friendActionLoading[n.id] === 'accept'
                            ? <span className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin" />
                            : <UserCheck className="h-3 w-3" />}
                          {t('notifications.accept')}
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={!!friendActionLoading[n.id]}
                          onClick={() => onFriendAction(n.id, n.actor_id, actorName, 'refuse')}>
                          {friendActionLoading[n.id] === 'refuse'
                            ? <span className="w-3 h-3 border border-red-400/50 border-t-transparent rounded-full animate-spin" />
                            : <UserX className="h-3 w-3" />}
                          {t('notifications.refuse')}
                        </Button>
                      </div>
                    )}
                    {n.type === 'ball_picker_invitation' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="default" className="text-xs h-7 px-2 gap-1 bg-green-600 hover:bg-green-700"
                          disabled={!!bpActionLoading[n.id]}
                          onClick={() => onBallPickerAction(n.id, n.metadata?.invitation_id ?? n.id, 'accepted')}>
                          {bpActionLoading[n.id] === 'accepted'
                            ? <span className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin" />
                            : <UserCheck className="h-3 w-3" />}
                          {t('notifications.accept')}
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={!!bpActionLoading[n.id]}
                          onClick={() => onBallPickerAction(n.id, n.metadata?.invitation_id ?? n.id, 'refused')}>
                          {bpActionLoading[n.id] === 'refused'
                            ? <span className="w-3 h-3 border border-red-400/50 border-t-transparent rounded-full animate-spin" />
                            : <UserX className="h-3 w-3" />}
                          {t('notifications.refuse')}
                        </Button>
                      </div>
                    )}
                    {!n.read && n.type !== 'friend_request' && n.type !== 'ball_picker_invitation' && (
                      <Button size="sm" variant="ghost" onClick={() => onMarkRead(n.id)}
                        className="text-xs text-muted-foreground">
                        {t('notifications.markRead')}
                      </Button>
                    )}
                  </div>
                </div>
              </SwipeableNotif>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Invite to session modal ────────────────────────────────────────────────────
function InviteToSessionModal({ actorId, actorName, onClose }) {
  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [sending,    setSending]    = useState(false);
  const [done,       setDone]       = useState(false);

  useEffect(() => {
    getMySessions()
      .then(({ sessions: s }) => {
        const open = (s ?? []).filter((x) => x.status === 'open');
        setSessions(open);
        if (open.length === 1) setSelectedId(open[0].id);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite() {
    if (!selectedId || sending) return;
    setSending(true);
    try {
      await invitePlayer(selectedId, actorId);
      setDone(true);
      setTimeout(onClose, 1500);
    } catch {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 pb-20 sm:pb-4"
      style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Inviter à une session</h2>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {done ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Invitation envoyée à {actorName} !
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground">
                Inviter <span className="font-semibold">{actorName}</span> à rejoindre une de vos sessions ?
              </p>

              {loading ? (
                <div className="h-10 rounded-lg bg-muted animate-pulse" />
              ) : sessions.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  Vous n'avez aucune session ouverte.{' '}
                  <Link to="/sessions" className="font-medium underline" onClick={onClose}>
                    Créez une session
                  </Link>{' '}
                  d'abord.
                </div>
              ) : (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Choisir une session…</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {String(s.date).slice(0, 10)} à {String(s.time).slice(0, 5)} — {s.current_players}/{s.max_players} joueurs
                    </option>
                  ))}
                </select>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Non merci
                </Button>
                <Button
                  type="button"
                  onClick={handleInvite}
                  disabled={!selectedId || sending || sessions.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 border-0 text-white"
                >
                  {sending ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                  ) : 'Oui, inviter'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pull refresh spinner ───────────────────────────────────────────────────────
function PullSpinner() {
  return (
    <div className="flex items-center justify-center py-3">
      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export default function Notifications() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  // After accepting friend request — invite to session
  const [inviteModal, setInviteModal] = useState(null); // { actorId, actorName } | null

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications ?? []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const { refreshing } = usePullToRefresh(fetchNotifications);

  async function handleMarkRead(id) {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // non-fatal
    }
  }

  const [friendActionLoading, setFriendActionLoading] = useState({});
  const [bpActionLoading, setBpActionLoading] = useState({});

  async function handleBallPickerAction(notifId, invitationId, action) {
    setBpActionLoading((prev) => ({ ...prev, [notifId]: action }));
    try {
      await respondToBallPickerInvitation(invitationId, action);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch { /* non-fatal */ }
    finally {
      setBpActionLoading((prev) => { const next = { ...prev }; delete next[notifId]; return next; });
    }
  }

  async function handleFriendAction(notifId, actorId, actorName, action) {
    setFriendActionLoading((prev) => ({ ...prev, [notifId]: action }));
    try {
      if (action === 'accept') {
        await acceptFriendRequest(actorId);
        // Remove notification
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
        // Offer to invite to session
        setInviteModal({ actorId, actorName });
      } else {
        await refuseFriendRequest(actorId);
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }
    } catch {
      // non-fatal
    } finally {
      setFriendActionLoading((prev) => { const next = { ...prev }; delete next[notifId]; return next; });
    }
  }

  async function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.read);
    await Promise.allSettled(unread.map((n) => markAsRead(n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Pull-to-refresh indicator */}
      {refreshing && <PullSpinner />}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vos alertes et mises à jour.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            {t('notifications.markAllRead')} ({unreadCount})
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <PageSkeleton icon="🔔" message="Vérification des notifications..." layout="list" />
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-foreground">{t('notifications.empty')}</p>
          <p className="text-xs text-muted-foreground">
            Vous serez notifié des demandes de session, réservations et mises à jour.
          </p>
        </div>
      ) : (
        <NotificationList
          notifications={notifications}
          friendActionLoading={friendActionLoading}
          bpActionLoading={bpActionLoading}
          onMarkRead={handleMarkRead}
          onFriendAction={handleFriendAction}
          onBallPickerAction={handleBallPickerAction}
          onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
          t={t}
        />
      )}

      {/* Invite to session modal (shown after accepting friend request) */}
      {inviteModal && (
        <InviteToSessionModal
          actorId={inviteModal.actorId}
          actorName={inviteModal.actorName}
          onClose={() => setInviteModal(null)}
        />
      )}
    </div>
  );
}
