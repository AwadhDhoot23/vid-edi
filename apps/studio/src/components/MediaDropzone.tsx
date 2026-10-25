import { useRef, useState } from 'react';
import { UploadCloud, Info, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, formatSecondsToTimecode } from '@vid-edi/ui';
import { inspectBrowserVideoFile, isWebCodecsSupported } from '@vid-edi/media-processing';
import { useTimelineStore } from '@vid-edi/editor-engine';
import type { MediaSource } from '@vid-edi/shared-types';

export function MediaDropzone() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { activeSource, setMediaSource } = useTimelineStore();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid video file (MP4, WebM, MOV, MKV).');
      return;
    }

    // Retain File handle for audio extraction and transcription
    (window as unknown as { __activeVideoFile?: File }).__activeVideoFile = file;

    try {
      setIsProcessing(true);
      const inspected = await inspectBrowserVideoFile(file);
      setMediaSource(inspected);
    } catch (err) {
      console.error('Failed to inspect media file:', err);
      // Fallback object if metadata inspection fails
      const fallback: MediaSource = {
        id: `source_${Date.now()}`,
        name: file.name,
        path: URL.createObjectURL(file),
        size: file.size,
        duration: 30, // default 30s
        width: 1920,
        height: 1080,
        fps: 30,
        codec: file.type || 'video/mp4',
        audioChannels: 2,
        audioSampleRate: 44100,
        mimeType: file.type || 'video/mp4',
      };
      setMediaSource(fallback);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadDemoMedia = () => {
    const demoSource: MediaSource = {
      id: 'demo_tech_interview_sample',
      name: 'tech_founder_interview_sample.mp4',
      path: '/tech_founder_interview_sample.mp4',
      size: 15 * 1024 * 1024,
      duration: 15,
      width: 1920,
      height: 1080,
      fps: 30,
      codec: 'h264 / aac',
      audioChannels: 2,
      audioSampleRate: 48000,
      mimeType: 'video/mp4',
    };
    setMediaSource(demoSource);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Upload Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped) void handleFile(dropped);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
            : 'border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) void handleFile(selected);
          }}
        />

        <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] shadow-xs">
          <UploadCloud className="w-6 h-6" />
        </div>

        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {isProcessing ? 'Inspecting video properties...' : 'Drop video here or click to browse'}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Supports MP4, WebM, MOV (H.264 / ProRes)
          </p>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              loadDemoMedia();
            }}
            className="text-xs gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
            Load Sample Interview Demo
          </Button>
        </div>
      </div>

      {/* Media Properties Inspector Panel (Task 1.3) */}
      {activeSource && (
        <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)]">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              Media Inspector
            </CardTitle>
            <div className="flex items-center gap-1 text-[var(--accent-primary)] text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Loaded</span>
            </div>
          </CardHeader>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)] block">Duration</span>
              <span className="font-mono font-medium text-[var(--text-primary)]">
                {formatSecondsToTimecode(activeSource.duration)}
              </span>
            </div>

            <div className="p-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)] block">Resolution</span>
              <span className="font-mono font-medium text-[var(--text-primary)]">
                {activeSource.width} × {activeSource.height}
              </span>
            </div>

            <div className="p-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)] block">Codec & FPS</span>
              <span className="font-medium text-[var(--text-primary)] truncate block">
                {activeSource.codec} @ {activeSource.fps}fps
              </span>
            </div>

            <div className="p-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)] block">Audio</span>
              <span className="font-medium text-[var(--text-primary)]">
                {activeSource.audioChannels}ch @ {activeSource.audioSampleRate / 1000}kHz
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-tertiary)]">Playback Engine</span>
            <span className="font-mono text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {isWebCodecsSupported() ? 'WebCodecs HW Accel' : 'HTML5 Standard'}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
