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
  Smartphone,
  Monitor,
  Square,
} from 'lucide-react';
import { Button, formatSecondsToTimecode } from '@vid-edi/ui';
import {
  useTimelineStore,
  getActiveClipAtTime,
  getNextClipStartTime,
} from '@vid-edi/editor-engine';

export function getFilterCss(filterName?: string): string {
  switch (filterName) {
    case 'warm-vintage':
      return 'sepia(0.3) saturate(1.2) contrast(1.05) brightness(1.02)';
    case 'teal-orange':
      return 'contrast(1.2) saturate(1.3) hue-rotate(-10deg)';
    case 'noir-bw':
      return 'grayscale(1) contrast(1.3) brightness(0.95)';
    case 'cyberpunk':
      return 'saturate(1.8) hue-rotate(180deg) contrast(1.15)';
    case 'clean-pop':
      return 'contrast(1.1) saturate(1.25) brightness(1.05)';
    case 'kodak-35mm':
      return 'sepia(0.18) saturate(1.15) contrast(1.12)';
    case 'bleach-bypass':
      return 'contrast(1.4) saturate(0.6) brightness(1.05)';
    case 'cool-slate':
      return 'hue-rotate(190deg) saturate(0.8) contrast(1.1)';
    default:
      return 'none';
  }
}

// Web Audio Synthesizer for 100% reliable, zero-CORS ambient background music with auto-ducking
class WebAudioBgmSynth {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isRunning = false;
  private loopInterval: number | null = null;

  start(presetId: string, baseVol: number, ducked: boolean) {
    if (this.isRunning) {
      this.updateVolume(baseVol, ducked);
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      const targetGain = baseVol * (ducked ? 0.2 : 0.8) * 0.12;
      this.gainNode.gain.setValueAtTime(Math.max(0.001, targetGain), this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
      this.isRunning = true;

      const chordFreqs = presetId.includes('synthwave')
        ? [
            [220, 261.63, 329.63],
            [174.61, 220, 261.63],
            [196, 246.94, 293.66],
            [164.81, 207.65, 246.94],
          ]
        : [
            [261.63, 329.63, 392.0],
            [220.0, 261.63, 329.63],
            [174.61, 220.0, 261.63],
            [196.0, 246.94, 293.66],
          ];

      let chordIdx = 0;
      const playChord = () => {
        if (!this.ctx || !this.gainNode || !this.isRunning) return;
        const freqs = chordFreqs[chordIdx % chordFreqs.length]!;
        chordIdx++;

        freqs.forEach((freq) => {
          if (!this.ctx || !this.gainNode) return;
          const osc = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();
          osc.type = presetId.includes('synthwave') ? 'sawtooth' : 'sine';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(
            presetId.includes('synthwave') ? 1100 : 750,
            this.ctx.currentTime
          );

          noteGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
          noteGain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 0.35);
          noteGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.2);

          osc.connect(filter);
          filter.connect(noteGain);
          noteGain.connect(this.gainNode);

          osc.start();
          osc.stop(this.ctx.currentTime + 2.3);
        });
      };

      playChord();
      this.loopInterval = window.setInterval(playChord, 2200);
    } catch (e) {
      console.warn('WebAudioBgmSynth error:', e);
    }
  }

  updateVolume(baseVol: number, ducked: boolean) {
    if (!this.ctx || !this.gainNode) return;
    const targetGain = baseVol * (ducked ? 0.2 : 0.8) * 0.12;
    this.gainNode.gain.setTargetAtTime(Math.max(0.0001, targetGain), this.ctx.currentTime, 0.1);
  }

  stop() {
    this.isRunning = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {}
      this.ctx = null;
      this.gainNode = null;
    }
  }
}

