import { useState } from 'react';
import {
  Download,
  Undo,
  Redo,
  Scissors,
  Film,
  ArrowLeft,
  BarChart3,
  TrendingDown,
} from 'lucide-react';
import { Button, ThemeToggle, Badge } from '@vid-edi/ui';
import { useTimelineStore } from '@vid-edi/editor-engine';
import { ExportModal } from './ExportModal';
import { AnalyticsModal } from './AnalyticsModal';

interface HeaderProps {
  onGoHome?: () => void;
}

export function Header({ onGoHome }: HeaderProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const { undo, redo, past, future, splitSelectedClip, selectedClipId, activeSource, timeline } =
    useTimelineStore();

  const originalDuration = activeSource?.duration ?? timeline.duration;
  const timeSavedSec = Math.max(0, originalDuration - timeline.duration);

  return (
    <header className="h-13 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        {onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs mr-1"
            title="Return to Home Cover Page"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>
        )}

        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-coral)]/15 border border-[var(--accent-coral)]/30 text-[var(--accent-coral)]">
          <Film className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
              Vid-Edi Studio
            </h1>
            <Badge variant="teal" className="text-[10px]">
              v0.1.0-alpha
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] truncate max-w-[200px]">
            {activeSource ? activeSource.name : 'Untitled Project'}
          </p>
        </div>
      </div>

      {/* Center Edit Controls */}
      <div className="flex items-center gap-1 bg-[var(--bg-base)] p-1 rounded-lg border border-[var(--border-subtle)]">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={past.length === 0}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Undo</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={future.length === 0}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Redo</span>
        </Button>
        <div className="h-4 w-px bg-[var(--border-subtle)] mx-1" />
        <Button
          variant="secondary"
          size="sm"
          onClick={splitSelectedClip}
          disabled={!selectedClipId}
          title="Split Selected Clip at Playhead (S)"
          className="text-[var(--text-primary)]"
        >
          <Scissors className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Split</span>
        </Button>
      </div>

      {/* Right Actions & Theme */}
      <div className="flex items-center gap-2">
        {timeSavedSec > 0.4 && (
          <button
            type="button"
            onClick={() => setIsAnalyticsOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            title="View Project Analytics & Impact"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>-{timeSavedSec.toFixed(1)}s pruned</span>
          </button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsAnalyticsOpen(true)}
          title="Project Analytics & Dead-Air Breakdown"
          className="cursor-pointer"
        >
          <BarChart3 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span className="hidden sm:inline">Analytics</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          disabled={!activeSource}
          onClick={() => setIsExportOpen(true)}
          title="Export Project & Render Plan"
          className="cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </Button>

        <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />
        <ThemeToggle />
      </div>

      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <AnalyticsModal isOpen={isAnalyticsOpen} onClose={() => setIsAnalyticsOpen(false)} />
    </header>
  );
}
