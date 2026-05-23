import { useMemo, useEffect } from 'react';
import ScrollPicker from './ScrollPicker';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Parse "HH:MM" → { hour, minute }. Falls back to 09:00. */
function parseVal(val) {
  if (val && /^\d{2}:\d{2}$/.test(val)) {
    const [h, m] = val.split(':').map(Number);
    return { hour: h, minute: m };
  }
  return { hour: 9, minute: 0 };
}

/** All 30-min slots from 07:00 to 22:30. */
const ALL_TIMES = (() => {
  const times = [];
  for (let h = 7; h <= 22; h++) {
    for (const m of [0, 30]) {
      times.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  return times;
})();

/**
 * TimeScrollPicker — two scroll wheels: Heure | Min.
 *
 * Props:
 *   value    — "HH:MM" string (or '')
 *   minTime  — optional "HH:MM"; only times strictly after this are shown
 *   onChange — (newTimeString: "HH:MM") => void
 */
export default function TimeScrollPicker({ value, minTime = '', onChange }) {
  const { hour, minute } = parseVal(value);

  // Unique hours that still have at least one valid minute after minTime
  const hourItems = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const t of ALL_TIMES) {
      if (minTime && t <= minTime) continue;
      const h = Number(t.slice(0, 2));
      if (!seen.has(h)) {
        seen.add(h);
        result.push({ value: h, label: pad2(h) });
      }
    }
    return result;
  }, [minTime]);

  // Valid minutes for the currently selected hour
  const minuteItems = useMemo(() => {
    const result = [];
    for (const m of [0, 30]) {
      const t = `${pad2(hour)}:${pad2(m)}`;
      if (!minTime || t > minTime) {
        result.push({ value: m, label: pad2(m) });
      }
    }
    return result;
  }, [hour, minTime]);

  // If current value is below/equal to minTime, jump to first valid time
  useEffect(() => {
    if (!minTime || !value) return;
    if (value > minTime) return;
    if (hourItems.length === 0) return;
    const firstHour = hourItems[0].value;
    const validMins = [0, 30].filter((m) => `${pad2(firstHour)}:${pad2(m)}` > minTime);
    const firstMin  = validMins[0] ?? 0;
    onChange(`${pad2(firstHour)}:${pad2(firstMin)}`);
  }, [minTime]); // eslint-disable-line react-hooks/exhaustive-deps

  function onHourChange(h) {
    // Keep current minute if still valid; otherwise take first valid minute
    const valid = [0, 30].filter((m) => !minTime || `${pad2(h)}:${pad2(m)}` > minTime);
    const newMin = valid.includes(minute) ? minute : (valid[0] ?? 0);
    onChange(`${pad2(h)}:${pad2(newMin)}`);
  }

  function onMinuteChange(m) {
    onChange(`${pad2(hour)}:${pad2(m)}`);
  }

  // Effective hour in case hourItems shifted away from current value
  const effectiveHour = hourItems.some((it) => it.value === hour)
    ? hour
    : (hourItems[0]?.value ?? hour);

  return (
    <div className="flex rounded-xl border border-border bg-muted/30 overflow-hidden">
      {/* Hour */}
      <div className="flex-1 flex flex-col">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center pt-1.5 pb-0.5">
          Heure
        </p>
        <ScrollPicker
          items={hourItems}
          value={effectiveHour}
          onChange={onHourChange}
        />
      </div>

      <div className="w-px bg-border/50" />

      {/* Minute */}
      <div className="flex-1 flex flex-col">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center pt-1.5 pb-0.5">
          Min
        </p>
        <ScrollPicker
          items={minuteItems}
          value={minute}
          onChange={onMinuteChange}
        />
      </div>
    </div>
  );
}
