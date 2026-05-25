import { Sparkles, X } from 'lucide-react';

/**
 * Floating action button that opens/closes the PIA chat panel.
 * Fixed at bottom-right, hidden when the panel is being shown.
 */
export default function PIAButton({ onClick, isOpen }) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? 'Fermer PIA' : 'Ouvrir PIA'}
      className={`fixed bottom-6 right-6 z-50 hidden md:flex items-center gap-2 px-4 py-3 rounded-full shadow-lg
        hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200
        text-white font-semibold text-sm select-none
        ${isOpen
          ? 'bg-foreground/70'
          : 'bg-gradient-to-r from-violet-600 to-primary'
        }`}
    >
      {isOpen
        ? <X className="h-4 w-4" />
        : <Sparkles className="h-4 w-4" />
      }
      <span>PIA</span>
    </button>
  );
}
