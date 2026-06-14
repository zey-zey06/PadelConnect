import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Sparkles, Plus, ExternalLink, History, ArrowLeft, Clock,
  Check, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { piaChatMessage, getPiaHistory, getPiaConversations } from '@/api/pia';
import { createSession, invitePlayer }  from '@/api/sessions';
import { getFriends }                   from '@/api/friends';
import { search as searchPlayers }      from '@/api/search';
import { useAuth, usePlayerPanel }      from '@/App';
import { cn }                           from '@/lib/utils';

const RATE_LIMIT = 20;
const WELCOME    = 'Bonjour ! Je suis PIA, votre assistante PadelConnect. Comment puis-je vous aider ? 🎾';

const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant+', 3: 'Intermédiaire', 4: 'Inter+',
  5: 'Confirmé',  6: 'Avancé',    7: 'Expert',
};

const ROLE_LABELS = {
  player:      'Assistante joueur',
  venue_admin: 'Assistante gérant',
  super_admin: 'Assistante admin',
  coach:       'Assistante coach',
  ball_picker: 'Assistante',
};

// ── Session creation intent detection ─────────────────────────────────────────
const SESSION_INTENT_RE =
  /cr[eé]er.{0,25}session|organis.{0,25}(session|partie)|nouvelle.{0,20}session|cr[eé]er.{0,20}(une\s+)?partie/i;

// ── QCM constants ─────────────────────────────────────────────────────────────
const QCM_TIME_MAP = {
  '08h': '08:00', '10h': '10:00', '12h': '12:00', '14h': '14:00',
  '16h': '16:00', '18h': '18:00', '20h': '20:00',
};

const QCM_STEPS = ['level', 'gender', 'players', 'date', 'time', 'share'];

const QCM_QUESTIONS = {
  level:   'Quel niveau ?',
  gender:  'Quel genre ?',
  players: 'Combien de joueurs ?',
  date:    'Quelle date ?',
  time:    'Quelle heure ?',
  share:   'Partager la session ?',
};

const QCM_OPTIONS = {
  level:   [1, 2, 3, 4, 5, 6, 7].map((n) => ({ v: n, l: `Niv. ${n}` })),
  gender:  [{ v: 'mixed', l: 'Mixte' }, { v: 'men', l: 'Hommes' }, { v: 'women', l: 'Femmes' }],
  players: [{ v: 2, l: '2' }, { v: 3, l: '3' }, { v: 4, l: '4' }],
  date: [
    { v: 'today',    l: "Aujourd'hui" },
    { v: 'tomorrow', l: 'Demain'       },
    { v: 'in2days',  l: 'Dans 2 jours' },
    { v: 'custom',   l: 'Choisir…'     },
  ],
  time: [
    ...['08h', '10h', '12h', '14h', '16h', '18h', '20h'].map((t) => ({ v: t, l: t })),
    { v: 'custom', l: 'Autre' },
  ],
  share: [{ v: 'yes', l: 'Oui' }, { v: 'no', l: 'Non' }],
};

function resolveSessionDate(val, custom) {
  const fmt = (d) => d.toISOString().slice(0, 10);
  if (val === 'today')    return fmt(new Date());
  if (val === 'tomorrow') { const d = new Date(); d.setDate(d.getDate() + 1); return fmt(d); }
  if (val === 'in2days')  { const d = new Date(); d.setDate(d.getDate() + 2); return fmt(d); }
  return custom;
}

function resolveSessionTime(val, custom) {
  return QCM_TIME_MAP[val] ?? custom;
}

// ── Mini card components ──────────────────────────────────────────────────────

