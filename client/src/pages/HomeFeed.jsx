import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import { useAuth } from '@/App';
import { getFeedPosts, toggleLike, getComments, addComment } from '@/api/teamPosts';
import { listSessions } from '@/api/sessions';
import { getFriends } from '@/api/friends';
import {
  Trophy, Heart, MessageSquare, Share2, Users, MapPin, Clock,
  Loader2, Send, X, Plus, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <p className="font-semibold text-foreground text-sm">Commentaires</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {loading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {!loading && comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun commentaire. Soyez le premier !</p>
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
              value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Ajouter un commentaire…"
              className="flex-1 h-9 text-sm rounded-full border border-border bg-background px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" disabled={!text.trim() || sending}
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 shrink-0">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, currentUserId, onLike, onComment }) {
  const meta = post.metadata && (typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata);

  function handleShare() {
    const url = `${window.location.origin}/team/${post.team_id}`;
    if (navigator.share) navigator.share({ title: post.team_name, url }).catch(() => {});
    else navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <div className="bg-card border-b border-border">
      <Link to={`/team/${post.team_id}`} className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
          {post.team_logo
            ? <img src={post.team_logo} alt="" className="w-full h-full object-cover" />
            : <Trophy className="h-4.5 w-4.5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{post.team_name}</p>
          <p className="text-[10px] text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <span className={cn(
          'text-[10px] font-medium px-2 py-0.5 rounded-full',
          post.type === 'tournament' ? 'bg-primary/10 text-primary' :
          post.type === 'reel'       ? 'bg-purple-100 text-purple-600' :
          'bg-muted text-muted-foreground'
        )}>
          {post.type === 'tournament' ? '🏆 Tournoi' : post.type === 'reel' ? '🎬 Reel' : '📸 Photo'}
        </span>
      </Link>

      <div className="relative bg-black">
        {post.type === 'reel'
          ? <video src={post.media_url} controls className="w-full max-h-72 object-contain" />
          : <img src={post.media_url} alt={post.caption || ''} className="w-full max-h-72 object-cover" />}
      </div>

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
            {meta.tournament_name && <p className="text-sm font-semibold text-foreground">{meta.tournament_name}</p>}
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

      {post.caption && <div className="px-4 pt-2"><p className="text-sm text-foreground leading-snug">{post.caption}</p></div>}

      <div className="flex items-center gap-1 px-3 py-2.5">
        <button onClick={() => onLike(post.id)} disabled={!currentUserId}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            post.liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            !currentUserId && 'opacity-50 cursor-default')}>
          <Heart className={cn('h-5 w-5', post.liked && 'fill-red-500')} />
          {post.likes_count ?? 0}
        </button>
        <button onClick={() => onComment(post)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <MessageSquare className="h-5 w-5" />
          {post.comments_count ?? 0}
        </button>
        <button onClick={handleShare}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <Share2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomeFeed() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [posts,       setPosts]       = useState([]);
  const [sessions,    setSessions]    = useState([]);
  const [friends,     setFriends]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [commentPost, setCommentPost] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, sessionsRes, friendsRes] = await Promise.allSettled([
        getFeedPosts(),
        listSessions({ status: 'open' }),
        getFriends(),
      ]);
      setPosts(postsRes.status === 'fulfilled'   ? (postsRes.value.posts     ?? []) : []);
      setSessions(sessionsRes.status === 'fulfilled' ? (sessionsRes.value.sessions ?? []) : []);
      setFriends(friendsRes.status === 'fulfilled'  ? (friendsRes.value.friends   ?? []) : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const { refreshing } = usePullToRefresh(load);

  async function handleLike(postId) {
    if (!user) return;
    try {
      const { liked, likes_count } = await toggleLike(postId);
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, liked, likes_count } : p
      ));
    } catch { /* ignore */ }
  }

  const greeting = user?.first_name || user?.email?.split('@')[0] || 'Joueur';

  const friendStories = friends.slice(0, 8).map((f) => ({
    id:    f.id ?? f.user_id,
    name:  [f.first_name, f.last_name].filter(Boolean).join(' ') || 'Ami',
    photo: f.photo_url,
    href:  `/players/${f.id ?? f.user_id}`,
  }));

  const teamStories = [
    ...new Map(posts.map((p) => [p.team_id, { id: p.team_id, name: p.team_name, logo: p.team_logo }])).values(),
  ].slice(0, 6);

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingSessions = sessions
    .filter((s) => (s.date ?? '').toString().slice(0, 10) >= todayStr)
    .slice(0, 4);

  const hasStories = friendStories.length > 0 || teamStories.length > 0;

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
            <img src={profile.photo_url} className="w-9 h-9 rounded-full object-cover border-2 border-border" alt="" />
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
        <div className="bg-card border-b border-border px-4 py-3">
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {friendStories.map((f) => (
              <Link key={f.id} to={f.href} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-purple-400">
                  <div className="w-full h-full rounded-full border-2 border-card overflow-hidden bg-muted flex items-center justify-center">
                    {f.photo
                      ? <img src={f.photo} alt={f.name} className="w-full h-full object-cover" />
                      : <span className="text-base font-bold text-muted-foreground">{(f.name[0] ?? 'A').toUpperCase()}</span>}
                  </div>
                </div>
                <span className="text-[10px] text-foreground/80 font-medium text-center w-14 truncate">
                  {f.name.split(' ')[0]}
                </span>
              </Link>
            ))}
            {teamStories.map((t) => (
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

      {/* Upcoming sessions */}
      {upcomingSessions.length > 0 && !loading && (
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Sessions disponibles</p>
            <Link to="/sessions" className="text-xs font-medium text-primary flex items-center gap-0.5">
              Voir tout <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {upcomingSessions.map((s) => {
              const dateStr   = (s.date ?? '').toString().slice(0, 10);
              const dateLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
                weekday: 'short', day: 'numeric', month: 'short',
              });
              const spots = (s.max_players ?? 4) - (s.current_players ?? 0);
              return (
                <Link key={s.id} to={`/sessions/${s.id}`}
                  className="shrink-0 w-48 rounded-xl border border-border bg-card p-3 space-y-2 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      spots > 0 ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-600'
                    )}>
                      {spots > 0 ? `${spots} place${spots > 1 ? 's' : ''}` : 'Complet'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
                  </div>
                  {s.time && (
                    <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {String(s.time).slice(0, 5)}{s.end_time ? `–${String(s.end_time).slice(0, 5)}` : ''}
                    </div>
                  )}
                  {s.location && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                      <MapPin className="h-3 w-3 shrink-0" />{s.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3 shrink-0" />{s.current_players ?? 0}/{s.max_players ?? 4} joueurs
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Team posts feed */}
      {!loading && posts.length > 0 && (
        <div className="px-4 py-2 border-t border-border/50">
          <p className="text-sm font-semibold text-foreground">Publications des équipes</p>
        </div>
      )}

      {loading ? (
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
              <div className="h-48 bg-muted" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 && upcomingSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground/30" />
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
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              currentUserId={user?.sub}
              onLike={handleLike}
              onComment={setCommentPost}
            />
          ))}
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
