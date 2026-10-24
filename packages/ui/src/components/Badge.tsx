import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'teal' | 'coral' | 'warning' | 'danger' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium tracking-wide transition-colors',
        {
          'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]':
            variant === 'default',
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20':
            variant === 'teal',
          'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20':
            variant === 'coral',
          'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20':
            variant === 'warning',
          'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20':
            variant === 'danger',
          'border border-[var(--border-strong)] text-[var(--text-primary)]':
            variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}