function PlayerMiniCard({ player, onViewProfile }) {
  const initials = (player.name || '??').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-white shadow-sm px-3 py-2">
      <div className="h-9 w-9 rounded-full overflow-hidden bg-primary/10 ring-2 ring-green-200 shrink-0">
        {player.photo_url ? (
          <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-[10px] font-bold text-primary select-none">{initials}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate leading-tight">{player.name}</p>
        {player.level && (
          <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
            Niv.{player.level} · {LEVEL_LABELS[player.level] ?? ''}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onViewProfile(player.id)}
        className="text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1.5 rounded-lg transition-colors shrink-0"
      >
        Voir profil
      </button>
    </div>
  );
}

function SlotMiniCard({ slot, onReserve }) {
  const dateStr = slot.date
    ? new Date(slot.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : '';
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-white shadow-sm px-3 py-2">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Clock className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate leading-tight">{slot.venue_name}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
          {dateStr} · {slot.start_time}–{slot.end_time}
        </p>
        {slot.price > 0 && (
          <p className="text-[10px] font-bold text-primary leading-tight">
            {slot.price.toLocaleString('fr-FR')} FCFA
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onReserve(slot)}
        className="text-[11px] font-semibold text-white bg-primary hover:bg-primary/90 px-2 py-1.5 rounded-lg transition-colors shrink-0"
      >
        Réserver
      </button>
    </div>
  );
}

// ── SessionQCM ────────────────────────────────────────────────────────────────
function SessionQCM({ userLevel }) {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [sel, setSel]   = useState({
    level:      userLevel ?? 3,
    gender:     'mixed',
    players:    4,
    date:       'today',
    customDate: '',
    time:       '18h',
    customTime: '',
    share:      'no',
  });

  // 'qcm' | 'creating' | 'done' | 'sharing'
  const [phase, setPhase]         = useState('qcm');
  const [session, setSession]     = useState(null);
  const [createErr, setCreateErr] = useState(null);

  // Sharing state
  const [friends, setFriends]               = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [searchQ, setSearchQ]               = useState('');
  const [searchRes, setSearchRes]           = useState([]);
  const [searching, setSearching]           = useState(false);
  const [picked, setPicked]                 = useState(new Set());
  const [inviting, setInviting]             = useState(false);
  const [inviteDone, setInviteDone]         = useState(false);

  const curKey  = QCM_STEPS[step];
  const curOpts = QCM_OPTIONS[curKey];
  const isLast  = step === QCM_STEPS.length - 1;

  function pickOpt(v) { setSel((s) => ({ ...s, [curKey]: v })); }

  // Search debounce
  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { players } = await searchPlayers(searchQ);
        setSearchRes((players ?? []).map((p) => ({ ...p, id: p.user_id ?? p.id })));
      } catch { setSearchRes([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  function goNext() {
    if (step < QCM_STEPS.length - 1) { setStep((s) => s + 1); return; }
    doCreate();
  }

  async function doCreate() {
    setPhase('creating');
    setCreateErr(null);
    try {
      const date = resolveSessionDate(sel.date, sel.customDate);
      const time = resolveSessionTime(sel.time, sel.customTime);
      const { session: s } = await createSession({
        date,
        time,
        max_players: sel.players,
        preferences: { level_min: sel.level, gender: sel.gender },
      });
      setSession(s);
      if (sel.share === 'yes') {
        setPhase('sharing');
        setFriendsLoading(true);
        getFriends()
          .then(({ friends: f }) => setFriends(f ?? []))
          .catch(() => {})
          .finally(() => setFriendsLoading(false));
      } else {
        setPhase('done');
      }
    } catch (err) {
      setCreateErr(err.message ?? 'Erreur lors de la création');
      setPhase('qcm');
    }
  }

  async function handleInvite() {
    if (!session || picked.size === 0) return;
    setInviting(true);
    try {
      await Promise.allSettled([...picked].map((id) => invitePlayer(session.id, id)));
      setInviteDone(true);
    } finally { setInviting(false); }
  }

  function togglePick(id) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function dateLabel() {
    const M = { today: "Aujourd'hui", tomorrow: 'Demain', in2days: 'Dans 2 jours' };
    return M[sel.date] ?? sel.customDate;
  }

  function summaryLabel(k) {
    const v = sel[k];
    if (k === 'level')   return `Niv. ${v}`;
    if (k === 'gender')  return v === 'mixed' ? 'Mixte' : v === 'men' ? 'Hommes' : 'Femmes';
    if (k === 'players') return `${v} joueurs`;
    if (k === 'date')    return dateLabel();
    if (k === 'time')    return QCM_TIME_MAP[v] ?? v;
    if (k === 'share')   return v === 'yes' ? 'Partager' : 'Privé';
    return String(v);
  }

  const needDatePicker = curKey === 'date' && sel.date === 'custom';
  const needTimePicker = curKey === 'time' && sel.time === 'custom';
  const canNext = curKey === 'date'
    ? sel.date !== 'custom' || !!sel.customDate
    : curKey === 'time'
    ? sel.time !== 'custom' || !!sel.customTime
    : true;

  // ── Phase: creating ──
  if (phase === 'creating') {
    return (
      <div className="rounded-2xl border border-violet-200 bg-white px-4 py-3 space-y-2 max-w-[260px]">
        <p className="text-sm font-semibold text-violet-700">Création en cours…</p>
        <div className="flex gap-1">
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Phase: done ──
  if (phase === 'done') {
    const dateStr = session?.date
      ? new Date(session.date + 'T00:00:00').toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long',
        })
      : '';
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3 max-w-[260px]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <Check className="h-4 w-4 text-white" />
          </div>
          <p className="text-sm font-bold text-emerald-700">Session créée !</p>
        </div>
        <div className="text-xs text-slate-600 space-y-0.5 pl-1">
          <p>📅 {dateStr}</p>
          <p>⏰ {(session?.time ?? '').slice(0, 5)}</p>
          <p>👥 {session?.max_players} joueurs max</p>
        </div>
        <button
          onClick={() => navigate('/sessions')}
          className="w-full text-center text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl py-2 transition-colors"
        >
          Voir ma session →
        </button>
      </div>
    );
  }

  // ── Phase: sharing ──
  if (phase === 'sharing') {
    const displayList = searchQ.trim() ? searchRes : friends;
    const sessionDateShort = session?.date
      ? new Date(session.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      : '';
    return (
      <div className="rounded-2xl border border-violet-200 bg-white p-4 space-y-3 max-w-[280px]">
        {/* Session mini-header */}
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <Check className="h-3 w-3 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-700">Session créée !</p>
            {session && (
              <p className="text-[10px] text-slate-400">
                {sessionDateShort} · {(session.time ?? '').slice(0, 5)} · {session.max_players} joueurs
              </p>
            )}
          </div>
        </div>

        <p className="text-sm font-semibold text-slate-800">Inviter des joueurs</p>

        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Rechercher par nom ou pseudo…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
        />

        <div className="max-h-40 overflow-y-auto space-y-1 no-scrollbar">
          {(friendsLoading || searching) ? (
            <p className="text-xs text-slate-400 text-center py-3">Chargement…</p>
          ) : displayList.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">
              {searchQ ? 'Aucun résultat' : 'Aucun ami trouvé'}
            </p>
          ) : displayList.map((f) => {
            const fid        = f.user_id ?? f.id;
            const name       = [f.first_name, f.last_name].filter(Boolean).join(' ') || f.username || '?';
            const isSelected = picked.has(fid);
            return (
              <button
                key={fid}
                onClick={() => togglePick(fid)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors border',
                  isSelected
                    ? 'bg-violet-50 border-violet-300'
                    : 'bg-white border-slate-100 hover:border-slate-200',
                )}
              >
                {f.photo_url ? (
                  <img src={f.photo_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-violet-700">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-slate-700 truncate">{name}</p>
                  {f.level && <p className="text-[10px] text-slate-400">Niv. {f.level}</p>}
                </div>
                {isSelected && <Check className="h-3 w-3 text-violet-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {inviteDone ? (
          <div className="text-xs text-center font-semibold text-emerald-600 py-1">
            ✓ Invitations envoyées !
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/sessions')}
              className="flex-1 text-xs py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Voir ma session
            </button>
            {picked.size > 0 && (
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="flex-1 text-xs py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors font-semibold"
              >
                {inviting ? '…' : `Envoyer à ${picked.size}`}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Phase: QCM ──
  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-4 space-y-3 max-w-[280px]">
      {/* Progress bar */}
      <div className="flex gap-1">
        {QCM_STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              i < step ? 'bg-emerald-500' : i === step ? 'bg-violet-400' : 'bg-slate-100',
            )}
          />
        ))}
      </div>

      {/* Completed answers as clickable pills */}
      {step > 0 && (
        <div className="flex flex-wrap gap-1">
          {QCM_STEPS.slice(0, step).map((k) => (
            <button
              key={k}
              onClick={() => setStep(QCM_STEPS.indexOf(k))}
              className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 hover:bg-emerald-100 transition-colors"
            >
              {summaryLabel(k)}
            </button>
          ))}
        </div>
      )}

      {/* Question */}
      <p className="text-sm font-bold text-slate-800">{QCM_QUESTIONS[curKey]}</p>

      {/* Option chips */}
      <div className="flex flex-wrap gap-1.5">
        {curOpts.map(({ v, l }) => {
          const isSelected = sel[curKey] === v;
          return (
            <button
              key={String(v)}
              onClick={() => pickOpt(v)}
              className={cn(
                'text-xs font-medium rounded-full px-3 py-1.5 border transition-colors',
                isSelected
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700',
              )}
            >
              {l}
            </button>
          );
        })}
      </div>

      {/* Date picker */}
      {needDatePicker && (
        <input
          type="date"
          value={sel.customDate}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setSel((s) => ({ ...s, customDate: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
      )}

      {/* Time picker */}
      {needTimePicker && (
        <input
          type="time"
          value={sel.customTime}
          onChange={(e) => setSel((s) => ({ ...s, customTime: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
      )}

      {/* Error */}
      {createErr && <p className="text-xs text-red-500">{createErr}</p>}

      {/* Next / Create button */}
      {canNext && (
        <button
          onClick={goNext}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          {isLast
            ? '🎾 Créer la session'
            : (<>Suivant <ChevronRight className="h-3.5 w-3.5" /></>)}
        </button>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMsgDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function groupByDate(conversations) {
  const groups = [];
  const seen   = {};
  for (const conv of conversations) {
    const label = new Date(conv.updated_at).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    if (!seen[label]) {
      seen[label] = [];
      groups.push({ label, items: seen[label] });
    }
    seen[label].push(conv);
  }
  return groups;
}

function shouldShowDateSeparator(msgs, idx) {
  if (idx === 0 || !msgs[idx]?.ts || !msgs[idx - 1]?.ts) return false;
  return msgs[idx].ts.slice(0, 10) !== msgs[idx - 1].ts.slice(0, 10);
}

function extractActions(text) {
  const actions = [];
  if (/\bsession/i.test(text))  actions.push({ label: 'Voir les sessions', path: '/sessions' });
  if (/\bclub/i.test(text))     actions.push({ label: 'Voir les clubs',    path: '/clubs'    });
  return actions;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PIAPanel({ onClose }) {
  const { user }            = useAuth();
  const navigate            = useNavigate();
  const { openPlayerPanel } = usePlayerPanel();

  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [historyLoading,  setHistoryLoading]  = useState(true);
  const [visible,         setVisible]         = useState(false);
  const [conversationId,  setConversationId]  = useState(null);
  const [rateLimited,     setRateLimited]     = useState(false);
  const [retryMinutes,    setRetryMinutes]    = useState(0);

  const [view,          setView]          = useState('chat');
  const [conversations, setConversations] = useState([]);
  const [convsLoading,  setConvsLoading]  = useState(false);
  const [convsLoaded,   setConvsLoaded]   = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    getPiaHistory()
      .then(({ messages: hist, conversation_id: convId }) => {
        if (hist?.length) {
          setMessages(hist);
          setConversationId(convId);
        } else {
          setMessages([{ role: 'model', text: WELCOME, ts: new Date().toISOString() }]);
        }
      })
      .catch(() => {
        setMessages([{ role: 'model', text: WELCOME, ts: new Date().toISOString() }]);
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 15);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!historyLoading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, historyLoading]);

  useEffect(() => {
    if (visible && !historyLoading) inputRef.current?.focus();
  }, [visible, historyLoading]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  function handleNewConversation() {
    setConversationId(null);
    setRateLimited(false);
    setView('chat');
    setMessages([{ role: 'model', text: WELCOME, ts: new Date().toISOString() }]);
  }

  async function openHistory() {
    setView('history');
    if (!convsLoaded) {
      setConvsLoading(true);
      try {
        const { conversations: convs } = await getPiaConversations();
        setConversations(convs ?? []);
        setConvsLoaded(true);
      } catch {
        setConversations([]);
      } finally {
        setConvsLoading(false);
      }
    }
  }

  async function loadConversation(convId) {
    setHistoryLoading(true);
    setView('chat');
    try {
      const { messages: hist, conversation_id: newConvId } = await getPiaHistory({ conversationId: convId });
      if (hist?.length) {
        setMessages(hist);
        setConversationId(newConvId);
      }
    } catch {
      // keep existing messages on error
    } finally {
      setHistoryLoading(false);
    }
  }

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || rateLimited || historyLoading) return;

    // Intercept session creation intent for players
    if (SESSION_INTENT_RE.test(text) && user?.role === 'player') {
      setInput('');
      const ts = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { role: 'user', text, ts },
        { role: 'widget', type: 'session_qcm', ts: new Date().toISOString() },
      ]);
      return;
    }

    setInput('');
    const ts          = new Date().toISOString();
    const newMessages = [...messages, { role: 'user', text, ts }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const history = newMessages
        .slice(0, -1)
        .filter((m) => m.role !== 'widget' && m.text !== WELCOME)
        .map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

      const { response, conversation_id: convId, type: respType, data: respData } =
        await piaChatMessage(text, history, conversationId);

      if (convId) setConversationId(convId);

      setMessages((prev) => [
        ...prev,
        {
          role:    'model',
          text:    response,
          ts:      new Date().toISOString(),
          actions: extractActions(response),
          type:    respType ?? 'text',
          data:    Array.isArray(respData) && respData.length > 0 ? respData : null,
        },
      ]);
    } catch (err) {
      if (err.status === 429 && err.data?.retry_after_minutes) {
        setRateLimited(true);
        setRetryMinutes(err.data.retry_after_minutes);
        setMessages((prev) => prev.slice(0, -1));
        setInput(text);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: 'Désolée, une erreur est survenue. Veuillez réessayer. 🎾',
            ts:   new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, rateLimited, historyLoading, messages, conversationId, user]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleSlotReserve(slot) {
    navigate(`/clubs/${slot.club_id}?date=${slot.date}&slotId=${slot.id}`);
    handleClose();
  }

  const roleLabel = ROLE_LABELS[user?.role] ?? 'Assistante';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-20 right-6 z-50',
          'w-[380px] max-w-[calc(100vw-1.5rem)]',
          'h-[540px] max-h-[calc(100vh-8rem)]',
          'flex flex-col rounded-2xl shadow-2xl border border-border bg-white overflow-hidden',
          'transform transition-all duration-[280ms] ease-out',
          visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95',
        )}
        role="dialog"
        aria-label="PIA — Assistante PadelConnect"
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-primary text-white shrink-0">
          {view === 'history' ? (
            <button
              onClick={() => setView('chat')}
              className="text-white/80 hover:text-white transition-colors p-1 rounded"
              aria-label="Retour au chat"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">
              {view === 'history' ? 'Historique' : 'PIA'}
            </p>
            <p className="text-xs text-white/80 truncate">
              {view === 'history' ? 'Vos conversations passées' : roleLabel}
            </p>
          </div>
          {view === 'chat' && (
            <>
              <button
                onClick={handleNewConversation}
                title="Nouvelle conversation"
                className="text-white/80 hover:text-white transition-colors p-1 rounded"
                aria-label="Nouvelle conversation"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={openHistory}
                title="Historique"
                className="text-white/80 hover:text-white transition-colors p-1 rounded"
                aria-label="Historique des conversations"
              >
                <History className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded"
            aria-label="Fermer PIA"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Messages / History ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">

          {/* History view */}
          {view === 'history' && (
            convsLoading ? (
              <div className="flex items-center justify-center h-full gap-1">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <History className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucune conversation enregistrée.</p>
                <button onClick={() => setView('chat')} className="text-xs text-primary hover:underline">
                  Démarrer une conversation
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {groupByDate(conversations).map(({ label, items }) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      {label}
                    </p>
                    <div className="space-y-1">
                      {items.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => loadConversation(conv.id)}
                          className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-accent px-3 py-2.5 transition-colors"
                        >
                          <p className="text-sm font-medium text-foreground truncate leading-tight">{conv.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Chat view */}
          {view === 'chat' && (historyLoading ? (
            <div className="flex items-center justify-center h-full gap-1">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i}>
                  {shouldShowDateSeparator(messages, i) && (
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground px-1 shrink-0">{formatMsgDate(msg.ts)}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {(msg.role === 'model' || msg.role === 'widget') && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mr-2 mt-0.5 shrink-0">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    )}

                    <div className="space-y-1.5 max-w-[80%]">

                      {/* SessionQCM widget */}
                      {msg.role === 'widget' && msg.type === 'session_qcm' && (
                        <SessionQCM userLevel={undefined} />
                      )}

                      {/* Text bubble — regular messages only */}
                      {msg.role !== 'widget' && (
                        <div className={cn(
                          'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                          msg.role === 'user'
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm',
                        )}>
                          {msg.text}
                        </div>
                      )}

                      {/* Player suggestion cards */}
                      {msg.role === 'model' && msg.type === 'players' && msg.data?.length > 0 && (
                        <div className="space-y-1.5 pt-0.5">
                          {msg.data.map((player) => (
                            <PlayerMiniCard
                              key={player.id}
                              player={player}
                              onViewProfile={(id) => { openPlayerPanel(id); }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Slot suggestion cards */}
                      {msg.role === 'model' && msg.type === 'slots' && msg.data?.length > 0 && (
                        <div className="space-y-1.5 pt-0.5">
                          {msg.data.map((slot) => (
                            <SlotMiniCard
                              key={slot.id}
                              slot={slot}
                              onReserve={handleSlotReserve}
                            />
                          ))}
                        </div>
                      )}

                      {/* Contextual navigation buttons */}
                      {msg.actions?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pl-0.5">
                          {msg.actions.map((action) => (
                            <button
                              key={action.path}
                              onClick={() => { navigate(action.path); handleClose(); }}
                              className="flex items-center gap-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full px-3 py-1 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start items-center">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mr-2 shrink-0">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-2">
                    <div className="flex gap-1 items-center">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">PIA réfléchit…</span>
                  </div>
                </div>
              )}
            </>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Rate-limit banner */}
        {view === 'chat' && rateLimited && (
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700 text-center shrink-0">
            Limite de {RATE_LIMIT} messages/heure atteinte. Réessayez dans {retryMinutes} min.
          </div>
        )}

        {/* Input */}
        {view === 'chat' && (
          <div className="shrink-0 px-3 py-3 border-t border-border bg-white">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={rateLimited ? `Limite atteinte — ${retryMinutes} min` : 'Posez votre question…'}
                rows={1}
                disabled={loading || rateLimited || historyLoading}
                className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20
                  disabled:opacity-50 overflow-y-auto no-scrollbar"
                style={{ minHeight: '38px', maxHeight: '96px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading || rateLimited || historyLoading}
                className="shrink-0 w-9 h-9 rounded-xl bg-primary hover:bg-primary/90
                  disabled:opacity-40 disabled:cursor-not-allowed
                  text-white flex items-center justify-center transition-colors"
                aria-label="Envoyer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              PIA peut faire des erreurs. Vérifiez les informations importantes.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
