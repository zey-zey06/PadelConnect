import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2, MapPin, Phone, Clock,
  AlertCircle, X, CreditCard, Banknote,
  CheckCircle2, ChevronLeft, ChevronRight, Calendar, ArrowLeft, Eye, Share2,
  Bell, BellOff, ImageIcon, Plus, Send, Trash2, Star, MessageSquare, Dumbbell,
  Menu, Search, Users, Lock, Globe, LogOut, Info,
} from 'lucide-react';
import ShareContactPicker from '@/components/ShareContactPicker';
import {
  getPublicClub, getClubSlots, getClubSubscriptionStatus, toggleClubSubscription,
  getClubPosts, createClubPost, getClubCoaches, getClubSubscribers,
} from '@/api/clubs';
import { getReviews, createReview } from '@/api/reviews';
import { getMySessions }   from '@/api/sessions';
import { createBooking }   from '@/api/bookings';
import { logout }          from '@/api/auth';
import { useAuth }         from '@/App';
import { Button }          from '@/components/ui/button';
import { cn }              from '@/lib/utils';
import { CLUB_AMENITIES }  from './manager/ClubSetup';
import { SingleClubMap }   from '@/components/ClubMap';
import { setLanguage }     from '@/i18n/i18n';
import { useTranslation }  from 'react-i18next';

// ── Constants ──────────────────────────────────────────────────────────────────
const LEVEL_LABELS = {
  1:'Débutant', 2:'Débutant +', 3:'Intermédiaire',
  4:'Inter +', 5:'Confirmé', 6:'Avancé', 7:'Expert',
};
const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().slice(0,10); }
function shiftDate(iso, days) {
  const d = new Date(iso+'T00:00:00'); d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}
