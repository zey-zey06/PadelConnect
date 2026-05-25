import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Users, Layers, Building2, BookOpen,
  ShieldAlert, AlertCircle, ChevronDown, Trash2, CheckCircle,
  Ban, XCircle, Search, Calendar, Filter, Activity,
  UserCheck, Clock, LogOut, Settings, CreditCard,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { logout } from '@/api/auth';
import {
  getDashboard, getAdminActivity,
  listUsers, updateUserStatus,
  listAdminSessions, deleteAdminSession,
  listAdminClubs, updateClubStatus,
  listAdminBookings,
  listAdminSanctions, markSanctionPaid, liftSanction,
} from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAdminSubscriptions, activateSubscription, suspendSubscription } from '@/api/subscriptions';

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
  open: 'green', complete: 'blue', cancelled: 'gray', confirmed: 'green',
};
const STATUS_LABEL = {
  active: 'Actif', inactive: 'Inactif', suspended: 'Suspendu', banned: 'Banni',
  open: 'Ouverte', complete: 'Complète', cancelled: 'Annulée', confirmed: 'Confirmée',
};
const ROLE_LABEL = {
  player: 'Joueur', venue_admin: 'Gérant', coach: 'Coach',
  ball_picker: 'Ramasseur', super_admin: 'Super Admin',
};
const PENALTY_LABEL = {
  app_ban: 'Ban app', club_ban: 'Ban club', no_show: 'No-show',
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

function UsersTab() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [roleF,    setRoleF]    = useState('');
  const [statusF,  setStatusF]  = useState('');

  useEffect(() => {
    setLoading(true);
    listUsers()
      .then(({ users: u }) => setUsers(u ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleStatus = useCallback(async (id, status) => {
    await updateUserStatus(id, status);
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status } : u));
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
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Rechercher par nom ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm w-72"
          />
        </div>
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
      </div>

      {loading ? <Skeleton /> : error ? <ErrorBanner message={error} /> : (
        <>
          <p className="text-xs text-slate-400">{filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}</p>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
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
                  <UserRow key={u.id} user={u} onStatusChange={handleStatus} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function UserRow({ user: u, onStatusChange }) {
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePick(status) {
    if (status === u.status) { setOpen(false); return; }
    setSaving(true);
    try { await onStatusChange(u.id, status); }
    finally { setSaving(false); setOpen(false); }
  }

  const fullName = (u.first_name || u.last_name)
    ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
    : null;

  return (
    <tr className="hover:bg-slate-50/60 transition-colors">
      <td className="px-4 py-3">
        <Link to={`/players/${u.id}`} className="font-medium text-slate-700 hover:text-amber-600 transition-colors block">
          <span className="truncate max-w-[180px] block">{fullName ?? u.email.split('@')[0]}</span>
          {fullName && <span className="text-xs text-slate-400 truncate max-w-[180px] block lg:hidden">{u.email}</span>}
        </Link>
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
      </td>
    </tr>
  );
}

// ── Sessions tab ──────────────────────────────────────────────────────────────
function SessionsTab() {
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

  const filtered = statusF ? sessions.filter((s) => s.status === statusF) : sessions;

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
function ClubsTab() {
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

  return (
    <div className="space-y-4">
      {loading ? <Skeleton /> : error ? <ErrorBanner message={error} /> : (
        <>
          <p className="text-xs text-slate-400">{clubs.length} club{clubs.length !== 1 ? 's' : ''}</p>
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
                {clubs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">Aucun club.</td></tr>
                ) : clubs.map((c) => (
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
                      <ClubToggle club={c} onToggle={handleToggle} />
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
  const fines = sanctions.filter((s) => s.type === 'no_show');

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
        </select>
      </div>

      {loading ? <Skeleton /> : error ? <ErrorBanner message={error} /> : (
        <>
          {/* Bans */}
          {(!typeF || typeF !== 'no_show') && (
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
                          <td className="px-4 py-3 text-slate-700 text-xs font-medium">{s.user_email}</td>
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
          {(!typeF || typeF === 'no_show') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-700">Amendes no-show ({fines.length})</h3>
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
                          <td className="px-4 py-3 text-slate-700 text-xs font-medium">{s.user_email}</td>
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

// ── Subscriptions tab ─────────────────────────────────────────────────────────
const SUB_STATUS_MAP = {
  trial:     { label: 'Essai',    color: 'yellow' },
  active:    { label: 'Actif',    color: 'green'  },
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

  const clubs = data?.clubs ?? [];

  return (
    <div className="space-y-5">

      {/* Revenue card */}
      {data && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
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
            <p className="text-xs text-slate-400">Clubs actifs</p>
            <p className="text-lg font-bold text-slate-700">
              {clubs.filter((c) => c.subscription_status === 'active').length}
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
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Club</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Abonnement</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Terrains</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Jours restants</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Montant dû</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clubs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                      Aucun club enregistré.
                    </td>
                  </tr>
                ) : clubs.map((c) => {
                  const cfg      = SUB_STATUS_MAP[c.subscription_status] ?? SUB_STATUS_MAP.suspended;
                  const isSaving = saving === c.id;
                  const urgent   = c.subscription_status !== 'suspended' && (c.days_remaining ?? 0) <= 7;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700 truncate max-w-[160px]">{c.name}</p>
                        <p className="text-xs text-slate-400 font-mono">/{c.slug ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={cfg.label} color={cfg.color} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                        {c.venue_count ?? 0}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={urgent ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                          {c.subscription_status === 'suspended' ? '—' : `${c.days_remaining ?? 0} j`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs font-medium hidden lg:table-cell">
                        {Number(c.amount_due ?? 0).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.subscription_status !== 'active' && (
                            <button
                              disabled={isSaving}
                              onClick={() => handleActivate(c.id)}
                              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                            >
                              {isSaving ? '…' : 'Activer'}
                            </button>
                          )}
                          {c.subscription_status !== 'suspended' && (
                            <button
                              disabled={isSaving}
                              onClick={() => handleSuspend(c.id)}
                              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            >
                              {isSaving ? '…' : 'Suspendre'}
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
  { key: 'overview',    label: 'Dashboard',      icon: LayoutDashboard },
  { key: 'users',       label: 'Utilisateurs',   icon: Users           },
  { key: 'sessions',    label: 'Sessions',        icon: Layers          },
  { key: 'clubs',       label: 'Clubs',           icon: Building2       },
  { key: 'bookings',    label: 'Réservations',    icon: BookOpen        },
  { key: 'sanctions',      label: 'Sanctions',       icon: ShieldAlert  },
  { key: 'subscriptions', label: 'Abonnements',     icon: CreditCard   },
];

// ── AdminDashboard page ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [tab,     setTab]     = useState('overview');
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

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
    overview:  <OverviewTab stats={stats} />,
    users:     <UsersTab />,
    sessions:  <SessionsTab />,
    clubs:     <ClubsTab />,
    bookings:       <BookingsTab />,
    sanctions:      <SanctionsTab />,
    subscriptions:  <SubscriptionsTab />,
  }[tab] ?? null;

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
            onClick={() => setTab(key)}
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

        {/* Mobile tab bar */}
        <div className="lg:hidden flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                tab === key
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

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

        {/* Tab content */}
        {ActiveTab}
      </div>
    </div>
  );
}
