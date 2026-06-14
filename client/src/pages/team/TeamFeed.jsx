import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/App';
import { getFeedPosts, toggleLike, getComments, addComment } from '@/api/teamPosts';
import {
  Trophy, Heart, MessageSquare, Share2, Loader2,
  Video, Image, Send, X, Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Comment sheet ─────────────────────────────────────────────────────────────
function CommentSheet({ post, onClose, currentUserId }) {
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
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
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
    if (navigator.share) {
      navigator.share({ title: post.team_name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  return (
    <div className="bg-card border-b border-border">
      {/* Header */}
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

      {/* Media */}
      <div className="relative bg-black">
        {post.type === 'reel' ? (
          <video src={post.media_url} controls className="w-full max-h-80 object-contain" />
        ) : (
          <img src={post.media_url} alt={post.caption || ''} className="w-full max-h-80 object-cover" />
        )}
      </div>

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

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pt-2">
          <p className="text-sm text-foreground leading-snug">{post.caption}</p>
        </div>
      )}

      {/* Actions */}
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

// ── Stories strip (team logos) ────────────────────────────────────────────────
function StoriesStrip({ posts }) {
  // Deduplicate teams from posts
  const teams = [];
  const seen = new Set();
  for (const p of posts) {
    if (!seen.has(p.team_id)) {
      seen.add(p.team_id);
      teams.push({ id: p.team_id, name: p.team_name, logo: p.team_logo });
    }
  }
  if (teams.length === 0) return null;

  return (
    <div className="bg-card border-b border-border px-4 py-3">
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {teams.map((t) => (
          <Link key={t.id} to={`/team/${t.id}`} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-primary to-primary/40 shadow-sm">
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
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TeamFeed() {
  const { user } = useAuth();
  const [posts,         setPosts]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [commentPost,   setCommentPost]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { posts: p } = await getFeedPosts();
      setPosts(p ?? []);
    } catch { setPosts([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleLike(postId) {
    if (!user) return;
    try {
      const { liked, likes_count } = await toggleLike(postId);
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, liked, likes_count: likes_count ?? p.likes_count } : p
      ));
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
          <span className="text-white font-bold text-xs">P</span>
        </div>
        <span className="text-base font-bold tracking-tight">
          <span className="text-foreground">Padel</span>
          <span className="text-primary">Connect</span>
        </span>
        <span className="ml-1 text-xs text-muted-foreground">— Équipes</span>
      </div>

      {/* Stories */}
      {!loading && <StoriesStrip posts={posts} />}

      {/* Feed */}
      {loading ? (
        <div className="space-y-0">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card border-b border-border animate-pulse">
              <div className="flex items-center gap-2.5 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-muted" />
                <div className="space-y-1 flex-1">
                  <div className="h-3 bg-muted rounded w-32" />
                  <div className="h-2.5 bg-muted rounded w-20" />
                </div>
              </div>
              <div className="h-64 bg-muted" />
              <div className="px-4 py-3 flex gap-4">
                <div className="h-5 bg-muted rounded w-12" />
                <div className="h-5 bg-muted rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
          <Video className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-foreground">Aucun post pour l'instant</p>
          <p className="text-xs text-muted-foreground">Les publications des équipes apparaîtront ici.</p>
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
