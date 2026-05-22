import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Users, Building2, CalendarDays, BookOpen, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '@/App';
import { getDashboard, listUsers, updateUserStatus, listAdminClubs, updateClubStatus } from '@/api/admin';
import { Button } from '@/components/ui/button';

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value ?? '—'}</p>
    </div>
  );
}

const USER_STATUS_OPTIONS = ['active', 'suspended', 'banned'];
const USER_STATUS_LABEL   = { active: 'Actif', suspended: 'Suspendu', banned: 'Banni' };
const USER_STATUS_CLS     = {
  active:    'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  banned:    'bg-red-100 text-red-600',
};
const ROLE_LABEL = {
  player: 'Joueur', venue_admin: 'Gérant', coach: 'Coach',
  ball_picker: 'Ramasseur', super_admin: 'Super Admin',
};

// ── User row ──────────────────────────────────────────────────────────────────
function UserRow({ user: u, onStatusChange }) {
  const [status,  setStatus]  = useState(u.status);
  const [saving,  setSaving]  = useState(false);
  const [open,    setOpen]    = useState(false);

  async function handleChange(newStatus) {
    if (newStatus === status) { setOpen(false); return; }
    setSaving(true);
    try {
      await onStatusChange(u.id, newStatus);
      setStatus(newStatus);
    } catch {
      // revert is implicit — state unchanged
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
        <p className="text-xs text-muted-foreground">
          {ROLE_LABEL[u.role] ?? u.role}
          {u.phone_number && <span className="ml-2 text-muted-foreground/70">{u.phone_number}</span>}
        </p>
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={saving}
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${USER_STATUS_CLS[status] ?? 'bg-muted text-muted-foreground'} disabled:opacity-50`}
        >
          {saving ? '…' : USER_STATUS_LABEL[status] ?? status}
          <ChevronDown className="h-3 w-3" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-10 w-32 rounded-lg border border-border bg-popover shadow-md overflow-hidden">
            {USER_STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleChange(s)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${s === status ? 'font-semibold' : ''}`}
              >
                {USER_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CLUB_STATUS_LABEL = { active: 'Actif', inactive: 'Inactif' };
const CLUB_STATUS_CLS   = { active: 'bg-green-100 text-green-700', inactive: 'bg-muted text-muted-foreground' };

// ── Club row ──────────────────────────────────────────────────────────────────
function ClubRow({ club: c, onStatusChange }) {
  const [status, setStatus] = useState(c.status);
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    const next = status === 'active' ? 'inactive' : 'active';
    setSaving(true);
    try {
      await onStatusChange(c.id, next);
      setStatus(next);
    } catch {
      // revert implicit
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{c.name}</p>
        <p className="text-xs text-muted-foreground">/{c.slug}</p>
      </div>
      <button
        onClick={handleToggle}
        disabled={saving}
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${CLUB_STATUS_CLS[status] ?? 'bg-muted text-muted-foreground'} disabled:opacity-50`}
      >
        {saving ? '…' : CLUB_STATUS_LABEL[status] ?? status}
      </button>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

// ── AdminDashboard page ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();

  const [stats,   setStats]   = useState(null);
  const [users,   setUsers]   = useState([]);
  const [clubs,   setClubs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState('users');

  useEffect(() => {
    async function load() {
      try {
        const [{ stats: s }, { users: u }, { clubs: c }] = await Promise.all([
          getDashboard(),
          listUsers(),
          listAdminClubs(),
        ]);
        setStats(s);
        setUsers(u ?? []);
        setClubs(c ?? []);
      } catch (err) {
        setError(err.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleUserStatus  = useCallback((id, status) => updateUserStatus(id, status),  []);
  const handleClubStatus  = useCallback((id, status) => updateClubStatus(id, status),  []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Administration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Accès super admin — {user?.email}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : (
        <>
          {/* Stats grid */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Utilisateurs"      value={stats.total_users}     icon={Users} />
              <StatCard label="Clubs"             value={stats.total_clubs}     icon={Building2} />
              <StatCard label="Sessions ouvertes" value={stats.active_sessions} icon={CalendarDays} />
              <StatCard label="Réservations"      value={stats.total_bookings}  icon={BookOpen} />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            {[
              { key: 'users', label: `Utilisateurs (${users.length})` },
              { key: 'clubs', label: `Clubs (${clubs.length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Users tab */}
          {tab === 'users' && (
            <Section title="">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun utilisateur.</p>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <UserRow key={u.id} user={u} onStatusChange={handleUserStatus} />
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Clubs tab */}
          {tab === 'clubs' && (
            <Section title="">
              {clubs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun club.</p>
              ) : (
                <div className="space-y-2">
                  {clubs.map((c) => (
                    <ClubRow key={c.id} club={c} onStatusChange={handleClubStatus} />
                  ))}
                </div>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
