import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      className={cn(
        'flex h-10 w-full appearance-none rounded-lg border border-input bg-card px-3 py-2 pr-8 text-sm text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors',
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  </div>
));
Select.displayName = 'Select';

export { Select };
