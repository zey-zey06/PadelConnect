import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { getMyTeam, inviteMember } from '@/api/teams';
import { createTournament, listTournaments, updateTournamentStatus } from '@/api/tournaments';
import { listClubs } from '@/api/clubs';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { Badge }  from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Users, Mail, Trophy, Clock, ExternalLink, UserPlus,
  AlertCircle, CheckCircle2, Plus, X, Calendar, Banknote,
  Camera, MapPin, ChevronRight, Loader2,
} from 'lucide-react';

// ── Member row ────────────────────────────────────────────────────────────────
function MemberRow({ member }) {
  const name   = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.invite_email || '—';
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
        {(member.email || member.invite_email) && (
          <p className="text-xs text-muted-foreground truncate">{member.email || member.invite_email}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
          {roleLbl}
        </Badge>
        {member.status === 'pending' && (
          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
            <Clock className="h-2.5 w-2.5 mr-0.5" />En attente
          </Badge>
        )}
      </div>
    </div>
  );
}

// ── Invite form ───────────────────────────────────────────────────────────────
function InviteForm({ teamId, onSuccess }) {
  const [email,   setEmail]   = useState('');
  const [role,    setRole]    = useState('staff');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [sent,    setSent]    = useState(false);

  async function handleInvite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError(null);
    try {
      await inviteMember(teamId, { email: email.trim(), role });
      setSent(true); setEmail('');
      setTimeout(() => { setSent(false); onSuccess?.(); }, 2000);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleInvite} className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}
      {sent && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />Invitation envoyée !
        </div>
      )}
      <div className="flex gap-2">
        <Input type="email" placeholder="email@exemple.com" value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }} required className="flex-1" />
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <Button type="submit" size="sm" className="w-full" disabled={loading || !email.trim()}>
        {loading
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi…</>
          : <><UserPlus className="h-4 w-4 mr-1.5" /> Envoyer l'invitation</>}
      </Button>
    </form>
  );
}

