import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { getTeamById, followTeam } from '@/api/teams';
import { getTeamPosts, toggleLike, getComments, addComment } from '@/api/teamPosts';
import { getTeamSponsors } from '@/api/sponsors';
import {
  AlertCircle, Trophy, Users, MapPin, ArrowLeft,
  Play, Image, Heart, MessageSquare, Send, X, Loader2,
  Settings, Handshake,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Post detail modal ─────────────────────────────────────────────────────────
function PostModal({ post, onClose, currentUserId, onLike }) {
  const [comments, setComments] = useState([]);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);

  useEffect(() => {
    getComments(post.id)
      .then(({ comments: c }) => setComments(c ?? []))
      .catch(() => {});
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

  const meta = post.metadata && (typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-card rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {post.team_logo
                ? <img src={post.team_logo} alt="" className="w-full h-full object-cover" />
                : <Trophy className="h-4 w-4 text-primary" />}
            </div>
            <span className="text-sm font-semibold text-foreground">{post.team_name}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Media */}
        <div className="bg-black shrink-0">
          {post.type === 'reel' ? (
            <video src={post.media_url} controls className="w-full max-h-72 object-contain" />
          ) : (
            <img src={post.media_url} alt={post.caption || ''} className="w-full max-h-72 object-cover" />
          )}
        </div>

        {/* Tournament metadata chips */}
        {meta && (
          <div className="px-4 pt-3 pb-1 space-y-1.5 shrink-0">
            {meta.tournament_name && (
              <p className="text-sm font-semibold text-foreground">{meta.tournament_name}</p>
            )}
            <div className="flex flex-wrap gap-1">
              {[
                { e: '📅', v: meta.date },
                { e: '📍', v: meta.venue },
                { e: '🏆', v: meta.level },
                { e: '💰', v: meta.registration_fee },
              ].filter((c) => c.v).map((c) => (
                <span key={c.e} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground/80">
                  {c.e} {c.v}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Caption + like */}
        <div className="px-4 py-2 space-y-1.5 shrink-0 border-b border-border">
          {post.caption && <p className="text-sm text-foreground leading-snug">{post.caption}</p>}
          <div className="flex items-center gap-4">
            <button onClick={() => onLike(post.id)}
              className={cn('flex items-center gap-1 text-sm font-medium transition-colors',
                post.liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground')}>
              <Heart className={cn('h-4 w-4', post.liked && 'fill-red-500')} />
              {post.likes_count ?? 0}
            </button>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />{comments.length}
            </span>
          </div>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun commentaire.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                {(c.author_name?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground">{c.author_name} </span>
                <span className="text-xs text-foreground/80">{c.body}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Comment input */}
        {currentUserId && (
          <form onSubmit={handleComment} className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0">
            <input
              value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Ajouter un commentaire…"
              className="flex-1 h-8 text-sm rounded-full border border-border bg-background px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" disabled={!text.trim() || sending}
              className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Grid thumbnail ─────────────────────────────────────────────────────────────
function PostThumbnail({ post, onClick }) {
  return (
    <button onClick={onClick}
      className="relative aspect-square w-full overflow-hidden bg-muted group">
      {post.media_url ? (
        <img src={post.media_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <Image className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      {/* Type overlay */}
      <div className="absolute top-1.5 right-1.5">
        {post.type === 'reel' && (
          <div className="w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
            <Play className="h-2.5 w-2.5 text-white fill-white" />
          </div>
        )}
        {post.type === 'tournament' && (
          <div className="w-5 h-5 bg-primary/80 rounded-full flex items-center justify-center">
            <Trophy className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
        <span className="flex items-center gap-1 text-white text-xs font-bold">
          <Heart className="h-4 w-4 fill-white" />{post.likes_count ?? 0}
        </span>
        <span className="flex items-center gap-1 text-white text-xs font-bold">
          <MessageSquare className="h-4 w-4" />{post.comments_count ?? 0}
        </span>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [team,        setTeam]        = useState(null);
  const [members,     setMembers]     = useState([]);
  const [sponsors,    setSponsors]    = useState([]);
  const [posts,       setPosts]       = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [following,   setFollowing]   = useState(false);
  const [activePost,  setActivePost]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamData, sponsorData, postsData] = await Promise.all([
        getTeamById(id),
        getTeamSponsors(id).catch(() => ({ sponsors: [] })),
        getTeamPosts(id).catch(() => []),
      ]);
      setTeam(teamData.team);
      setMembers(teamData.members || []);
      setIsFollowing(teamData.is_following ?? false);
      setSponsors(sponsorData.sponsors ?? []);
      // getTeamPosts returns array directly or {posts:[]}
      const rawPosts = Array.isArray(postsData) ? postsData : (postsData.posts ?? []);
      setPosts(rawPosts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleFollow() {
    if (!user) { navigate('/login'); return; }
    setFollowing(true);
    try {
      const res = await followTeam(id);
      setIsFollowing(res.following);
      setTeam((t) => t ? { ...t, followers_count: res.followers_count } : t);
    } catch { /* ignore */ } finally { setFollowing(false); }
  }

  async function handleLike(postId) {
    if (!user) return;
    try {
      const { liked, likes_count } = await toggleLike(postId);
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, liked, likes_count: likes_count ?? p.likes_count } : p
      ));
      if (activePost?.id === postId) {
        setActivePost((p) => ({ ...p, liked, likes_count: likes_count ?? p.likes_count }));
      }
    } catch { /* ignore */ }
  }

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
          <button onClick={() => navigate(-1)} className="text-sm text-primary underline">Retour</button>
        </div>
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.status === 'active');
  const isAdmin = user && members.some((m) => m.user_id === user.sub && m.role === 'admin');
  const isOwnTeam = user?.team_id === id;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── Back button ─────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 z-10">
        <button onClick={() => navigate(-1)}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      {/* ── Cover photo ─────────────────────────────────────────── */}
      <div className="relative w-full h-[130px] bg-gradient-to-br from-primary/30 to-primary/10 overflow-hidden">
        {team.banner_url && (
          <img src={team.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      {/* ── Profile section ─────────────────────────────────────── */}
      <div className="max-w-xl mx-auto px-4">
        {/* Logo overlapping cover */}
        <div className="relative -mt-[42px] mb-3">
          <div className="w-[84px] h-[84px] rounded-full border-4 border-background overflow-hidden bg-primary/10 flex items-center justify-center shadow-lg">
            {team.logo_url
              ? <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
              : <Trophy className="h-9 w-9 text-primary" />}
          </div>
        </div>

        {/* Name + city + action buttons */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">{team.name}</h1>
            {team.city && (
              <div className="flex items-center gap-1 mt-0.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />{team.city}
              </div>
            )}
            {team.description && (
              <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed max-w-xs">{team.description}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0 pt-1">
            {isAdmin || isOwnTeam ? (
              <Link to="/team/dashboard"
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors">
                <Settings className="h-3.5 w-3.5" />Modifier
              </Link>
            ) : user && (
              <button onClick={handleFollow} disabled={following}
                className={cn(
                  'px-4 h-8 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60',
                  isFollowing
                    ? 'border border-border bg-card text-foreground hover:bg-muted'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}>
                {following ? '…' : isFollowing ? 'Suivi ✓' : 'Suivre'}
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 mb-5">
          {[
            { value: team.tournament_count ?? 0, label: 'Tournois' },
            { value: team.followers_count ?? 0,  label: 'Abonnés'  },
            { value: activeMembers.length,        label: 'Membres'  },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Sponsors strip */}
        {sponsors.length > 0 && (
          <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
            {sponsors.map((s) => {
              const inner = (
                <div className="flex flex-col items-center gap-1 w-14 shrink-0">
                  <div className="w-12 h-12 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden p-1 shadow-sm">
                    {s.logo_url
                      ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain" />
                      : <Handshake className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-2 w-full">{s.name}</span>
                </div>
              );
              return s.website_url ? (
                <a key={s.id} href={s.website_url} target="_blank" rel="noopener noreferrer">{inner}</a>
              ) : (
                <div key={s.id}>{inner}</div>
              );
            })}
          </div>
        )}

        {/* Divider with icon tabs (future: filter by type) */}
        <div className="flex border-t border-border mb-1">
          <div className="flex-1 flex items-center justify-center py-2.5 border-b-2 border-primary">
            <Image className="h-4 w-4 text-primary" />
          </div>
        </div>

        {/* ── Posts grid ───────────────────────────────────────── */}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center">
              <Image className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-foreground">Aucune publication</p>
            <p className="text-xs text-muted-foreground">Les posts de l'équipe apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((p) => (
              <PostThumbnail key={p.id} post={p} onClick={() => setActivePost(p)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Post detail modal ─────────────────────────────────── */}
      {activePost && (
        <PostModal
          post={activePost}
          currentUserId={user?.sub}
          onClose={() => setActivePost(null)}
          onLike={handleLike}
        />
      )}

    </div>
  );
}
