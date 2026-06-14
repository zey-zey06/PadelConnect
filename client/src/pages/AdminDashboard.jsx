import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Users, Layers, Building2, BookOpen,
  ShieldAlert, AlertCircle, ChevronDown, Trash2, CheckCircle,
  Ban, XCircle, Search, Calendar, Filter, Activity,
  UserCheck, Clock, LogOut, Settings, CreditCard, RefreshCw,
  Home, User, TrendingUp, Download,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, usePlayerPanel } from '@/App';
import { logout } from '@/api/auth';
import {
  getDashboard, getAdminActivity,
  listUsers, updateUserStatus, deleteAdminUser,
  listAdminSessions, deleteAdminSession,
  listAdminClubs, updateClubStatus, validateClub,
  listAdminBookings,
  listAdminSanctions, markSanctionPaid, liftSanction,
} from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getAdminSubscriptions, activateSubscription, suspendSubscription,
  markSubscriptionPaid, getAdminRevenue,
} from '@/api/subscriptions';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(t) {
  if (!t) return '—';
  return String(t).slice(0, 5);
}

function Badge({ label, color }) {
  const map = {
    green:  'bg-emerald-100 text-emerald-700',
    red:    'bg-red-100 text-red-600',
    yellow: 'bg-amber-100 text-amber-700',
    gray:   'bg-slate-100 text-slate-500',
    blue:   'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[color] ?? map.gray}`}>
      {label}
    </span>
  );
}

const STATUS_COLOR = {
  active: 'green', inactive: 'gray', suspended: 'yellow', banned: 'red',
  pending_validation: 'orange',
  open: 'green', complete: 'blue', cancelled: 'gray', confirmed: 'green',
};
const STATUS_LABEL = {
  active: 'Actif', inactive: 'Inactif', suspended: 'Suspendu', banned: 'Banni',
  pending_validation: 'En attente',
  open: 'Ouverte', complete: 'Complète', cancelled: 'Annulée', confirmed: 'Confirmée',
};
const ROLE_LABEL = {
  player: 'Joueur', venue_admin: 'Gérant', coach: 'Coach',
  ball_picker: 'Ramasseur', super_admin: 'Super Admin',
};
const PENALTY_LABEL = {
  app_ban:     'Ban app',
  club_ban:    'Ban club',
  no_show:     'No-show',
  late_cancel: 'Annulation tardive',
};

