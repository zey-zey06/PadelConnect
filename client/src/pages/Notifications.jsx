import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markAsRead } from '@/api/notifications';
import { acceptFriendRequest, refuseFriendRequest } from '@/api/friends';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2, AlertCircle, UserCheck, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import PageSkeleton from '@/components/PageSkeleton';

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
  // Coaches
  coach_invite:      'Invitation coach',
  club_invitation:   'Invitation au club',
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
  welcome:           'Bienvenue',
  new_user:          'Nouveau joueur',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  useEffect(() => {
    setLoading(true);
    getNotifications()
      .then((data) => {
        setNotifications(data.notifications ?? []);
      })
      .catch((e) => {
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);

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

  async function handleFriendAction(notifId, actorId, action) {
    setFriendActionLoading((prev) => ({ ...prev, [notifId]: action }));
    try {
      if (action === 'accept') {
        await acceptFriendRequest(actorId);
      } else {
        await refuseFriendRequest(actorId);
      }
      // Remove notification after action
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vos alertes et mises à jour.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Tout marquer comme lu ({unreadCount})
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
          <p className="text-sm font-medium text-foreground">Aucune notification</p>
          <p className="text-xs text-muted-foreground">
            Vous serez notifié des demandes de session, réservations et mises à jour.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-all',
                !n.read && 'border-primary/20 bg-primary/[0.03]'
              )}
            >
              {/* Indicator */}
              <div className="mt-0.5 shrink-0">
                {n.read
                  ? <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  : <span className="block w-2 h-2 rounded-full bg-primary mt-1" />
                }
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {n.type && (
                  <p className="text-xs font-medium text-primary mb-0.5">
                    {TYPE_LABELS[n.type] ?? n.type}
                  </p>
                )}
                <p className={cn(
                  'text-sm',
                  n.read ? 'text-muted-foreground' : 'text-foreground font-medium'
                )}>
                  {n.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {n.type === 'session_request' && (
                  <Link to="/sessions?tab=mine">
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                      Gérer
                    </Button>
                  </Link>
                )}
                {n.type === 'friend_request' && n.actor_id && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="text-xs h-7 px-2 gap-1 bg-green-600 hover:bg-green-700"
                      disabled={!!friendActionLoading[n.id]}
                      onClick={() => handleFriendAction(n.id, n.actor_id, 'accept')}
                    >
                      {friendActionLoading[n.id] === 'accept'
                        ? <span className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin" />
                        : <UserCheck className="h-3 w-3" />
                      }
                      Accepter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={!!friendActionLoading[n.id]}
                      onClick={() => handleFriendAction(n.id, n.actor_id, 'refuse')}
                    >
                      {friendActionLoading[n.id] === 'refuse'
                        ? <span className="w-3 h-3 border border-red-400/50 border-t-transparent rounded-full animate-spin" />
                        : <UserX className="h-3 w-3" />
                      }
                      Refuser
                    </Button>
                  </div>
                )}
                {!n.read && n.type !== 'friend_request' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-muted-foreground"
                  >
                    Lire
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
