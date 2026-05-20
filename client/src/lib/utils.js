import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes safely — handles conditional classes and deduplication.
 * Used by all shadcn/ui components.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
