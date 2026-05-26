import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function NetworkStatus() {
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-16 z-30 w-full bg-amber-500 text-white text-xs font-medium px-4 py-2 flex items-center justify-center gap-2 shadow-sm">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      Pas de connexion internet 📡 — Certaines fonctionnalités sont indisponibles
    </div>
  );
}
