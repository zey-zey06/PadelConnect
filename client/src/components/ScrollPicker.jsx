import { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

const ITEM_H  = 44;
const VISIBLE = 5;
const PAD     = Math.floor(VISIBLE / 2) * ITEM_H;  // 88px

/**
 * ScrollPicker — reusable iOS-style scroll wheel.
 *
 * Props:
 *   items    — array of strings OR { value, label } objects
 *   value    — currently selected value (string or number)
 *   onChange — (newValue) => void
 *   className
 */
export default function ScrollPicker({ items, value, onChange, className }) {
  const ref              = useRef(null);
  const timerRef         = useRef(null);
  const isProgRef        = useRef(false);  // true during our own scrollTo
  const lastCommittedRef = useRef(null);   // idx we last committed via onChange

  const idxOf = (v) => {
    const i = items.findIndex((it) => (it?.value ?? it) === v);
    return i >= 0 ? i : 0;
  };

  const [centerIdx, setCenterIdx] = useState(() => idxOf(value));

  // Scroll to an index. smooth=false → instant (no scrollend will fire).
  const scrollToIdx = useCallback((idx, smooth) => {
    const el = ref.current;
    if (!el) return;
    const target = idx * ITEM_H;
    if (smooth) {
      if (Math.abs(el.scrollTop - target) < 1) return; // already there
      isProgRef.current = true;
      el.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      el.scrollTop = target;
    }
  }, []);

  // Initial position — instant, no animation
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = idxOf(value) * ITEM_H;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // External value change → scroll only if WE didn't cause it
  useEffect(() => {
    const idx = idxOf(value);
    setCenterIdx(idx);
    if (lastCommittedRef.current === idx) {
      lastCommittedRef.current = null;
      return;
    }
    const el = ref.current;
    if (!el) return;
    if (Math.abs(el.scrollTop - idx * ITEM_H) > 2) {
      scrollToIdx(idx, true);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Snap to nearest item and emit value — called after scroll settles
  const commit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const raw     = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, raw));
    setCenterIdx(clamped);
    scrollToIdx(clamped, true);  // snap to exact grid position
    const item   = items[clamped];
    const newVal = item?.value ?? item;
    if (newVal !== value) {
      lastCommittedRef.current = clamped;
      onChange(newVal);
    }
  }, [items, value, onChange, scrollToIdx]);

  // scrollend listener — fires after browser finishes scrolling
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScrollEnd = () => {
      if (isProgRef.current) {
        // our own scrollTo ended — clear flag, don't commit again
        isProgRef.current = false;
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      commit();
    };
    el.addEventListener('scrollend', onScrollEnd);
    return () => el.removeEventListener('scrollend', onScrollEnd);
  }, [commit]);

  // onScroll — only updates visual highlight; defers commit via 150ms fallback
  const handleScroll = useCallback(() => {
    if (isProgRef.current) return;
    const el = ref.current;
    if (!el) return;
    const raw     = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, raw));
    if (clamped !== centerIdx) setCenterIdx(clamped);
    // fallback for browsers that don't support scrollend
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(commit, 150);
  }, [items.length, centerIdx, commit]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div
      className={cn('relative select-none overflow-hidden', className)}
      style={{ height: VISIBLE * ITEM_H }}
    >
      {/* Centre selection highlight */}
      <div
        className="absolute inset-x-0 pointer-events-none z-10 bg-primary/[0.07] border-y border-primary/20"
        style={{ top: PAD, height: ITEM_H }}
      />

      {/* Top fade overlay */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-20"
        style={{
          height:     PAD,
          background: 'linear-gradient(to bottom, hsl(var(--card)) 15%, transparent 100%)',
        }}
      />

      {/* Bottom fade overlay */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
        style={{
          height:     PAD,
          background: 'linear-gradient(to top, hsl(var(--card)) 15%, transparent 100%)',
        }}
      />

      {/* Scrollable list */}
      <ul
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType:          'y mandatory',
          scrollbarWidth:          'none',
          WebkitOverflowScrolling: 'touch',
          paddingTop:              PAD,
          paddingBottom:           PAD,
          overscrollBehavior:      'contain',
        }}
      >
        {items.map((item, i) => {
          const val   = item?.value ?? item;
          const label = item?.label ?? item;
          const dist  = Math.abs(i - centerIdx);
          return (
            <li
              key={String(val)}
              onClick={() => {
                if (timerRef.current) clearTimeout(timerRef.current);
                const newVal = item?.value ?? item;
                setCenterIdx(i);
                scrollToIdx(i, true);
                if (newVal !== value) {
                  lastCommittedRef.current = i;
                  onChange(newVal);
                }
              }}
              className="flex items-center justify-center cursor-pointer"
              style={{
                scrollSnapAlign: 'center',
                height:          ITEM_H,
                opacity:         dist === 0 ? 1 : dist === 1 ? 0.4 : 0.18,
                fontWeight:      dist === 0 ? 600 : 400,
                fontSize:        dist === 0 ? '15px' : '13px',
                transition:      'opacity 120ms, font-size 120ms',
              }}
            >
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