function fmtLong(iso) {
  return new Date(iso+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function fmtShort(iso) {
  return new Date(iso+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
}
function durationLabel(start='00:00', end='00:00') {
  const [sh,sm]=start.slice(0,5).split(':').map(Number);
  const [eh,em]=end.slice(0,5).split(':').map(Number);
  const mins=(eh*60+em)-(sh*60+sm); if(mins<=0) return '';
  return mins%60===0?`${mins/60}h`:`${Math.floor(mins/60)}h${String(mins%60).padStart(2,'0')}`;
}
function formatCardNumber(val) {
  return val.replace(/\D/g,'').slice(0,16).replace(/(\d{4})(?=\d)/g,'$1 ').trim();
}
function formatExpiry(val) {
  const d=val.replace(/\D/g,'').slice(0,4);
  return d.length>=3?`${d.slice(0,2)}/${d.slice(2)}`:d;
}
function generateICS({date,startTime,endTime,venueName,clubName}) {
  const st=startTime.replace(':','').slice(0,4);
  const et=endTime.replace(':','').slice(0,4);
  const ds=date.replace(/-/g,'');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PadelConnect//FR','BEGIN:VEVENT',
    `UID:booking-${Date.now()}@padelconnect`,`DTSTART:${ds}T${st}00`,`DTEND:${ds}T${et}00`,
    `SUMMARY:Padel — ${venueName}`,`DESCRIPTION:${clubName}`,`LOCATION:${clubName}`,
    'END:VEVENT','END:VCALENDAR'].join('\r\n');
}
function downloadICS(content,filename) {
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'}));
  a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── Stars display ──────────────────────────────────────────────────────────────
function Stars({ value, max=5, size='h-3.5 w-3.5' }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({length:max},(_,i)=>i+1).map((n) => (
        <Star key={n} className={size} style={{
          fill: n<=Math.round(value||0)?'#f59e0b':'transparent',
          color: n<=Math.round(value||0)?'#f59e0b':'#d1d5db',
        }} />
      ))}
    </div>
  );
}

// ── Subscribers slide panel ────────────────────────────────────────────────────
function SubscribersPanel({ clubId, subscribersCount, user, subscribed, subLoading, onToggle, onClose }) {
  const [subs,    setSubs]    = useState(null);
  const [search,  setSearch]  = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 15);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    getClubSubscribers(clubId)
      .then(({ subscribers: s }) => setSubs(s ?? []))
      .catch(() => setSubs([]));
  }, [clubId]);

  function handleClose() { setVisible(false); setTimeout(onClose, 280); }

  const filtered = subs?.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = [s.first_name, s.last_name].filter(Boolean).join(' ').toLowerCase();
    return name.includes(q);
  }) ?? null;

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={handleClose}
      />
      <div className={cn(
        'fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-background shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out',
        visible ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">
              Abonnés ({subscribersCount})
            </h2>
          </div>
          <button onClick={handleClose}
            className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Subscribe toggle */}
        {user && (
          <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border">
            <button
              onClick={onToggle}
              disabled={subLoading}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-60',
                subscribed
                  ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {subscribed ? <Bell className="h-4 w-4 fill-primary" /> : <BellOff className="h-4 w-4" />}
              {subscribed ? 'Abonné — cliquer pour se désabonner' : "S'abonner aux actualités du club"}
            </button>
          </div>
        )}

        {/* Search */}
        <div className="shrink-0 px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input type="text" value={search} onChange={(e)=>setSearch(e.target.value)}
              placeholder="Rechercher un abonné…"
              className="w-full rounded-lg border border-input bg-muted/30 pl-9 pr-8 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-colors" />
            {search && <button onClick={()=>setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered === null ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">
                {search ? 'Aucun abonné trouvé' : 'Aucun abonné pour le moment'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((s) => {
                const name = [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Joueur';
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="h-11 w-11 rounded-full overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center border border-border">
                      {s.photo_url
                        ? <img src={s.photo_url} alt={name} className="h-full w-full object-cover" />
                        : <span className="text-xs font-bold text-primary">{name.slice(0,2).toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      {s.level && (
                        <p className="text-xs text-muted-foreground">
                          Niv.{s.level} · {LEVEL_LABELS[s.level] ?? ''}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Hamburger settings panel ───────────────────────────────────────────────────
const LANGUAGES = [
  { code:'fr', label:'Français', flag:'🇫🇷' },
  { code:'en', label:'English',  flag:'🇬🇧' },
  { code:'ar', label:'العربية',  flag:'🇸🇦' },
];

function HamburgerPanel({ open, user, navigate, onClose }) {
  const { t, i18n } = useTranslation();
  const current = i18n.language?.slice(0,2) || 'fr';

  async function handleLogout() {
    try { await logout(); } catch { /* non-fatal */ }
    window.location.href = '/login';
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={onClose} />}
      <div className={cn(
        'fixed top-0 right-0 z-[80] h-full w-72 bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-out',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Paramètres</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-3 py-2 space-y-0.5">
          {/* Language */}
          <div className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground flex-1">Langue</span>
            <div className="flex gap-1">
              {LANGUAGES.map(({code,label,flag}) => (
                <button key={code} onClick={()=>setLanguage(code)} title={label}
                  className={cn('h-8 w-8 rounded-lg text-base flex items-center justify-center transition-all',
                    current===code ? 'bg-primary/10 ring-2 ring-primary/30 scale-110' : 'hover:bg-muted opacity-60 hover:opacity-100')}>
                  {flag}
                </button>
              ))}
            </div>
          </div>

          {/* Change password */}
          {user && (
            <button onClick={()=>{ onClose(); navigate('/profile'); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors text-left">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              Changer le mot de passe
            </button>
          )}

          {/* Logout */}
          {user && (
            <button onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
              <LogOut className="h-4 w-4 shrink-0" />
              Se déconnecter
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Slot button ────────────────────────────────────────────────────────────────
function SlotBtn({ slot, venueName, clubName, onBook, onShare, isMyBooking }) {
  const avail     = slot.status === 'available';
  const cancelled = slot.status === 'cancelled';

  if (isMyBooking) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
        <span className="text-xs font-medium text-blue-800 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 shrink-0" />Ma réservation
        </span>
        <button onClick={()=>{ const c=generateICS({date:slot.date,startTime:slot.start_time?.slice(0,5),endTime:slot.end_time?.slice(0,5),venueName,clubName}); downloadICS(c,`padel-${slot.date}.ics`); }}
          className="flex items-center gap-0.5 text-xs text-blue-700 underline hover:text-blue-900">
          <Calendar className="h-3 w-3" />Calendrier
        </button>
        <button onClick={()=>onShare?.(slot,venueName)} className="flex items-center gap-0.5 text-xs text-blue-700 hover:text-blue-900">
          <Share2 className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button onClick={()=>avail&&onBook(slot,venueName)} disabled={!avail}
        className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all select-none',
          avail     && 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100 hover:shadow-sm cursor-pointer',
          !avail && !cancelled && 'border-zinc-200 bg-zinc-100 text-zinc-500 cursor-not-allowed',
          cancelled && 'border-border bg-muted/40 text-muted-foreground line-through cursor-not-allowed opacity-60',
        )}>
        {cancelled ? 'Annulé' : !avail ? 'Réservé' : (
          <><Clock className="h-3 w-3 shrink-0" />{slot.start_time?.slice(0,5)}–{slot.end_time?.slice(0,5)}
            {slot.price>0&&<span className="ml-1 font-normal opacity-80">| {Number(slot.price).toLocaleString('fr-FR')} FCFA</span>}</>
        )}
      </button>
      {avail && <button onClick={()=>onShare?.(slot,venueName)}
        className="inline-flex items-center justify-center rounded-lg border border-green-200 bg-green-50 p-2 text-green-700 hover:bg-green-100 transition-colors">
        <Share2 className="h-3 w-3" />
      </button>}
    </div>
  );
}

// ── Booking modal ──────────────────────────────────────────────────────────────
function BookingModal({ slot, venueName, onClose, onBooked }) {
  const { user } = useAuth();
  const userBalance = Number(user?.balance ?? 0);
  const [sessions,setSessions]=useState([]); const [sessionId,setSessionId]=useState('');
  const [paymentMethod,setPaymentMethod]=useState('on_arrival');
  const [loading,setLoading]=useState(false); const [sessionsLoading,setSessionsLoading]=useState(true);
  const [error,setError]=useState(null);
  const [cardNumber,setCardNumber]=useState(''); const [cardExpiry,setCardExpiry]=useState('');
  const [cardCvv,setCardCvv]=useState(''); const [cardHolder,setCardHolder]=useState('');
  const [cardAccepted,setCardAccepted]=useState(false); const [phone,setPhone]=useState('');
  const duration=durationLabel(slot.start_time,slot.end_time);
  const showCard=paymentMethod==='card'; const showPhone=paymentMethod==='wave'||paymentMethod==='orange_money';

  useEffect(()=>{
    getMySessions().then(({sessions:s})=>{ const o=(s??[]).filter(x=>x.status==='open'); setSessions(o); if(o.length===1) setSessionId(String(o[0].id)); }).catch(()=>setSessions([])).finally(()=>setSessionsLoading(false));
  },[]);
  useEffect(()=>{ setCardAccepted(false); setPhone(''); setError(null); },[paymentMethod]);

  function fmtPhone(v){const d=v.replace(/\D/g,'').slice(0,10);const g=[];for(let i=0;i<d.length;i+=2)g.push(d.slice(i,i+2));return g.join(' ');}
  function validateCard(){const n=cardNumber.replace(/\s/g,'');if(!/^\d{16}$/.test(n))return 'Numéro invalide (16 chiffres).';if(!/^\d{2}\/\d{2}$/.test(cardExpiry))return 'Date invalide (MM/AA).';const[m,y]=cardExpiry.split('/').map(Number);if(m<1||m>12)return 'Mois invalide.';if(new Date(2000+y,m)<new Date())return 'Carte expirée.';if(!/^\d{3,4}$/.test(cardCvv))return 'CVV invalide.';if(!cardHolder.trim())return 'Nom du titulaire requis.';return null;}

  async function handleSubmit(e){
    e.preventDefault(); if(!sessionId){setError('Sélectionnez une session.');return;}
    if(showCard&&!cardAccepted){const ce=validateCard();if(ce){setError(ce);return;}setCardAccepted(true);}
    if(showPhone){const pd=phone.replace(/\s/g,'');if(pd.length!==10){setError('Numéro invalide — 10 chiffres requis.');return;}}
    setLoading(true);setError(null);
    try {
      const pd=phone.replace(/\s/g,'');
      const payment_phone=showPhone&&pd?`+225${pd}`:undefined;
      const{booking}=await createBooking({session_id:sessionId,venue_slot_id:slot.id,payment_method:paymentMethod,...(payment_phone&&{payment_phone})});
      onBooked(booking);
    } catch(err){setError(err.message||'Erreur lors de la réservation.');setCardAccepted(false);}
    finally{setLoading(false);}
  }

  const inp='w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e)=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Réserver ce créneau</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error&&<div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="font-semibold text-foreground text-sm truncate">{venueName}</p><p className="text-xs text-muted-foreground mt-0.5 capitalize">{fmtLong(slot.date)}</p></div>
              {slot.price>0&&<p className="text-lg font-bold text-foreground shrink-0 leading-none">{Number(slot.price).toLocaleString('fr-FR')}<span className="text-xs font-normal text-muted-foreground ml-1">FCFA</span></p>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="h-3 w-3"/>{slot.start_time?.slice(0,5)} – {slot.end_time?.slice(0,5)}</span>
              {duration&&<span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{duration}</span>}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Ma session</label>
            {sessionsLoading?<div className="h-10 rounded-lg bg-muted animate-pulse"/>:sessions.length===0
              ?<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">Aucune session. <Link to="/sessions" className="font-medium underline">Créez-en une</Link> puis revenez.</div>
              :<select value={sessionId} onChange={(e)=>setSessionId(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Sélectionnez une session…</option>
                {sessions.map((s)=><option key={s.id} value={String(s.id)}>{s.date} à {s.time} — {s.current_players}/{s.max_players} joueurs</option>)}
              </select>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mode de paiement</label>
            <div className="grid grid-cols-2 gap-2.5">
              {[{value:'on_arrival',label:'Sur place',Icon:Banknote},{value:'card',label:'Carte bancaire',Icon:CreditCard},{value:'wave',label:'Wave',color:'#1DC8FF'},{value:'orange_money',label:'Orange Money',color:'#FF6600'},{value:'balance',label:`Solde`,Icon:null,isBalance:true}].map(({value,label,Icon,color,isBalance})=>{
                const active=paymentMethod===value; const insuf=isBalance&&userBalance<(slot.price??0);
                return(<button key={value} type="button" onClick={()=>!insuf&&setPaymentMethod(value)} disabled={insuf}
                  style={active&&color?{borderColor:color,backgroundColor:`${color}15`}:undefined}
                  className={cn('flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all',active&&!color?'border-primary bg-primary/5 text-primary':!active&&!insuf?'border-border text-foreground/70 hover:border-primary/40':insuf?'border-border text-muted-foreground/40 cursor-not-allowed opacity-50':'')}>
                  {Icon?<Icon className={cn('h-5 w-5',active?'text-primary':'')}/>:<span className="text-lg leading-none">{value==='wave'?'🌊':value==='orange_money'?'🟠':'💰'}</span>}
                  <span style={active&&color?{color}:undefined} className="text-xs text-center leading-tight">
                    {isBalance?<>Solde<br/><span className={cn('text-[10px]',insuf?'text-red-500':'text-muted-foreground')}>{userBalance.toLocaleString('fr-FR')} FCFA{insuf&&' — insuffisant'}</span></>:label}
                  </span>
                </button>);
              })}
            </div>
          </div>
          {showPhone&&<div className="rounded-xl border p-4 space-y-2" style={{borderColor:paymentMethod==='wave'?'#1DC8FF':'#FF6600',backgroundColor:paymentMethod==='wave'?'#1DC8FF10':'#FF660010'}}>
            <label className="text-xs font-semibold" style={{color:paymentMethod==='wave'?'#0ea5e9':'#ea580c'}}>{paymentMethod==='wave'?'Numéro Wave':'Numéro Orange Money'}</label>
            <div className="flex items-center gap-2"><span className="text-sm font-mono text-muted-foreground shrink-0 select-none">🇨🇮 +225</span><input type="text" inputMode="numeric" placeholder="07 12 34 56 78" value={phone} onChange={(e)=>{setPhone(fmtPhone(e.target.value));setError(null);}} maxLength={14} className={inp+' font-mono tracking-wider'}/></div>
            <p className="text-[11px] text-muted-foreground">10 chiffres · ex : 07 12 34 56 78</p>
          </div>}
          {showCard&&<div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            {cardAccepted&&<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4 shrink-0"/>Paiement accepté</div>}
            <div className="space-y-1.5"><label className="text-xs font-medium text-foreground">Numéro de carte</label><input type="text" inputMode="numeric" placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e)=>{setCardNumber(formatCardNumber(e.target.value));setCardAccepted(false);}} maxLength={19} className={inp}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-foreground">Date d'expiration</label><input type="text" inputMode="numeric" placeholder="MM/AA" value={cardExpiry} onChange={(e)=>{setCardExpiry(formatExpiry(e.target.value));setCardAccepted(false);}} maxLength={5} className={inp}/></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-foreground">CVV</label><input type="text" inputMode="numeric" placeholder="123" value={cardCvv} onChange={(e)=>{setCardCvv(e.target.value.replace(/\D/g,'').slice(0,4));setCardAccepted(false);}} maxLength={4} className={inp}/></div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-foreground">Nom du titulaire</label><input type="text" placeholder="PRENOM NOM" value={cardHolder} onChange={(e)=>{setCardHolder(e.target.value.toUpperCase());setCardAccepted(false);}} className={inp}/></div>
          </div>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" disabled={loading||sessionsLoading||sessions.length===0} className="flex-1">
              {loading?'Réservation…':'Confirmer la réservation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reviews modal ──────────────────────────────────────────────────────────────
function ReviewsModal({ clubId, reviews, average, count, user, isManager, reviewDone, onClose, onReviewSubmit }) {
  const [rating,setRating]=useState(0); const [comment,setComment]=useState('');
  const [submitting,setSubmitting]=useState(false); const [error,setError]=useState(null);

  async function handleSubmit(e){
    e.preventDefault(); if(rating<1){setError('Sélectionnez une note.');return;}
    setSubmitting(true);setError(null);
    try{ await onReviewSubmit({target_id:clubId,target_type:'club',rating,comment:comment.trim()||null}); setRating(0);setComment(''); }
    catch(err){setError(err.message||'Erreur.');}
    finally{setSubmitting(false);}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/30 backdrop-blur-sm"
      onClick={(e)=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl max-h-[88vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 rounded-full bg-muted-foreground/30"/></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400"/>Avis clients
            </h2>
            {count>0&&<p className="text-xs text-muted-foreground mt-0.5">{average}/5 · {count} avis</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {user&&!isManager&&!reviewDone&&(
            <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Votre avis</p>
              {error&&<div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{error}</div>}
              <div className="flex gap-1.5">
                {[1,2,3,4,5].map((n)=>(
                  <button key={n} type="button" onClick={()=>setRating(n)} className="p-0.5 transition-transform hover:scale-110">
                    <Star className="h-7 w-7" style={{fill:n<=rating?'#f59e0b':'transparent',color:n<=rating?'#f59e0b':'#d1d5db'}}/>
                  </button>
                ))}
              </div>
              <textarea value={comment} onChange={(e)=>setComment(e.target.value)} maxLength={500} rows={2} placeholder="Partagez votre expérience…"
                className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"/>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">Annuler</button>
                <button type="submit" disabled={submitting||rating<1} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-40">
                  {submitting?'Envoi…':'Publier'}
                </button>
              </div>
            </form>
          )}
          {reviewDone&&<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4 shrink-0"/>Merci pour votre avis !</div>}
          {reviews.length===0?(
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
              <Star className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2"/><p className="text-sm text-muted-foreground">Aucun avis pour l'instant.</p>
            </div>
          ):(
            <div className="space-y-3">
              {reviews.map((r)=>{
                const rName=[r.reviewer_first_name,r.reviewer_last_name].filter(Boolean).join(' ')||'Joueur';
                const dateStr=new Date(r.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
                return(
                  <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {r.reviewer_photo_url?<img src={r.reviewer_photo_url} alt={rName} className="h-full w-full object-cover"/>:<span className="text-xs font-bold text-primary">{rName.slice(0,2).toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{rName}</p>
                        <div className="flex items-center gap-2 mt-0.5"><Stars value={r.rating}/><span className="text-[11px] text-muted-foreground">{dateStr}</span></div>
                      </div>
                    </div>
                    {r.comment&&<p className="text-sm text-foreground/80 leading-relaxed">{r.comment}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ClubProfile page ──────────────────────────────────────────────────────
export default function ClubProfile() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const isAdmin        = user?.role === 'super_admin';
  const isManager      = user?.role === 'venue_admin' && user?.organization_id === id;
  const [searchParams] = useSearchParams();
  const urlDate        = searchParams.get('date') || null;
  const urlSlotId      = searchParams.get('slotId') || null;

  // ── Data state ───────────────────────────────────────────────────────────────
  const [club,         setClub]         = useState(null);
  const [venues,       setVenues]       = useState([]);
  const [subsCount,    setSubsCount]    = useState(0);
  const [activeBookings,setActiveBookings]=useState(0);
  const [clubLoading,  setClubLoading]  = useState(true);
  const [clubError,    setClubError]    = useState(null);

  const [subscribed,   setSubscribed]   = useState(false);
  const [subLoading,   setSubLoading]   = useState(false);

  const [posts,        setPosts]        = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [reviews,      setReviews]      = useState([]);
  const [reviewsAvg,   setReviewsAvg]   = useState(null);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [reviewsLoading,setReviewsLoading]=useState(true);
  const [reviewDone,   setReviewDone]   = useState(false);

  const [coaches,      setCoaches]      = useState([]);
  const [coachesLoading,setCoachesLoading]=useState(true);

  // ── Slots / booking state ────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(()=>urlDate||todayISO());
  const [slotsData,    setSlotsData]    = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [pendingSlotId,setPendingSlotId]= useState(urlSlotId);
  const [booking,      setBooking]      = useState(null);
  const [myBooking,    setMyBooking]    = useState(null);
  const [booked,       setBooked]       = useState(false);
  const [shareSlot,    setShareSlot]    = useState(null);

  // ── Posts state ──────────────────────────────────────────────────────────────
  const [showPostForm, setShowPostForm] = useState(false);
  const [postContent,  setPostContent]  = useState('');
  const [postPhotos,   setPostPhotos]   = useState([]);
  const [postSubmitting,setPostSubmitting]=useState(false);
  const [postError,    setPostError]    = useState(null);

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [activeTab,       setActiveTab]       = useState('about'); // about | venues | posts | reviews
  const [showMenuPanel,   setShowMenuPanel]   = useState(false);
  const [showSubsPanel,   setShowSubsPanel]   = useState(false);
  const [showReviewsModal,setShowReviewsModal]= useState(false);

  // ── Loaders ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    getPublicClub(id)
      .then(({ club: c, venues: v, subscribers_count: sc, active_bookings_count: ab }) => {
        setClub(c); setVenues(v ?? []);
        setSubsCount(sc ?? 0); setActiveBookings(ab ?? 0);
      })
      .catch((err) => setClubError(err.message || 'Erreur de chargement.'))
      .finally(() => setClubLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || isAdmin) return;
    getClubSubscriptionStatus(id).then(({ subscribed: s }) => setSubscribed(s)).catch(() => {});
  }, [id, user, isAdmin]);

  useEffect(() => {
    getClubPosts(id).then(({ posts: p }) => setPosts(p ?? [])).catch(() => setPosts([])).finally(() => setPostsLoading(false));
  }, [id]);

  useEffect(() => {
    setReviewsLoading(true);
    getReviews(id).then(({ reviews: r, average, count }) => {
      setReviews(r ?? []); setReviewsAvg(average); setReviewsCount(count);
    }).catch(() => {}).finally(() => setReviewsLoading(false));
  }, [id]);

  useEffect(() => {
    setCoachesLoading(true);
    getClubCoaches(id).then(({ coaches: c }) => setCoaches(c ?? [])).catch(() => setCoaches([])).finally(() => setCoachesLoading(false));
  }, [id]);

  useEffect(() => {
    setSlotsLoading(true); setSlotsData(null);
    getClubSlots(id, selectedDate).then((data) => {
      setSlotsData(data);
      if (pendingSlotId && data?.venues) {
        for (const v of data.venues ?? []) {
          const t = v.slots?.find((s) => s.id === pendingSlotId && s.status === 'available');
          if (t) { setBooking({ slot: t, venueName: v.name }); setPendingSlotId(null); break; }
        }
        if (pendingSlotId) setPendingSlotId(null);
      }
    }).catch(() => setSlotsData({ date: selectedDate, venues: [] })).finally(() => setSlotsLoading(false));
  }, [id, selectedDate]); // eslint-disable-line

  // ── Handlers ──────────────────────────────────────────────────────────────────
  async function handleToggleSubscription() {
    if (subLoading) return; setSubLoading(true);
    try {
      const { subscribed: s } = await toggleClubSubscription(id);
      setSubscribed(s);
      setSubsCount((c) => s ? c + 1 : Math.max(0, c - 1));
    } catch { /* non-fatal */ } finally { setSubLoading(false); }
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => { const r=new FileReader(); r.onload=(e)=>resolve(e.target.result); r.onerror=reject; r.readAsDataURL(file); });
  }

  async function handlePostPhotoChange(e) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - postPhotos.length);
    if (!files.length) return;
    const urls = await Promise.all(files.map(readFileAsDataURL));
    setPostPhotos((prev) => [...prev, ...urls].slice(0, 4)); e.target.value = '';
  }

  async function handleCreatePost() {
    if (!postContent.trim() && postPhotos.length === 0) return;
    setPostSubmitting(true); setPostError(null);
    try {
      const { post } = await createClubPost(id, { content: postContent.trim(), photos: postPhotos });
      setPosts((prev) => [post, ...prev]); setPostContent(''); setPostPhotos([]); setShowPostForm(false);
    } catch (err) { setPostError(err.message || 'Erreur.'); } finally { setPostSubmitting(false); }
  }

  async function handleSubmitReview({ target_id, target_type, rating: r, comment: c } = {}) {
    if ((r ?? 0) < 1) return;
    setReviewDone(false);
    try {
      const { review } = await createReview({ target_id: target_id ?? id, target_type: target_type ?? 'club', rating: r, comment: c?.trim() || null });
      const newReview = { ...review, reviewer_first_name: user?.first_name ?? null, reviewer_last_name: user?.last_name ?? null, reviewer_photo_url: null };
      setReviews((prev) => [newReview, ...prev]);
      const nc = reviewsCount + 1;
      const na = reviewsAvg ? Math.round(((reviewsAvg * reviewsCount + r) / nc) * 10) / 10 : r;
      setReviewsAvg(na); setReviewsCount(nc); setReviewDone(true);
      setShowReviewsModal(false);
    } catch { /* non-fatal */ }
  }

  // ── Loading / error ───────────────────────────────────────────────────────────
  if (clubLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-52 rounded-none sm:rounded-2xl bg-muted -mx-4 sm:mx-0" />
        <div className="h-8 w-48 rounded-lg bg-muted mx-4 sm:mx-0" />
        <div className="grid grid-cols-3 gap-3 mx-4 sm:mx-0">
          {[1,2,3].map((i)=><div key={i} className="h-16 rounded-xl bg-muted"/>)}
        </div>
        <div className="h-10 rounded-xl bg-muted mx-4 sm:mx-0" />
      </div>
    );
  }
  if (clubError || !club) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />{clubError || 'Club introuvable.'}
      </div>
    );
  }

  const amenityKeys  = club.amenities ? Object.keys(club.amenities).filter((k) => club.amenities[k]) : [];
  const photos       = Array.isArray(club.photos_urls) ? club.photos_urls : [];
  const today        = todayISO();
  const isSuspended  = club.subscription_status === 'suspended';
  const todayKey     = DAYS[new Date().getDay()];
  const todayHours   = club.opening_hours?.[todayKey];
  const isOpenToday  = todayHours && !todayHours.closed;

  const TABS = [
    { id:'about',   label:'À propos' },
    { id:'venues',  label:'Terrains' },
    { id:'posts',   label:'Posts' + (posts.length > 0 ? ` (${posts.length})` : '') },
    { id:'reviews', label:'Avis' + (reviewsCount > 0 ? ` (${reviewsCount})` : '') },
  ];

  return (
    <div className="pb-10 -mx-4 sm:mx-0">

      {/* ── Hero: cover + logo + actions ──────────────────────────────────── */}
      <div className="relative">
        {/* Cover */}
        <div className="h-52 sm:h-60 overflow-hidden sm:rounded-t-2xl relative">
          {club.cover_url
            ? <img src={club.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            : photos[0]
            ? <img src={photos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
                <div className="absolute inset-0 opacity-[0.06] flex items-center justify-center">
                  <Building2 className="h-40 w-40 text-primary" />
                </div>
              </div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Back button */}
          <button onClick={()=>navigate(-1)}
            className="absolute top-4 left-4 flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>

          {/* Hamburger menu button */}
          <button onClick={()=>setShowMenuPanel(true)}
            className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-black/50 transition-colors">
            <Menu className="h-4 w-4" />
          </button>

          {/* Open/closed badge bottom-right of cover */}
          {todayHours && (
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
              <span className={cn('w-2 h-2 rounded-full shrink-0', isOpenToday ? 'bg-green-400' : 'bg-red-400')} />
              <span className="text-xs font-semibold text-white">
                {isOpenToday ? `Ouvert · jusqu'à ${todayHours.close}` : 'Fermé aujourd\'hui'}
              </span>
            </div>
          )}
        </div>

        {/* Logo overlapping cover */}
        <div className="absolute -bottom-10 left-4 sm:left-6">
          <div className="h-20 w-20 rounded-full border-4 border-background bg-card overflow-hidden shadow-lg flex items-center justify-center">
            {club.logo_url
              ? <img src={club.logo_url} alt="Logo" className="h-full w-full object-cover" />
              : <div className="h-full w-full flex items-center justify-center bg-primary/10"><Building2 className="h-8 w-8 text-primary" /></div>}
          </div>
        </div>

        {/* Subscribe / status row — right side of logo row */}
        <div className="absolute -bottom-5 right-4 sm:right-6 flex items-center gap-2">
          {!isAdmin && user && (
            <button onClick={handleToggleSubscription} disabled={subLoading}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-60',
                subscribed ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20' : 'bg-white border-border text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm')}>
              {subscribed ? <Bell className="h-3.5 w-3.5 fill-primary"/> : <BellOff className="h-3.5 w-3.5"/>}
              {subscribed ? 'Abonné' : "S'abonner"}
            </button>
          )}
        </div>
      </div>

      {/* ── Identity block ─────────────────────────────────────────────────── */}
      <div className="mt-14 px-4 sm:px-6 space-y-3">
        {/* Name + reviews */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{club.name}</h1>
          {!reviewsLoading && (
            <button type="button" onClick={()=>setShowReviewsModal(true)}
              className="flex items-center gap-1.5 mt-1 hover:opacity-75 transition-opacity">
              <Stars value={reviewsAvg} />
              {reviewsCount > 0
                ? <span className="text-xs text-muted-foreground">{reviewsAvg} ({reviewsCount} avis)</span>
                : <span className="text-xs text-muted-foreground">Aucun avis — donnez le premier !</span>}
            </button>
          )}
        </div>

        {/* Address + phone */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {club.address && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />{club.address}
            </div>
          )}
          {club.phone && (
            <a href={`tel:${club.phone.replace(/\s/g,'')}`}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline transition-colors">
              <Phone className="h-3.5 w-3.5 shrink-0" />{club.phone}
              <span className="text-xs font-medium bg-primary/10 px-2 py-0.5 rounded-full">Appeler</span>
            </a>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Terrains */}
          <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
            <p className="text-xl font-bold text-foreground">{venues.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">Terrain{venues.length!==1?'s':''}</p>
          </div>
          {/* Réservations actives */}
          <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
            <p className="text-xl font-bold text-foreground">{activeBookings}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">Réservations</p>
          </div>
          {/* Abonnés — clickable */}
          <button
            type="button"
            onClick={()=>setShowSubsPanel(true)}
            className="rounded-xl border border-border bg-card px-3 py-3 text-center hover:bg-muted/40 transition-colors"
          >
            <p className="text-xl font-bold text-foreground">{subsCount}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">Abonnés</p>
          </button>
        </div>

        {/* Suspended banner */}
        {isSuspended && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Ce club n'est plus disponible</p>
              <p className="text-xs text-orange-700 mt-0.5">Les réservations sont temporairement suspendues.</p>
            </div>
          </div>
        )}

        {/* Booking success banner */}
        {booked && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 space-y-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">Réservation confirmée !</p>
                <p className="text-xs text-green-700 mt-0.5">Un email de confirmation vous a été envoyé.</p>
              </div>
              <button onClick={()=>setBooked(false)} className="text-green-600 hover:text-green-800 shrink-0"><X className="h-4 w-4" /></button>
            </div>
            {!reviewDone && (
              <button type="button" onClick={()=>setShowReviewsModal(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-green-300 bg-white/60 hover:bg-white px-3 py-2 text-xs font-medium text-green-800 transition-colors">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                Laisser un avis sur ce club
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="mt-5 border-b border-border overflow-x-auto">
        <div className="flex px-4 sm:px-6 min-w-max">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab===tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border')}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 mt-5 space-y-6">

        {/* ── À PROPOS tab ─────────────────────────────────────────────────── */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            {/* Description */}
            {club.description && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">À propos</p>
                <p className="text-sm text-foreground leading-relaxed">{club.description}</p>
              </div>
            )}

            {/* Amenities */}
            {amenityKeys.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Équipements</p>
                <div className="flex flex-wrap gap-2">
                  {amenityKeys.map((k) => {
                    const opt = CLUB_AMENITIES.find((a) => a.key === k);
                    return (
                      <span key={k} className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/15">
                        {opt?.label ?? k}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Opening hours */}
            {club.opening_hours && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Horaires</p>
                <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/50">
                  {DAYS.slice(1).concat(DAYS[0]).map((key) => {
                    const h = club.opening_hours[key];
                    if (!h) return null;
                    const dayLabels = { monday:'Lundi',tuesday:'Mardi',wednesday:'Mercredi',thursday:'Jeudi',friday:'Vendredi',saturday:'Samedi',sunday:'Dimanche' };
                    const isCurrent = key === todayKey;
                    return (
                      <div key={key} className={cn('flex items-center justify-between px-4 py-2.5 text-sm',isCurrent&&'bg-primary/[0.03]')}>
                        <span className={cn('font-medium',isCurrent?'text-primary':'text-foreground')}>{dayLabels[key]}</span>
                        {h.closed
                          ? <span className="text-muted-foreground text-xs">Fermé</span>
                          : <span className={cn('text-xs font-mono',isCurrent?'text-primary font-semibold':'text-muted-foreground')}>{h.open} – {h.close}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location map */}
            {club.latitude != null && club.longitude != null && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Localisation</p>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${club.latitude},${club.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                    Google Maps <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </div>
                <SingleClubMap lat={Number(club.latitude)} lng={Number(club.longitude)} clubName={club.name} />
              </div>
            )}

            {/* Photo gallery */}
            {photos.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Photos</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {photos.map((url, i) => (
                    <div key={url} className={cn('rounded-xl overflow-hidden border border-border aspect-square',i===0&&'sm:col-span-2 sm:row-span-2')}>
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coaches */}
            {!coachesLoading && coaches.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Coachs</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {coaches.map((coach) => {
                    const cName = [coach.user_first_name, coach.user_last_name].filter(Boolean).join(' ') || 'Coach';
                    return (
                      <div key={coach.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                        <div className="h-11 w-11 rounded-full overflow-hidden bg-amber-100 shrink-0 flex items-center justify-center border border-border">
                          {coach.user_photo_url ? <img src={coach.user_photo_url} alt={cName} className="h-full w-full object-cover"/> : <span className="text-sm font-bold text-amber-700">{cName.slice(0,2).toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{cName}</p>
                          <p className="text-xs text-muted-foreground truncate">{coach.specialty||'Coach padel'}</p>
                          {coach.rate!=null&&<p className="text-xs font-semibold text-primary mt-0.5">{Number(coach.rate).toLocaleString('fr-FR')} FCFA/h</p>}
                        </div>
                        {user&&!isAdmin&&<button type="button" onClick={()=>navigate(`/messages?userId=${coach.user_id}`)}
                          className="shrink-0 flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors">
                          <MessageSquare className="h-3.5 w-3.5"/>Contacter
                        </button>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty about state */}
            {!club.description && amenityKeys.length===0 && !club.opening_hours && club.latitude==null && photos.length===0 && coaches.length===0 && (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 flex flex-col items-center gap-3 text-center">
                <Info className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Ce club n'a pas encore renseigné sa fiche.</p>
              </div>
            )}
          </div>
        )}

        {/* ── TERRAINS tab ───────────────────────────────────────────────────── */}
        {activeTab === 'venues' && (
          <div className="space-y-5">
            {isSuspended ? (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 text-center text-sm text-orange-800">
                Les réservations sont temporairement suspendues.
              </div>
            ) : (
              <>
                {/* Date navigation */}
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <button onClick={()=>setSelectedDate((d)=>shiftDate(d,-1))} disabled={selectedDate<=today}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex-1 flex items-center justify-center gap-3">
                    <input type="date" value={selectedDate} min={today}
                      onChange={(e)=>e.target.value&&setSelectedDate(e.target.value)}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"/>
                    <p className="text-sm font-medium text-foreground hidden sm:block capitalize">
                      {fmtShort(selectedDate)}
                      {selectedDate===today&&<span className="ml-2 text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Aujourd'hui</span>}
                    </p>
                  </div>
                  <button onClick={()=>setSelectedDate((d)=>shiftDate(d,1))}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Slots */}
                {slotsLoading ? (
                  <div className="space-y-3">{[1,2].map((i)=><div key={i} className="h-28 rounded-xl bg-muted animate-pulse"/>)}</div>
                ) : !slotsData||slotsData.venues.length===0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                    <p className="text-sm text-muted-foreground">Aucun terrain enregistré pour ce club.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const nowMins = (() => { const n=new Date(); return n.getHours()*60+n.getMinutes(); })();
                      return slotsData.venues.map((venue) => {
                        const visible = selectedDate===today
                          ? venue.slots.filter((s)=>{ const[h,m]=(s.start_time||'00:00').slice(0,5).split(':').map(Number); return h*60+m>=nowMins; })
                          : venue.slots;
                        const availCount = visible.filter((s)=>s.status==='available').length;
                        return (
                          <div key={venue.id} className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-primary shrink-0"/>
                              <p className="text-sm font-semibold text-foreground">{venue.name}</p>
                              {venue.description&&<p className="text-xs text-muted-foreground truncate">{venue.description}</p>}
                              {visible.length>0&&<span className="ml-auto text-xs text-muted-foreground shrink-0">{availCount} disponible{availCount!==1?'s':''}</span>}
                            </div>
                            <div className="px-5 py-4">
                              {visible.length===0
                                ? <p className="text-sm text-muted-foreground">Aucun créneau pour cette date.</p>
                                : <div className="flex flex-wrap gap-2">
                                    {visible.map((slot) => isAdmin
                                      ? <div key={slot.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500"><Eye className="h-3 w-3 shrink-0"/>{slot.start_time?.slice(0,5)}–{slot.end_time?.slice(0,5)} · <span className={slot.status==='available'?'text-emerald-600':'text-slate-400'}>{slot.status==='available'?'Libre':'Réservé'}</span></div>
                                      : <SlotBtn key={slot.id} slot={slot} venueName={venue.name} clubName={club.name} isMyBooking={myBooking?.venue_slot_id===slot.id} onBook={(s,n)=>setBooking({slot:s,venueName:n})} onShare={(s,n)=>setShareSlot({slot:s,venueName:n})}/>
                                    )}
                                  </div>}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── POSTS tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {isManager && (
              <button type="button" onClick={()=>{setShowPostForm((v)=>!v);setPostError(null);}}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="h-3.5 w-3.5"/>
                {showPostForm?'Annuler':'Nouvelle publication'}
              </button>
            )}
            {isManager&&showPostForm&&(
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                {postError&&<div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{postError}</div>}
                <textarea value={postContent} onChange={(e)=>setPostContent(e.target.value)} placeholder="Partagez une actualité, une offre, un événement…" rows={3} className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"/>
                {postPhotos.length>0&&<div className="flex gap-2 flex-wrap">{postPhotos.map((url,i)=><div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border shrink-0"><img src={url} alt="" className="h-full w-full object-cover"/><button type="button" onClick={()=>setPostPhotos((p)=>p.filter((_,j)=>j!==i))} className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"><X className="h-2.5 w-2.5 text-white"/></button></div>)}</div>}
                <div className="flex items-center gap-2">
                  {postPhotos.length<4&&<label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer px-3 py-2 rounded-lg hover:bg-muted transition-colors"><ImageIcon className="h-3.5 w-3.5"/>Photo<input type="file" accept="image/*" multiple className="hidden" onChange={handlePostPhotoChange}/></label>}
                  <div className="flex-1"/>
                  <button type="button" onClick={handleCreatePost} disabled={postSubmitting||(!postContent.trim()&&postPhotos.length===0)} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors disabled:opacity-40">
                    {postSubmitting?<span className="w-3.5 h-3.5 border-2 border-white/40 border-t-transparent rounded-full animate-spin"/>:<Send className="h-3.5 w-3.5"/>}Publier
                  </button>
                </div>
              </div>
            )}
            {postsLoading?(
              <div className="space-y-3">{[1,2].map((i)=><div key={i} className="h-24 rounded-xl bg-muted animate-pulse"/>)}</div>
            ) : posts.length===0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 flex flex-col items-center gap-3 text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40"/>
                <p className="text-sm text-muted-foreground">{isManager?'Aucune publication. Créez la première !':'Aucune actualité pour le moment.'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post)=>{
                  const imgs=Array.isArray(post.photos)?post.photos:[];
                  const postDate=new Date(post.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
                  return(
                    <div key={post.id} className="rounded-xl border border-border bg-card overflow-hidden">
                      {imgs.length>0&&<div className={cn('grid gap-0.5',imgs.length===1?'grid-cols-1':'grid-cols-2')}>
                        {imgs.slice(0,4).map((url,i)=>(
                          <div key={url} className={cn('overflow-hidden bg-muted relative',imgs.length===1?'aspect-video':'aspect-square',imgs.length===3&&i===0?'col-span-2 aspect-video':'')}>
                            <img src={url} alt="" className="h-full w-full object-cover"/>
                            {i===3&&imgs.length>4&&<div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-lg font-bold">+{imgs.length-4}</span></div>}
                          </div>
                        ))}
                      </div>}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {club.logo_url?<img src={club.logo_url} alt="" className="h-full w-full rounded-full object-cover"/>:<Building2 className="h-3.5 w-3.5 text-primary"/>}
                          </div>
                          <div><p className="text-xs font-semibold text-foreground">{club.name}</p><p className="text-[11px] text-muted-foreground">{postDate}</p></div>
                        </div>
                        {post.content&&<p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{post.content}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── AVIS tab ────────────────────────────────────────────────────────── */}
        {activeTab === 'reviews' && (
          <div className="space-y-5">
            {/* Summary */}
            {reviewsCount > 0 && (
              <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
                <div className="text-center shrink-0">
                  <p className="text-4xl font-black text-foreground">{reviewsAvg}</p>
                  <Stars value={reviewsAvg} size="h-4 w-4" />
                  <p className="text-xs text-muted-foreground mt-1">{reviewsCount} avis</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5,4,3,2,1].map((n)=>{
                    const cnt=reviews.filter((r)=>r.rating===n).length;
                    const pct=reviewsCount>0?Math.round(cnt/reviewsCount*100):0;
                    return(
                      <div key={n} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-muted-foreground font-medium">{n}</span>
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0"/>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{width:`${pct}%`}}/>
                        </div>
                        <span className="w-5 text-muted-foreground text-right">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Write review CTA */}
            {user && !isManager && !reviewDone && (
              <button type="button" onClick={()=>setShowReviewsModal(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted/40 px-4 py-3 text-sm font-medium text-foreground transition-colors">
                <Star className="h-4 w-4 text-amber-400"/>
                Laisser un avis
              </button>
            )}
            {reviewDone && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0"/>Merci pour votre avis !
              </div>
            )}

            {/* Reviews list */}
            {reviewsLoading ? (
              <div className="space-y-3">{[1,2,3].map((i)=><div key={i} className="h-20 rounded-xl bg-muted animate-pulse"/>)}</div>
            ) : reviews.length===0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
                <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2"/>
                <p className="text-sm text-muted-foreground">Aucun avis pour l'instant. Soyez le premier !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r)=>{
                  const rName=[r.reviewer_first_name,r.reviewer_last_name].filter(Boolean).join(' ')||'Joueur';
                  const dateStr=new Date(r.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
                  return(
                    <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {r.reviewer_photo_url?<img src={r.reviewer_photo_url} alt={rName} className="h-full w-full object-cover"/>:<span className="text-xs font-bold text-primary">{rName.slice(0,2).toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{rName}</p>
                          <div className="flex items-center gap-2 mt-0.5"><Stars value={r.rating}/><span className="text-[11px] text-muted-foreground">{dateStr}</span></div>
                        </div>
                      </div>
                      {r.comment&&<p className="text-sm text-foreground/80 leading-relaxed">{r.comment}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals & panels ───────────────────────────────────────────────── */}
      {showReviewsModal && (
        <ReviewsModal
          clubId={id} reviews={reviews} average={reviewsAvg} count={reviewsCount}
          user={user} isManager={isManager} reviewDone={reviewDone}
          onClose={()=>setShowReviewsModal(false)} onReviewSubmit={handleSubmitReview}
        />
      )}

      {booking && !isAdmin && !isSuspended && (
        <BookingModal
          slot={booking.slot} venueName={booking.venueName}
          onClose={()=>setBooking(null)}
          onBooked={(b)=>{
            setMyBooking(b); setBooking(null); setBooked(true);
            setSlotsLoading(true);
            getClubSlots(id,selectedDate).then((d)=>setSlotsData(d)).catch(()=>{}).finally(()=>setSlotsLoading(false));
            window.scrollTo({top:0,behavior:'smooth'});
          }}
        />
      )}

      {shareSlot && (
        <ShareContactPicker
          shareType="slot_share"
          metadata={{ club_id:club.id,club_name:club.name,venue_name:shareSlot.venueName,date:selectedDate,start_time:shareSlot.slot.start_time?.slice(0,5),end_time:shareSlot.slot.end_time?.slice(0,5),price:shareSlot.slot.price,slot_id:shareSlot.slot.id }}
          onClose={()=>setShareSlot(null)}
        />
      )}

      {showSubsPanel && (
        <SubscribersPanel
          clubId={id}
          subscribersCount={subsCount}
          user={user}
          subscribed={subscribed}
          subLoading={subLoading}
          onToggle={handleToggleSubscription}
          onClose={()=>setShowSubsPanel(false)}
        />
      )}

      <HamburgerPanel
        open={showMenuPanel}
        user={user}
        navigate={navigate}
        onClose={()=>setShowMenuPanel(false)}
      />
    </div>
  );
}
