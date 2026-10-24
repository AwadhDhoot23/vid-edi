import { useState, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Film,
  FileCode,
  Smartphone,
  Monitor,
  Square,
  Clock,
} from 'lucide-react';
import { Button, formatSecondsToTimecode } from '@vid-edi/ui';
import { useTimelineStore } from '@vid-edi/editor-engine';
import {
  compileTimelineToFFmpeg,
  generateEditPlanJson,
  STANDARD_EXPORT_PRESETS,
  generateSrt,
  generateVtt,
  wordsToSegments,
  downloadTextBlob,
} from '@vid-edi/media-processing';
import type { ExportPreset } from '@vid-edi/shared-types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { timeline, activeSource, transcriptWords } = useTimelineStore();
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>(STANDARD_EXPORT_PRESETS[0]!);
  const [copied, setCopied] = useState(false);

  const compilation = useMemo(() => {
    const filename = activeSource ? activeSource.name : 'input.mp4';
    return compileTimelineToFFmpeg(timeline, filename, selectedPreset);
  }, [timeline, activeSource, selectedPreset]);

  const originalDuration = activeSource?.duration || timeline.duration;
  const timeSaved = Math.max(0, originalDuration - timeline.duration);

  if (!isOpen) return null;

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(compilation.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleDownloadEditPlan = () => {
    const jsonStr = generateEditPlanJson({
      timeline,
      source: activeSource,
    });
    const filename = `${activeSource?.name.replace(/\.[^/.]+$/, '') || 'videdi'}_edit_plan.json`;
    downloadTextBlob(jsonStr, filename, 'application/json;charset=utf-8');
  };

  const handleExportSubtitles = (format: 'srt' | 'vtt') => {
    if (!transcriptWords || transcriptWords.length === 0) return;
    const segments = wordsToSegments(transcriptWords, 6);
    const filename = `${activeSource?.name.replace(/\.[^/.]+$/, '') || 'subtitles'}.${format}`;
    if (format === 'srt') {
      downloadTextBlob(generateSrt(segments), filename, 'text/plain;charset=utf-8');
    } else {
      downloadTextBlob(generateVtt(segments), filename, 'text/vtt;charset=utf-8');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Export Project & Render Plan</h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                Native FFmpeg command generation & reproducible project JSON
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Duration Summary */}
          <div className="grid grid-cols-3 gap-2.5 bg-[var(--bg-elevated)]/60 p-3 rounded-xl border border-[var(--border-subtle)] text-xs">
            <div>
              <span className="text-[var(--text-tertiary)] text-[11px] block">Original Source</span>
              <span className="font-mono font-semibold text-[var(--text-primary)] mt-0.5 block">
                {formatSecondsToTimecode(originalDuration)}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)] text-[11px] block">Rendered Cut</span>
              <span className="font-mono font-semibold text-[var(--accent-primary)] mt-0.5 block">
                {formatSecondsToTimecode(timeline.duration)}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)] text-[11px] block">Duration Saved</span>
              <span className="font-mono font-semibold text-emerald-500 mt-0.5 block">
                -{timeSaved.toFixed(1)}s ({timeSaved > 0 ? Math.round((timeSaved / originalDuration) * 100) : 0}%)
              </span>
            </div>
          </div>

          {/* Aspect Ratio Preset Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Export Preset & Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {STANDARD_EXPORT_PRESETS.map((preset) => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-xs'
                        : 'border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {preset.aspectRatio === '16:9' ? (
                        <Monitor className="w-4 h-4 text-[var(--accent-primary)]" />
                      ) : preset.aspectRatio === '9:16' ? (
                        <Smartphone className="w-4 h-4 text-[var(--accent-coral)]" />
                      ) : (
                        <Square className="w-4 h-4 text-purple-400" />
                      )}
                      <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                        {preset.aspectRatio}
                      </span>
                    </div>
                    <span className="text-xs font-semibold mt-1 truncate">{preset.name}</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {preset.resolution.width}x{preset.resolution.height}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Native FFmpeg Command Box */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Deterministic Native FFmpeg Command</span>
              </label>

              <button
                type="button"
                onClick={handleCopyCommand}
                className="text-xs font-medium flex items-center gap-1 text-[var(--accent-primary)] hover:underline cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="text-[11px] font-mono p-3 bg-black/80 text-emerald-300 rounded-xl border border-white/10 overflow-x-auto max-h-32 select-all whitespace-pre-wrap break-all leading-relaxed">
                {compilation.command}
              </pre>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              This command concatenates your exact timeline clips and applies aspect ratio cropping in native FFmpeg with zero audio drift.
            </p>
          </div>

          {/* Quick Subtitle Downloads */}
          <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)]/40 rounded-xl border border-[var(--border-subtle)] text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
              <span>Subtitles synced to cuts:</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExportSubtitles('srt')}
                className="h-7 text-xs"
              >
                Download .SRT
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExportSubtitles('vtt')}
                className="h-7 text-xs"
              >
                Download .VTT
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadEditPlan}
            className="text-xs h-8 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Edit Plan (.json)</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs h-8"
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyCommand}
              className="text-xs h-8 gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Render Command</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
