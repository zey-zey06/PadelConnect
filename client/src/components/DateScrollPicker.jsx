import { useMemo } from 'react';
import ScrollPicker from './ScrollPicker';

const MONTHS_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Days in a given month (1-12). */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** Parse "YYYY-MM-DD" → { year, month, day }. Falls back to today. */
function parseVal(val) {
  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-').map(Number);
    return { year: y, month: m, day: d };
  }
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() };
}

/**
 * DateScrollPicker — three scroll wheels: Jour | Mois | Année.
 *
 * Props:
 *   value    — "YYYY-MM-DD" string (or '' for today)
 *   onChange — (newDateString: "YYYY-MM-DD") => void
 */
export default function DateScrollPicker({ value, onChange }) {
  const currentYear = new Date().getFullYear();
  const { year, month, day } = parseVal(value);

  // Days list rebuilds when month/year changes (handles Feb 28/29 etc.)
  const dayItems = useMemo(() => {
    const max = daysInMonth(year, month);
    return Array.from({ length: max }, (_, i) => ({
      value: i + 1,
      label: pad2(i + 1),
    }));
  }, [year, month]);

  const monthItems = useMemo(
    () => MONTHS_FR.map((lbl, i) => ({ value: i + 1, label: lbl })),
    [],
  );

  const yearItems = useMemo(
    () => [currentYear, currentYear + 1].map((y) => ({ value: y, label: String(y) })),
    [currentYear],
  );

  /** Emit a new date, auto-clamping the day if it exceeds the month's max. */
  function emit(y, m, d) {
    const safeDay = Math.min(d, daysInMonth(y, m));
    onChange(`${y}-${pad2(m)}-${pad2(safeDay)}`);
  }

  return (
    <div className="flex rounded-xl border border-border bg-muted/30 overflow-hidden">
      {/* Day */}
      <div className="flex-1 flex flex-col">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center pt-1.5 pb-0.5">
          Jour
        </p>
        <ScrollPicker
          items={dayItems}
          value={day}
          onChange={(d) => emit(year, month, d)}
        />
      </div>

      <div className="w-px bg-border/50" />

      {/* Month */}
      <div className="flex-1 flex flex-col">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center pt-1.5 pb-0.5">
          Mois
        </p>
        <ScrollPicker
          items={monthItems}
          value={month}
          onChange={(m) => emit(year, m, day)}
        />
      </div>

      <div className="w-px bg-border/50" />

      {/* Year */}
      <div className="flex-1 flex flex-col">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center pt-1.5 pb-0.5">
          Année
        </p>
        <ScrollPicker
          items={yearItems}
          value={year}
          onChange={(y) => emit(y, month, day)}
        />
      </div>
    </div>
  );
}
