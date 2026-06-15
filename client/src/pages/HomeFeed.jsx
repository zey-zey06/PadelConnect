import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import { useAuth } from '@/App';
import { getFeed } from '@/api/feed';
import { toggleLike, getComments, addComment } from '@/api/teamPosts';
import {
  Trophy, Heart, MessageSquare, Share2, Users, MapPin, Clock,
  Loader2, Send, X, Plus, ChevronRight, Star, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins   = Math.floor(diffMs / 60_000);
  if (mins < 1)  return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `il y a ${days} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// ── Comment sheet ─────────────────────────────────────────────────────────────
function CommentSheet({ post, currentUserId, onClose }) {
  const [comments, setComments] = useState([]);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getComments(post.id)
      .then(({ comments: c }) => setComments(c ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [post.id]);

  async function handleComment(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { comment } = await addComment(post.id, text.trim());
      setComments((prev) => [...prev, comment]);
      setText('');
    } catch { /* ignore */ } finally { setSending(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <p className="font-semibold text-foreground text-sm">Commentaires</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun commentaire. Soyez le premier !
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                {(c.author_name?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="bg-muted/50 rounded-xl px-3 py-1.5 flex-1">
                <span className="text-xs font-semibold text-foreground">{c.author_name} </span>
                <span className="text-xs text-foreground/80">{c.body}</span>
              </div>
            </div>
          ))}
        </div>
        {currentUserId && (
          <form onSubmit={handleComment} className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ajouter un commentaire…"
              className="flex-1 h-9 text-sm rounded-full border border-border bg-background px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 shrink-0"
            >
              {sending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Team / Club post card ─────────────────────────────────────────────────────
function TeamPostCard({ post, currentUserId, onLike, onComment }) {
  const meta = post.metadata && (
    typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata
  );

  function handleShare() {
    const url = `${window.location.origin}/team/${post.team_id}`;
    if (navigator.share) navigator.share({ title: post.team_name, url }).catch(() => {});
    else navigator.clipboard.writeText(url).catch(() => {});
  }

  const isTournament = post.type === 'tournament';

  return (
    <div className="bg-card border-b border-border">
      {/* Author row */}
      <Link to={`/team/${post.team_id}`} className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
          {post.team_logo
            ? <img src={post.team_logo} alt="" className="w-full h-full object-cover" />
            : <Trophy className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{post.team_name}</p>
          <p className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</p>
        </div>
        <span className={cn(
          'text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0',
          isTournament          ? 'bg-primary/10 text-primary' :
          post.type === 'reel'  ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
          'bg-muted text-muted-foreground',
        )}>
          {isTournament ? '🏆 Tournoi' : post.type === 'reel' ? '🎬 Reel' : '📸 Photo'}
        </span>
      </Link>

      {/* Media */}
      {post.media_url && (
        <div className="bg-black">
          {post.type === 'reel'
            ? <video src={post.media_url} controls className="w-full max-h-80 object-contain" />
            : <img src={post.media_url} alt={post.caption || ''} className="w-full max-h-80 object-cover" />}
        </div>
      )}

      {/* Tournament metadata chips */}
      {meta && (() => {
        const chips = [
          { e: '📅', v: meta.date },
          { e: '📍', v: meta.venue },
          { e: '🏆', v: meta.level },
          { e: '💰', v: meta.registration_fee },
        ].filter((c) => c.v);
        if (!chips.length && !meta.tournament_name) return null;
        return (
          <div className="px-4 pt-3 space-y-1.5">
            {meta.tournament_name && (
              <p className="text-sm font-semibold text-foreground">{meta.tournament_name}</p>
            )}
            <div className="flex flex-wrap gap-1">
              {chips.map((c) => (
                <span key={c.e} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground/80">
                  {c.e} {c.v}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {post.caption && (
        <div className="px-4 pt-2">
          <p className="text-sm text-foreground leading-snug">{post.caption}</p>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-1 px-3 py-2.5">
        <button
          onClick={() => onLike(post.id)}
          disabled={!currentUserId}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            post.liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            !currentUserId && 'opacity-50 cursor-default',
          )}
        >
          <Heart className={cn('h-5 w-5', post.liked && 'fill-red-500')} />
          {post.likes_count ?? 0}
        </button>
        <button
          onClick={() => onComment(post)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <MessageSquare className="h-5 w-5" />
          {post.comments_count ?? 0}
        </button>
        <button
          onClick={handleShare}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {/* Tournament CTA buttons */}
      {isTournament && (
        <div className="flex gap-2 px-4 pb-3">
          <Link
            to={`/team/${post.team_id}`}
            className="flex-1 h-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            Participer
          </Link>
          <Link
            to={`/team/${post.team_id}`}
            className="flex-1 h-9 flex items-center justify-center rounded-xl border border-border bg-muted text-foreground text-sm font-semibold"
          >
            Voir la liste
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Session card (friend activity) ───────────────────────────────────────────
function SessionCard({ item }) {
  const dateStr   = (item.date ?? '').toString().slice(0, 10);
  const dateLabel = dateStr
    ? new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : '';
  const spots   = (item.max_players ?? 4) - (item.current_players ?? 0);
  const creator = [item.creator_first_name, item.creator_last_name].filter(Boolean).join(' ') || 'Ami';

  return (
    <div className="bg-card border-b border-border px-4 py-3">
      {/* Author */}
      <Link to={`/players/${item.creator_id}`} className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {item.creator_photo_url
            ? <img src={item.creator_photo_url} alt={creator} className="w-full h-full object-cover" />
            : <span className="text-sm font-bold text-muted-foreground">{(creator[0] ?? 'J').toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{creator}</p>
          <p className="text-[10px] text-muted-foreground">a créé une session · {timeAgo(item.created_at)}</p>
        </div>
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>

      {/* Session info card */}
      <Link to={`/sessions/${item.id}`} className="block rounded-xl border border-border bg-muted/30 p-3 space-y-2 hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
            spots > 0 ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-600 dark:bg-red-900/20',
          )}>
            {spots > 0 ? `${spots} place${spots > 1 ? 's' : ''} libre${spots > 1 ? 's' : ''}` : 'Complet'}
          </span>
          {dateLabel && (
            <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
          )}
        </div>
        {item.time && (
          <div className="flex items-center gap-1 text-xs text-foreground font-medium">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {String(item.time).slice(0, 5)}{item.end_time ? `–${String(item.end_time).slice(0, 5)}` : ''}
          </div>
        )}
        {item.location && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0" />{item.location}
          </div>
        )}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />{item.current_players ?? 0}/{item.max_players ?? 4} joueurs
        </div>
      </Link>

      {/* Rejoindre */}
      {spots > 0 && (
        <Link
          to={`/sessions/${item.id}`}
          className="mt-2 w-full h-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          Rejoindre
        </Link>
      )}
    </div>
  );
}

// ── Discovery section (empty feed) ────────────────────────────────────────────
function DiscoverySection({ suggestions }) {
  const clubs = suggestions?.clubs ?? [];
  const teams = suggestions?.teams ?? [];

  return (
    <div className="px-4 py-4 space-y-6">
      <div className="text-center py-4">
        <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">Découvrez du contenu</p>
        <p className="text-xs text-muted-foreground mt-1">
          Suivez des équipes et abonnez-vous à des clubs pour personnaliser votre fil.
        </p>
      </div>

      {clubs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Clubs à rejoindre</p>
          <div className="space-y-2">
            {clubs.map((c) => (
              <Link
                key={c.id}
                to={`/clubs/${c.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  {c.city && <p className="text-[11px] text-muted-foreground">{c.city}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {teams.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Équipes à suivre</p>
          <div className="space-y-2">
            {teams.map((t) => (
              <Link
                key={t.id}
                to={`/team/${t.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  {t.logo
                    ? <img src={t.logo} alt={t.name} className="w-full h-full object-cover" />
                    : <Trophy className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                  {t.city && <p className="text-[11px] text-muted-foreground">{t.city}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link
        to="/sessions"
        className="flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:border-primary/40 transition-colors"
      >
        <Users className="h-4 w-4" />
        Voir les sessions publiques
      </Link>
    </div>
  );
}

// ── Feed skeleton ─────────────────────────────────────────────────────────────
function FeedSkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border-b border-border animate-pulse">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-muted" />
            <div className="space-y-1 flex-1">
              <div className="h-3 bg-muted rounded w-32" />
              <div className="h-2.5 bg-muted rounded w-20" />
            </div>
          </div>
          <div className="h-52 bg-muted" />
          <div className="flex gap-2 px-4 py-3">
            <div className="h-8 bg-muted rounded-lg w-16" />
            <div className="h-8 bg-muted rounded-lg w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomeFeed() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [items,       setItems]       = useState([]);
  const [stories,     setStories]     = useState({ friends: [], teams: [] });
  const [suggestions, setSuggestions] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [empty,       setEmpty]       = useState(false);
  const [commentPost, setCommentPost] = useState(null);

  const loaderRef = useRef(null);

  const load = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    const nextPage = reset ? 1 : page + 1;
    try {
      const res = await getFeed({ page: nextPage, limit: 20 });
      const newItems = res.items ?? [];
      if (reset) {
        setItems(newItems);
        setPage(1);
      } else {
        setItems((prev) => [...prev, ...newItems]);
        setPage(nextPage);
      }
      setHasMore(res.has_more ?? false);
      setEmpty(res.empty ?? false);
      if (res.stories) setStories(res.stories);
      if (res.suggestions) setSuggestions(res.suggestions);
      else if (reset) setSuggestions(null);
    } catch { /* ignore */ } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  }, [page]);

  useEffect(() => { load(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { refreshing } = usePullToRefresh(() => load(true));

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!loaderRef.current || !hasMore || loading || loadingMore) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) load(false); },
      { rootMargin: '200px' },
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, load]);

  async function handleLike(postId) {
    if (!user) return;
    try {
      const { liked, likes_count } = await toggleLike(postId);
      setItems((prev) => prev.map((p) =>
        p.id === postId ? { ...p, liked, likes_count } : p,
      ));
    } catch { /* ignore */ }
  }

  const greeting   = user?.first_name || user?.email?.split('@')[0] || 'Joueur';
  const friendList = stories.friends ?? [];
  const teamList   = stories.teams   ?? [];
  const hasStories = friendList.length > 0 || teamList.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {refreshing && (
        <div className="flex items-center justify-center py-2">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Bienvenue 👋</p>
          <h1 className="text-xl font-bold text-foreground">{greeting}</h1>
        </div>
        {profile?.photo_url ? (
          <Link to="/profile">
            <img
              src={profile.photo_url}
              className="w-9 h-9 rounded-full object-cover border-2 border-border"
              alt=""
            />
          </Link>
        ) : (
          <Link to="/profile" className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{(greeting[0] ?? 'J').toUpperCase()}</span>
          </Link>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2.5 px-4 pb-4">
        <button
          onClick={() => navigate('/sessions?create=1')}
          className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />Créer une session
        </button>
        <Link
          to="/sessions"
          className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-muted text-foreground text-sm font-semibold"
        >
          <Users className="h-4 w-4" />Rejoindre
        </Link>
      </div>

      {/* Stories strip */}
      {hasStories && !loading && (
        <div className="bg-card border-y border-border px-4 py-3">
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {/* Friend stories */}
            {friendList.map((f) => {
              const name = [f.first_name, f.last_name].filter(Boolean).join(' ') || 'Ami';
              return (
                <Link key={f.id} to={`/players/${f.id}`} className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-purple-400">
                    <div className="w-full h-full rounded-full border-2 border-card overflow-hidden bg-muted flex items-center justify-center">
                      {f.photo_url
                        ? <img src={f.photo_url} alt={name} className="w-full h-full object-cover" />
                        : <span className="text-base font-bold text-muted-foreground">{(name[0] ?? 'A').toUpperCase()}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-foreground/80 font-medium text-center w-14 truncate">
                    {name.split(' ')[0]}
                  </span>
                </Link>
              );
            })}

            {/* Team / club stories */}
            {teamList.map((t) => (
              <Link key={t.id} to={`/team/${t.id}`} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-primary to-primary/40">
                  <div className="w-full h-full rounded-full border-2 border-card overflow-hidden bg-muted flex items-center justify-center">
                    {t.logo
                      ? <img src={t.logo} alt={t.name} className="w-full h-full object-cover" />
                      : <Trophy className="h-5 w-5 text-primary" />}
                  </div>
                </div>
                <span className="text-[10px] text-foreground/80 font-medium text-center w-14 truncate">{t.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Feed content */}
      {loading ? (
        <FeedSkeleton />
      ) : empty ? (
        <DiscoverySection suggestions={suggestions} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
          <Star className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-foreground">Votre fil est vide</p>
          <p className="text-xs text-muted-foreground">
            Suivez des équipes et rejoignez des sessions pour voir des publications ici.
          </p>
          <Link to="/team/feed" className="text-xs font-medium text-primary hover:underline">
            Découvrir les équipes →
          </Link>
        </div>
      ) : (
        <div>
          {items.map((item) =>
            item._type === 'team_post' ? (
              <TeamPostCard
                key={item.id}
                post={item}
                currentUserId={user?.sub}
                onLike={handleLike}
                onComment={setCommentPost}
              />
            ) : (
              <SessionCard key={item.id} item={item} />
            ),
          )}

          {/* Infinite scroll sentinel */}
          <div ref={loaderRef} className="py-4 flex justify-center">
            {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {!hasMore && items.length > 0 && (
              <p className="text-xs text-muted-foreground">Vous avez tout vu 🎉</p>
            )}
          </div>
        </div>
      )}

      {commentPost && (
        <CommentSheet
          post={commentPost}
          currentUserId={user?.sub}
          onClose={() => setCommentPost(null)}
        />
      )}
    </div>
  );
}
