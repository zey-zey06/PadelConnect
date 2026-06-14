import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, CalendarCheck, CreditCard, ChevronRight,
  AlertCircle, Clock, User, MessageSquare, ArrowLeft, Send,
  Trophy, Loader2,
} from 'lucide-react';
import { useAuth } from '@/App';
import { getManagerDashboard } from '@/api/manager';
import { getMySubscription } from '@/api/subscriptions';
import { getMyChats, getChatMessages, sendChatMessage } from '@/api/teamChats';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '—';
  return new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}
function fmtTime(t) { return t ? String(t).slice(0, 5) : '—'; }
function fmtAmount(v) { return v ? `${Number(v).toLocaleString('fr-FR')} FCFA` : '—'; }
function fmtRelTime(iso) {
  if (!iso) return '';
  const d    = new Date(iso);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Hier';
  if (diff < 7)   return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

const PAYMENT_LABELS = {
  on_arrival: 'Sur place', card: 'Carte', wave: 'Wave',
  orange_money: 'Orange Money', balance: 'Solde',
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
      <div className="h-10 rounded-xl bg-muted animate-pulse" />
      <div className="space-y-3">
        {[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${accent ? 'bg-primary/[0.03] border-primary/20' : 'bg-card border-border'}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{label}</p>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${accent ? 'bg-primary/10' : 'bg-muted'}`}>
          <Icon className={`h-3.5 w-3.5 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
      </div>
      <p className="text-xl font-bold text-foreground leading-none">{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Subscription status chip ──────────────────────────────────────────────────
function SubChip({ sub }) {
  if (!sub) return null;
  const { status, days_remaining } = sub;
  const cfg = {
    active:    { cls: 'bg-green-50  text-green-800  border-green-200',  label: 'Actif'    },
    trial:     { cls: 'bg-amber-50  text-amber-800  border-amber-200',  label: 'Essai'    },
    suspended: { cls: 'bg-red-50    text-red-800    border-red-200',    label: 'Suspendu' },
  }[status] ?? { cls: 'bg-muted text-foreground border-border', label: status };

  const urgent = status !== 'suspended' && days_remaining <= 7;

  return (
    <Link to="/manager/profile"
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${cfg.cls} transition-opacity hover:opacity-80`}>
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold">Abonnement · {cfg.label}</span>
        {status !== 'suspended' && (
          <span className={`text-xs font-medium ${urgent ? 'text-red-600' : 'opacity-70'}`}>
            {days_remaining}j restants
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 opacity-60 shrink-0" />
    </Link>
  );
}

// ── Booking row ───────────────────────────────────────────────────────────────
function BookingRow({ b }) {
  const playerName = [b.player_first_name, b.player_last_name].filter(Boolean).join(' ')
    || b.player_email?.split('@')[0] || 'Joueur';
  const initials = playerName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {b.player_photo
          ? <img src={b.player_photo} alt={playerName} className="h-full w-full rounded-full object-cover" />
          : <span className="text-xs font-bold text-primary">{initials}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{playerName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {b.venue_name} · {fmt(b.slot_date)} · {fmtTime(b.start_time)}–{fmtTime(b.end_time)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-foreground">{fmtAmount(b.price)}</p>
        <p className="text-[10px] text-muted-foreground">{PAYMENT_LABELS[b.payment_method] ?? b.payment_method}</p>
      </div>
    </div>
  );
}

// ── Team chat window ──────────────────────────────────────────────────────────
function TeamChatWindow({ chat, currentUserId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const { messages: msgs } = await getChatMessages(chat.id);
      setMessages(msgs ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [chat.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { message } = await sendChatMessage(chat.id, text.trim());
      setMessages((prev) => [...prev, message]);
      setText('');
    } catch { /* ignore */ } finally { setSending(false); }
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden" style={{ height: 420 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30 shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {chat.team_logo
            ? <img src={chat.team_logo} alt="" className="w-full h-full object-cover" />
            : <Trophy className="h-3.5 w-3.5 text-primary" />}
        </div>
        <span className="text-sm font-semibold text-foreground truncate">{chat.team_name}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-muted/10">
        {loading && <div className="flex justify-center pt-6"><Loader2 className="h-5 w-5 text-primary animate-spin" /></div>}
        {!loading && messages.length === 0 && (
          <div className="text-center pt-6 text-xs text-muted-foreground">Démarrez la conversation…</div>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[72%] px-3.5 py-2 text-sm leading-relaxed',
                isMine
                  ? 'bg-primary text-primary-foreground rounded-[18px_18px_4px_18px]'
                  : 'bg-card border border-border text-foreground rounded-[18px_18px_18px_4px]'
              )}>
                {!isMine && <p className="text-[9px] font-semibold mb-0.5 opacity-60">{m.sender_name}</p>}
                <p className="break-words">{m.content}</p>
                <p className={cn('text-[9px] mt-0.5 text-right', isMine ? 'opacity-60' : 'text-muted-foreground')}>
                  {fmtRelTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2.5 border-t border-border bg-card shrink-0">
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Votre message…"
          disabled={sending}
          className="flex-1 h-9 rounded-full border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" disabled={!text.trim() || sending}
          className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors">
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </form>
    </div>
  );
}

// ── Teams chats section ───────────────────────────────────────────────────────
function TeamChatsSection({ currentUserId }) {
  const [chats,      setChats]      = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    getMyChats()
      .then(({ chats: c }) => setChats(c ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (activeChat) {
    return <TeamChatWindow chat={activeChat} currentUserId={currentUserId} onBack={() => setActiveChat(null)} />;
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
        <MessageSquare className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Messages des équipes</p>
        {chats.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{chats.length} conversation{chats.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        </div>
      ) : chats.length === 0 ? (
        <div className="py-8 flex flex-col items-center gap-2 text-center">
          <MessageSquare className="h-7 w-7 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucune équipe ne vous a encore contacté.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {chats.map((c) => (
            <button key={c.id} onClick={() => setActiveChat(c)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {c.team_logo
                  ? <img src={c.team_logo} alt="" className="w-full h-full object-cover" />
                  : <Trophy className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{c.team_name}</p>
                <p className="text-xs text-muted-foreground">{c.last_at ? fmtRelTime(c.last_at) : 'Pas encore de messages'}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ManagerHome page ──────────────────────────────────────────────────────────
export default function ManagerHome() {
  const { user } = useAuth();
  const [data,    setData]    = useState(null);
  const [sub,     setSub]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!user?.organization_id) { setLoading(false); return; }
    Promise.all([
      getManagerDashboard(),
      getMySubscription().catch(() => null),
    ])
      .then(([{ stats, recent_bookings }, subResult]) => {
        setData({ stats, recent_bookings: recent_bookings ?? [] });
        setSub(subResult?.subscription ?? null);
      })
      .catch((err) => setError(err.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [user?.organization_id]);

  const greeting = user?.first_name || user?.email?.split('@')[0];

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />{error}
      </div>
    );
  }

  const { stats, recent_bookings } = data ?? {};

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-primary mb-0.5">Espace gérant</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bonjour, {greeting} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Voici un aperçu de votre activité.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Revenus aujourd'hui"
          value={`${(stats?.revenue_today ?? 0).toLocaleString('fr-FR')} FCFA`}
          sub="créneaux réservés ce jour"
          icon={TrendingUp}
          accent
        />
        <StatCard
          label="Revenus cette semaine"
          value={`${(stats?.revenue_week ?? 0).toLocaleString('fr-FR')} FCFA`}
          sub="7 prochains jours"
          icon={TrendingUp}
        />
        <StatCard
          label="Réservés cette semaine"
          value={stats?.bookings_week ?? 0}
          sub="créneaux sur 7 jours"
          icon={CalendarCheck}
          accent
        />
        <StatCard
          label="Total réservations"
          value={stats?.bookings_total ?? 0}
          sub="depuis le début"
          icon={CalendarCheck}
        />
      </div>

      {/* Subscription chip */}
      <SubChip sub={sub} />

      {/* Recent bookings */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Dernières réservations</p>
          </div>
          <Link to="/manager/bookings"
            className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5">
            Voir tout <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="px-4 divide-y divide-border/50">
          {!recent_bookings?.length ? (
            <div className="py-8 flex flex-col items-center gap-2 text-center">
              <User className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucune réservation pour le moment.</p>
            </div>
          ) : (
            recent_bookings.map((b) => <BookingRow key={b.id} b={b} />)
          )}
        </div>
      </div>

      {/* Team messages */}
      <TeamChatsSection currentUserId={user?.sub} />

    </div>
  );
}
