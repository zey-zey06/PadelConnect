import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function useSwipeBack({ enabled = true } = {}) {
  const navigate = useNavigate();
  const touchStart = useRef(null);
  const indicatorRef = useRef(null);

  useEffect(() => {
    function show(progress) {
      const el = indicatorRef.current;
      if (!el) return;
      el.style.opacity = String(Math.min(progress, 0.9));
      el.style.transform = `translateY(-50%) translateX(${Math.min(progress * 48, 44) - 4}px)`;
    }

    function hide() {
      const el = indicatorRef.current;
      if (!el) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(-50%) translateX(-4px)';
    }

    function reset() {
      touchStart.current = null;
      hide();
    }

    if (!enabled) { hide(); return; }

    function onTouchStart(e) {
      const touch = e.touches[0];
      if (touch.clientX > 30) return;
      touchStart.current = { x: touch.clientX, y: touch.clientY };
      show(0.2);
    }

    function onTouchMove(e) {
      if (!touchStart.current) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = Math.abs(touch.clientY - touchStart.current.y);

      if (deltaX < 0) { reset(); return; }
      // Cancel if swipe becomes more vertical than horizontal (after initial 15px)
      if (deltaX > 15 && deltaY > deltaX) { reset(); return; }

      show(deltaX / 80);
    }

    function onTouchEnd(e) {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = Math.abs(touch.clientY - touchStart.current.y);

      reset();

      if (deltaX >= 80 && deltaX >= deltaY * 2) {
        navigate(-1);
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', reset, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', reset);
    };
  }, [enabled, navigate]);

  return { indicatorRef };
}
