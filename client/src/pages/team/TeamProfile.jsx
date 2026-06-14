import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTeamById } from '@/api/teams';
import { getTeamSponsors } from '@/api/sponsors';
import { Button } from '@/components/ui/button';
import { Badge }  from '@/components/ui/badge';
import { AlertCircle, Trophy, Users, MapPin, ArrowLeft, Handshake } from 'lucide-react';

function MemberCard({ member }) {
  const name    = [member.first_name, member.last_name].filter(Boolean).join(' ') || '—';
  const initial = (member.first_name?.[0] || '?').toUpperCase();
  const roleLbl = { admin: 'Admin', manager: 'Manager', staff: 'Staff' }[member.role] || member.role;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-semibold text-primary">{initial}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
      </div>
      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
        {roleLbl}
      </Badge>
    </div>
  );
}

export default function TeamProfile() {
  const { id } = useParams();
  const [team,     setTeam]     = useState(null);
  const [members,  setMembers]  = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    getTeamById(id)
      .then((data) => { setTeam(data.team); setMembers(data.members || []); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    getTeamSponsors(id)
      .then(({ sponsors: s }) => setSponsors(s ?? []))
      .catch(() => {});
  }, [id]);

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
          <Link to="/"><Button variant="outline" size="sm">Retour</Button></Link>
        </div>
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.status === 'active');

  return (
    <div className="min-h-screen bg-background">
      {/* Back nav */}
      <div className="border-b border-border px-4 py-3">
        <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Team hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-24 h-24 rounded-2xl object-cover shadow-md" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
            {team.city && (
              <div className="flex items-center justify-center gap-1 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />{team.city}
              </div>
            )}
          </div>
          {team.description && (
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{team.description}</p>
          )}
          <Button variant="outline" size="sm" className="px-6">Suivre</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{activeMembers.length}</p>
            <p className="text-xs text-muted-foreground">Membre{activeMembers.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground">Tournois organisés</p>
          </div>
        </div>

        {/* Members */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Équipe</span>
          </div>
          <div className="px-4 divide-y divide-border">
            {activeMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Aucun membre public.</p>
            ) : (
              activeMembers.map((m) => <MemberCard key={m.id} member={m} />)
            )}
          </div>
        </div>

        {/* Sponsors — "Nos partenaires" */}
        {sponsors.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Handshake className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Nos partenaires</span>
            </div>
            <div className="p-4 grid grid-cols-4 gap-3">
              {sponsors.map((s) => {
                const inner = (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden p-1">
                      {s.logo_url
                        ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain" />
                        : <Handshake className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2 w-full">{s.name}</span>
                  </div>
                );
                return s.website_url ? (
                  <a key={s.id} href={s.website_url} target="_blank" rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity">{inner}</a>
                ) : (
                  <div key={s.id}>{inner}</div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tournaments placeholder */}
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun tournoi organisé pour l'instant.</p>
        </div>
      </div>
    </div>
  );
}
