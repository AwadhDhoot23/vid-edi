import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  PlayCircle,
  HelpCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button, formatSecondsToTimecode, Badge } from '@vid-edi/ui';
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
import { renderTimelineInBrowser, type RenderProgress } from '../utils/browser-renderer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { timeline, activeSource, transcriptWords } = useTimelineStore();
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>(STANDARD_EXPORT_PRESETS[0]!);
  const [copied, setCopied] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [renderSuccess, setRenderSuccess] = useState(false);

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

  // Direct In-Browser Video Render & Download
  const handleRenderVideoInBrowser = async () => {
    if (!activeSource?.path) {
      alert('No media source URL available to render.');
      return;
    }

    try {
      setIsRendering(true);
      setRenderSuccess(false);

      const blob = await renderTimelineInBrowser(
        activeSource.path,
        timeline,
        selectedPreset,
        (progress) => {
          setRenderProgress(progress);
        }
      );

      // Trigger browser download of final edited video
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const baseName = activeSource.name.replace(/\.[^/.]+$/, '') || 'videdi';
      a.download = `${baseName}_cut_${selectedPreset.aspectRatio.replace(':', 'x')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setRenderSuccess(true);
      setTimeout(() => setRenderSuccess(false), 4000);
    } catch (err) {
      console.error('In-browser render failed', err);
      alert(`Render failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRendering(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] overflow-y-auto p-3 sm:p-6 flex justify-center items-center animate-spring-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--text-primary)] my-auto relative">
        {/* Modal Header (Fixed at top, never cut off) */}
        <div className="shrink-0 p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight">Export Project & Render Video</h2>
                <Badge variant="teal" className="text-[10px]">
                  Dual Engine
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                Direct in-browser download & lossless native FFmpeg pipeline
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

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Duration Comparison Cards */}
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
          <div className="flex flex-col gap-1.5">
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
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-xs ring-1 ring-[var(--accent-primary)]'
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
                    <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                      {preset.resolution.width}x{preset.resolution.height}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 1: Direct In-Browser Video Render & Download (NEW!) */}
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  1-Click In-Browser Video Download
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                  Direct .webm / .mp4
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Renders your trimmed clips, extracted dead air, and chosen aspect ratio directly in your browser tab. No command line required!
            </p>

            {/* Active Render Progress Bar */}
            {isRendering && renderProgress && (
              <div className="flex flex-col gap-1.5 p-2.5 bg-black/40 rounded-lg border border-emerald-500/20">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Rendering timeline: {renderProgress.percent}%
                  </span>
                  <span className="text-[var(--text-tertiary)]">
                    {formatSecondsToTimecode(renderProgress.currentSec)} / {formatSecondsToTimecode(renderProgress.totalSec)}
                  </span>
                </div>
                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-150"
                    style={{ width: `${renderProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {renderSuccess && (
              <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Video rendered & downloaded successfully! Check your browser downloads.</span>
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={handleRenderVideoInBrowser}
              disabled={isRendering || !activeSource}
              className="w-full text-xs h-9 font-semibold gap-2 shadow-xs cursor-pointer"
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rendering Video in Browser...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Edited Video ({selectedPreset.aspectRatio} • WebM/MP4)</span>
                </>
              )}
            </Button>
          </div>

          {/* SECTION 2: Native FFmpeg Command Box (For Lossless 4K Desktop Render) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
                <span>Lossless 4K Native FFmpeg Command</span>
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
              <pre className="text-[11px] font-mono p-3 bg-black/85 text-emerald-300 rounded-xl border border-white/10 overflow-x-auto max-h-24 select-all whitespace-pre-wrap break-all leading-relaxed">
                {compilation.command}
              </pre>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-[var(--accent-coral)] shrink-0 mt-0.5" />
              <span>
                <strong>Why FFmpeg CLI?</strong> Web browsers have strict RAM caps that crash on giant 4K files. This command lets you render unlimited 4K/60fps video on your machine with 10-bit lossless GPU acceleration!
              </span>
            </div>
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
                className="h-7 text-xs cursor-pointer"
              >
                Download .SRT
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExportSubtitles('vtt')}
                className="h-7 text-xs cursor-pointer"
              >
                Download .VTT
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Footer (Fixed at bottom) */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadEditPlan}
            className="text-xs h-8 gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Edit Plan (.json)</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs h-8 cursor-pointer"
            >
              Close
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyCommand}
              className="text-xs h-8 gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy FFmpeg Command</span>
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