// ── Create tournament modal ────────────────────────────────────────────────────
function CreateTournamentModal({ onClose, onCreated }) {
  const fileRef = useRef(null);
  const [clubs,   setClubs]   = useState([]);
  const [form,    setForm]    = useState({
    name: '', description: '', format: 'elimination',
    level_min: 1, level_max: 7, max_teams: 16, registration_fee: 0,
    start_date: '', end_date: '', club_id: '', status: 'draft',
  });
  const [banner,  setBanner]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    listClubs().then(({ clubs: c }) => setClubs((c ?? []).filter((cl) => cl.status === 'active' || !cl.status))).catch(() => {});
  }, []);

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); setError(null); }

  function handleBanner(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBanner(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom du tournoi est requis.'); return; }
    setLoading(true); setError(null);
    try {
      const { tournament } = await createTournament({
        ...form,
        banner_url: banner || null,
        club_id:    form.club_id || null,
        level_min:  Number(form.level_min),
        level_max:  Number(form.level_max),
        max_teams:  Number(form.max_teams),
        registration_fee: Number(form.registration_fee),
      });
      onCreated(tournament);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground">Créer un tournoi</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {/* Banner upload */}
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="relative w-full h-28 rounded-xl border-2 border-dashed border-border bg-muted hover:border-primary/50 hover:bg-primary/5 transition-all overflow-hidden flex items-center justify-center">
              {banner
                ? <img src={banner} alt="banner" className="absolute inset-0 w-full h-full object-cover" />
                : <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">Bannière (optionnel)</span>
                  </div>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Nom du tournoi *</Label>
            <Input placeholder="Ex: Tournoi Open Abidjan 2026" value={form.name}
              onChange={(e) => set('name', e.target.value)} required />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea placeholder="Infos pratiques, règlement…" value={form.description}
              onChange={(e) => set('description', e.target.value)} rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <Label>Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {[['elimination', 'Élimination directe'], ['round_robin', 'Poules']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('format', v)}
                  className={cn(
                    'py-2.5 px-3 rounded-xl border text-sm font-medium transition-all',
                    form.format === v
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border text-foreground/70 hover:border-primary/40'
                  )}>{l}</button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date de début</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date de fin</Label>
              <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>

          {/* Level range */}
          <div className="space-y-1.5">
            <Label>Niveaux (min – max)</Label>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 flex-1">
                {[1,2,3,4,5,6,7].map((n) => (
                  <button key={n} type="button" onClick={() => set('level_min', n)}
                    className={cn(
                      'flex-1 h-8 rounded-lg border text-xs font-bold transition-all',
                      n <= form.level_min
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-foreground/40 hover:border-primary/40'
                    )}>{n}</button>
                ))}
              </div>
              <span className="text-muted-foreground text-sm">–</span>
              <div className="flex gap-1 flex-1">
                {[1,2,3,4,5,6,7].map((n) => (
                  <button key={n} type="button" onClick={() => set('level_max', n)}
                    className={cn(
                      'flex-1 h-8 rounded-lg border text-xs font-bold transition-all',
                      n >= form.level_max
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-foreground/40 hover:border-primary/40'
                    )}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Max teams + fee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nb. équipes max</Label>
              <Input type="number" min={2} max={128} value={form.max_teams}
                onChange={(e) => set('max_teams', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Frais d'inscription (FCFA)</Label>
              <Input type="number" min={0} value={form.registration_fee}
                onChange={(e) => set('registration_fee', e.target.value)} />
            </div>
          </div>

          {/* Club partner */}
          {clubs.length > 0 && (
            <div className="space-y-1.5">
              <Label>
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />Club partenaire (optionnel)</span>
              </Label>
              <select value={form.club_id} onChange={(e) => set('club_id', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">— Aucun club —</option>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Visibility */}
          <div className="space-y-1.5">
            <Label>Visibilité initiale</Label>
            <div className="grid grid-cols-2 gap-2">
              {[['draft', 'Brouillon (privé)'], ['open', 'Ouvert aux inscriptions']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('status', v)}
                  className={cn(
                    'py-2.5 px-3 rounded-xl border text-sm font-medium transition-all text-left',
                    form.status === v
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border text-foreground/70 hover:border-primary/40'
                  )}>{l}</button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading || !form.name.trim()}>
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Création…</>
              : 'Créer le tournoi'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Tournament row ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:     { label: 'Brouillon',  color: 'bg-slate-100 text-slate-600' },
  open:      { label: 'Inscriptions', color: 'bg-green-100 text-green-700' },
  ongoing:   { label: 'En cours',   color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Terminé',    color: 'bg-purple-100 text-purple-700' },
};

function TournamentRow({ tournament }) {
  const cfg = STATUS_CFG[tournament.status] ?? STATUS_CFG.draft;
  return (
    <Link to={`/tournaments/${tournament.id}`}
      className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors -mx-4 px-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
        {tournament.banner_url
          ? <img src={tournament.banner_url} alt="" className="w-full h-full object-cover" />
          : <Trophy className="h-5 w-5 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{tournament.name}</p>
        {tournament.start_date && (
          <p className="text-xs text-muted-foreground">
            {new Date(tournament.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', cfg.color)}>{cfg.label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function TeamDashboard() {
  const { user } = useAuth();
  const [team,          setTeam]          = useState(null);
  const [members,       setMembers]       = useState([]);
  const [tournaments,   setTournaments]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [showCreateTnmt, setShowCreateTnmt] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getMyTeam();
      setTeam(data.team);
      setMembers(data.members || []);
      // Load team's tournaments
      const all = await listTournaments().then((d) => d.tournaments ?? []);
      setTournaments(all.filter((t) => t.team_id === data.team.id));
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
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
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
            {team.logo_url
              ? <img src={team.logo_url} alt={team.name} className="w-10 h-10 rounded-xl object-cover" />
              : <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>}
            <div>
              <h1 className="font-semibold text-foreground text-base leading-tight">{team.name}</h1>
              <p className="text-xs text-muted-foreground">{team.city}</p>
            </div>
          </div>
          <Link to={`/team/${team.id}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Profil public
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users,  label: 'Membres',    value: activeMembers.length },
            { icon: Clock,  label: 'En attente', value: pendingMembers.length },
            { icon: Trophy, label: 'Tournois',   value: tournaments.length },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
              <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {team.description && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{team.description}</p>
          </div>
        )}

        {/* Tournaments */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Tournois organisés</span>
            </div>
            {isAdmin && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => setShowCreateTnmt(true)}>
                <Plus className="h-3.5 w-3.5" />
                Créer
              </Button>
            )}
          </div>
          <div className="px-4">
            {tournaments.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">Aucun tournoi organisé.</p>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => setShowCreateTnmt(true)} className="gap-1 mt-1">
                    <Plus className="h-3.5 w-3.5" />
                    Créer un tournoi
                  </Button>
                )}
              </div>
            ) : (
              tournaments.map((t) => <TournamentRow key={t.id} tournament={t} />)
            )}
          </div>
        </div>

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
            {members.length === 0
              ? <p className="text-sm text-muted-foreground py-6 text-center">Aucun membre.</p>
              : members.map((m) => <MemberRow key={m.id} member={m} />)}
          </div>
        </div>

        {/* Invite — admin only */}
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
      </div>

      {showCreateTnmt && (
        <CreateTournamentModal
          onClose={() => setShowCreateTnmt(false)}
          onCreated={(t) => {
            setShowCreateTnmt(false);
            setTournaments((prev) => [t, ...prev]);
          }}
        />
      )}
    </div>
  );
}
