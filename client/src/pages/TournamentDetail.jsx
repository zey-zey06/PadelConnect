import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import {
  getTournament, registerForTournament, generateBracket,
  submitMatchScore, likeTournament, getComments, addComment,
  updateTournamentStatus,
} from '@/api/tournaments';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Badge }  from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Trophy, Calendar, Users, MapPin, Banknote, Heart, MessageSquare,
  Share2, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Zap,
  ChevronRight, Copy, Check,
} from 'lucide-react';

const LEVEL_LABELS = { 1:'Déb.', 2:'Déb+', 3:'Inter', 4:'Inter+', 5:'Conf.', 6:'Avancé', 7:'Expert' };
const FORMAT_LABELS = { elimination: 'Élimination directe', round_robin: 'Poules' };

const STATUS_CFG = {
  draft:     { label: 'Brouillon',  color: 'bg-slate-100 text-slate-600' },
  open:      { label: 'Inscriptions ouvertes', color: 'bg-green-100 text-green-700' },
  ongoing:   { label: 'En cours',   color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Terminé',    color: 'bg-purple-100 text-purple-700' },
};

const PAYMENT_LABELS = {
  wave: 'Wave', orange_money: 'Orange Money', mtn_money: 'MTN Money',
  card: 'Carte', on_arrival: 'Sur place', balance: 'Solde',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Register modal ────────────────────────────────────────────────────────────
function RegisterModal({ tournamentId, fee, onClose, onSuccess }) {
  const [partnerEmail, setPartnerEmail] = useState('');
  const [payment,      setPayment]      = useState('on_arrival');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registerForTournament(tournamentId, {
        partner_email:  partnerEmail.trim() || null,
        payment_method: payment,
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">S'inscrire au tournoi</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {fee > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Frais d'inscription : {Number(fee).toLocaleString('fr-FR')} FCFA
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email du partenaire (optionnel)</label>
            <Input
              type="email"
              placeholder="partenaire@exemple.com"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Laissez vide pour vous inscrire en individuel.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mode de paiement</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setPayment(v)}
                  className={cn(
                    'text-sm py-2.5 px-3 rounded-xl border font-medium transition-all text-left',
                    payment === v
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border text-foreground/70 hover:border-primary/40'
                  )}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Inscription…</> : "Confirmer l'inscription"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Score input ───────────────────────────────────────────────────────────────
function ScoreInput({ tournamentId, match, onUpdated }) {
  const [s1, setS1] = useState(match.score_team1 ?? '');
  const [s2, setS2] = useState(match.score_team2 ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (s1 === '' || s2 === '') return;
    setLoading(true);
    try {
      const updated = await submitMatchScore(tournamentId, match.id, {
        score_team1: Number(s1), score_team2: Number(s2),
      });
      onUpdated(updated.match);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  return (
    <div className="flex items-center gap-2">
      <input type="number" min={0} max={99} value={s1} onChange={(e) => setS1(e.target.value)}
        className="w-12 h-8 text-center text-sm font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
      <span className="text-xs text-muted-foreground font-medium">–</span>
      <input type="number" min={0} max={99} value={s2} onChange={(e) => setS2(e.target.value)}
        className="w-12 h-8 text-center text-sm font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
      <button onClick={handleSave} disabled={loading || s1 === '' || s2 === ''}
        className="h-8 px-2.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
        {loading ? '…' : '✓'}
      </button>
    </div>
  );
}

// ── Comments section ──────────────────────────────────────────────────────────
function CommentsSection({ tournamentId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [body,     setBody]     = useState('');
  const [posting,  setPosting]  = useState(false);

  useEffect(() => {
    getComments(tournamentId)
      .then((d) => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  async function handlePost(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      const { comment } = await addComment(tournamentId, body);
      setComments((prev) => [...prev, {
        ...comment,
        first_name: user?.first_name || 'Vous',
        last_name:  user?.last_name  || '',
      }]);
      setBody('');
    } catch { /* ignore */ } finally { setPosting(false); }
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun commentaire. Soyez le premier !</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
                {(c.first_name?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-1 bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                <p className="text-xs font-medium text-foreground mb-0.5">
                  {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                </p>
                <p className="text-sm text-foreground leading-snug">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {user && (
        <form onSubmit={handlePost} className="flex gap-2 pt-1">
          <input
            type="text" placeholder="Votre commentaire…" value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 h-9 text-sm rounded-full border border-border bg-background px-4 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" size="sm" disabled={posting || !body.trim()}
            className="rounded-full px-4">
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Envoyer'}
          </Button>
        </form>
      )}
    </div>
  );
}

// ── Bracket display ───────────────────────────────────────────────────────────
function BracketTab({ tournament, matches, isOrganizer, onMatchUpdated }) {
  const hasMatches = matches.length > 0;

  if (!hasMatches) {
    return (
      <div className="text-center py-10 space-y-2">
        <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto" />
        <p className="text-sm font-medium text-foreground">Tableau pas encore généré</p>
        <p className="text-xs text-muted-foreground">
          {isOrganizer
            ? 'Générez le tableau depuis le tableau de bord de votre équipe.'
            : 'Le tableau sera disponible prochainement.'}
        </p>
      </div>
    );
  }

  if (tournament.format === 'round_robin') {
    // Group matches by group_number
    const groups = {};
    for (const m of matches) {
      const g = m.group_number ?? 1;
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    }

    return (
      <div className="space-y-5">
        {Object.entries(groups).map(([gNum, gMatches]) => (
          <div key={gNum} className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Poule {gNum}</span>
            </div>
            <div className="divide-y divide-border">
              {gMatches.map((m) => (
                <MatchRow key={m.id} match={m} tournamentId={tournament.id}
                  isOrganizer={isOrganizer} onUpdated={onMatchUpdated} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Elimination: group by round
  const rounds = {};
  for (const m of matches) {
    const r = m.round ?? 1;
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push(m);
  }
  const roundLabels = (n, total) => {
    if (n === total) return 'Finale';
    if (n === total - 1) return 'Demi-finales';
    if (n === total - 2) return 'Quarts de finale';
    return `Tour ${n}`;
  };
  const roundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      {roundNums.map((rNum) => (
        <div key={rNum} className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
            <span className="text-xs font-semibold text-foreground">
              {roundLabels(rNum, roundNums.length)}
            </span>
          </div>
          <div className="divide-y divide-border">
            {rounds[rNum].map((m) => (
              <MatchRow key={m.id} match={m} tournamentId={tournament.id}
                isOrganizer={isOrganizer} onUpdated={onMatchUpdated} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchRow({ match, tournamentId, isOrganizer, onUpdated }) {
  const t1 = [match.t1p1_first, match.t1p1_last].filter(Boolean).join(' ') || 'Équipe 1';
  const t2 = [match.t2p1_first, match.t2p1_last].filter(Boolean).join(' ') || 'Équipe 2';
  const t1p2 = [match.t1p2_first, match.t1p2_last].filter(Boolean).join(' ');
  const t2p2 = [match.t2p2_first, match.t2p2_last].filter(Boolean).join(' ');
  const isCompleted = match.status === 'completed';

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Team 1 */}
        <div className={cn('flex-1 min-w-0', match.winner_team === 1 && 'font-semibold')}>
          <p className={cn('text-sm truncate', match.winner_team === 1 ? 'text-foreground' : 'text-muted-foreground')}>{t1}</p>
          {t1p2 && <p className="text-[10px] text-muted-foreground truncate">{t1p2}</p>}
        </div>

        {/* Score */}
        <div className="shrink-0 flex items-center gap-1">
          {isCompleted ? (
            <span className="text-sm font-bold text-foreground px-2">
              {match.score_team1} – {match.score_team2}
            </span>
          ) : isOrganizer ? (
            <ScoreInput tournamentId={tournamentId} match={match} onUpdated={onUpdated} />
          ) : (
            <span className="text-xs text-muted-foreground px-2">vs</span>
          )}
        </div>

        {/* Team 2 */}
        <div className={cn('flex-1 min-w-0 text-right', match.winner_team === 2 && 'font-semibold')}>
          <p className={cn('text-sm truncate', match.winner_team === 2 ? 'text-foreground' : 'text-muted-foreground')}>{t2}</p>
          {t2p2 && <p className="text-[10px] text-muted-foreground truncate">{t2p2}</p>}
        </div>
      </div>
      {match.winner_team && (
        <p className="text-[10px] text-primary font-medium mt-1 text-center">
          ✓ {match.winner_team === 1 ? t1 : t2} gagne
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TournamentDetail() {
  const { id }      = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [tab,         setTab]         = useState('info'); // info | bracket | comments
  const [showRegModal, setShowRegModal] = useState(false);
  const [liked,       setLiked]       = useState(false);
  const [likeCount,   setLikeCount]   = useState(0);
  const [liking,      setLiking]      = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [genError,    setGenError]    = useState(null);
  const [registered,  setRegistered]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getTournament(id);
      setData(d);
      setLiked(d.liked ?? false);
      setLikeCount(d.likeCount ?? 0);
      const myReg = d.registrations?.find(
        (r) => r.player1_id === user?.id || r.player2_id === user?.id
      );
      setRegistered(!!myReg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => { load(); }, [load]);

  async function handleLike() {
    if (!user || liking) return;
    setLiking(true);
    try {
      const res = await likeTournament(id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch { /* ignore */ } finally { setLiking(false); }
  }

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleGenerateBracket() {
    setGenerating(true);
    setGenError(null);
    try {
      await generateBracket(id);
      await load();
      setTab('bracket');
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleMatchUpdated(updatedMatch) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        matches: prev.matches.map((m) => m.id === updatedMatch.id ? updatedMatch : m),
      };
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{error || 'Tournoi introuvable.'}</p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </div>
    );
  }

  const { tournament, registrations, matches } = data;
  const statusCfg = STATUS_CFG[tournament.status] ?? STATUS_CFG.draft;
  const isOrganizer = user?.role === 'tournament_organizer' && user?.team_id === tournament.team_id;
  const canRegister = tournament.status === 'open' && !registered && user && user.role !== 'tournament_organizer';
  const spotsLeft   = tournament.max_teams - (registrations?.length ?? 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Back nav */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-semibold text-foreground text-sm truncate">{tournament.name}</h1>
        {/* Share */}
        <button onClick={handleShare}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Banner */}
      <div className="relative h-44 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
        {tournament.banner_url && (
          <img src={tournament.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          {tournament.team_logo && (
            <img src={tournament.team_logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
          )}
          {tournament.team_name && (
            <span className="text-xs text-foreground/80 font-medium bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
              {tournament.team_name}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 -mt-2 pb-8 max-w-2xl mx-auto space-y-5">

        {/* Title + status */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-foreground leading-tight">{tournament.name}</h1>
            <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap', statusCfg.color)}>
              {statusCfg.label}
            </span>
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              <Trophy className="h-3 w-3" />
              {FORMAT_LABELS[tournament.format] ?? tournament.format}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Niv. {LEVEL_LABELS[tournament.level_min]} – {LEVEL_LABELS[tournament.level_max]}
            </span>
            {tournament.start_date && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                <Calendar className="h-3 w-3" />
                {fmtDate(tournament.start_date)}
                {tournament.end_date && tournament.end_date !== tournament.start_date && ` – ${fmtDate(tournament.end_date)}`}
              </span>
            )}
            {tournament.registration_fee > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <Banknote className="h-3 w-3" />
                {Number(tournament.registration_fee).toLocaleString('fr-FR')} FCFA
              </span>
            )}
            {tournament.club_name && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                <MapPin className="h-3 w-3" />
                {tournament.club_name}
              </span>
            )}
          </div>

          {tournament.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{tournament.description}</p>
          )}
        </div>

        {/* Teams registered */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {registrations.length} / {tournament.max_teams} équipes
            </span>
          </div>
          {spotsLeft > 0 && tournament.status === 'open' && (
            <span className="text-xs text-green-600 font-medium">
              {spotsLeft} place{spotsLeft > 1 ? 's' : ''} restante{spotsLeft > 1 ? 's' : ''}
            </span>
          )}
          {spotsLeft <= 0 && <span className="text-xs text-red-500 font-medium">Complet</span>}
        </div>

        {/* CTA — register or organizer actions */}
        {canRegister && (
          <Button className="w-full" size="lg" onClick={() => setShowRegModal(true)}>
            S'inscrire au tournoi
          </Button>
        )}
        {registered && !isOrganizer && (
          <div className="flex items-center gap-2 justify-center text-sm text-green-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Vous êtes inscrit à ce tournoi
          </div>
        )}
        {isOrganizer && (
          <div className="flex flex-col gap-2">
            {tournament.status === 'draft' && (
              <Button variant="outline" onClick={() => updateTournamentStatus(id, 'open').then(load)}>
                Ouvrir les inscriptions
              </Button>
            )}
            {(tournament.status === 'open' || tournament.status === 'ongoing') && registrations.length >= 2 && (
              <Button onClick={handleGenerateBracket} disabled={generating}
                className="gap-2">
                <Zap className="h-4 w-4" />
                {generating ? 'Génération du tableau…' : 'Générer le tableau (IA)'}
              </Button>
            )}
            {genError && (
              <p className="text-xs text-red-500 text-center">{genError}</p>
            )}
          </div>
        )}

        {/* Social row */}
        <div className="flex items-center gap-4 border-t border-border pt-3">
          <button onClick={handleLike} disabled={!user || liking}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium transition-colors',
              liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground',
              !user && 'opacity-50 cursor-default',
            )}>
            <Heart className={cn('h-5 w-5', liked && 'fill-red-500')} />
            {likeCount}
          </button>
          <button onClick={() => setTab('comments')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium">
            <MessageSquare className="h-5 w-5" />
            Commenter
          </button>
          <button onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium ml-auto">
            {copied ? <><Check className="h-4 w-4 text-green-500" /><span className="text-green-500 text-xs">Copié !</span></>
              : <><Share2 className="h-4 w-4" />Partager</>}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border -mx-4 px-4 sm:-mx-6 sm:px-6">
          {[
            { k: 'info',     l: 'Infos' },
            { k: 'bracket',  l: 'Tableau' },
            { k: 'comments', l: 'Commentaires' },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === k
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              {l}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'info' && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Équipes inscrites ({registrations.length})</h2>
            {registrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune équipe inscrite pour l'instant.</p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {registrations.map((r, i) => (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {[r.p1_first_name, r.p1_last_name].filter(Boolean).join(' ') || '—'}
                        {r.player2_id && ` & ${[r.p2_first_name, r.p2_last_name].filter(Boolean).join(' ')}`}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full',
                      r.payment_status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    )}>
                      {r.payment_status === 'paid' ? 'Payé' : 'En attente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'bracket' && (
          <BracketTab
            tournament={tournament}
            matches={matches}
            isOrganizer={isOrganizer}
            onMatchUpdated={handleMatchUpdated}
          />
        )}

        {tab === 'comments' && <CommentsSection tournamentId={id} />}
      </div>

      {showRegModal && (
        <RegisterModal
          tournamentId={id}
          fee={tournament.registration_fee}
          onClose={() => setShowRegModal(false)}
          onSuccess={() => {
            setShowRegModal(false);
            setRegistered(true);
            load();
          }}
        />
      )}
    </div>
  );
}
