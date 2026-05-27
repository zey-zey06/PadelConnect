import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * usePullToRefresh — mobile pull-to-refresh gesture.
 *
 * Returns { refreshing } — true while the onRefresh callback is running.
 * Shows a visual indicator when the user pulls down past the threshold.
 *
 * Usage:
 *   const { refreshing } = usePullToRefresh(fetchData);
 *   {refreshing && <PullSpinner />}
 *
 * @param {() => Promise<any>} onRefresh — async function to call on pull
 * @param {{ threshold?: number }} options
 */
export default function usePullToRefresh(onRefresh, { threshold = 80 } = {}) {
  const [refreshing, setRefreshing] = useState(false);
  const startY      = useRef(null);
  const pulling     = useRef(false);
  const refreshingRef = useRef(false);

  // Keep refreshingRef in sync so touch handlers get the latest value
  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);

  const stableRefresh = useCallback(onRefresh, []); // eslint-disable-line

  useEffect(() => {
    function onTouchStart(e) {
      // Only trigger when page is at the top
      if (window.scrollY <= 0 && !refreshingRef.current) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    }

    function onTouchEnd(e) {
      if (!pulling.current || startY.current === null) return;
      const diff = e.changedTouches[0].clientY - startY.current;
      pulling.current = false;
      startY.current  = null;

      if (diff > threshold && !refreshingRef.current) {
        setRefreshing(true);
        Promise.resolve(stableRefresh()).finally(() => setRefreshing(false));
      }
    }

    function onTouchCancel() {
      pulling.current = false;
      startY.current  = null;
    }

    window.addEventListener('touchstart',  onTouchStart,  { passive: true });
    window.addEventListener('touchend',    onTouchEnd,    { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart',  onTouchStart);
      window.removeEventListener('touchend',    onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [stableRefresh, threshold]);

  return { refreshing };
}