const bgmSynth = new WebAudioBgmSynth();

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgmAudioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);

  const {
    activeSource,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    timeline,
    transcriptWords,
    activeFilter,
    setAspectRatio,
    selectedClipId,
    setSelectedClipId,
  } = useTimelineStore();

  const activeClipInfo = getActiveClipAtTime(timeline.tracks, currentTime);

  // Dynamic Kinetic Subtitles Calculation (Task 5.11)
  const currentSourceTime = activeClipInfo?.sourceTime ?? currentTime;
  const activeWordIndex = transcriptWords.findIndex(
    (w) => currentSourceTime >= w.start && currentSourceTime <= w.end
  );
  const activeWord = activeWordIndex !== -1 ? transcriptWords[activeWordIndex] : null;

  // 3-word bite-sized window around current word
  const subtitleSnippet =
    activeWordIndex !== -1
      ? transcriptWords.slice(
          Math.max(0, activeWordIndex - 1),
          Math.min(transcriptWords.length, activeWordIndex + 2)
        )
      : [];

  // Active Overlays on Track 2 (Overlay / B-Roll)
  const overlayTrack = timeline.tracks.find((t) => t.id === 'track_overlay');
  const activeOverlayClips =
    overlayTrack?.clips.filter(
      (c) => currentTime >= c.timelineStart && currentTime < c.timelineStart + c.timelineDuration
    ) || [];

  const activeTitleCardClip = activeOverlayClips.find((c) => c.titleCard);
  const activeTextClips = activeOverlayClips.filter((c) => c.textOverlay);

  // Active Background Music on Track 4
  const musicTrack = timeline.tracks.find((t) => t.id === 'track_audio_music');
  const activeMusicClip = musicTrack?.clips.find(
    (c) => currentTime >= c.timelineStart && currentTime < c.timelineStart + c.timelineDuration
  );

  // Animated Transitions (In & Out)
  const inTransition = activeClipInfo?.clip.transitions?.in || activeClipInfo?.clip.transition;
  const outTransition = activeClipInfo?.clip.transitions?.out;

  let transOpacity = 1;
  let transBrightness = 1;
  let transTranslateX = 0;
  let transScale = 1;
  let transBlur = 0;

  if (activeClipInfo) {
    const clipStart = activeClipInfo.clip.timelineStart;
    const clipEnd = clipStart + activeClipInfo.clip.timelineDuration;
    const elapsed = currentTime - clipStart;
    const remaining = clipEnd - currentTime;

    // Incoming transition (at clip start)
    if (inTransition && inTransition.duration > 0 && elapsed >= 0 && elapsed <= inTransition.duration) {
      const p = Math.min(1, Math.max(0, elapsed / inTransition.duration));
      switch (inTransition.type) {
        case 'crossfade':
        case 'fade':
          transOpacity *= p;
          break;
        case 'dipToBlack':
          transBrightness *= p;
          break;
        case 'dipToWhite':
          transBrightness *= 1 + (1 - p) * 2.5;
          break;
        case 'slideLeft':
          transTranslateX += (1 - p) * 100;
          break;
        case 'zoomBlur':
          transScale *= 1 + (1 - p) * 0.35;
          transBlur = Math.max(transBlur, (1 - p) * 10);
          break;
      }
    }

    // Outgoing transition (at clip end)
    if (outTransition && outTransition.duration > 0 && remaining >= 0 && remaining <= outTransition.duration) {
      const p = Math.min(1, Math.max(0, remaining / outTransition.duration));
      switch (outTransition.type) {
        case 'crossfade':
        case 'fade':
          transOpacity *= p;
          break;
        case 'dipToBlack':
          transBrightness *= p;
          break;
        case 'dipToWhite':
          transBrightness *= 1 + (1 - p) * 2.5;
          break;
        case 'slideLeft':
          transTranslateX -= (1 - p) * 100;
          break;
        case 'zoomBlur':
          transScale *= 1 + (1 - p) * 0.35;
          transBlur = Math.max(transBlur, (1 - p) * 10);
          break;
      }
    }
  }

  // Filter & Transform calculations
  const currentFilterName = activeClipInfo?.clip.colorFilter || activeFilter || 'none';
  const filterStyle = getFilterCss(currentFilterName);
  const transform = activeClipInfo?.clip.transform;
  const baseScale = transform?.scale ?? 1.0;
  const finalScale = baseScale * transScale;
  const posX = (transform?.positionX ?? 0) + transTranslateX;
  const posY = transform?.positionY ?? 0;
  const baseOpacity = transform?.opacity ?? 1.0;
  const finalOpacity = baseOpacity * transOpacity;

  // Aspect ratio detection
  const is916 = timeline.resolution.height > timeline.resolution.width;
  const is11 = timeline.resolution.width === timeline.resolution.height;

  // Sync volume with HTML video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = isMuted ? 0 : volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  // Sync BGM audio with Web Audio Synth and HTML Audio element
  useEffect(() => {
    if (!activeMusicClip || !isPlaying) {
      bgmSynth.stop();
      if (bgmAudioRef.current && !bgmAudioRef.current.paused) {
        bgmAudioRef.current.pause();
      }
      return;
    }

    const hasSpeech = activeClipInfo !== null;
    const duckingEnabled = activeMusicClip.audioDucking?.enabled ?? true;
    const isDucked = hasSpeech && duckingEnabled;
    const baseVol = (activeMusicClip.volume ?? 0.8) * (isMuted ? 0 : volume);

    // If sourcePath is a playable media blob or custom URL, try audio element first
    const audioUrl = activeMusicClip.sourcePath || (activeMusicClip.sourceId.startsWith('http') ? activeMusicClip.sourceId : null);
    if (audioUrl && bgmAudioRef.current) {
      const bgm = bgmAudioRef.current;
      bgm.volume = isDucked ? baseVol * 0.2 : baseVol;
      if (bgm.paused) {
        bgm.play().catch(() => {
          // Fallback to Web Audio Synth if CORS or format fails
          bgmSynth.start(activeMusicClip.sourceId, baseVol, isDucked);
        });
      }
    } else {
      // Use synthesized Web Audio BGM
      bgmSynth.start(activeMusicClip.sourceId, baseVol, isDucked);
    }
  }, [activeMusicClip, isPlaying, activeClipInfo, volume, isMuted]);

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

  // Stutter-free virtual playback loop: HTML5 hardware clock drives time, 0 lag at any speed
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

      const rate = playbackRate;
      const currentTlTime = useTimelineStore.getState().currentTime;
      const activeInfo = getActiveClipAtTime(timeline.tracks, currentTlTime);

      if (activeInfo) {
        if (video.paused) {
          video.currentTime = activeInfo.sourceTime;
          video.playbackRate = rate;
          void video.play().catch(() => {});
        } else if (video.playbackRate !== rate) {
          video.playbackRate = rate;
        }

        // Only correct video time if drift exceeds 0.35s (e.g. from a click seek)
        const expectedSource = activeInfo.sourceTime;
        if (Math.abs(video.currentTime - expectedSource) > 0.35) {
          video.currentTime = expectedSource;
        }

        // Smoothly derive timeline time from video playback
        const elapsedInClip = (video.currentTime - activeInfo.clip.sourceStart) / (activeInfo.clip.playbackRate || 1);
        const derivedTlTime = activeInfo.clip.timelineStart + elapsedInClip;

        // Clip boundary detection
        if (
          video.currentTime >= activeInfo.clip.sourceEnd - 0.04 ||
          derivedTlTime >= activeInfo.clip.timelineStart + activeInfo.clip.timelineDuration
        ) {
          const nextStart = getNextClipStartTime(
            timeline.tracks,
            activeInfo.clip.timelineStart + activeInfo.clip.timelineDuration
          );
          if (nextStart !== null && nextStart < timeline.duration) {
            setCurrentTime(nextStart);
            const nextClip = getActiveClipAtTime(timeline.tracks, nextStart);
            if (nextClip) {
              video.currentTime = nextClip.sourceTime;
            } else {
              video.pause();
            }
          } else {
            setCurrentTime(timeline.duration);
            setIsPlaying(false);
            return;
          }
        } else {
          setCurrentTime(Math.min(timeline.duration, Math.max(0, derivedTlTime)));
        }
      } else {
        // No video clip (e.g. intro title card at 0:00 or timeline gap)
        if (!video.paused) {
          video.pause();
        }

        const newTlTime = currentTlTime + deltaSec * rate;
        if (newTlTime >= timeline.duration) {
          setCurrentTime(timeline.duration);
          setIsPlaying(false);
          return;
        }

        // Check if playhead reached the next video clip
        const nextInfo = getActiveClipAtTime(timeline.tracks, newTlTime);
        if (nextInfo) {
          video.currentTime = nextInfo.sourceTime;
          video.playbackRate = rate;
          void video.play().catch(() => {});
        }
        setCurrentTime(newTlTime);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, timeline.tracks, timeline.duration, playbackRate, setCurrentTime, setIsPlaying]);

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

  const getPositionClass = (pos?: string) => {
    switch (pos) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2';
      case 'bottom-left':
      default:
        return 'bottom-4 left-4';
    }
  };

  const combinedFilter = `${filterStyle} brightness(${transBrightness}) ${
    transBlur > 0 ? `blur(${transBlur}px)` : ''
  }`.trim();

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-black/95 relative overflow-hidden select-none"
    >
      {/* Background BGM Audio Element */}
      {activeMusicClip && (
        <audio
          ref={bgmAudioRef}
          src={activeMusicClip.sourcePath || undefined}
          loop
          preload="auto"
        />
      )}

      {/* Video Viewport Stage */}
      <div className="flex-1 flex items-center justify-center relative p-3 overflow-hidden">
        {activeSource ? (
          <div
            className={`relative flex items-center justify-center bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-200 ${
              is916
                ? 'aspect-[9/16] h-full max-w-[380px]'
                : is11
                ? 'aspect-square h-full max-w-[500px]'
                : 'aspect-video max-h-full max-w-full'
            }`}
          >
            {/* Blurred Letterbox Background for 9:16 vertical Reel layout */}
            {is916 && (
              <video
                src={activeSource.path}
                style={{ filter: 'blur(20px) brightness(0.4)' }}
                className="absolute inset-0 w-full h-full object-cover scale-120 pointer-events-none opacity-60"
                aria-hidden="true"
                playsInline
                muted
              />
            )}

            {/* Main Video Element with Live CSS Filter, Transitions, and Spring Transform */}
            <video
              ref={videoRef}
              src={activeSource.path}
              style={{
                filter: combinedFilter,
                transform: `scale(${finalScale}) translate(${posX}px, ${posY}px)`,
                opacity: activeClipInfo ? finalOpacity : 0.05,
              }}
              className="max-h-full max-w-full object-contain transition-transform duration-75 relative z-10"
              onEnded={() => setIsPlaying(false)}
              playsInline
              crossOrigin="anonymous"
              preload="auto"
            />

            {/* Empty Gap Overlay when playhead is in a cut gap and NO title card is active */}
            {!activeClipInfo && !activeTitleCardClip && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xs text-neutral-400 z-20 pointer-events-none p-4 text-center">
                <Scissors className="w-8 h-8 text-neutral-500 mb-2 opacity-60" />
                <span className="text-xs font-semibold text-neutral-300 tracking-wide uppercase">
                  Empty Timeline Gap
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5">
                  Blank space on timeline — continues playing or skips to next cut
                </span>
              </div>
            )}

            {/* Full-Frame Title Card Overlay (Intro / Outro / Middle) */}
            {activeTitleCardClip?.titleCard && (
              <div
                style={{
                  backgroundColor: activeTitleCardClip.titleCard.backgroundColor || '#0A0A0A',
                  color: activeTitleCardClip.titleCard.textColor || '#FFFFFF',
                }}
                className="absolute inset-0 z-35 flex flex-col items-center justify-center p-8 text-center animate-spring-in shadow-2xl"
              >
                <div className="text-xl sm:text-3xl font-extrabold uppercase tracking-widest border-b-2 border-amber-400/80 pb-2 mb-2 max-w-md">
                  {activeTitleCardClip.titleCard.title}
                </div>
                {activeTitleCardClip.titleCard.subtitle && (
                  <div className="text-xs sm:text-base opacity-80 max-w-sm font-medium">
                    {activeTitleCardClip.titleCard.subtitle}
                  </div>
                )}
              </div>
            )}

            {/* On-Screen Text & Lower Thirds with Canvas Bounding Box Gizmo (Task 4.20 & R10) */}
            {activeTextClips.map((clip) => {
              const isSelected = selectedClipId === clip.id;
              const cfg = clip.textOverlay!;
              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClipId(clip.id);
                  }}
                  className={`absolute z-30 cursor-pointer transition-all ${getPositionClass(
                    cfg.position
                  )} ${
                    isSelected
                      ? 'ring-2 ring-emerald-400 rounded-lg shadow-lg'
                      : 'hover:brightness-110'
                  }`}
                >
                  <div
                    style={{
                      fontFamily: cfg.fontFamily,
                      fontSize: `${cfg.fontSize}px`,
                      color: cfg.color,
                      backgroundColor: cfg.backgroundColor || 'rgba(0, 0, 0, 0.75)',
                    }}
                    className="px-3.5 py-1.5 rounded-lg shadow-md font-bold tracking-tight inline-block backdrop-blur-xs"
                  >
                    <div>{cfg.text}</div>
                    {cfg.subtitle && (
                      <div className="text-[11px] font-normal opacity-90 mt-0.5">
                        {cfg.subtitle}
                      </div>
                    )}
                  </div>
                  {/* Direct manipulation bounding gizmo handles */}
                  {isSelected && (
                    <>
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-emerald-400 rounded-full shadow-xs border border-white" />
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full shadow-xs border border-white" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-emerald-400 rounded-full shadow-xs border border-white" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full shadow-xs border border-white" />
                    </>
                  )}
                </div>
              );
            })}

            {/* Dynamic Kinetic Subtitles Overlay (Task 5.11) */}
            {showCaptions && subtitleSnippet.length > 0 ? (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none px-4 z-25">
                <div className="bg-black/70 backdrop-blur-xs px-3.5 py-1.5 rounded-lg border border-white/10 shadow-lg flex items-center gap-1.5 text-xs sm:text-sm font-semibold tracking-normal transition-all duration-75">
                  {subtitleSnippet.map((w, idx) => {
                    const isCurrent =
                      w.text === activeWord?.text &&
                      Math.abs(w.start - (activeWord?.start ?? -99)) < 0.05;
                    return (
                      <span
                        key={`${w.start}_${idx}`}
                        className={`transition-colors duration-75 ${
                          isCurrent
                            ? 'text-emerald-400 font-bold scale-105 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
                            : 'text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
                        }`}
                      >
                        {w.text}
                      </span>
                    );
                  })}
                </div>
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
              Upload footage in the left Media Bin or click "Load Sample Interview Video"
            </p>
          </div>
        )}
      </div>

      {/* Playback Control Bar */}
      <div className="h-11 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] px-4 flex items-center justify-between z-10 shrink-0">
        {/* Playhead Timecode & Format Badge */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[var(--accent-primary)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded-md border border-[var(--border-subtle)]">
            {formatSecondsToTimecode(currentTime)}
          </span>
          <span className="text-[var(--text-tertiary)] text-xs">/</span>
          <span className="font-mono text-xs text-[var(--text-secondary)]">
            {formatSecondsToTimecode(timeline.duration)}
          </span>
          {currentFilterName !== 'none' && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {currentFilterName}
            </span>
          )}
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => stepFrame(-1)}
            disabled={!activeSource}
            title="Step back 1 frame (Left Arrow = 5s seek)"
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
            title="Step forward 1 frame (Right Arrow = 5s seek)"
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
            className="w-8 h-8 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Secondary controls (Aspect Ratio, Speed, Volume, CC, Fullscreen) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Aspect Ratio Switcher Dropdown / Quick Toggle */}
          <div className="flex items-center gap-1 bg-[var(--bg-elevated)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setAspectRatio('16:9')}
              className={`p-1 rounded-md text-[10px] font-mono transition-colors cursor-pointer ${
                !is916 && !is11
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="16:9 Landscape (YouTube)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio('9:16')}
              className={`p-1 rounded-md text-[10px] font-mono transition-colors cursor-pointer ${
                is916
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="9:16 Vertical Reel (TikTok/Shorts)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio('1:1')}
              className={`p-1 rounded-md text-[10px] font-mono transition-colors cursor-pointer ${
                is11
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="1:1 Square"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 group">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              disabled={!activeSource}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-md disabled:opacity-40 cursor-pointer"
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

          {/* Captions (CC) Toggle */}
          <button
            type="button"
            onClick={() => setShowCaptions(!showCaptions)}
            disabled={!activeSource}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
              showCaptions
                ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
            title={showCaptions ? 'Hide subtitles (CC)' : 'Show subtitles (CC)'}
          >
            CC
          </button>

          {/* Speed Selector */}
          <select
            className="text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-md px-1.5 py-1 text-[var(--text-secondary)] focus:outline-hidden cursor-pointer"
            value={playbackRate}
            onChange={(e) => {
              const newRate = parseFloat(e.target.value);
              setPlaybackRate(newRate);
              if (videoRef.current) {
                videoRef.current.playbackRate = newRate;
              }
            }}
          >
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2.0x</option>
          </select>

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="w-8 h-8 text-[var(--text-secondary)] cursor-pointer"
            title="Fullscreen"
          >
            <Maximize className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