function ErrorBanner({ message }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function Skeleton({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent }) {
  const colors = {
    amber:   { ring: 'bg-amber-100',   icon: 'text-amber-600'   },
    emerald: { ring: 'bg-emerald-100', icon: 'text-emerald-600' },
    blue:    { ring: 'bg-blue-100',    icon: 'text-blue-600'    },
    violet:  { ring: 'bg-violet-100',  icon: 'text-violet-600'  },
  };
  const c = colors[accent] ?? colors.amber;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl ${c.ring} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${c.icon}`} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ stats }) {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    getAdminActivity()
      .then((data) => setActivity(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Utilisateurs"      value={stats.total_users}     icon={Users}      accent="amber"   />
          <StatCard label="Sessions actives"  value={stats.active_sessions} icon={Layers}     accent="emerald" />
          <StatCard label="Clubs"             value={stats.total_clubs}     icon={Building2}  accent="blue"    />
          <StatCard label="Réservations"      value={stats.total_bookings}  icon={BookOpen}   accent="violet"  />
        </div>
      )}

      {/* Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">Dernières inscriptions</h3>
          </div>
          {loading ? <Skeleton rows={5} /> : error ? <ErrorBanner message={error} /> : (
            <div className="space-y-2">
              {(activity?.recentUsers ?? []).map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[220px]">
                      {(u.first_name || u.last_name)
                        ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
                        : u.email}
                    </p>
                    <p className="text-xs text-slate-400">{ROLE_LABEL[u.role] ?? u.role}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">{fmt(u.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-700">Dernières réservations</h3>
          </div>
          {loading ? <Skeleton rows={5} /> : error ? <ErrorBanner message={error} /> : (
            <div className="space-y-2">
              {(activity?.recentBookings ?? []).map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[220px]">{b.player_email}</p>
                    <p className="text-xs text-slate-400">{b.club_name} · {b.venue_name}</p>
                  </div>
                  <Badge label={STATUS_LABEL[b.status] ?? b.status} color={STATUS_COLOR[b.status]} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────
const USER_STATUS_OPTIONS = [
  { value: 'active',    label: 'Activer'    },
  { value: 'suspended', label: 'Suspendre'  },
  { value: 'banned',    label: 'Bannir'     },
];

function UsersTab({ search = '' }) {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [roleF,    setRoleF]    = useState('');
  const [statusF,  setStatusF]  = useState('');

  function load() {
    setLoading(true);
    setError(null);
    listUsers()
      .then(({ users: u }) => setUsers(u ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const handleStatus = useCallback(async (id, status) => {
    await updateUserStatus(id, status);
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status } : u));
  }, []);

  const handleDelete = useCallback(async (id) => {
    await deleteAdminUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const filtered = users.filter((u) => {
    if (roleF   && u.role   !== roleF)   return false;
    if (statusF && u.status !== statusF) return false;
    if (search) {
      const q = search.toLowerCase();
      const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase();
      if (!u.email.toLowerCase().includes(q) && !fullName.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={roleF}
          onChange={(e) => setRoleF(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">Tous les rôles</option>
          {Object.entries(ROLE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
          <option value="banned">Banni</option>
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40"
          title="Actualiser"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? <Skeleton /> : error ? <ErrorBanner message={error} /> : (
        <>
          <p className="text-xs text-slate-400">{filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}</p>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rôle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Téléphone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Inscrit le</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Motivation</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">Aucun utilisateur trouvé.</td></tr>
                ) : filtered.map((u) => (
                  <UserRow key={u.id} user={u} onStatusChange={handleStatus} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function DeleteUserModal({ user: u, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Supprimer ce compte</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {(u.first_name || u.last_name)
                ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
                : u.email}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Êtes-vous sûr de vouloir supprimer ce compte ? Cette action est irréversible.
        </p>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            {deleting ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserRow({ user: u, onStatusChange, onDelete }) {
  const { openPlayerPanel } = usePlayerPanel();
  const [open,        setOpen]        = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  async function handlePick(status) {
    if (status === u.status) { setOpen(false); return; }
    setSaving(true);
    try { await onStatusChange(u.id, status); }
    finally { setSaving(false); setOpen(false); }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try { await onDelete(u.id); }
    finally { setDeleting(false); setShowDelete(false); }
  }

  const fullName = (u.first_name || u.last_name)
    ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
    : null;

  return (
    <>
      {showDelete && (
        <DeleteUserModal
          user={u}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}
      <tr className="hover:bg-slate-50/60 transition-colors">
        <td className="px-4 py-3">
          <button
            onClick={() => openPlayerPanel(u.id)}
            className="font-medium text-slate-700 hover:text-amber-600 transition-colors text-left"
          >
            <span className="truncate max-w-[180px] block">{fullName ?? u.email.split('@')[0]}</span>
            {fullName && <span className="text-xs text-slate-400 truncate max-w-[180px] block lg:hidden">{u.email}</span>}
          </button>
        </td>
        <td className="px-4 py-3 text-slate-500 text-sm hidden lg:table-cell truncate max-w-[200px]">{u.email}</td>
        <td className="px-4 py-3 text-slate-500">{ROLE_LABEL[u.role] ?? u.role}</td>
        <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{u.phone_number || '—'}</td>
        <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{fmt(u.created_at)}</td>
        <td className="px-4 py-3 hidden xl:table-cell max-w-[200px]">
          {u.motivation_answer ? (
            <span
              title={u.motivation_answer}
              className="text-slate-500 text-xs truncate block cursor-help"
            >
              {u.motivation_answer.length > 55
                ? `${u.motivation_answer.slice(0, 55)}…`
                : u.motivation_answer}
            </span>
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <Badge label={STATUS_LABEL[u.status] ?? u.status} color={STATUS_COLOR[u.status]} />
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {u.role !== 'super_admin' && (
              <button
                onClick={() => setShowDelete(true)}
                disabled={saving || deleting}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                title="Supprimer ce compte"
              >
                <Trash2 className="h-3 w-3" />
                Supprimer
              </button>
            )}
            <div className="relative inline-block">
              <button
                onClick={() => setOpen((o) => !o)}
                disabled={saving}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                {saving ? '…' : 'Action'}
                <ChevronDown className="h-3 w-3" />
              </button>
              {open && (
                <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  {USER_STATUS_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handlePick(value)}
                      className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition-colors ${value === u.status ? 'font-semibold text-amber-600' : 'text-slate-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

// ── Sessions tab ──────────────────────────────────────────────────────────────
function SessionsTab({ search = '' }) {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [statusF,  setStatusF]  = useState('');

  function load() {
    setLoading(true);
    listAdminSessions()
      .then(({ sessions: s }) => setSessions(s ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Supprimer cette session ?')) return;
    await deleteAdminSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const filtered = sessions.filter((s) => {
    if (statusF && s.status !== statusF) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.creator_email?.toLowerCase().includes(q) && !s.date?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">Tous les statuts</option>
          <option value="open">Ouverte</option>
          <option value="complete">Complète</option>
          <option value="cancelled">Annulée</option>
        </select>
      </div>

      {loading ? <Skeleton /> : error ? <ErrorBanner message={error} /> : (
        <>
          <p className="text-xs text-slate-400">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</p>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Heure</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Créateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Joueurs</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">Aucune session.</td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-slate-700">{fmt(s.date)}</td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{fmtTime(s.time)}</td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[180px]">{s.creator_email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{s.current_players}/{s.max_players}</td>
                    <td className="px-4 py-3">
                      <Badge label={STATUS_LABEL[s.status] ?? s.status} color={STATUS_COLOR[s.status]} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Clubs tab ─────────────────────────────────────────────────────────────────
function ClubsTab({ search = '' }) {
  const [clubs,   setClubs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    listAdminClubs()
      .then(({ clubs: c }) => setClubs(c ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback(async (id, currentStatus) => {
    const next = currentStatus === 'active' ? 'inactive' : 'active';
    await updateClubStatus(id, next);
    setClubs((prev) => prev.map((c) => c.id === id ? { ...c, status: next } : c));
  }, []);

  const handleValidate = useCallback(async (id) => {
    await validateClub(id);
    setClubs((prev) => prev.map((c) => c.id === id ? { ...c, status: 'active' } : c));
  }, []);

  const displayClubs = search
    ? clubs.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.slug?.toLowerCase().includes(search.toLowerCase()))
    : clubs;
  const pending = displayClubs.filter((c) => c.status === 'pending_validation');

  return (
    <div className="space-y-4">
      {loading ? <Skeleton /> : error ? <ErrorBanner message={error} /> : (
        <>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">{displayClubs.length} club{displayClubs.length !== 1 ? 's' : ''}</p>
            {pending.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                {pending.length} en attente de validation
              </span>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Club</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Slug</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Terrains</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayClubs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">Aucun club.</td></tr>
                ) : displayClubs.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0 border border-slate-100" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-amber-500" />
                          </div>
                        )}
                        <Link to={`/clubs/${c.id}`} className="font-medium text-slate-700 hover:text-amber-600 transition-colors">
                          {c.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell font-mono">/{c.slug}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{c.venues_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <Badge label={STATUS_LABEL[c.status] ?? c.status} color={STATUS_COLOR[c.status]} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status === 'pending_validation' ? (
                        <ClubValidateButton club={c} onValidate={handleValidate} />
                      ) : (
                        <ClubToggle club={c} onToggle={handleToggle} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ClubValidateButton({ club, onValidate }) {
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  async function handle() {
    setSaving(true);
    try {
      await onValidate(club.id);
      setDone(true);
    } finally {
      setSaving(false);
    }
  }
  if (done) return <span className="text-xs text-emerald-600 font-medium">Validé ✓</span>;
  return (
    <button
      onClick={handle}
      disabled={saving}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40"
    >
      {saving ? '…' : 'Valider'}
    </button>
  );
}

function ClubToggle({ club, onToggle }) {
  const [saving, setSaving] = useState(false);
  async function handle() {
    setSaving(true);
    try { await onToggle(club.id, club.status); }
    finally { setSaving(false); }
  }
  const isActive = club.status === 'active';
  return (
    <button
      onClick={handle}
      disabled={saving}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
        isActive
          ? 'border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50'
          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
      }`}
    >
      {saving ? '…' : isActive ? 'Désactiver' : 'Activer'}
    </button>
  );
}

