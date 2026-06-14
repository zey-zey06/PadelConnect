import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyBookings } from '@/api/bookings';
import { getMySessions } from '@/api/sessions';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  MapPin, Users, AlertCircle, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS_FR   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function buildGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7;
  const cells = [];
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ iso: d.toISOString().slice(0, 10), currentMonth: false });
  }
  for (let d = 1; d <= lastDate; d++) {
    cells.push({ iso: new Date(year, month, d).toISOString().slice(0, 10), currentMonth: true });
  }
  const tail = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= tail; i++) {
    cells.push({ iso: new Date(year, month + 1, i).toISOString().slice(0, 10), currentMonth: false });
  }
  return cells;
}

function fmtTime(t) { return t ? String(t).slice(0, 5).replace(':', 'h') : ''; }
function fmtDayHeader(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function BookingCard({ b }) {
  const clubName  = b.club_name ?? b.venue_name ?? 'Réservation';
  const venueName = b.venue_name ?? '';
  const timeStr   = b.start_time ? `${fmtTime(b.start_time)}–${fmtTime(b.end_time)}` : '';
  const price     = Number(b.total_price ?? b.price ?? 0);
  return (
    <div className="rounded-xl border-l-[3px] border-l-blue-500 border border-border bg-card px-4 py-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground truncate">{clubName}</p>
        <span className="shrink-0 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wide">Réservation</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {timeStr && <span className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />{timeStr}</span>}
        {venueName && venueName !== clubName && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{venueName}</span>}
        {price > 0 && <span className="font-medium text-foreground">{price.toLocaleString('fr-FR')} FCFA</span>}
      </div>
    </div>
  );
}

function SessionCard({ s }) {
  const timeStr = s.time ? `${fmtTime(s.time)}${s.end_time ? `–${fmtTime(s.end_time)}` : ''}` : '';
  const players  = `${s.current_players ?? 0}/${s.max_players ?? 4}`;
  return (
    <div className="rounded-xl border-l-[3px] border-l-primary border border-border bg-card px-4 py-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{timeStr ? `Session à ${timeStr}` : 'Session'}</p>
        <span className="shrink-0 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wide">Session</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="h-3 w-3 shrink-0" />{players} joueurs</span>
        {s.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{s.location}</span>}
      </div>
    </div>
  );
}

export default function CalendarView() {
  const today    = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  const [year,        setYear]        = useState(today.getFullYear());
  const [month,       setMonth]       = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(todayISO);
  const [eventMap,    setEventMap]    = useState({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getMyBookings().catch(() => ({ bookings: [] })),
      getMySessions().catch(() => ({ sessions: [] })),
    ]).then(([{ bookings = [] }, { sessions = [] }]) => {
      const map = {};
      function add(dateStr, event) {
        if (!dateStr || dateStr.length < 10) return;
        const key = dateStr.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(event);
      }
      for (const b of bookings) {
        add(String(b.session_date ?? b.slot_date ?? b.date ?? ''), { _type: 'booking', ...b });
      }
      for (const s of sessions) {
        add(String(s.date ?? ''), { _type: 'session', ...s });
      }
      setEventMap(map);
    }).catch((e) => setError(e.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const cells          = buildGrid(year, month);
  const selectedEvents = eventMap[selectedDay] ?? [];
  const totalBookings  = Object.values(eventMap).flat().filter((e) => e._type === 'booking').length;
  const totalSessions  = Object.values(eventMap).flat().filter((e) => e._type === 'session').length;

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        {loading
          ? 'Chargement…'
          : <>{totalBookings} réservation{totalBookings !== 1 ? 's' : ''} · {totalSessions} session{totalSessions !== 1 ? 's' : ''}</>}
      </p>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={prevMonth} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-foreground">{MONTHS_FR[month]} {year}</h2>
          <button onClick={nextMonth} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {DAYS_FR.map((d) => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map(({ iso, currentMonth }) => {
              const dayEvents  = eventMap[iso] ?? [];
              const hasBooking = dayEvents.some((e) => e._type === 'booking');
              const hasSession = dayEvents.some((e) => e._type === 'session');
              const isToday    = iso === todayISO;
              const isSelected = iso === selectedDay;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDay(iso)}
                  className={cn(
                    'relative flex flex-col items-center pb-2 pt-2 gap-1 transition-colors border-b border-border/40 outline-none focus-visible:ring-1 focus-visible:ring-primary',
                    !currentMonth && 'opacity-25',
                    isSelected && 'bg-primary',
                    !isSelected && isToday && 'bg-primary/8',
                    !isSelected && !isToday && 'hover:bg-muted/60',
                  )}
                >
                  <span className={cn(
                    'text-[13px] font-medium leading-none',
                    isSelected    ? 'text-white'
                    : isToday     ? 'text-primary font-bold'
                    : currentMonth ? 'text-foreground'
                    : 'text-muted-foreground',
                  )}>
                    {new Date(iso + 'T00:00:00').getDate()}
                  </span>
                  {(hasBooking || hasSession) && (
                    <div className="flex gap-0.5 h-1.5">
                      {hasBooking && <span className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-blue-200' : 'bg-blue-500')} />}
                      {hasSession && <span className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white/80' : 'bg-primary')} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />Réservation</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary shrink-0" />Session créée</div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground capitalize">{fmtDayHeader(selectedDay)}</h3>
        {selectedEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-2">
            <CalendarDays className="h-6 w-6 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">Aucun événement ce jour.</p>
            {selectedDay >= todayISO && (
              <Link to="/sessions" className="inline-block mt-1 text-xs font-medium text-primary hover:underline">
                Créer une session →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((event, i) =>
              event._type === 'booking'
                ? <BookingCard key={event.id ?? `b${i}`} b={event} />
                : <SessionCard key={event.id ?? `s${i}`} s={event} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
