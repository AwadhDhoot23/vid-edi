import { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize,
  RotateCcw,
  Volume2,
  VolumeX,
  Scissors,
} from 'lucide-react';
import { Button, formatSecondsToTimecode } from '@vid-edi/ui';
import {
  useTimelineStore,
  getActiveClipAtTime,
  getNextClipStartTime,
} from '@vid-edi/editor-engine';

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const {
    activeSource,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    timeline,
    transcriptWords,
  } = useTimelineStore();

  const activeClipInfo = getActiveClipAtTime(timeline.tracks, currentTime);

  // Dynamic Kinetic Subtitles Calculation (Task 5.11)
  const currentSourceTime = activeClipInfo?.sourceTime ?? currentTime;
  const activeWordIndex = transcriptWords.findIndex(
    (w) => currentSourceTime >= w.start && currentSourceTime <= w.end
  );
  const activeWord = activeWordIndex !== -1 ? transcriptWords[activeWordIndex] : null;

  // 4 words window around current word
  const subtitleSnippet =
    activeWordIndex !== -1
      ? transcriptWords.slice(
          Math.max(0, activeWordIndex - 2),
          Math.min(transcriptWords.length, activeWordIndex + 3)
        )
      : [];

  // Sync volume with HTML video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = isMuted ? 0 : volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  // Direct scrub / playhead sync when paused
  useEffect(() => {
    if (isPlaying) return;
    const video = videoRef.current;
    if (!video) return;

    if (activeClipInfo) {
      if (Math.abs(video.currentTime - activeClipInfo.sourceTime) > 0.03) {
        video.currentTime = activeClipInfo.sourceTime;
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [currentTime, activeClipInfo, isPlaying]);

  // Virtual Timeline Playback loop: skips deleted clips and advances smoothly
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) {
      if (video && !video.paused) video.pause();
      return;
    }

    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      const rate = video.playbackRate || 1;
      const currentTlTime = useTimelineStore.getState().currentTime;
      const newTlTime = currentTlTime + deltaSec * rate;

      if (newTlTime >= timeline.duration) {
        setCurrentTime(timeline.duration);
        setIsPlaying(false);
        return;
      }

      const activeInfo = getActiveClipAtTime(timeline.tracks, newTlTime);
      if (activeInfo) {
        // Within an active clip
        if (video.paused) {
          video.currentTime = activeInfo.sourceTime;
          void video.play().catch(() => {});
        } else if (Math.abs(video.currentTime - activeInfo.sourceTime) > 0.12) {
          video.currentTime = activeInfo.sourceTime;
        }
        setCurrentTime(newTlTime);
      } else {
        // In an empty gap created by a deleted or trimmed clip!
        // Ripple skip: jump directly to the start of the next clip
        const nextStart = getNextClipStartTime(timeline.tracks, newTlTime);
        if (nextStart !== null && nextStart < timeline.duration) {
          setCurrentTime(nextStart);
          const nextClipInfo = getActiveClipAtTime(timeline.tracks, nextStart);
          if (nextClipInfo) {
            video.currentTime = nextClipInfo.sourceTime;
          }
        } else {
          // Reached the end of all clips on the timeline
          setCurrentTime(timeline.duration);
          setIsPlaying(false);
          return;
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, timeline.tracks, timeline.duration, setCurrentTime, setIsPlaying]);

  const stepFrame = (frames: number) => {
    const fps = timeline.fps || 30;
    const delta = frames / fps;
    const nextTime = Math.max(0, Math.min(currentTime + delta, timeline.duration));
    setCurrentTime(nextTime);

    const targetClip = getActiveClipAtTime(timeline.tracks, nextTime);
    if (targetClip && videoRef.current) {
      videoRef.current.currentTime = targetClip.sourceTime;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current.requestFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-black/95 relative overflow-hidden select-none"
    >
      {/* Video Viewport */}
      <div className="flex-1 flex items-center justify-center relative p-3">
        {activeSource ? (
          <div className="relative max-h-full max-w-full aspect-video flex items-center justify-center bg-black/40 rounded-lg overflow-hidden border border-white/10 shadow-2xl">
            <video
              ref={videoRef}
              src={activeSource.path}
              className={`max-h-full max-w-full object-contain transition-opacity duration-150 ${
                activeClipInfo ? 'opacity-100' : 'opacity-10'
              }`}
              onEnded={() => setIsPlaying(false)}
              playsInline
              crossOrigin="anonymous"
              preload="auto"
            />

            {/* Empty Gap Overlay when playhead is in a deleted or trimmed gap */}
            {!activeClipInfo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xs text-neutral-400 z-10 pointer-events-none p-4 text-center">
                <Scissors className="w-8 h-8 text-neutral-500 mb-2 opacity-60" />
                <span className="text-xs font-semibold text-neutral-300 tracking-wide uppercase">
                  Empty Timeline Gap
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5">
                  Clip trimmed or deleted here — skips to next cut on play
                </span>
              </div>
            )}

            {/* Dynamic Kinetic Subtitles Overlay (Task 5.11) */}
            {subtitleSnippet.length > 0 ? (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none px-4 z-20">
                <div className="bg-black/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2 text-base sm:text-xl font-bold tracking-wide">
                  {subtitleSnippet.map((w, idx) => {
                    const isCurrent =
                      w.text === activeWord?.text &&
                      Math.abs(w.start - (activeWord?.start ?? -99)) < 0.05;
                    return (
                      <span
                        key={`${w.start}_${idx}`}
                        className={`transition-transform duration-100 ${
                          isCurrent
                            ? 'text-emerald-400 scale-110 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)] underline decoration-emerald-400/50'
                            : 'text-white/85'
                        }`}
                      >
                        {w.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : activeClipInfo ? (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none px-4 z-20">
                <span className="bg-black/60 backdrop-blur-xs text-white/70 px-2.5 py-0.5 rounded-md text-xs font-mono border border-white/10">
                  {formatSecondsToTimecode(currentTime)}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 text-neutral-500">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3">
              <Play className="w-8 h-8 text-neutral-600" />
            </div>
            <p className="text-sm font-medium text-neutral-400">No active media loaded</p>
            <p className="text-xs text-neutral-600 mt-1 max-w-xs">
              Upload video footage or click "Load Sample Interview Demo" in the left panel
            </p>
          </div>
        )}
      </div>

      {/* Playback Control Bar */}
      <div className="h-11 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] px-4 flex items-center justify-between z-10 shrink-0">
        {/* Playhead Timecode */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[var(--accent-primary)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded-md border border-[var(--border-subtle)]">
            {formatSecondsToTimecode(currentTime)}
          </span>
          <span className="text-[var(--text-tertiary)] text-xs">/</span>
          <span className="font-mono text-xs text-[var(--text-secondary)]">
            {formatSecondsToTimecode(timeline.duration)}
          </span>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => stepFrame(-1)}
            disabled={!activeSource}
            title="Step back 1 frame (use Left Arrow for 5s seek)"
            className="w-8 h-8 cursor-pointer"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            variant={isPlaying ? 'secondary' : 'primary'}
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!activeSource}
            title="Play / Pause (Space)"
            className="w-9 h-9 rounded-full shadow-xs cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => stepFrame(1)}
            disabled={!activeSource}
            title="Step forward 1 frame (use Right Arrow for 5s seek)"
            className="w-8 h-8 cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setCurrentTime(0);
              if (videoRef.current) videoRef.current.currentTime = 0;
            }}
            disabled={!activeSource}
            title="Return to start"
            className="w-8 h-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Secondary controls (Speed, Volume, Fullscreen) */}
        <div className="flex items-center gap-3">
          {/* Volume Control */}
          <div className="flex items-center gap-1.5 group">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              disabled={!activeSource}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-md disabled:opacity-40"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              disabled={!activeSource}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                if (val > 0 && isMuted) setIsMuted(false);
              }}
              className="w-14 h-1 accent-[var(--accent-primary)] bg-[var(--border-subtle)] rounded-lg cursor-pointer disabled:opacity-40"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>

          {/* Speed Selector */}
          <select
            className="text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-[var(--text-secondary)] focus:outline-hidden"
            onChange={(e) => {
              if (videoRef.current) {
                videoRef.current.playbackRate = parseFloat(e.target.value);
              }
            }}
            defaultValue="1"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="w-8 h-8 text-[var(--text-secondary)]"
            title="Fullscreen"
          >
            <Maximize className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