// ── Bookings tab ──────────────────────────────────────────────────────────────
const PAYMENT_LABEL = {
  on_arrival: 'Sur place',
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_money: 'MTN Money',
  momo: 'MoMo',
};

function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [dateF,    setDateF]    = useState('');

  function load() {
    setLoading(true);
    listAdminBookings(dateF ? { date: dateF } : {})
      .then(({ bookings: b }) => setBookings(b ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, [dateF]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-400" />
        <input
          type="date"
          value={dateF}
          onChange={(e) => setDateF(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {dateF && (
          <button onClick={() => setDateF('')} className="text-xs text-slate-400 hover:text-slate-600 underline">
            Effacer
          </button>
        )}
      </div>

      {loading ? <Skeleton /> : error ? <ErrorBanner message={error} /> : (
        <>
          <p className="text-xs text-slate-400">{bookings.length} réservation{bookings.length !== 1 ? 's' : ''}</p>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joueur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Club · Terrain</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Heure</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Paiement</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Montant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Aucune réservation.</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/players/${b.player_id}`} className="text-slate-700 hover:text-amber-600 transition-colors text-xs font-medium truncate max-w-[160px] block">
                        {b.player_email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-slate-700 text-xs font-medium">{b.club_name}</p>
                      <p className="text-slate-400 text-xs">{b.venue_name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{fmt(b.slot_date)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">{fmtTime(b.start_time)} – {fmtTime(b.end_time)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{PAYMENT_LABEL[b.payment_method] ?? b.payment_method ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs font-medium hidden lg:table-cell">
                      {b.price ? `${Number(b.price).toLocaleString('fr-FR')} FCFA` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={STATUS_LABEL[b.status] ?? b.status} color={STATUS_COLOR[b.status]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sanctions tab ─────────────────────────────────────────────────────────────
function SanctionsTab() {
  const [sanctions, setSanctions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [typeF,     setTypeF]     = useState('');

  function load() {
    setLoading(true);
    listAdminSanctions(typeF ? { type: typeF } : {})
      .then(({ sanctions: s }) => setSanctions(s ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, [typeF]);

  const handleMarkPaid = useCallback(async (id) => {
    await markSanctionPaid(id);
    setSanctions((prev) => prev.map((s) => s.id === id ? { ...s, paid: true } : s));
  }, []);

  const handleLift = useCallback(async (id) => {
    if (!confirm('Lever cette sanction ?')) return;
    await liftSanction(id);
    setSanctions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const bans  = sanctions.filter((s) => ['app_ban', 'club_ban'].includes(s.type));
  const fines = sanctions.filter((s) => ['no_show', 'late_cancel'].includes(s.type));

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <select
          value={typeF}
          onChange={(e) => setTypeF(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">Toutes les sanctions</option>
          <option value="app_ban">Ban app</option>
          <option value="club_ban">Ban club</option>
          <option value="no_show">Amendes no-show</option>
          <option value="late_cancel">Annulation tardive</option>
        </select>
      </div>

      {loading ? <Skeleton /> : error ? <ErrorBanner message={error} /> : (
        <>
          {/* Bans */}
          {(!typeF || (typeF !== 'no_show' && typeF !== 'late_cancel')) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold text-slate-700">Bans actifs ({bans.length})</h3>
              </div>
              {bans.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Aucun ban actif.</p>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Utilisateur</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Club</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Expire le</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bans.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-slate-700 text-xs font-medium">
                            {[s.user_first_name, s.user_last_name].filter(Boolean).join(' ') || s.user_email}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              label={PENALTY_LABEL[s.type] ?? s.type}
                              color={s.type === 'app_ban' ? 'red' : 'orange'}
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{s.club_name ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{fmt(s.expires_at)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleLift(s.id)}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Lever
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Fines */}
          {(!typeF || typeF === 'no_show' || typeF === 'late_cancel') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-700">Amendes ({fines.length})</h3>
              </div>
              {fines.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Aucune amende en attente.</p>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Utilisateur</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Club</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {fines.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-slate-700 text-xs font-medium">
                            {[s.user_first_name, s.user_last_name].filter(Boolean).join(' ') || s.user_email}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{s.club_name ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-700 text-xs font-medium">
                            {s.amount ? `${Number(s.amount).toLocaleString('fr-FR')} FCFA` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge label={s.paid ? 'Payée' : 'En attente'} color={s.paid ? 'green' : 'yellow'} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!s.paid && (
                              <button
                                onClick={() => handleMarkPaid(s.id)}
                                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Marquer payée
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Revenue tab ───────────────────────────────────────────────────────────────
function RevenueTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [period,  setPeriod]  = useState('month');

  function load() {
    setLoading(true);
    setError(null);
    getAdminRevenue(period)
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  function exportCSV() {
    const payments = data?.payments ?? [];
    if (!payments.length) return;
    const header = ['Club', 'Terrains', 'Montant (FCFA)', 'Méthode', 'Date de paiement', 'Période début', 'Période fin', 'Statut'];
    const rows = payments.map((p) => [
      p.club_name,
      p.venue_count,
      p.amount,
      p.payment_method ?? 'N/A',
      fmt(p.paid_at),
      fmt(p.current_period_start),
      fmt(p.current_period_end),
      p.org_subscription_status ?? '—',
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `revenus_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const payments = data?.payments ?? [];

  return (
    <div className="space-y-5">

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total ce mois"
            value={`${Number(data.revenue_this_month ?? 0).toLocaleString('fr-FR')} FCFA`}
            icon={TrendingUp}
            accent="emerald"
          />
          <StatCard
            label="Total cette semaine"
            value={`${Number(data.revenue_this_week ?? 0).toLocaleString('fr-FR')} FCFA`}
            icon={CreditCard}
            accent="blue"
          />
          <StatCard
            label="Total (tous)"
            value={`${Number(data.revenue_all_time ?? 0).toLocaleString('fr-FR')} FCFA`}
            icon={TrendingUp}
            accent="violet"
          />
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-2.5 justify-center">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Clubs actifs</span>
              <span className="text-xl font-bold text-emerald-600">{data.active_clubs ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">En essai</span>
              <span className="text-xl font-bold text-amber-500">{data.pending_clubs ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter + Export row */}
      <div className="flex items-center gap-2 flex-wrap">
        {[['month', 'Ce mois'], ['week', 'Cette semaine'], ['all', 'Tout']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setPeriod(v)}
            className={`h-9 px-3.5 rounded-lg border text-sm font-medium transition-colors ${
              period === v
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {l}
          </button>
        ))}
        <button
          onClick={exportCSV}
          disabled={!payments.length}
          className="ml-auto flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {loading ? <Skeleton /> : error ? <ErrorBanner message={error} /> : (
        <>
          <p className="text-xs text-slate-400">{payments.length} paiement{payments.length !== 1 ? 's' : ''}</p>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Club</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Terrains</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Méthode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date paiement</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Période</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payments.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Aucun paiement sur cette période.</td></tr>
                ) : payments.map((p) => {
                  const s   = p.org_subscription_status;
                  const cfg = { trial: { label: 'Essai', color: 'yellow' }, active: { label: 'Payé', color: 'green' }, suspended: { label: 'Suspendu', color: 'red' } }[s] ?? { label: s ?? '—', color: 'gray' };
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700 truncate max-w-[160px]">{p.club_name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{p.venue_count}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{Number(p.amount).toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{PAYMENT_LABEL[p.payment_method] ?? p.payment_method ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(p.paid_at)}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell whitespace-nowrap">
                        {fmt(p.current_period_start)} → {fmt(p.current_period_end)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={cfg.label} color={cfg.color} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Subscriptions tab ─────────────────────────────────────────────────────────
const SUB_STATUS_MAP = {
  trial:     { label: 'Essai',    color: 'yellow' },
  active:    { label: 'Payé',     color: 'green'  },
  suspended: { label: 'Suspendu', color: 'red'    },
};

function SubscriptionsTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [saving,  setSaving]  = useState(null); // orgId being saved

  function load() {
    setLoading(true);
    getAdminSubscriptions()
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const handleActivate = useCallback(async (orgId) => {
    setSaving(orgId);
    try {
      await activateSubscription(orgId);
      setData((prev) => ({
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === orgId ? { ...c, subscription_status: 'active', days_remaining: 30 } : c
        ),
      }));
    } catch { /* ignore */ }
    finally { setSaving(null); }
  }, []);

  const handleSuspend = useCallback(async (orgId) => {
    if (!confirm('Suspendre cet abonnement ? Le club ne pourra plus accepter de réservations.')) return;
    setSaving(orgId);
    try {
      await suspendSubscription(orgId);
      setData((prev) => ({
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === orgId ? { ...c, subscription_status: 'suspended', days_remaining: 0 } : c
        ),
      }));
    } catch { /* ignore */ }
    finally { setSaving(null); }
  }, []);

  const handleMarkPaid = useCallback(async (orgId) => {
    setSaving(orgId);
    try {
      const { sub } = await markSubscriptionPaid(orgId);
      setData((prev) => ({
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === orgId
            ? {
                ...c,
                subscription_status: 'active',
                days_remaining: 30,
                last_subscription: sub,
              }
            : c
        ),
      }));
    } catch { /* ignore */ }
    finally { setSaving(null); }
  }, []);

  const clubs = data?.clubs ?? [];

  return (
    <div className="space-y-5">

      {/* Revenue quick card */}
      {data && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Revenus ce mois</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">
              {Number(data.revenue_this_month ?? 0).toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">Payés</p>
            <p className="text-lg font-bold text-emerald-600">
              {clubs.filter((c) => c.subscription_status === 'active').length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Essai</p>
            <p className="text-lg font-bold text-amber-500">
              {clubs.filter((c) => c.subscription_status === 'trial').length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Suspendus</p>
            <p className="text-lg font-bold text-red-600">
              {clubs.filter((c) => c.subscription_status === 'suspended').length}
            </p>
          </div>
        </div>
      )}

      {loading ? <Skeleton /> : error ? <ErrorBanner message={error} /> : (
        <>
          <p className="text-xs text-slate-400">{clubs.length} club{clubs.length !== 1 ? 's' : ''}</p>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Club</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Terrains</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Dernier paiement</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Renouvellement</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Montant dû</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clubs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                      Aucun club enregistré.
                    </td>
                  </tr>
                ) : clubs.map((c) => {
                  const cfg      = SUB_STATUS_MAP[c.subscription_status] ?? SUB_STATUS_MAP.suspended;
                  const isSaving = saving === c.id;
                  const urgent   = c.subscription_status !== 'suspended' && (c.days_remaining ?? 0) <= 7;
                  const lastSub  = c.last_subscription;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700 truncate max-w-[150px]">{c.name}</p>
                        <p className="text-xs text-slate-400 font-mono">/{c.slug ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={cfg.label} color={cfg.color} />
                        {c.subscription_status !== 'suspended' && (
                          <p className={`text-[10px] mt-0.5 ${urgent ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                            {`${c.days_remaining ?? 0} j restants`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                        {c.venue_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                        {lastSub?.paid_at ? fmt(lastSub.paid_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                        {lastSub?.current_period_end ? fmt(lastSub.current_period_end) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs font-medium hidden lg:table-cell">
                        {Number(c.amount_due ?? 0).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {c.subscription_status !== 'active' && (
                            <button
                              disabled={isSaving}
                              onClick={() => handleMarkPaid(c.id)}
                              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40 whitespace-nowrap"
                            >
                              {isSaving ? '…' : '✓ Marquer payé'}
                            </button>
                          )}
                          {c.subscription_status === 'active' && (
                            <button
                              disabled={isSaving}
                              onClick={() => handleSuspend(c.id)}
                              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            >
                              {isSaving ? '…' : 'Suspendre'}
                            </button>
                          )}
                          {c.subscription_status === 'suspended' && (
                            <button
                              disabled={isSaving}
                              onClick={() => handleActivate(c.id)}
                              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
                            >
                              {isSaving ? '…' : 'Réactiver'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV = [
  { key: 'overview',       label: 'Dashboard',    icon: LayoutDashboard },
  { key: 'users',          label: 'Utilisateurs', icon: Users           },
  { key: 'sessions',       label: 'Sessions',     icon: Layers          },
  { key: 'clubs',          label: 'Clubs',        icon: Building2       },
  { key: 'bookings',       label: 'Réservations', icon: BookOpen        },
  { key: 'sanctions',      label: 'Sanctions',    icon: ShieldAlert     },
  { key: 'subscriptions',  label: 'Abonnements',  icon: CreditCard      },
  { key: 'revenue',        label: 'Revenus',      icon: TrendingUp      },
];

// ── AdminDashboard page ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [tab,     setTab]     = useState('overview');
  const [search,  setSearch]  = useState('');
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  function switchTab(key) { setTab(key); setSearch(''); }

  useEffect(() => {
    getDashboard()
      .then(({ stats: s }) => setStats(s))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    try { await logout(); } catch { /* non-fatal */ }
    setUser(null);
    navigate('/admin/login', { replace: true });
  }

  const ActiveTab = {
    overview:      <OverviewTab stats={stats} />,
    users:         <UsersTab search={search} />,
    sessions:      <SessionsTab search={search} />,
    clubs:         <ClubsTab search={search} />,
    bookings:      <BookingsTab />,
    sanctions:     <SanctionsTab />,
    subscriptions: <SubscriptionsTab />,
    revenue:       <RevenueTab />,
  }[tab] ?? null;

  const searchableTabs = ['users', 'sessions', 'clubs'];
  const searchPlaceholder = {
    users:    'Rechercher un utilisateur…',
    sessions: 'Rechercher par créateur ou date…',
    clubs:    'Rechercher un club…',
  }[tab] ?? 'Rechercher…';

  return (
    <div className="flex gap-6 min-h-[calc(100vh-4rem)]">

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 hidden lg:flex flex-col gap-1 pt-1">
        {/* Identity */}
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 mb-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Super Admin</p>
          <p className="text-xs text-amber-600/80 mt-0.5 truncate">{user?.email}</p>
        </div>

        {/* Nav */}
        {NAV.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-left ${
              tab === key
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${tab === key ? 'text-white' : 'text-slate-400'}`} />
            {label}
          </button>
        ))}

        <div className="mt-auto pt-4 space-y-1">
          <Link
            to="/admin/profile"
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors w-full"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            Paramètres
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors w-full text-left"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Global search bar */}
        {searchableTabs.includes(tab) && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>
        )}

        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {NAV.find((n) => n.key === tab)?.label}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Panneau d'administration PadelConnect</p>
          </div>
          {loading && (
            <div className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-500 rounded-full animate-spin" />
          )}
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Tab content — extra bottom padding on mobile for fixed bottom nav */}
        <div className="pb-20 lg:pb-0">
          {ActiveTab}
        </div>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-center justify-around px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: '64px' }}>
        {[
          { key: 'overview',  label: 'Dashboard',    icon: Home      },
          { key: 'users',     label: 'Utilisateurs', icon: Users     },
          { key: 'sessions',  label: 'Sessions',     icon: Calendar  },
          { key: 'clubs',     label: 'Clubs',        icon: Building2 },
          { key: 'profile',   label: 'Profil',       icon: User      },
        ].map(({ key, label, icon: Icon }) => (
          key === 'profile' ? (
            <Link
              key={key}
              to="/admin/profile"
              className="flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 transition-colors text-slate-400 hover:text-slate-600"
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </Link>
          ) : (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 transition-colors ${
                tab === key ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </button>
          )
        ))}
      </nav>
    </div>
  );
}
