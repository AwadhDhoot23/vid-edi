import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '../lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center p-2 rounded-lg border transition-all duration-150',
        'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]',
        'text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-xs focus:outline-hidden',
        className
      )}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
      ) : (
        <Sun className="w-4 h-4 text-[var(--accent-warning)]" />
      )}
    </button>
  );
}
