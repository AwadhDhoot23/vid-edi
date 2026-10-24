import { createPortal } from 'react-dom';
import { X, TrendingDown, Clock, Scissors, CheckCircle, BarChart3, Sparkles } from 'lucide-react';
import { Button, Badge, formatSecondsToTimecode } from '@vid-edi/ui';
import { useTimelineStore } from '@vid-edi/editor-engine';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsModal({ isOpen, onClose }: AnalyticsModalProps) {
  const { activeSource, timeline, history } = useTimelineStore();

  if (!isOpen) return null;

  const originalDuration = activeSource?.duration ?? timeline.duration;
  const currentDuration = timeline.duration;
  const timeSavedSec = Math.max(0, originalDuration - currentDuration);
  const timeSavedPct =
    originalDuration > 0 ? ((timeSavedSec / originalDuration) * 100).toFixed(1) : '0';

  const videoTrack = timeline.tracks.find((t) => t.id === 'track_video_main');
  const clipCount = videoTrack?.clips.length ?? 1;
  const cutsCount = Math.max(0, clipCount - 1);

  const appliedCount = history.filter((h) => h.status === 'accepted').length;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-spring-in">
      <div className="w-full max-w-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto relative">
        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Project Edit Analytics & Impact
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                Measured efficiency and dead-air reduction
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          {/* Key Metric Hero Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wide">Time Saved</span>
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
              <span className="text-xl font-bold font-mono text-[var(--text-primary)]">
                -{timeSavedSec.toFixed(1)}s
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                {timeSavedPct}% dead air pruned
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col">
              <div className="flex items-center justify-between text-[var(--accent-coral)] mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wide">Timeline Cuts</span>
                <Scissors className="w-3.5 h-3.5" />
              </div>
              <span className="text-xl font-bold font-mono text-[var(--text-primary)]">
                {cutsCount}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {clipCount} clean segments
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col">
              <div className="flex items-center justify-between text-[var(--accent-primary)] mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wide">AI Accepted</span>
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xl font-bold font-mono text-[var(--text-primary)]">
                {appliedCount}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Approved operations
              </span>
            </div>
          </div>

          {/* Comparative Duration Visual Bar */}
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3">
            <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              Footage Compression Comparison
            </span>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-secondary)]">Raw Source Media</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {formatSecondsToTimecode(originalDuration)}
                </span>
              </div>
              <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-neutral-400 dark:bg-neutral-600 rounded-full w-full" />
              </div>

              <div className="flex items-center justify-between text-xs font-mono mt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Rendered Final Timeline
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatSecondsToTimecode(currentDuration)}
                </span>
              </div>
              <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(10, (currentDuration / (originalDuration || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Retention & Speech Density Score */}
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                  Content Retention Density
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  High-engagement speaking ratio without dead air pauses.
                </p>
              </div>
            </div>
            <Badge variant="teal" className="text-xs px-2.5 py-1 font-mono">
              {(100 - Number(timeSavedPct)).toFixed(1)}% Active
            </Badge>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
