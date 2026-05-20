import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:   'bg-primary/10 text-primary border border-primary/20',
        secondary: 'bg-muted text-muted-foreground border border-border',
        accent:    'bg-accent text-accent-foreground border border-accent-foreground/10',
        success:   'bg-green-50 text-green-700 border border-green-200',
        warning:   'bg-amber-50 text-amber-700 border border-amber-200',
        destructive: 'bg-red-50 text-red-700 border border-red-200',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
