/**
 * useHaptic — lightweight wrapper around the Vibration API.
 * No-ops silently when the API isn't available (iOS Safari, desktop).
 *
 * Usage:
 *   const haptic = useHaptic();
 *   haptic.light();   // 50ms — tap feedback
 *   haptic.medium();  // 100ms — confirm / join
 *   haptic.success(); // 2 short — booking confirmed, etc.
 *   haptic.error();   // 3 short — validation error
 */
export function useHaptic() {
  function vibrate(pattern) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch { /* not supported */ }
    }
  }

  return {
    light:   () => vibrate(50),
    medium:  () => vibrate(100),
    success: () => vibrate([60, 40, 60]),
    error:   () => vibrate([80, 40, 80, 40, 80]),
  };
}
