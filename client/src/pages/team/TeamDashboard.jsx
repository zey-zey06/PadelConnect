import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/App';
import { getMyTeam, inviteMember } from '@/api/teams';
import { Button }  from '@/components/ui/button';
import { Input }   from '@/components/ui/input';
import { Label }   from '@/components/ui/label';
import { Badge }   from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Users, Mail, Trophy, Settings, Copy, CheckCircle2,
  AlertCircle, UserPlus, Shield, Clock, ExternalLink,
} from 'lucide-react';

function MemberRow({ member }) {
  const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.invite_email || '—';
  const roleLbl = { admin: 'Admin', manager: 'Manager', staff: 'Staff' }[member.role] || member.role;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-muted-foreground">
          {(member.first_name?.[0] || member.invite_email?.[0] || '?').toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        {member.email && <p className="text-xs text-muted-foreground truncate">{member.email}</p>}
        {!member.email && member.invite_email && (
          <p className="text-xs text-muted-foreground truncate">{member.invite_email}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
          {roleLbl}
        </Badge>
        {member.status === 'pending' && (
          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            En attente
          </Badge>
        )}
      </div>
    </div>
  );
}

function InviteForm({ teamId, onSuccess }) {
  const [email,   setEmail]   = useState('');
  const [role,    setRole]    = useState('staff');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [sent,    setSent]    = useState(false);

  async function handleInvite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await inviteMember(teamId, { email: email.trim(), role });
      setSent(true);
      setEmail('');
      setTimeout(() => { setSent(false); onSuccess?.(); }, 2000);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'invitation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleInvite} className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {sent && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Invitation envoyée !
        </div>
      )}
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="email@exemple.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          required
          className="flex-1"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <Button type="submit" size="sm" className="w-full" disabled={loading || !email.trim()}>
        {loading ? (
          <><span className="w-3.5 h-3.5 border-2 border-primary-foreground/50 border-t-transparent rounded-full animate-spin" /> Envoi…</>
        ) : (
          <><UserPlus className="h-4 w-4 mr-1.5" /> Envoyer l'invitation</>
        )}
      </Button>
    </form>
  );
}

export default function TeamDashboard() {
  const { user } = useAuth();
  const [team,    setTeam]    = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyTeam();
      setTeam(data.team);
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{error || 'Équipe introuvable.'}</p>
          <Button variant="outline" size="sm" onClick={load}>Réessayer</Button>
        </div>
      </div>
    );
  }

  const activeMembers  = members.filter((m) => m.status === 'active');
  const pendingMembers = members.filter((m) => m.status === 'pending');
  const isAdmin = members.some((m) => m.user_id === user?.id && m.role === 'admin');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-semibold text-foreground text-base leading-tight">{team.name}</h1>
              <p className="text-xs text-muted-foreground">{team.city}</p>
            </div>
          </div>
          <Link
            to={`/team/${team.id}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Profil public
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users,  label: 'Membres',    value: activeMembers.length },
            { icon: Clock,  label: 'En attente', value: pendingMembers.length },
            { icon: Trophy, label: 'Tournois',   value: 0 },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
              <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Team description */}
        {team.description && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{team.description}</p>
          </div>
        )}

        {/* Members */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Membres de l'équipe</span>
            </div>
            <span className="text-xs text-muted-foreground">{members.length} total</span>
          </div>
          <div className="px-4">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Aucun membre pour l'instant.</p>
            ) : (
              members.map((m) => <MemberRow key={m.id} member={m} />)
            )}
          </div>
        </div>

        {/* Invite section — admin only */}
        {isAdmin && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Inviter un membre</span>
            </div>
            <div className="p-4">
              <InviteForm teamId={team.id} onSuccess={load} />
            </div>
          </div>
        )}

        {/* Tournaments — placeholder */}
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center space-y-2">
          <Trophy className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium text-foreground">Aucun tournoi organisé</p>
          <p className="text-xs text-muted-foreground">La gestion de tournois sera disponible prochainement.</p>
        </div>
      </div>
    </div>
  );
}
