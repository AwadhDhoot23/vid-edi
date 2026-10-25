import { useState, useMemo, useRef, useEffect } from 'react';
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
  HelpCircle,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  StopCircle,
  RefreshCw,
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

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RenderState = 'idle' | 'preparing' | 'rendering' | 'completed' | 'failed' | 'aborted';

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { timeline, activeSource, transcriptWords } = useTimelineStore();
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>(STANDARD_EXPORT_PRESETS[0]!);
  const [copied, setCopied] = useState(false);

  // Native FFmpeg Render State
  const [renderState, setRenderState] = useState<RenderState>('idle');
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderCurrentTime, setRenderCurrentTime] = useState<number>(0);
  const [renderStage, setRenderStage] = useState<string>('');
  const [renderFps, setRenderFps] = useState<number>(0);
  const [renderSpeed, setRenderSpeed] = useState<string>('1.0x');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const compilation = useMemo(() => {
    const filename = activeSource ? activeSource.name : 'input.mp4';
    return compileTimelineToFFmpeg(timeline, filename, selectedPreset);
  }, [timeline, activeSource, selectedPreset]);

  const originalDuration = activeSource?.duration || timeline.duration;
  const timeSaved = Math.max(0, originalDuration - timeline.duration);

  // Cleanup EventSource when modal closes or unmounts
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

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

  // Start Full-Quality Server Render with Native FFmpeg
  const handleStartRender = async () => {
    if (!activeSource) {
      alert('Please load or import a video first.');
      return;
    }

    setRenderState('preparing');
    setRenderProgress(0);
    setRenderCurrentTime(0);
    setRenderStage('Submitting render plan to native FFmpeg engine...');
    setErrorMessage(null);
    setDownloadUrl(null);
    setFileSize(null);

    try {
      let localFilePath: string | undefined = undefined;

      // When media is an in-memory browser blob, stream it to server disk for native FFmpeg access
      if (activeSource.path.startsWith('blob:')) {
        setRenderStage('Streaming original media to native FFmpeg render worker...');
        const blobRes = await fetch(activeSource.path);
        const blob = await blobRes.blob();

        const uploadRes = await fetch('/api/render/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: blob,
        });

        if (!uploadRes.ok) {
          const errJson = (await uploadRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(errJson.error || `Upload failed with status ${uploadRes.status}`);
        }

        const uploadData = (await uploadRes.json()) as { localFilePath: string };
        localFilePath = uploadData.localFilePath;
      }

      const payload = {
        timeline,
        preset: selectedPreset,
        sourceUrl: activeSource.path,
        localFilePath,
      };

      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || `HTTP ${res.status} failed to start render`);
      }

      const { jobId } = (await res.json()) as { jobId: string };
      setCurrentJobId(jobId);
      setRenderState('rendering');
      setRenderStage('Initializing native FFmpeg filtergraph...');

      // Connect to Server-Sent Events stream for real-time progress
      const eventSource = new EventSource(`/api/render/${jobId}/progress`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.progress !== undefined) setRenderProgress(data.progress);
          if (data.currentTime !== undefined) setRenderCurrentTime(data.currentTime);
          if (data.stage) setRenderStage(data.stage);
          if (data.fps) setRenderFps(data.fps);
          if (data.speed) setRenderSpeed(data.speed);

          if (data.status === 'completed') {
            eventSource.close();
            eventSourceRef.current = null;
            setRenderState('completed');
            setRenderProgress(100);
            setDownloadUrl(data.downloadUrl || `/api/render/${jobId}/download`);
            setFileSize(data.fileSize || null);
            setRenderStage('Lossless video render completed successfully!');
          } else if (data.status === 'failed' || data.status === 'cancelled') {
            eventSource.close();
            eventSourceRef.current = null;
            setRenderState(data.status === 'cancelled' ? 'aborted' : 'failed');
            setErrorMessage(data.error || 'Rendering was stopped');
          }
        } catch (err) {
          console.error('Failed to parse SSE progress update', err);
        }
      };

      eventSource.onerror = () => {
        // Fallback to polling if SSE is interrupted
        eventSource.close();
        eventSourceRef.current = null;

        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/render/${jobId}/status`);
            if (!statusRes.ok) return;
            const statusData = await statusRes.json();
            if (statusData.progress !== undefined) setRenderProgress(statusData.progress);
            if (statusData.currentTime !== undefined) setRenderCurrentTime(statusData.currentTime);
            if (statusData.stage) setRenderStage(statusData.stage);
            if (statusData.fps) setRenderFps(statusData.fps);
            if (statusData.speed) setRenderSpeed(statusData.speed);

            if (statusData.status === 'completed') {
              clearInterval(pollInterval);
              setRenderState('completed');
              setRenderProgress(100);
              setDownloadUrl(statusData.downloadUrl || `/api/render/${jobId}/download`);
              setFileSize(statusData.fileSize || null);
              setRenderStage('Lossless video render completed successfully!');
            } else if (statusData.status === 'failed' || statusData.status === 'cancelled') {
              clearInterval(pollInterval);
              setRenderState(statusData.status === 'cancelled' ? 'aborted' : 'failed');
              setErrorMessage(statusData.error || 'Rendering failed');
            }
          } catch {
            // ignore network glitch
          }
        }, 1000);
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRenderState('failed');
      setErrorMessage(msg);
      setRenderStage(`Render error: ${msg}`);
    }
  };

  const handleCancelRender = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (currentJobId) {
      try {
        await fetch(`/api/render/${currentJobId}/cancel`, { method: 'POST' });
      } catch {
        // ignore
      }
    }
    setRenderState('aborted');
    setRenderStage('Render cancelled by user.');
  };

  const handleDownloadRenderedVideo = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    const ext = selectedPreset.aspectRatio.replace(':', 'x');
    a.download = `videdi_lossless_${ext}_${Math.round(timeline.duration)}s.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] overflow-y-auto p-3 sm:p-6 flex justify-center items-center animate-spring-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--text-primary)] my-auto relative">
        {/* Modal Header */}
        <div className="shrink-0 p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight">Export & Native FFmpeg Render</h2>
                <Badge variant="teal" className="text-[10px]">
                  Full Quality
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                One-click native FFmpeg render with real-time progress and direct MP4 download
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
                    onClick={() => {
                      if (renderState === 'idle' || renderState === 'completed') {
                        setSelectedPreset(preset);
                      }
                    }}
                    disabled={renderState === 'rendering' || renderState === 'preparing'}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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

          {/* PRIMARY: ⚡ ONE-CLICK LOSSLESS NATIVE FFmpeg RENDER CARD */}
          <div className="p-4 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-[var(--accent-coral)]/10 text-[var(--accent-coral)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                    Native FFmpeg Render Engine
                  </h3>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Lossless H.264 CRF 18 • Zero browser memory limits • 1080p/4K
                  </p>
                </div>
              </div>
              <Badge variant="teal" className="text-[10px] font-mono">
                {selectedPreset.aspectRatio} @ 30fps
              </Badge>
            </div>

            {/* State: Idle */}
            {renderState === 'idle' && (
              <div className="flex flex-col gap-2 pt-1">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Ready to render your edited cuts, speeds, color grades, and audio balance using the system's native FFmpeg pipeline.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleStartRender}
                    disabled={!activeSource}
                    className="flex-1 text-xs gap-2 h-9 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Render MP4 Now (Native FFmpeg)</span>
                  </Button>
                </div>
              </div>
            )}

            {/* State: Preparing or Rendering */}
            {(renderState === 'preparing' || renderState === 'rendering') && (
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-coral)]" />
                    {renderStage || 'Rendering video frames...'}
                  </span>
                  <span className="font-mono font-bold text-[var(--accent-coral)]">
                    {renderProgress}%
                  </span>
                </div>

                {/* Real-time Progress Bar */}
                <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-coral)] transition-all duration-200 rounded-full"
                    style={{ width: `${Math.max(4, renderProgress)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-mono">
                  <span>
                    Rendered: {formatSecondsToTimecode(renderCurrentTime)} /{' '}
                    {formatSecondsToTimecode(timeline.duration)}
                  </span>
                  <span>
                    {renderFps > 0 ? `${renderFps} fps` : ''}{' '}
                    {renderSpeed ? `• Speed ${renderSpeed}` : ''}
                  </span>
                </div>

                <div className="pt-1 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelRender}
                    className="text-xs h-7 text-red-500 hover:text-red-600 gap-1 cursor-pointer"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>Cancel Render</span>
                  </Button>
                </div>
              </div>
            )}

            {/* State: Completed */}
            {renderState === 'completed' && (
              <div className="flex flex-col gap-3 pt-1">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Render Complete! Lossless MP4 is ready.
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-mono">
                      Size: {formatBytes(fileSize)} • Duration:{' '}
                      {formatSecondsToTimecode(timeline.duration)} • Preset:{' '}
                      {selectedPreset.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleDownloadRenderedVideo}
                    className="flex-1 text-xs gap-2 h-9 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Final Video (.mp4)</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setRenderState('idle')}
                    className="text-xs gap-1.5 h-9 cursor-pointer"
                    title="Render again"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Render Again</span>
                  </Button>
                </div>
              </div>
            )}

            {/* State: Failed or Aborted */}
            {(renderState === 'failed' || renderState === 'aborted') && (
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-red-600 dark:text-red-400">
                      {renderState === 'aborted' ? 'Render Cancelled' : 'Rendering Error'}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 break-words">
                      {errorMessage || renderStage || 'The render process encountered an issue.'}
                    </p>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStartRender}
                  className="text-xs h-8 gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Render</span>
                </Button>
              </div>
            )}
          </div>

          {/* Native FFmpeg Command Box (Alternative / Fallback) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
                <span>FFmpeg CLI Filtergraph Command</span>
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
                <strong>Under the hood:</strong> The "Render MP4 Now" button above executes this exact deterministic filtergraph on our native FFmpeg engine with H.264 CRF 18 encoding!
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

        {/* Modal Footer */}
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
              disabled={renderState === 'rendering' || renderState === 'preparing'}
              className="text-xs h-8 cursor-pointer"
            >
              Close
            </Button>

            {renderState === 'completed' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadRenderedVideo}
                className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .MP4</span>
              </Button>
            ) : renderState === 'rendering' || renderState === 'preparing' ? (
              <Button
                variant="primary"
                size="sm"
                disabled
                className="text-xs h-8 gap-1.5 opacity-80 cursor-wait"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Rendering ({renderProgress}%)</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartRender}
                disabled={!activeSource}
                className="text-xs h-8 gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Render MP4 Now</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
