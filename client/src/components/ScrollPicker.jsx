import { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

const ITEM_H  = 44;          // px — height of each row
const VISIBLE = 5;           // rows visible (must be odd)
const PAD     = Math.floor(VISIBLE / 2) * ITEM_H;  // top + bottom padding (88px)

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
  const ref = useRef(null);

  const idxOf = (v) => {
    const i = items.findIndex((it) => (it?.value ?? it) === v);
    return i >= 0 ? i : 0;
  };

  const [centerIdx, setCenterIdx] = useState(() => idxOf(value));

  // External value change → smooth-scroll to that item
  useEffect(() => {
    const idx = idxOf(value);
    setCenterIdx(idx);
    const el = ref.current;
    if (!el) return;
    const target = idx * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 2) {
      el.scrollTo({ top: target, behavior: 'smooth' });
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial scroll on mount (no animation — instant)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = idxOf(value) * ITEM_H;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const idx     = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (clamped !== centerIdx) {
      setCenterIdx(clamped);
      const item   = items[clamped];
      const newVal = item?.value ?? item;
      if (newVal !== value) onChange(newVal);
    }
  }, [items, value, onChange, centerIdx]);

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
          scrollSnapType:            'y mandatory',
          scrollbarWidth:            'none',
          WebkitOverflowScrolling:   'touch',
          paddingTop:                PAD,
          paddingBottom:             PAD,
        }}
      >
        {items.map((item, i) => {
          const val   = item?.value ?? item;
          const label = item?.label ?? item;
          const dist  = Math.abs(i - centerIdx);
          return (
            <li
              key={String(val)}
              onClick={() => ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })}
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
