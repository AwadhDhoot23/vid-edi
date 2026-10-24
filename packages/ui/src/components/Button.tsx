import React from 'react';
import { cn } from '../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'coral';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-md transition-all duration-120 cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]',
          {
            // Primary Teal
            'bg-[var(--accent-primary)] text-white hover:opacity-90 shadow-xs':
              variant === 'primary',
            // Coral (AI actions)
            'bg-[var(--accent-coral)] text-white hover:opacity-90 shadow-xs':
              variant === 'coral',
            // Secondary Neutral
            'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]':
              variant === 'secondary',
            // Outline
            'border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface)]':
              variant === 'outline',
            // Danger Red
            'bg-[var(--accent-danger)] text-white hover:opacity-90':
              variant === 'danger',
            // Ghost
            'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]':
              variant === 'ghost',
          },
          {
            'text-xs px-2.5 py-1.5 h-8 gap-1.5': size === 'sm',
            'text-sm px-3.5 py-2 h-9 gap-2': size === 'md',
            'text-base px-5 py-2.5 h-11 gap-2.5': size === 'lg',
            'h-9 w-9 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
