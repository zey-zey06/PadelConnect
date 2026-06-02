import { useState, useEffect } from 'react';

function getInitialDark() {
  try {
    const stored = localStorage.getItem('padelconnect_dark_mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function useDarkMode() {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('padelconnect_dark_mode', dark ? 'true' : 'false');
    } catch { /* non-fatal */ }
  }, [dark]);

  const toggle = () => setDark((d) => !d);

  return { dark, toggle };
}
